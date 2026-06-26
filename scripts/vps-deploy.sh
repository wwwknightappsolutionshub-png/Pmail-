#!/usr/bin/env bash
# Apply code + database updates on the production VPS (mail.prohost.cloud).
# Usage: ./scripts/vps-deploy.sh [branch-name]
set -euo pipefail

BRANCH="${1:-fix/login-placeholders-provider-defaults}"
APP_ROOT="${APP_ROOT:-/var/www/hostnet-panel}"

cd "$APP_ROOT"
git fetch origin
git pull origin "$BRANCH"
npm run db:migrate -w hmail-api
npm run db:generate -w hmail-api
npm run build -w hmail-api
npm run build -w hmail-web
npm run build -w hostnet-web
sudo systemctl restart hmail-api
echo "Deploy complete on branch: $BRANCH"
