# Prohost Cloud

Standalone project for **Prohost Cloud** (custom VPS hosting panel) and **PMail+** (fully branded webmail UI).

**Not** related to ChurchCRM or ChurchApp.

## Products

| Product | Status | Description |
|---------|--------|-------------|
| **PMail+** | Phase 1 | Branded webmail UI powered by Hostinger IMAP/SMTP |
| **Prohost Cloud** | Phase 2 (planned) | Custom WHM-style hosting panel on Ubuntu VPS |

## Local test (no Docker)

**Recommended on Windows:**

```powershell
cd "Hostnet Panel"
npm install
npm run setup:sqlite
npm run dev
```

- Web: http://localhost:5173/login
- API: http://localhost:4000/health
- Sign in with your Hostinger mailbox credentials

Other options (native PostgreSQL, free cloud DB): see **[docs/SETUP-WITHOUT-DOCKER.md](docs/SETUP-WITHOUT-DOCKER.md)**

Docker is **optional** — see `docker-compose.yml` only if you want it.

## Local backup before upload

```powershell
npm run backup:local
```

Creates:

- `../Hostnet Panel - Local Test/` — working copy without `node_modules`
- `../Hostnet Panel-backup.zip` — zip archive for safekeeping

## Deployment path

Shared hosting first, then VPS — see **[docs/DEPLOYMENT-PATHS.md](docs/DEPLOYMENT-PATHS.md)**

| Stage | What runs where |
|-------|-----------------|
| Local PC | Full stack (SQLite or PostgreSQL) |
| Shared hosting | Static UI easily; API needs Node.js + PostgreSQL |
| Ubuntu VPS | Full production stack (recommended end state) |

Email always stays on **Hostinger** — moving servers does not move mailboxes.

## Production (Ubuntu VPS)

```bash
npm install
cp .env.postgres-native.example .env   # edit secrets
npm run setup:postgres
npm run build
npm run start -w hmail-api
```

Nginx + systemd: `deploy/nginx-hmail.conf`, `deploy/hmail-api.service`

## Tests

```bash
npm run test
npm run lint
```

## Env templates

| File | Use case |
|------|----------|
| `.env.sqlite.example` | Local test, no DB install |
| `.env.postgres-native.example` | PostgreSQL on Windows/Ubuntu |
| `.env.cloud-db.example` | Neon / Supabase free tier |
| `.env.example` | Docker PostgreSQL (optional) |

## Phase 2 — Prohost Cloud panel

`HostingAccount` model is ready in the schema for the future VPS hosting panel.

