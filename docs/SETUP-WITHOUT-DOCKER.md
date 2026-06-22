# Local setup without Docker

Docker is **optional**. Pick one of these paths for local testing on Windows.

## Option A — SQLite (recommended for quick local test)

**No Docker. No PostgreSQL install. One file database.**

```powershell
cd "Hostnet Panel"
Copy-Item .env.sqlite.example .env
npm install
npm run setup:sqlite
npm run dev
```

Open http://localhost:5173/login and sign in with your Hostinger mailbox.

> SQLite is for **local development only**. Production (shared hosting API or VPS) uses PostgreSQL.

---

## Option B — PostgreSQL installed on Windows

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install (remember the password you set for the `postgres` user)
3. Create database and user in pgAdmin or `psql`:

```sql
CREATE USER hostnet WITH PASSWORD 'your_password';
CREATE DATABASE hostnet_panel OWNER hostnet;
```

4. Configure the project:

```powershell
Copy-Item .env.postgres-native.example .env
# Edit .env — set DATABASE_URL password
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

---

## Option C — Free cloud PostgreSQL (Neon / Supabase)

**No local database software at all.**

1. Create a free project at [Neon](https://neon.tech) or [Supabase](https://supabase.com)
2. Copy the connection string
3. Configure:

```powershell
Copy-Item .env.cloud-db.example .env
# Paste your DATABASE_URL into .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

This same approach works from any PC — useful before you upload to a server.

---

## Option D — Docker (optional, not required)

If you prefer containers:

```powershell
docker compose up -d
Copy-Item .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

---

## Switching from SQLite to PostgreSQL later

When you move to shared hosting or VPS:

1. Set up PostgreSQL (or cloud PostgreSQL)
2. Copy `.env.postgres-native.example` values into production `.env`
3. Run:

```bash
npm run db:generate -w hmail-api
npm run db:migrate
npm run db:seed
```

Your mail data lives on **Hostinger** (IMAP), not in this database — so switching DB only affects tenants, sessions, and users metadata. No email is lost.

---

## Local backup copy

A sibling folder **`Hostnet Panel - Local Test`** and zip **`Hostnet Panel-backup.zip`** can be kept on your Desktop for safe offline testing before upload. Re-run the backup script in `scripts/backup-local.ps1` anytime.
