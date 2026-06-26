import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

function schemaDriftMessage(code: "P2021" | "P2022"): string {
  const isSqlite = (process.env.DATABASE_URL ?? "").startsWith("file:");
  if (isSqlite) {
    return code === "P2022"
      ? "Local database schema is out of date. From the project root run: npm run db:local:sync, then restart the API (npm run dev)."
      : "Local database is missing tables. From the project root run: npm run setup:sqlite, then restart the API.";
  }
  return code === "P2022"
    ? "Database schema is missing columns for this feature. On the server run: npm run db:migrate -w hmail-api, then restart the API."
    : "Database schema is missing tables for this feature. From apps/hmail-api run: npm run db:sqlite:setup (SQLite dev) or npm run db:migrate (PostgreSQL).";
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {  console.error(err);

  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", details: err.flatten() });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2022")) {
    res.status(503).json({ error: schemaDriftMessage(err.code) });
    return;
  }
  if (err instanceof Error && err.message.includes("database schema is out of date")) {
    res.status(503).json({ error: err.message });
    return;
  }

  if (err instanceof Error && err.name === "AuthError") {
    res.status(401).json({ error: err.message });
    return;
  }

  if (err instanceof Error && err.message.includes("Invalid credentials")) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
}
