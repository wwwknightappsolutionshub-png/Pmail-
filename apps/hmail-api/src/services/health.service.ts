import { prisma } from "../lib/prisma.js";
import { getEnv } from "../config/env.js";

const startedAt = Date.now();

export async function getLiveness() {
  return {
    status: "ok" as const,
    product: "hostnet-platform-api",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    nodeEnv: getEnv().NODE_ENV,
    modules: [
      "hmail",
      "landing-cms",
      "hosting",
      "panel",
      "vps",
      "platform-admin",
      "payments",
      "bespoke-demo",
      "billing-lifecycle",
    ],
  };
}

export async function getReadiness() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (err) {
    checks.database = {
      ok: false,
      detail: err instanceof Error ? err.message : "Database unreachable",
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return {
    status: allOk ? ("ready" as const) : ("degraded" as const),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    checks,
  };
}
