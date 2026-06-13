import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseUrl } from "../src/lib/database-url.js";

const monorepoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
config({ path: resolve(monorepoRoot, ".env") });
resolveDatabaseUrl();

const apiRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const url = process.env.DATABASE_URL ?? "";
const schema = url.startsWith("file:") ? "prisma/schema.sqlite.prisma" : "prisma/schema.prisma";

console.log(`Prisma generate using ${schema} (DATABASE_URL=${url.startsWith("file:") ? "sqlite" : "postgres"})`);

const result = spawnSync("npx", ["prisma", "generate", `--schema=${schema}`], {
  stdio: "inherit",
  shell: true,
  cwd: apiRoot,
  env: process.env,
});

process.exit(result.status ?? 1);
