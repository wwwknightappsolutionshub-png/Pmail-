import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseUrl } from "../src/lib/database-url.js";

const monorepoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
config({ path: resolve(monorepoRoot, ".env") });
resolveDatabaseUrl();

const args = process.argv.slice(2);
const result = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  shell: true,
  env: process.env,
  cwd: resolve(fileURLToPath(new URL(".", import.meta.url)), ".."),
});

process.exit(result.status ?? 1);
