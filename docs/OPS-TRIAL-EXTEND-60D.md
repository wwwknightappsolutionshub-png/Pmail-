# Ops: +60 day trial extension + user email

**Target:** production `/var/www/hostnet-panel` (`mail.prohost.cloud`)  
**Scripts:** `apps/hmail-api/scripts/ops-extend-trials-60d.ts`, `ops-notify-trial-extension.ts`

## What this does

1. Sets every `User.panelWorkspaceTrialStartedAt` so Panel welcome trial ends ≈ **now + 60 days** (keeps the code constant of **7** days: `startedAt = now + 53d`).
2. Resets panel day-5 / day-7 reminder flags.
3. Sets every `TenantAddonTrial.endsAt = max(endsAt, now) + 60 days` and `status = active`.
4. Emails every active user via platform SMTP about the extension.

## Deploy scripts first

```bash
cd /var/www/hostnet-panel
./scripts/vps-deploy.sh fix/login-placeholders-provider-defaults
# or pull + rebuild hmail-api only if you already know HEAD includes these scripts
git pull origin fix/login-placeholders-provider-defaults
npm run build -w hmail-api
```

Confirm scripts exist:

```bash
ls apps/hmail-api/scripts/ops-extend-trials-60d.ts apps/hmail-api/scripts/ops-notify-trial-extension.ts
```

## 1) Dry-run trial clocks

```bash
cd /var/www/hostnet-panel
npm run ops:extend-trials-60d -w hmail-api -- --dry-run
```

Expect `before.panel.expired` high and `formula.expectedEndsAt` ~60 days out.

## 2) Apply trial clocks

```bash
npm run ops:extend-trials-60d -w hmail-api -- --apply
```

Expect `after.panel.active` ≈ total users and `expired` ≈ 0.

## 3) Verify counts

```bash
cd /var/www/hostnet-panel/apps/hmail-api
DATABASE_URL=$(grep -E '^DATABASE_URL=' ../../.env | head -1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//') \
node --input-type=module -e '
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const now = Date.now();
const users = await p.user.findMany({ select: { panelWorkspaceTrialStartedAt: true } });
let never=0, active=0, expired=0;
for (const u of users) {
  if (!u.panelWorkspaceTrialStartedAt) { never++; continue; }
  const end = u.panelWorkspaceTrialStartedAt.getTime() + 7*864e5;
  if (end > now) active++; else expired++;
}
console.log({ total: users.length, never, active7d: active, expired7d: expired });
await p.$disconnect();
'
```

## 4) Notify users (email)

```bash
cd /var/www/hostnet-panel
npm run ops:notify-trial-extension -w hmail-api -- --dry-run
npm run ops:notify-trial-extension -w hmail-api -- --apply --delay-ms=1500
```

Requires `PLATFORM_SMTP_USER` / `PLATFORM_SMTP_PASS` in `.env`. Check `PlatformEmailLog` for `ops-trial-extension-60d`.

## Optional push (opted-in devices only)

Admin → System → PMail+ push broadcast, or `POST /api/admin/pmail-push/broadcast`.

## Speed audit snippet (read-only)

```bash
# Host pressure
uptime; free -h; df -h / | tail -1
ps -o pid,rss,pcpu,cmd -p $(systemctl show -p MainPID --value hmail-api)

# Recent IMAP / timeout noise
sudo journalctl -u hmail-api --since "1 hour ago" --no-pager \
  | grep -E "ETIMEDOUT|ENOTFOUND|EAI_AGAIN|inbox-contact-sync|bot-spam|Failed to establish|AUTHENTICATIONFAILED" \
  | tail -n 40
```

Deployed mitigations in this release: contact-sync `take: 4` + 2.5s gap; bot-spam max 6 sessions/tick + 1.5s gap; PWA mail sync every 5m + per-account gap; IMAP connect/greeting timeout 12s.
