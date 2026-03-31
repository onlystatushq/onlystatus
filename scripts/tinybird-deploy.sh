#!/bin/sh
set -e

log() { echo "[tinybird-deploy] $1"; }

TINYBIRD_HOST="${TINYBIRD_HOST:-http://tinybird-local:7181}"
AUTH_FILE="${AUTH_FILE:-/auth/.tinyb}"

# Schema version - bump this when datasources, pipes, or endpoints change.
# The deploy container stores the last deployed version in Tinybird metadata.
# If the version matches, only new/changed pipes are pushed. If it differs,
# a full redeploy with --override-datasource is triggered.
SCHEMA_VERSION="2"

# Wait for auth file (tinybird-local writes .tinyb after workspace init)
for i in $(seq 1 60); do
  [ -f "$AUTH_FILE" ] && break
  log "Waiting for auth file ($i/60)..."
  sleep 2
done

if [ ! -f "$AUTH_FILE" ]; then
  log "FATAL: auth file not found at $AUTH_FILE"
  exit 1
fi

read_token() {
  python3 -c "import json; print(json.load(open('$AUTH_FILE'))['token'])" 2>/dev/null || echo ""
}

TOKEN=$(read_token)
if [ -z "$TOKEN" ]; then
  log "FATAL: empty token in $AUTH_FILE"
  exit 1
fi
log "Read admin token from auth file"

# Wait for workspace API to be ready. Healthcheck passes before this.
# Re-read token on auth errors (stale token from previous workspace).
for i in $(seq 1 60); do
  RESULT=$(python3 -c "
import urllib.request, sys
try:
  req = urllib.request.Request('$TINYBIRD_HOST/v0/datasources', headers={'Authorization': 'Bearer $TOKEN'})
  resp = urllib.request.urlopen(req, timeout=5)
  print('ok')
except urllib.error.HTTPError as e:
  print('http_' + str(e.code))
except Exception as e:
  print('error')
" 2>/dev/null || echo "error")

  case "$RESULT" in
    ok) log "API is ready"; break ;;
    http_401|http_403)
      log "Token rejected ($RESULT), re-reading auth file ($i/60)..."
      NEW_TOKEN=$(read_token)
      [ -n "$NEW_TOKEN" ] && TOKEN="$NEW_TOKEN"
      ;;
    *) log "Waiting for API [$RESULT] ($i/60)..." ;;
  esac
  sleep 2
done

# Get the deployed schema version from a Tinybird metadata datasource.
# Returns empty string if no version tracking exists yet (fresh or pre-versioning deploy).
get_deployed_version() {
  python3 -c "
import urllib.request, json, sys
try:
  req = urllib.request.Request(
    '$TINYBIRD_HOST/v0/pipes/schema_version__v1.json',
    headers={'Authorization': 'Bearer $TOKEN'}
  )
  resp = urllib.request.urlopen(req, timeout=5)
  data = json.loads(resp.read()).get('data', [])
  print(data[0]['version'] if data else '')
except:
  print('')
" 2>/dev/null
}

# Check if core datasource exists (for fresh vs upgrade detection)
has_core_datasource() {
  python3 -c "
import urllib.request, json, sys
hdr = {'Authorization': 'Bearer $TOKEN'}
req = urllib.request.Request('$TINYBIRD_HOST/v0/datasources', headers=hdr)
resp = urllib.request.urlopen(req, timeout=5)
ds = [d['name'] for d in json.loads(resp.read())['datasources']]
sys.exit(0 if 'ping_response__v8' in ds else 1)
" 2>/dev/null
}

DEPLOYED_VERSION=$(get_deployed_version)
log "Schema version: want=$SCHEMA_VERSION, deployed=${DEPLOYED_VERSION:-none}"

if [ "$DEPLOYED_VERSION" = "$SCHEMA_VERSION" ]; then
  log "Schema version $SCHEMA_VERSION already deployed. Nothing to do."
  exit 0
fi

# Determine deploy mode
if has_core_datasource; then
  DEPLOY_MODE="upgrade"
  log "Upgrading schema from version ${DEPLOYED_VERSION:-unknown} to $SCHEMA_VERSION"
else
  DEPLOY_MODE="fresh"
  log "Fresh deploy - no existing datasources found"
fi

log "Authenticating with tb CLI..."
cd /tmp
tb auth --host "$TINYBIRD_HOST" --token "$TOKEN"

# Set up work directory with schema files (copy, not symlink, so we can patch)
mkdir -p /tmp/tb-work
cp /tmp/.tinyb /tmp/tb-work/.tinyb
for dir in datasources pipes endpoints; do
  [ -d "/mnt/data/$dir" ] && cp -r "/mnt/data/$dir" "/tmp/tb-work/$dir"
done
cd /tmp/tb-work

log "Deploying schemas ($DEPLOY_MODE mode)..."
# tcp_response.datasource (VERSION 0) and tcp_response__v0.datasource conflict on
# fresh deploys (column change limit). The __v0 file has the current schema with
# requestStatus/id columns that pipes depend on. Remove the outdated versioned file.
rm -f /tmp/tb-work/datasources/tcp_response.datasource
rm -f /tmp/tb-work/endpoints/endpoint__cert_*
printf 'y\n%.0s' $(seq 1 50) | tb push --force --override-datasource 2>&1 || true

# Verify critical schema exists
if ! has_core_datasource; then
  log "FATAL: ping_response__v8 not found after deploy"
  exit 1
fi

# Ensure cert endpoint pipes exist. The Tinybird Forward CLI (local) has a
# template parameter parsing bug that causes tb push to skip these pipes.
# Fall back to creating them via the HTTP API if they are missing.
log "Ensuring cert endpoint pipes..."
python3 -c "
import urllib.request, json, sys

host = '$TINYBIRD_HOST'
token = '$TOKEN'
hdr = {'Authorization': 'Bearer ' + token}

# Check which pipes exist
try:
    req = urllib.request.Request(host + '/v0/pipes', headers=hdr)
    resp = urllib.request.urlopen(req, timeout=5)
    existing = {p['name'] for p in json.loads(resp.read()).get('pipes', [])}
except:
    existing = set()

cert_pipes = {
    'endpoint__cert_status__v1': {
        'node': 'cert_latest',
        'sql': '''SELECT monitorId, argMax(t.certExpiryDays, t.cronTimestamp) AS certExpiryDays,
            argMax(t.certValid, t.cronTimestamp) AS certValid,
            argMax(t.certIssuer, t.cronTimestamp) AS certIssuer,
            argMax(t.certExpiresAt, t.cronTimestamp) AS certExpiresAt,
            argMax(t.certFingerprint, t.cronTimestamp) AS certFingerprint,
            argMax(t.certError, t.cronTimestamp) AS certError,
            max(t.cronTimestamp) AS lastChecked
            FROM (SELECT * FROM ping_response__v8 WHERE certExpiryDays IS NOT NULL
                AND cronTimestamp >= toUnixTimestamp64Milli(now64() - toIntervalDay(1))) AS t
            GROUP BY monitorId'''
    },
    'endpoint__cert_status_workspace__v1': {
        'node': 'cert_latest_all',
        'sql': '''SELECT monitorId, argMax(t.certExpiryDays, t.cronTimestamp) AS certExpiryDays,
            argMax(t.certValid, t.cronTimestamp) AS certValid,
            argMax(t.certIssuer, t.cronTimestamp) AS certIssuer,
            max(t.cronTimestamp) AS lastChecked
            FROM (SELECT * FROM ping_response__v8 WHERE certExpiryDays IS NOT NULL
                AND cronTimestamp >= toUnixTimestamp64Milli(now64() - toIntervalDay(1))) AS t
            GROUP BY monitorId'''
    },
    'endpoint__cert_history__v1': {
        'node': 'cert_trend',
        'sql': '''SELECT toStartOfHour(fromUnixTimestamp64Milli(t.cronTimestamp)) AS time,
            t.monitorId, avg(t.certExpiryDays) AS avgExpiryDays,
            min(t.certValid) AS allValid
            FROM (SELECT * FROM ping_response__v8 WHERE certExpiryDays IS NOT NULL) AS t
            GROUP BY time, t.monitorId ORDER BY time ASC'''
    },
}

created = 0
for pipe_name, spec in cert_pipes.items():
    if pipe_name in existing:
        continue
    try:
        data = json.dumps({
            'name': pipe_name,
            'nodes': [{'name': spec['node'], 'sql': spec['sql']}]
        }).encode()
        req = urllib.request.Request(host + '/v0/pipes', data=data,
            headers={**hdr, 'Content-Type': 'application/json'})
        urllib.request.urlopen(req, timeout=10)
        # Publish as endpoint
        req2 = urllib.request.Request(
            host + '/v0/pipes/' + pipe_name + '/nodes/' + spec['node'] + '/endpoint',
            headers=hdr, method='POST')
        urllib.request.urlopen(req2, timeout=5)
        created += 1
        print(f'Created {pipe_name}')
    except Exception as e:
        print(f'Warning: could not create {pipe_name}: {e}')

print(f'Cert pipes: {created} created, {len(cert_pipes) - created} already existed')
" 2>/dev/null || log "Warning: cert pipe creation failed (non-fatal)"

# Store the deployed schema version as a Tinybird pipe for tracking.
# This is a constant-returning pipe that acts as version metadata.
log "Setting schema version to $SCHEMA_VERSION..."
python3 -c "
import urllib.request, json

# Delete existing version pipe if present
try:
  req = urllib.request.Request(
    '$TINYBIRD_HOST/v0/pipes/schema_version__v1',
    headers={'Authorization': 'Bearer $TOKEN'},
    method='DELETE'
  )
  urllib.request.urlopen(req, timeout=5)
except:
  pass

# Create version pipe
data = json.dumps({
  'name': 'schema_version__v1',
  'nodes': [{
    'name': 'version_node',
    'sql': \"SELECT '$SCHEMA_VERSION' AS version\"
  }]
}).encode()
req = urllib.request.Request(
  '$TINYBIRD_HOST/v0/pipes',
  data=data,
  headers={
    'Authorization': 'Bearer $TOKEN',
    'Content-Type': 'application/json'
  }
)
resp = urllib.request.urlopen(req, timeout=5)
result = json.loads(resp.read())

# Publish as endpoint
req2 = urllib.request.Request(
  '$TINYBIRD_HOST/v0/pipes/schema_version__v1/nodes/version_node/endpoint',
  headers={'Authorization': 'Bearer $TOKEN'},
  method='POST'
)
urllib.request.urlopen(req2, timeout=5)
print('Version pipe created')
" 2>/dev/null || log "Warning: could not set schema version (non-fatal)"

log "Done. Schema version $SCHEMA_VERSION deployed."
exit 0
