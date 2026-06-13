# Deployment: shared hosting first, then VPS

Yes — you can stage this project in phases. The app is designed to move without rewriting code.

## What each part needs

| Component | Shared hosting | VPS |
|-----------|----------------|-----|
| **hmail-web** (React UI) | Yes — static files in `public_html` | Yes — Nginx serves `dist/` |
| **hmail-api** (Node.js API) | Only if host supports Node.js apps | Yes — systemd service |
| **PostgreSQL** | Rare on basic shared plans | Yes — native install |
| **Hostinger mail** | Unchanged — IMAP/SMTP | Unchanged — IMAP/SMTP |

## Phase 1 — Test locally (your PC)

Use SQLite or cloud PostgreSQL — see [SETUP-WITHOUT-DOCKER.md](./SETUP-WITHOUT-DOCKER.md).

No upload required yet.

---

## Phase 2 — Shared hosting (early production)

### What works well on typical shared hosting

**Static frontend only** — upload `apps/hmail-web/dist` to:

- `public_html/mail/` or a subdomain `mail.yourdomain.com`

### API on shared hosting — depends on your plan

| Hostinger plan type | Node.js API? |
|---------------------|--------------|
| Basic shared (PHP) | Usually **no** long-running Node API |
| Business / Cloud with Node.js in hPanel | **Maybe** — check hPanel → Advanced → Node.js |
| VPS | **Yes** — full control |

### Practical shared-hosting strategies

**Strategy A — Split (most common)**

- **Shared hosting:** hmail UI (static files)
- **Small API host:** same VPS later, or temporary free/cheap Node host (Railway, Render, Fly.io) until VPS is ready
- Point `VITE_API_BASE_URL` at the API URL when building the frontend

**Strategy B — All on shared if Node is supported**

- Upload full project
- Build on server or build locally and upload `dist` + `hmail-api/dist`
- Run API via host’s Node.js app manager
- Use host’s **MySQL** only if you migrate schema — **this project uses PostgreSQL**, so you need PostgreSQL from the host or an external DB (Neon free tier works)

**Strategy C — Wait for VPS**

- Test locally until VPS is ready — often the cleanest path for this stack

---

## Phase 3 — Move to Ubuntu VPS

When your VPS is ready:

1. Copy the same project folder (or `git pull`)
2. Install Node 20+, PostgreSQL, Nginx
3. Production `.env` with PostgreSQL `DATABASE_URL`
4. `npm install && npm run build && npm run db:migrate && npm run db:seed`
5. Use `deploy/hmail-api.service` and `deploy/nginx-hmail.conf`
6. Point DNS (`mail.yourdomain.com`) to the VPS
7. SSL via Certbot

### What you migrate

| Data | How |
|------|-----|
| Code | Git, zip, or SCP — same repo |
| Database | `pg_dump` / restore, or re-seed tenants and let users log in again |
| Email | **Stays on Hostinger** — no mail migration needed |
| Frontend | Rebuild with production `VITE_API_BASE_URL` if API URL changes |

### What does **not** need to change

- Hostinger mailbox passwords
- Imported old emails (still on Hostinger IMAP)
- Tenant branding in DB (if you migrate PostgreSQL)

---

## Recommended path for your project

```
Local PC (SQLite or cloud PostgreSQL)
        ↓
Optional: static UI on shared hosting + API on temp Node host
        ↓
Ubuntu VPS (full stack: Nginx + Node API + PostgreSQL)
        ↓
Phase 2: HostNet panel on same VPS
```

---

## Build frontend for a specific API URL

When the API is not on the same domain as the UI:

```bash
# In .env before build:
VITE_API_BASE_URL=https://api.yourdomain.com

npm run build -w hmail-web
```

Upload only `apps/hmail-web/dist` to shared hosting.

---

## Summary

| Question | Answer |
|----------|--------|
| Avoid Docker? | Yes — SQLite, native PostgreSQL, or cloud PostgreSQL |
| Test locally first? | Yes — use `Hostnet Panel - Local Test` copy or zip backup |
| Shared hosting first? | **Partially** — UI yes; full stack needs Node + PostgreSQL |
| Move to VPS later? | **Yes** — same codebase, update `.env` and DNS |
