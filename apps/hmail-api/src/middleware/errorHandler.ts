import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { toClientError } from "../lib/client-error.js";
import { classifyMailAuthError } from "../lib/mail-auth-errors.js";

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

function isMailTransportError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message;
  return (
    /Failed to establish connection in required time/i.test(message) ||
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH|ECONNRESET/i.test(message) ||
    /authentication failed|invalid credentials|LOGIN failed|Command failed/i.test(message) ||
    /certificate|SSL|TLS|self[- ]signed/i.test(message)
  );
}

function mailTransportClientMessage(err: unknown): string {
  const kind = classifyMailAuthError(err);
  if (kind === "network") {
    return "Could not reach your mail server (IMAP). Please try again in a moment. If this continues, check the mailbox IMAP host/DNS with your provider.";
  }
  if (kind === "tls") {
    return "Secure connection to your mail server failed (IMAP). Confirm IMAP host and port with your provider.";
  }
  if (kind === "auth") {
    return "Mail server rejected the mailbox login. Re-enter the mailbox password or App Password.";
  }
  return "Mail server request failed. Please try again.";
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", details: err.flatten() });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2022")) {
    res.status(503).json({ error: schemaDriftMessage(err.code), code: "schema_out_of_date" });
    return;
  }

  const clientError = toClientError(err);
  if (clientError.code === "database_unavailable" || clientError.status === 503) {
    res.status(clientError.status).json({ error: clientError.message, code: clientError.code });
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

  if (isMailTransportError(err)) {
    res.status(502).json({ error: mailTransportClientMessage(err) });
    return;
  }

  // Honor explicit status on thrown errors (e.g. Unknown use case → 404).
  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status;
    if (typeof status === "number" && status >= 400 && status < 600) {
      res.status(status).json({ error: err.message });
      return;
    }
  }

  res.status(500).json({ error: "Internal server error" });
}
