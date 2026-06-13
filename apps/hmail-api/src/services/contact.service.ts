import { prisma } from "../lib/prisma.js";

export class ContactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function serializeContact(contact: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: contact.id,
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    phone: contact.phone,
    company: contact.company,
    notes: contact.notes,
    displayName:
      [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || contact.email,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

export async function listContacts(userId: string) {
  const contacts = await prisma.mailContact.findMany({
    where: { userId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { email: "asc" }],
  });
  return contacts.map(serializeContact);
}

export async function createContact(
  userId: string,
  input: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    company?: string | null;
    notes?: string | null;
  },
) {
  const email = normalizeEmail(input.email);
  if (!email.includes("@")) throw new ContactError("Valid email is required");

  const contact = await prisma.mailContact.create({
    data: {
      userId,
      email,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      phone: input.phone?.trim() || null,
      company: input.company?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
  return serializeContact(contact);
}

export async function updateContact(
  userId: string,
  contactId: string,
  input: Partial<{
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    company: string | null;
    notes: string | null;
  }>,
) {
  const existing = await prisma.mailContact.findFirst({ where: { id: contactId, userId } });
  if (!existing) throw new ContactError("Contact not found");

  const contact = await prisma.mailContact.update({
    where: { id: contactId },
    data: {
      ...(input.email !== undefined ? { email: normalizeEmail(input.email) } : {}),
      ...(input.firstName !== undefined ? { firstName: input.firstName?.trim() || null } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName?.trim() || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      ...(input.company !== undefined ? { company: input.company?.trim() || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
    },
  });
  return serializeContact(contact);
}

export async function deleteContact(userId: string, contactId: string) {
  const existing = await prisma.mailContact.findFirst({ where: { id: contactId, userId } });
  if (!existing) throw new ContactError("Contact not found");
  await prisma.mailContact.delete({ where: { id: contactId } });
}

export async function listContactLists(userId: string) {
  const lists = await prisma.mailContactList.findMany({
    where: { userId },
    include: {
      members: { include: { contact: true } },
    },
    orderBy: { name: "asc" },
  });
  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    description: list.description,
    memberCount: list.members.length,
    contacts: list.members.map((m) => serializeContact(m.contact)),
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  }));
}

export async function createContactList(
  userId: string,
  input: { name: string; description?: string | null },
) {
  const name = input.name.trim();
  if (!name) throw new ContactError("List name is required");
  const list = await prisma.mailContactList.create({
    data: {
      userId,
      name,
      description: input.description?.trim() || null,
    },
  });
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    memberCount: 0,
    contacts: [],
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  };
}

export async function updateContactList(
  userId: string,
  listId: string,
  input: Partial<{ name: string; description: string | null }>,
) {
  const existing = await prisma.mailContactList.findFirst({ where: { id: listId, userId } });
  if (!existing) throw new ContactError("Contact list not found");

  const list = await prisma.mailContactList.update({
    where: { id: listId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    },
    include: { members: { include: { contact: true } } },
  });
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    memberCount: list.members.length,
    contacts: list.members.map((m) => serializeContact(m.contact)),
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  };
}

export async function deleteContactList(userId: string, listId: string) {
  const existing = await prisma.mailContactList.findFirst({ where: { id: listId, userId } });
  if (!existing) throw new ContactError("Contact list not found");
  await prisma.mailContactList.delete({ where: { id: listId } });
}

export async function addContactToList(userId: string, listId: string, contactId: string) {
  const list = await prisma.mailContactList.findFirst({ where: { id: listId, userId } });
  if (!list) throw new ContactError("Contact list not found");
  const contact = await prisma.mailContact.findFirst({ where: { id: contactId, userId } });
  if (!contact) throw new ContactError("Contact not found");

  await prisma.mailContactListMember.upsert({
    where: { listId_contactId: { listId, contactId } },
    create: { listId, contactId },
    update: {},
  });
}

export async function removeContactFromList(userId: string, listId: string, contactId: string) {
  const list = await prisma.mailContactList.findFirst({ where: { id: listId, userId } });
  if (!list) throw new ContactError("Contact list not found");
  await prisma.mailContactListMember.deleteMany({ where: { listId, contactId } });
}

export async function listContactGroups(userId: string) {
  const groups = await prisma.mailContactGroup.findMany({
    where: { userId },
    include: {
      members: { include: { contact: true } },
    },
    orderBy: { name: "asc" },
  });
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    memberCount: group.members.length,
    contacts: group.members.map((m) => serializeContact(m.contact)),
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  }));
}

export async function createContactGroup(
  userId: string,
  input: { name: string; description?: string | null },
) {
  const name = input.name.trim();
  if (!name) throw new ContactError("Group name is required");
  const group = await prisma.mailContactGroup.create({
    data: {
      userId,
      name,
      description: input.description?.trim() || null,
    },
  });
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    memberCount: 0,
    contacts: [],
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

export async function updateContactGroup(
  userId: string,
  groupId: string,
  input: Partial<{ name: string; description: string | null }>,
) {
  const existing = await prisma.mailContactGroup.findFirst({ where: { id: groupId, userId } });
  if (!existing) throw new ContactError("Contact group not found");

  const group = await prisma.mailContactGroup.update({
    where: { id: groupId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    },
    include: { members: { include: { contact: true } } },
  });
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    memberCount: group.members.length,
    contacts: group.members.map((m) => serializeContact(m.contact)),
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

export async function deleteContactGroup(userId: string, groupId: string) {
  const existing = await prisma.mailContactGroup.findFirst({ where: { id: groupId, userId } });
  if (!existing) throw new ContactError("Contact group not found");
  await prisma.mailContactGroup.delete({ where: { id: groupId } });
}

export async function addContactToGroup(userId: string, groupId: string, contactId: string) {
  const group = await prisma.mailContactGroup.findFirst({ where: { id: groupId, userId } });
  if (!group) throw new ContactError("Contact group not found");
  const contact = await prisma.mailContact.findFirst({ where: { id: contactId, userId } });
  if (!contact) throw new ContactError("Contact not found");

  await prisma.mailContactGroupMember.upsert({
    where: { groupId_contactId: { groupId, contactId } },
    create: { groupId, contactId },
    update: {},
  });
}

export async function removeContactFromGroup(userId: string, groupId: string, contactId: string) {
  const group = await prisma.mailContactGroup.findFirst({ where: { id: groupId, userId } });
  if (!group) throw new ContactError("Contact group not found");
  await prisma.mailContactGroupMember.deleteMany({ where: { groupId, contactId } });
}

/** Returns sender emails from inbox that are not yet saved as contacts */
export async function suggestContactsFromEmails(userId: string, emails: string[]) {
  const normalized = [...new Set(emails.map(normalizeEmail).filter((e) => e.includes("@")))];
  if (normalized.length === 0) return [];

  const existing = await prisma.mailContact.findMany({
    where: { userId, email: { in: normalized } },
    select: { email: true },
  });
  const known = new Set(existing.map((c) => c.email));
  return normalized.filter((email) => !known.has(email));
}
