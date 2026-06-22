import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { resolveDatabaseUrl } from "../src/lib/database-url.js";
import { prisma } from "../src/lib/prisma.js";

config({ path: resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../.env") });
resolveDatabaseUrl();

const sqlPath = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../prisma/migrations/20250622120000_growth_phase_c/migration.sqlite.sql",
);
const sql = readFileSync(sqlPath, "utf8");

for (const statement of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
  await prisma.$executeRawUnsafe(statement);
}

const rows = await prisma.$queryRaw<Array<{ name: string }>>`
  SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Growth%'
`;
console.log("Applied Phase C migration. Growth tables:", rows.map((r) => r.name).sort().join(", "));
await prisma.$disconnect();
