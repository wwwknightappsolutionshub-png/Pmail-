#!/usr/bin/env bash
# Apply code + database updates on the production VPS (mail.prohost.cloud).
# Usage: ./scripts/vps-deploy.sh [branch-name]
# Latest release: cf1ab4d — feat(pmail): branded footer, open tracking trial, and send UX
# See docs/VPS-DEPLOY-cf1ab4d.md for full runbook.
set -euo pipefail

BRANCH="${1:-fix/login-placeholders-provider-defaults}"
EXPECTED_COMMIT="${EXPECTED_COMMIT:-808f6a546117ed7a5507c48e75e0ece5634498ed}"
APP_ROOT="${APP_ROOT:-/var/www/hostnet-panel}"

cd "$APP_ROOT"
git fetch origin
git pull origin "$BRANCH"
ACTUAL_COMMIT="$(git rev-parse HEAD)"
if [ "$ACTUAL_COMMIT" != "$EXPECTED_COMMIT" ]; then
  echo "Warning: HEAD is $ACTUAL_COMMIT (expected $EXPECTED_COMMIT). Continuing deploy."
fi
# NODE_ENV=production in .env omits devDependencies (vite, playwright, etc.) — force include for builds.
npm install --include=dev
npm run db:migrate -w hmail-api
npm run db:generate -w hmail-api
npm exec -w hostnet-web -- playwright install chromium 2>/dev/null || true
npm run build -w hmail-api
npm run build -w hmail-web
npm run build -w hostnet-web
sudo systemctl restart hmail-api
echo "Deploy complete on branch: $BRANCH (commit: $ACTUAL_COMMIT)"
API_PORT="$(grep -E '^API_PORT=' "$APP_ROOT/.env" 2>/dev/null | cut -d= -f2 | tr -d '\r' || true)"
API_PORT="${API_PORT:-4000}"
curl -fsS "http://127.0.0.1:${API_PORT}/health" >/dev/null && echo "API health: OK" || echo "API health: check failed — run: journalctl -u hmail-api -n 50"
echo "Runbook: docs/VPS-DEPLOY-cf1ab4d.md"
echo "SEO: set VITE_HOSTNET_WEB_URL, VITE_HMAIL_URL, PUBLIC_SITE_URL, and VITE_GOOGLE_SITE_VERIFICATION in .env before build."
echo "SEO center: super-admin → SEO center for monitoring, articles, and optional GSC API sync."
