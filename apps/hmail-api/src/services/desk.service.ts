import { prisma } from "../lib/prisma.js";
import { PROGRAM_CHECKLIST_TEMPLATES } from "../data/feature-seeds.js";
import { logComplianceEvent } from "./compliance.service.js";

export async function listClients(tenantId: string) {
  const clients = await prisma.client.findMany({
    where: { tenantId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { _count: { select: { matters: true } } },
  });

  return clients.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    matterCount: c._count.matters,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function createClient(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: { firstName: string; lastName: string; email?: string; phone?: string },
) {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    throw new Error("First and last name are required");
  }

  const client = await prisma.client.create({
    data: {
      tenantId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "client.created",
    entityType: "client",
    entityId: client.id,
  });

  return formatClient(client);
}

export async function listMatters(tenantId: string, search?: string) {
  const matters = await prisma.matter.findMany({
    where: {
      tenantId,
      ...(search
        ? {
            OR: [
              { uci: { contains: search } },
              { title: { contains: search } },
              { client: { lastName: { contains: search } } },
              { client: { firstName: { contains: search } } },
            ],
          }
        : {}),
    },
    include: { client: true },
    orderBy: { updatedAt: "desc" },
  });

  return matters.map(formatMatter);
}

export async function createMatter(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    clientId: string;
    title: string;
    uci?: string;
    program?: string;
    status?: string;
  },
) {
  const client = await prisma.client.findFirst({ where: { id: input.clientId, tenantId } });
  if (!client) throw new Error("Client not found");

  const program = input.program ?? "express_entry";
  const matter = await prisma.matter.create({
    data: {
      tenantId,
      clientId: input.clientId,
      title: input.title.trim(),
      uci: input.uci?.trim() || null,
      program,
      status: input.status ?? "intake",
    },
    include: { client: true },
  });

  const template = PROGRAM_CHECKLIST_TEMPLATES[program] ?? PROGRAM_CHECKLIST_TEMPLATES.express_entry;
  await prisma.matterChecklistItem.createMany({
    data: template.map((item, index) => ({
      matterId: matter.id,
      label: item.label,
      category: item.category,
      sortOrder: index,
    })),
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "matter.created",
    entityType: "matter",
    entityId: matter.id,
    metadata: { program, uci: matter.uci },
  });

  return formatMatter(matter);
}

export async function getMatterChecklist(matterId: string, tenantId: string) {
  const matter = await prisma.matter.findFirst({
    where: { id: matterId, tenantId },
    include: { checklistItems: { orderBy: { sortOrder: "asc" } }, client: true },
  });
  if (!matter) throw new Error("Matter not found");

  return {
    matter: formatMatter(matter),
    items: matter.checklistItems.map((item) => ({
      id: item.id,
      label: item.label,
      category: item.category,
      isComplete: item.isComplete,
      dueDate: item.dueDate?.toISOString() ?? null,
      sortOrder: item.sortOrder,
    })),
  };
}

export async function toggleChecklistItem(
  tenantId: string,
  userId: string,
  userEmail: string,
  matterId: string,
  itemId: string,
  isComplete: boolean,
) {
  const matter = await prisma.matter.findFirst({ where: { id: matterId, tenantId } });
  if (!matter) throw new Error("Matter not found");

  const item = await prisma.matterChecklistItem.findFirst({
    where: { id: itemId, matterId },
  });
  if (!item) throw new Error("Checklist item not found");

  const updated = await prisma.matterChecklistItem.update({
    where: { id: itemId },
    data: { isComplete },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "checklist.item_toggled",
    entityType: "checklist_item",
    entityId: itemId,
    metadata: { isComplete, matterId },
  });

  return {
    id: updated.id,
    isComplete: updated.isComplete,
  };
}

function formatClient(client: {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
}) {
  return {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    phone: client.phone,
    createdAt: client.createdAt.toISOString(),
  };
}

function formatMatter(matter: {
  id: string;
  title: string;
  uci: string | null;
  program: string;
  status: string;
  openedAt: Date;
  client: { firstName: string; lastName: string; email: string | null };
}) {
  return {
    id: matter.id,
    title: matter.title,
    uci: matter.uci,
    program: matter.program,
    status: matter.status,
    openedAt: matter.openedAt.toISOString(),
    clientName: `${matter.client.firstName} ${matter.client.lastName}`,
    clientEmail: matter.client.email,
  };
}
