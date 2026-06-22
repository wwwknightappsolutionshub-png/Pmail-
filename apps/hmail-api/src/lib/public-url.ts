import type { Request } from "express";
import { getEnv } from "../config/env.js";

export function getPublicApiBaseUrl(req?: Request): string {
  const env = getEnv();
  if (env.PUBLIC_API_URL) {
    return env.PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (req) {
    return `${req.protocol}://${req.get("host") ?? `localhost:${env.API_PORT}`}`;
  }
  return `http://localhost:${env.API_PORT}`;
}
