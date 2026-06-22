import { prisma } from "../lib/prisma.js";

const MAX_STATE_BYTES = 2_000_000;

function assertSessionKey(sessionKey: string): void {
  if (!sessionKey || sessionKey.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(sessionKey)) {
    throw Object.assign(new Error("Invalid demo session header"), { status: 400 });
  }
}

function assertUseCaseId(useCaseId: string): void {
  const allowed = new Set([
    "legal",
    "real-estate",
    "accounting",
    "recruitment",
    "b2b-services",
    "healthcare",
  ]);
  if (!allowed.has(useCaseId)) {
    throw Object.assign(new Error("Unknown use case"), { status: 404 });
  }
}

export async function getBespokeDemoWorkspace(useCaseId: string, sessionKey: string) {
  assertUseCaseId(useCaseId);
  assertSessionKey(sessionKey);

  const row = await prisma.bespokeDemoWorkspace.findUnique({
    where: { useCaseId_sessionKey: { useCaseId, sessionKey } },
  });

  if (!row) return null;

  try {
    return JSON.parse(row.stateJson) as unknown;
  } catch {
    return null;
  }
}

export async function saveBespokeDemoWorkspace(
  useCaseId: string,
  sessionKey: string,
  state: unknown,
): Promise<void> {
  assertUseCaseId(useCaseId);
  assertSessionKey(sessionKey);

  const stateJson = JSON.stringify(state);
  if (stateJson.length > MAX_STATE_BYTES) {
    throw Object.assign(new Error("Demo workspace payload too large"), { status: 413 });
  }

  await prisma.bespokeDemoWorkspace.upsert({
    where: { useCaseId_sessionKey: { useCaseId, sessionKey } },
    create: { useCaseId, sessionKey, stateJson },
    update: { stateJson },
  });
}
