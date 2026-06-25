import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseUrl } from "../src/lib/database-url.js";

const monorepoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const apiRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(monorepoRoot, ".env") });
resolveDatabaseUrl();

const url = process.env.DATABASE_URL ?? "";
const defaultSchema = url.startsWith("file:") ? "prisma/schema.sqlite.prisma" : "prisma/schema.prisma";

const args = process.argv.slice(2);
const hasSchema = args.some((a) => a === "--schema" || a.startsWith("--schema="));
// Prisma expects --schema after the subcommand (e.g. `migrate deploy --schema …`), not before it.
const prismaArgs = hasSchema ? args : [...args, "--schema", defaultSchema];

const prismaBin = resolve(monorepoRoot, "node_modules/prisma/build/index.js");

const result = spawnSync(process.execPath, [prismaBin, ...prismaArgs], {
  stdio: "inherit",
  env: process.env,
  cwd: apiRoot,
});

process.exit(result.status ?? 1);
