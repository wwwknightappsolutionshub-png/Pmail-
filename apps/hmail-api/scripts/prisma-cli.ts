import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseUrl } from "../src/lib/database-url.js";

const monorepoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
config({ path: resolve(monorepoRoot, ".env") });
resolveDatabaseUrl();

const url = process.env.DATABASE_URL ?? "";
const defaultSchema = url.startsWith("file:") ? "prisma/schema.sqlite.prisma" : "prisma/schema.prisma";

const args = process.argv.slice(2);
const hasSchema = args.some((a) => a === "--schema" || a.startsWith("--schema="));
const prismaArgs = hasSchema ? args : ["--schema", defaultSchema, ...args];

const result = spawnSync("npx", ["prisma", ...prismaArgs], {
  stdio: "inherit",
  shell: true,
  env: process.env,
  cwd: resolve(fileURLToPath(new URL(".", import.meta.url)), ".."),
});

process.exit(result.status ?? 1);
