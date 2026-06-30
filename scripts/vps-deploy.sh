#!/usr/bin/env bash
# Apply code + database updates on the production VPS (mail.prohost.cloud).
# Usage: ./scripts/vps-deploy.sh [branch-name]
set -euo pipefail

BRANCH="${1:-fix/login-placeholders-provider-defaults}"
APP_ROOT="${APP_ROOT:-/var/www/hostnet-panel}"

cd "$APP_ROOT"
git fetch origin
git pull origin "$BRANCH"
npm install
npm run db:migrate -w hmail-api
npm run db:generate -w hmail-api
npx playwright install chromium 2>/dev/null || true
npm run build -w hmail-api
npm run build -w hmail-web
npm run build -w hostnet-web
sudo systemctl restart hmail-api
echo "Deploy complete on branch: $BRANCH"
echo "SEO: set VITE_HOSTNET_WEB_URL, VITE_HMAIL_URL, PUBLIC_SITE_URL, and VITE_GOOGLE_SITE_VERIFICATION in .env before build."
echo "SEO center: super-admin → SEO center for monitoring, articles, and optional GSC API sync."
