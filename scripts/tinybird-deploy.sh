#!/bin/sh
set -e

log() { echo "[tinybird-deploy] $1"; }

TINYBIRD_HOST="${TINYBIRD_HOST:-http://tinybird-local:7181}"
AUTH_FILE="${AUTH_FILE:-/auth/.tinyb}"

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

# Check if schemas fully deployed (datasources + endpoint pipes)
check_deployed() {
  python3 -c "
import urllib.request, json, sys
hdr = {'Authorization': 'Bearer $TOKEN'}
# Check datasource exists
req = urllib.request.Request('$TINYBIRD_HOST/v0/datasources', headers=hdr)
resp = urllib.request.urlopen(req, timeout=5)
ds = [d['name'] for d in json.loads(resp.read())['datasources']]
if 'ping_response__v8' not in ds:
    sys.exit(1)
# Check endpoint pipes exist (not just datasources)
req2 = urllib.request.Request('$TINYBIRD_HOST/v0/pipes', headers=hdr)
resp2 = urllib.request.urlopen(req2, timeout=5)
pipes = json.loads(resp2.read()).get('pipes', [])
endpoints = [p['name'] for p in pipes if p.get('endpoint')]
sys.exit(0 if len(endpoints) >= 50 else 1)
" 2>/dev/null
}

if check_deployed; then
  log "Schemas already deployed, skipping."
  exit 0
fi

log "Authenticating with tb CLI..."
cd /tmp
tb auth --host "$TINYBIRD_HOST" --token "$TOKEN"

# Set up work directory with schema files
mkdir -p /tmp/tb-work
cp /tmp/.tinyb /tmp/tb-work/.tinyb
for dir in datasources pipes endpoints; do
  [ -d "/mnt/data/$dir" ] && ln -sf "/mnt/data/$dir" "/tmp/tb-work/$dir"
done
cd /tmp/tb-work

log "Deploying schemas..."
# Drop legacy datasources that block migration (column change limits)
for ds in tcp_response__v0; do
  tb datasource rm "$ds" --yes 2>/dev/null || true
done
printf 'y\n%.0s' $(seq 1 50) | tb push --force 2>&1 || true

# Verify critical schema exists
if check_deployed; then
  log "Done."
  exit 0
fi

log "FATAL: ping_response__v8 not found after deploy"
exit 1
