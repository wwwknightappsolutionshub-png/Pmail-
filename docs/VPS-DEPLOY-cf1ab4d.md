# VPS deployment — `cf1ab4d`

**Commit:** `cf1ab4dcac5de849dc1dc68eb89a2ed8077f2174`  
**Branch:** `fix/login-placeholders-provider-defaults`  
**Message:** `feat(pmail): branded footer, open tracking trial, and send UX`  
**Target:** `mail.prohost.cloud` (`/var/www/hostnet-panel`)

## What this release includes

- Branded PMail+ footer with **Explore Now** button → `/welcome/prohost`
- Post-send toast with open-tracking link; inbox stays active after send
- Open tracking auto-enabled on first send (7-day panel trial)
- Push or in-app notification when a tracked email is opened
- 70-hour open-tracking upsell email (addon-upsell template)
- Inbox switcher, Gmail wizard mobile, onboarding/PWA, messaging tab count fixes

## Database migration (required)

```
20250714120000_open_tracking_entitlement
```

Adds to `UserComposeSettings`:

- `openTrackingFirstSendAt`
- `openTrackingUpsellEmailSent`

Adds table: `TrackingOpenNotification`

---

## One-command deploy (recommended)

SSH into the VPS, then:

```bash
cd /var/www/hostnet-panel
./scripts/vps-deploy.sh fix/login-placeholders-provider-defaults
```

Expected final commit after pull:

```bash
git rev-parse HEAD
# cf1ab4dcac5de849dc1dc68eb89a2ed8077f2174
```

---

## Manual deploy (step-by-step)

```bash
export APP_ROOT=/var/www/hostnet-panel
export BRANCH=fix/login-placeholders-provider-defaults
cd "$APP_ROOT"

# 1. Backup DB (recommended before migration)
npm run backup:db || ./scripts/backup-database.sh backups

# 2. Pull latest
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
git rev-parse HEAD   # verify cf1ab4d

# 3. Install (include dev deps for Vite builds)
npm install --include=dev

# 4. Migrate + regenerate Prisma client
npm run db:migrate -w hmail-api
npm run db:generate -w hmail-api

# 5. Build apps
npm run build -w hmail-api
npm run build -w hmail-web
npm run build -w hostnet-web

# 6. Restart API
sudo systemctl restart hmail-api
sudo systemctl status hmail-api --no-pager
```

---

## Post-deploy verification

```bash
# API health
curl -sS https://mail.prohost.cloud/health
curl -sS https://mail.prohost.cloud/health/ready

# Confirm migration applied
cd /var/www/hostnet-panel/apps/hmail-api
npx dotenv-cli -e ../../.env -- tsx scripts/prisma-cli.ts migrate status
```

### Smoke test in browser

1. Log in to PMail+ on production.
2. Send a test email → confirm **sent toast** appears and you land on **Inbox** (not Sent).
3. Open the sent message recipient side (or use a second mailbox) → confirm open-tracking notification (push or in-app toast).
4. Check outbound email HTML footer → PMail+ logo + **Explore Now** button linking to `/welcome/prohost`.
5. Open **Open tracking** panel → loads during active trial; shows tracked sends.

---

## Rollback

If deploy fails after migration:

```bash
cd /var/www/hostnet-panel
git checkout 49588ca   # previous commit on this branch
npm install --include=dev
npm run build -w hmail-api
npm run build -w hmail-web
npm run build -w hostnet-web
sudo systemctl restart hmail-api
```

**Note:** Rolling back code does not reverse DB migrations. Restore from backup if schema/data rollback is required.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| `migrate deploy` fails | `DATABASE_URL` in `/var/www/hostnet-panel/.env`; Postgres running |
| API won't start | `journalctl -u hmail-api -n 100 --no-pager` |
| UI shows old footer | Hard refresh / clear PWA cache; confirm `hmail-web/dist` rebuilt |
| Open tracking 403 | User must send first email to start panel trial; or subscribe to addon |
| Upsell email not sent | Hourly `addon-trial.job` runs in API process; needs `NURTURE_SMTP_*` in `.env` |
