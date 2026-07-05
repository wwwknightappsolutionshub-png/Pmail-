import { getEnv } from "../config/env.js";

/** First public web origin from CORS_ORIGIN (typically the PMail web app). */
export function getPrimaryWebOrigin(): string {
  const env = getEnv();
  return env.CORS_ORIGIN.split(",")[0]?.trim() || "http://localhost:5173";
}
