import { prisma } from "../lib/prisma.js";
import { ensureAutoReplyComplimentary, getAutoReplyEntitlement } from "./auto-reply-entitlement.service.js";

export async function getComposeSettingsByUserId(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true, businessVertical: true },
  });
  if (!user) throw new Error("User not found");
  return getComposeSettings(userId, user.tenantId, user.businessVertical);
}

export async function getComposeSettings(userId: string, tenantId: string, businessVertical?: string | null) {
  await ensureAutoReplyComplimentary(userId, businessVertical ?? null);

  const [settings, signatures, autoReplies, autoReplyEntitlement] = await Promise.all([
    prisma.userComposeSettings.findUnique({ where: { userId } }),
    prisma.userSignature.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.userAutoReply.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    getAutoReplyEntitlement(userId, tenantId),
  ]);

  return {
    displayName: settings?.displayName ?? null,
    autoReplyEnabled: autoReplyEntitlement.entitled ? (settings?.autoReplyEnabled ?? true) : false,
    activeSignatureId: settings?.activeSignatureId ?? signatures[0]?.id ?? null,
    activeAutoReplyId: settings?.activeAutoReplyId ?? autoReplies[0]?.id ?? null,
    signatures,
    autoReplies,
    autoReplyEntitlement,
  };
}

export async function updateComposeSettings(
  userId: string,
  tenantId: string,
  input: Partial<{
    displayName: string;
    autoReplyEnabled: boolean;
    activeSignatureId: string;
    activeAutoReplyId: string;
  }>,
) {
  if (input.autoReplyEnabled === true || input.activeAutoReplyId) {
    const entitlement = await getAutoReplyEntitlement(userId, tenantId);
    if (!entitlement.entitled) {
      throw new Error("Auto Reply requires an active subscription after the complimentary period ends");
    }
  }

  return prisma.userComposeSettings.upsert({
    where: { userId },
    create: {
      userId,
      displayName: input.displayName?.trim() || null,
      autoReplyEnabled: input.autoReplyEnabled ?? false,
      activeSignatureId: input.activeSignatureId || null,
      activeAutoReplyId: input.activeAutoReplyId || null,
    },
    update: {
      displayName: input.displayName?.trim() ?? undefined,
      autoReplyEnabled: input.autoReplyEnabled ?? undefined,
      activeSignatureId: input.activeSignatureId ?? undefined,
      activeAutoReplyId: input.activeAutoReplyId ?? undefined,
    },
  });
}

export async function createSignature(
  userId: string,
  input: { name: string; body: string; avatarUrl?: string; isDefault?: boolean },
) {
  if (!input.name.trim() || !input.body.trim()) throw new Error("Name and body are required");
  if (input.isDefault) {
    await prisma.userSignature.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.userSignature.create({
    data: {
      userId,
      name: input.name.trim(),
      body: input.body,
      avatarUrl: input.avatarUrl || null,
      isDefault: input.isDefault ?? false,
    },
  });
}

export async function updateSignature(
  userId: string,
  id: string,
  input: Partial<{ name: string; body: string; avatarUrl: string; isDefault: boolean }>,
) {
  const row = await prisma.userSignature.findFirst({ where: { id, userId } });
  if (!row) throw new Error("Signature not found");
  if (input.isDefault) {
    await prisma.userSignature.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.userSignature.update({
    where: { id },
    data: {
      name: input.name?.trim() ?? undefined,
      body: input.body ?? undefined,
      avatarUrl: input.avatarUrl ?? undefined,
      isDefault: input.isDefault ?? undefined,
    },
  });
}

export async function deleteSignature(userId: string, id: string) {
  const row = await prisma.userSignature.findFirst({ where: { id, userId } });
  if (!row) throw new Error("Signature not found");
  await prisma.userSignature.delete({ where: { id } });
}

async function assertAutoReplyEntitled(userId: string, tenantId: string) {
  const entitlement = await getAutoReplyEntitlement(userId, tenantId);
  if (!entitlement.entitled) {
    throw new Error("Auto Reply requires an active subscription after the complimentary period ends");
  }
}

export async function createAutoReply(
  userId: string,
  tenantId: string,
  input: { name: string; subject: string; body: string; enabled?: boolean },
) {
  await assertAutoReplyEntitled(userId, tenantId);
  if (!input.name.trim() || !input.subject.trim()) throw new Error("Name and subject are required");
  return prisma.userAutoReply.create({
    data: {
      userId,
      name: input.name.trim(),
      subject: input.subject.trim(),
      body: input.body,
      enabled: input.enabled ?? false,
    },
  });
}

export async function updateAutoReply(
  userId: string,
  tenantId: string,
  id: string,
  input: Partial<{ name: string; subject: string; body: string; enabled: boolean }>,
) {
  await assertAutoReplyEntitled(userId, tenantId);
  const row = await prisma.userAutoReply.findFirst({ where: { id, userId } });
  if (!row) throw new Error("Auto-reply not found");
  return prisma.userAutoReply.update({
    where: { id },
    data: {
      name: input.name?.trim() ?? undefined,
      subject: input.subject?.trim() ?? undefined,
      body: input.body ?? undefined,
      enabled: input.enabled ?? undefined,
    },
  });
}

export async function deleteAutoReply(userId: string, tenantId: string, id: string) {
  await assertAutoReplyEntitled(userId, tenantId);
  const row = await prisma.userAutoReply.findFirst({ where: { id, userId } });
  if (!row) throw new Error("Auto-reply not found");
  await prisma.userAutoReply.delete({ where: { id } });
}
