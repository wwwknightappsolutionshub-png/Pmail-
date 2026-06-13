import { config } from "dotenv";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const apiRoot = resolve(root, "apps/hmail-api");
config({ path: resolve(root, ".env") });

import { resolveDatabaseUrl } from "../src/lib/database-url.js";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "file:./prisma/test.db";
resolveDatabaseUrl();

process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-characters-long";
process.env.CREDENTIAL_ENCRYPTION_KEY ??= "test-credential-encryption-key-32chars!!";
process.env.CORS_ORIGIN ??= "http://localhost:5173,http://localhost:5174";
process.env.COOKIE_SECURE ??= "false";
process.env.ADMIN_DEFAULT_EMAIL ??= "admin@test.local";
process.env.ADMIN_DEFAULT_PASSWORD ??= "test-admin-pass";

execSync("npx tsx scripts/prisma-cli.ts db push --schema prisma/schema.sqlite.prisma --skip-generate", {
  cwd: apiRoot,
  env: process.env,
  stdio: "ignore",
});
execSync("npx tsx scripts/prisma-cli.ts generate --schema prisma/schema.sqlite.prisma", {
  cwd: apiRoot,
  env: process.env,
  stdio: "ignore",
});
