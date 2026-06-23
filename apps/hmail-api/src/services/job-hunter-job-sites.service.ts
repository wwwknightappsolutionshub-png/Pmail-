import { prisma } from "../lib/prisma.js";

function serializeJobSiteLink(row: {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    label: row.label,
    url: row.url,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("URL must start with http:// or https://");
  }
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname) {
      throw new Error("Invalid URL");
    }
    return parsed.toString();
  } catch {
    throw new Error("Invalid URL");
  }
}

export async function listJobSiteLinks(userId: string) {
  const rows = await prisma.userJobSiteLink.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(serializeJobSiteLink);
}

export async function createJobSiteLink(
  userId: string,
  input: { label: string; url: string; sortOrder?: number },
) {
  const label = input.label.trim();
  if (!label) {
    throw new Error("Label is required");
  }
  const url = normalizeUrl(input.url);

  const maxSort = await prisma.userJobSiteLink.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });
  const sortOrder = input.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1;

  const row = await prisma.userJobSiteLink.create({
    data: {
      userId,
      label,
      url,
      sortOrder,
    },
  });
  return serializeJobSiteLink(row);
}

export async function updateJobSiteLink(
  userId: string,
  id: string,
  input: { label?: string; url?: string; sortOrder?: number },
) {
  const existing = await prisma.userJobSiteLink.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const row = await prisma.userJobSiteLink.update({
    where: { id },
    data: {
      ...(input.label !== undefined ? { label: input.label.trim() } : {}),
      ...(input.url !== undefined ? { url: normalizeUrl(input.url) } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
  return serializeJobSiteLink(row);
}

export async function deleteJobSiteLink(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.userJobSiteLink.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.userJobSiteLink.delete({ where: { id } });
  return true;
}
