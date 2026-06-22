import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", details: err.flatten() });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2021") {
    res.status(503).json({
      error:
        "Database schema is missing tables for this feature. From apps/hmail-api run: npm run db:sqlite:setup (SQLite dev) or npm run db:migrate (PostgreSQL).",
    });
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
