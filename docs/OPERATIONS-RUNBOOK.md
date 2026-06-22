# Hostnet Panel — Operations Runbook

Operator guide for production deployment, monitoring, backups, and billing lifecycle.

## Health & monitoring

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness — process is up |
| `GET /health/ready` | Readiness — includes database ping (returns 503 if DB down) |
| `GET /api/admin/system-status` | Admin-only ops summary (subscriptions, counts, config flags) |

Structured request logs are emitted when `LOG_REQUESTS` is not `false` (disabled in `NODE_ENV=test`).

### Recommended alerts

- `/health/ready` returns non-200 for > 2 minutes
- Error-rate spike in API logs (`level: error`)
- `billing.hosting.pastDue` or `billing.addons.pastDue` increases unexpectedly

## CI/CD

GitHub Actions workflow: `.github/workflows/ci.yml`

Runs on push/PR: lint → API tests (Tier A/B/D + payments + health) → build all apps.

Local equivalent:

```bash
npm run lint
npm run test:ci
npm run build
```

## Database

### Migrations (production Postgres)

```bash
npm run setup:postgres
# or: npm run db:migrate -w hmail-api && npm run db:seed -w hmail-api
```

### Backups

**PostgreSQL (production):**

```powershell
npm run backup:db
# or: ./scripts/backup-database.sh backups
```

Schedule daily backups via cron/Task Scheduler. Store off-server. Test restore quarterly.

**Code snapshot (dev):**

```powershell
npm run backup:local
```

## Billing lifecycle

Background job runs hourly (`billing-lifecycle.job.ts`):

1. `active` subscriptions past `currentPeriodEnd` → `past_due`
2. `past_due` longer than `BILLING_GRACE_DAYS` (default **7**) → `canceled`

### Stripe webhooks (configure in Stripe dashboard)

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Complete checkout + provision |
| `invoice.paid` | Renew subscription period |
| `invoice.payment_failed` | Mark `past_due` |
| `customer.subscription.deleted` | Mark `canceled` |

Webhook URL: `https://<api-host>/api/payments/webhooks/stripe`

**Production:** set `PAYMENT_MOCK_MODE=false`, configure `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.

## Privacy & compliance

| Surface | Control |
|---------|---------|
| Marketing leads | `consentPrivacy` required on `POST /api/public/leads` |
| Open tracking | `GET /api/public/privacy` documents pixel behavior; pixel returns `X-Tracking-Notice` header |
| Sessions | `COOKIE_SECURE=true` in production behind HTTPS |

Review notices with legal counsel before public launch.

## Environment checklist (production)

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
API_PORT=4002
PUBLIC_API_URL=https://api.yourdomain.com
CORS_ORIGIN=https://mail.yourdomain.com,https://www.yourdomain.com
COOKIE_SECURE=true
SESSION_SECRET=<32+ random chars>
CREDENTIAL_ENCRYPTION_KEY=<32+ random chars>
PAYMENT_MOCK_MODE=false
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
BILLING_GRACE_DAYS=7
LOG_REQUESTS=true
```

Rebuild frontends with matching `VITE_API_BASE_URL`.

## Deploy sequence

1. Run migrations + seed on target DB
2. Build: `npm run build`
3. Deploy `hmail-api` (systemd — see `deploy/hmail-api.service`)
4. Deploy `hostnet-web` + `hmail-web` static assets behind Nginx
5. Verify `/health/ready`, complete one test checkout (staging), confirm webhook delivery
6. Enable backup schedule

## Support escalation

| Issue | First check |
|-------|-------------|
| Login failures after purchase | `/api/admin/system-status` → tenant exists; mail onboarding complete |
| Addon locked | Subscription status in admin tenant ops; trial/subscription rows |
| Payments not activating | `paymentWebhookEvent` table; Stripe webhook logs |
| Panel 500 on first load | Migrations applied; `panelFileEntry` tables exist |
