#!/bin/sh
set -e

if [ -f .env.docker ]; then
    echo ".env.docker already exists, skipping setup"
    exit 0
fi

cp .env.docker.example .env.docker

AUTH=$(openssl rand -base64 32 | tr -d '\n')
TOTP=$(openssl rand -hex 32)
CRON=$(openssl rand -base64 32 | tr -d '\n')

sed -i "s|^AUTH_SECRET=$|AUTH_SECRET=$AUTH|" .env.docker
sed -i "s|^TOTP_ENCRYPTION_KEY=$|TOTP_ENCRYPTION_KEY=$TOTP|" .env.docker
sed -i "s|^CRON_SECRET=change-me-to-a-random-string$|CRON_SECRET=$CRON|" .env.docker

echo "Created .env.docker with generated secrets"
