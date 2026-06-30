import type { Prisma, User } from "@prisma/client";
import { hashToken } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";

export const PRESENCE_ONLINE_WINDOW_MS = 5 * 60 * 1000;
const PRESENCE_TOUCH_THROTTLE_MS = 30 * 1000;

const touchThrottle = new Map<string, number>();

function onlineSinceDate(): Date {
  return new Date(Date.now() - PRESENCE_ONLINE_WINDOW_MS);
}

export function activeSessionWhere(): Prisma.SessionWhereInput {
  const now = new Date();
  return {
    expiresAt: { gt: now },
    lastActiveAt: { gt: onlineSinceDate() },
  };
}

export type UserPresenceSnapshot = {
  isOnline: boolean;
  activeSessionCount: number;
  lastActiveAt: string | null;
};

export type AdminMailUserSessionRecord = {
  id: string;
  userId: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  isOnline: boolean;
  user: {
    email: string;
    displayName: string | null;
    tenant: { id: string; slug: string; name: string };
  } | null;
};

export type AdminMailUserRecord = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  tenant: {
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
  };
  presence: UserPresenceSnapshot;
};

function emptyPresence(): UserPresenceSnapshot {
  return { isOnline: false, activeSessionCount: 0, lastActiveAt: null };
}

function serializeSessionRecord(session: {
  id: string;
  userId: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  user?: {
    email: string;
    displayName: string | null;
    tenant: { id: string; slug: string; name: string };
  } | null;
}): AdminMailUserSessionRecord {
  const now = Date.now();
  const isOnline =
    session.expiresAt.getTime() > now &&
    session.lastActiveAt.getTime() > now - PRESENCE_ONLINE_WINDOW_MS;

  return {
    id: session.id,
    userId: session.userId,
    createdAt: session.createdAt.toISOString(),
    lastActiveAt: session.lastActiveAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    isOnline,
    user: session.user ?? null,
  };
}

export async function touchSessionPresence(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  const nowMs = Date.now();
  const lastTouch = touchThrottle.get(tokenHash);
  if (lastTouch && nowMs - lastTouch < PRESENCE_TOUCH_THROTTLE_MS) {
    return null;
  }
  touchThrottle.set(tokenHash, nowMs);

  const activeAt = new Date();
  const updated = await prisma.session.updateMany({
    where: {
      tokenHash,
      expiresAt: { gt: activeAt },
    },
    data: { lastActiveAt: activeAt },
  });

  if (updated.count === 0) return null;
  return activeAt.toISOString();
}

export async function getPresenceMapForUserIds(userIds: string[]): Promise<Map<string, UserPresenceSnapshot>> {
  const map = new Map<string, UserPresenceSnapshot>();
  if (userIds.length === 0) return map;

  for (const userId of userIds) {
    map.set(userId, emptyPresence());
  }

  const now = new Date();
  const sessions = await prisma.session.findMany({
    where: {
      userId: { in: userIds },
      expiresAt: { gt: now },
    },
    select: {
      userId: true,
      lastActiveAt: true,
    },
  });

  for (const session of sessions) {
    const current = map.get(session.userId) ?? emptyPresence();
    const lastActiveAtMs = session.lastActiveAt.getTime();
    const currentLastMs = current.lastActiveAt ? Date.parse(current.lastActiveAt) : 0;
    const isOnline = lastActiveAtMs > now.getTime() - PRESENCE_ONLINE_WINDOW_MS;

    map.set(session.userId, {
      activeSessionCount: current.activeSessionCount + 1,
      isOnline: current.isOnline || isOnline,
      lastActiveAt:
        lastActiveAtMs > currentLastMs ? session.lastActiveAt.toISOString() : current.lastActiveAt,
    });
  }

  return map;
}

export function clearPresenceTouchThrottle(): void {
  touchThrottle.clear();
}

export async function getMailUserPresenceStats() {
  const now = new Date();
  const onlineSessions = await prisma.session.findMany({
    where: activeSessionWhere(),
    select: { userId: true },
  });
  const onlineUserIds = new Set(onlineSessions.map((row) => row.userId));

  const [totalUsers, activeUsers, activeSessions] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.session.count({ where: activeSessionWhere() }),
  ]);

  return {
    totalUsers,
    activeUsers,
    onlineNow: onlineUserIds.size,
    activeSessions,
    onlineWindowMinutes: PRESENCE_ONLINE_WINDOW_MS / 60_000,
    asOf: now.toISOString(),
  };
}

function serializeMailUserRecord(
  user: User & { tenant: { id: string; slug: string; name: string; isActive: boolean } },
  presence: UserPresenceSnapshot,
): AdminMailUserRecord {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    tenant: user.tenant,
    presence,
  };
}

export async function listGlobalMailUsers(input: {
  q?: string;
  tenantId?: string;
  onlineOnly?: boolean;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(200, Math.max(1, input.limit ?? 50));
  const skip = (page - 1) * limit;
  const q = input.q?.trim();

  const where: Prisma.UserWhereInput = {
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q } },
            { displayName: { contains: q } },
            { tenant: { name: { contains: q } } },
            { tenant: { slug: { contains: q } } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        tenant: { select: { id: true, slug: true, name: true, isActive: true } },
      },
      orderBy: [{ lastLoginAt: "desc" }, { email: "asc" }],
      skip,
      take: limit,
    }),
  ]);

  const presenceMap = await getPresenceMapForUserIds(users.map((user) => user.id));
  let records = users.map((user) =>
    serializeMailUserRecord(user, presenceMap.get(user.id) ?? emptyPresence()),
  );

  if (input.onlineOnly) {
    records = records.filter((user) => user.presence.isOnline);
  }

  return {
    users: records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function listOnlineMailUsers() {
  const now = new Date();
  const sessions = await prisma.session.findMany({
    where: activeSessionWhere(),
    select: { userId: true },
    distinct: ["userId"],
  });
  const userIds = sessions.map((row) => row.userId);
  if (userIds.length === 0) {
    return { users: [] as AdminMailUserRecord[], asOf: now.toISOString() };
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: {
      tenant: { select: { id: true, slug: true, name: true, isActive: true } },
    },
    orderBy: [{ lastLoginAt: "desc" }, { email: "asc" }],
  });

  const presenceMap = await getPresenceMapForUserIds(userIds);
  return {
    users: users
      .map((user) => serializeMailUserRecord(user, presenceMap.get(user.id) ?? emptyPresence()))
      .filter((user) => user.presence.isOnline),
    asOf: now.toISOString(),
  };
}

export async function listActiveMailUserSessions(input?: { userId?: string; limit?: number }) {
  const limit = Math.min(500, Math.max(1, input?.limit ?? 100));
  const sessions = await prisma.session.findMany({
    where: {
      ...(input?.userId ? { userId: input.userId } : {}),
      expiresAt: { gt: new Date() },
    },
    orderBy: [{ lastActiveAt: "desc" }],
    take: limit,
    select: {
      id: true,
      userId: true,
      createdAt: true,
      lastActiveAt: true,
      expiresAt: true,
      ipAddress: true,
      userAgent: true,
      user: {
        select: {
          email: true,
          displayName: true,
          tenant: { select: { id: true, slug: true, name: true } },
        },
      },
    },
  });

  return {
    sessions: sessions.map(serializeSessionRecord),
    asOf: new Date().toISOString(),
  };
}

export async function listMailUserSessions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return null;

  const result = await listActiveMailUserSessions({ userId, limit: 50 });
  return result;
}
