import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

/**
 * Resolve relative SQLite paths against apps/hmail-api so cwd does not matter.
 */
export function resolveDatabaseUrl(): void {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:")) return;

  const filePath = url.slice("file:".length);
  const isAbsolute = filePath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(filePath);
  if (isAbsolute) return;

  const normalized = filePath.replace(/^\.\//, "");
  process.env.DATABASE_URL = `file:${resolve(apiRoot, normalized)}`;
}
