import type { NextFunction, Request, Response } from "express";
import { getEnv } from "../config/env.js";

const LOG_REQUESTS = process.env.LOG_REQUESTS !== "false";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  if (!LOG_REQUESTS || getEnv().NODE_ENV === "test") {
    next();
    return;
  }

  const start = Date.now();
  res.on("finish", () => {
    const entry = {
      ts: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - start,
    };
    if (res.statusCode >= 500) {
      console.error(JSON.stringify({ level: "error", ...entry }));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify({ level: "warn", ...entry }));
    } else {
      console.info(JSON.stringify({ level: "info", ...entry }));
    }
  });
  next();
}
