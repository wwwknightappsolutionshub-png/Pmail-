import { prisma } from "../lib/prisma.js";
import { logComplianceEvent } from "./compliance.service.js";

const LISTING_STATUSES = new Set(["active", "pending", "sold", "withdrawn"]);
const SHOWING_STATUSES = new Set(["scheduled", "completed", "cancelled", "no_show"]);
const DEAL_STATUSES = new Set(["offer", "negotiation", "accepted", "closed", "fallen_through"]);
const CONTACT_ROLES = new Set(["buyer", "seller", "agent"]);

export async function listReContacts(tenantId: string, role?: string) {
  const contacts = await prisma.reContact.findMany({
    where: {
      tenantId,
      ...(role ? { role } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return contacts.map(formatContact);
}

export async function createReContact(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: { firstName: string; lastName: string; email?: string; phone?: string; role?: string },
) {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    throw new Error("First and last name are required");
  }
  const role = input.role ?? "buyer";
  if (!CONTACT_ROLES.has(role)) throw new Error("Invalid contact role");

  const contact = await prisma.reContact.create({
    data: {
      tenantId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      role,
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "re_contact.created",
    entityType: "re_contact",
    entityId: contact.id,
    metadata: { role },
  });

  return formatContact(contact);
}

export async function listReListings(tenantId: string, status?: string) {
  const listings = await prisma.reListing.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      sellerContact: true,
      assignedAgent: { select: { id: true, email: true, displayName: true } },
      _count: { select: { showings: true, deals: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return listings.map(formatListing);
}

export async function createReListing(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    address: string;
    city: string;
    province?: string;
    postalCode?: string;
    mlsNumber?: string;
    listPriceCents?: number;
    status?: string;
    assignedUserId?: string;
    sellerContactId?: string;
  },
) {
  if (!input.address.trim() || !input.city.trim()) {
    throw new Error("Address and city are required");
  }
  const status = input.status ?? "active";
  if (!LISTING_STATUSES.has(status)) throw new Error("Invalid listing status");

  if (input.sellerContactId) {
    const seller = await prisma.reContact.findFirst({
      where: { id: input.sellerContactId, tenantId },
    });
    if (!seller) throw new Error("Seller contact not found");
  }

  const listing = await prisma.reListing.create({
    data: {
      tenantId,
      address: input.address.trim(),
      city: input.city.trim(),
      province: input.province?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      mlsNumber: input.mlsNumber?.trim() || null,
      listPriceCents: input.listPriceCents ?? null,
      status,
      assignedUserId: input.assignedUserId || userId,
      sellerContactId: input.sellerContactId || null,
    },
    include: {
      sellerContact: true,
      assignedAgent: { select: { id: true, email: true, displayName: true } },
      _count: { select: { showings: true, deals: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "re_listing.created",
    entityType: "re_listing",
    entityId: listing.id,
    metadata: { mlsNumber: listing.mlsNumber, status },
  });

  return formatListing(listing);
}

export async function updateReListingStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  listingId: string,
  status: string,
) {
  if (!LISTING_STATUSES.has(status)) throw new Error("Invalid listing status");

  const existing = await prisma.reListing.findFirst({ where: { id: listingId, tenantId } });
  if (!existing) throw new Error("Listing not found");

  const listing = await prisma.reListing.update({
    where: { id: listingId },
    data: { status },
    include: {
      sellerContact: true,
      assignedAgent: { select: { id: true, email: true, displayName: true } },
      _count: { select: { showings: true, deals: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "re_listing.status_updated",
    entityType: "re_listing",
    entityId: listingId,
    metadata: { status },
  });

  return formatListing(listing);
}

export async function listReShowings(tenantId: string, status?: string) {
  const showings = await prisma.reShowing.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      listing: true,
      contact: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  return showings.map(formatShowing);
}

export async function createReShowing(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    listingId: string;
    contactId?: string;
    contact?: { firstName: string; lastName: string; email?: string; phone?: string };
    scheduledAt: string;
    notes?: string;
  },
) {
  const listing = await prisma.reListing.findFirst({
    where: { id: input.listingId, tenantId },
  });
  if (!listing) throw new Error("Listing not found");

  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid scheduled date");
  if (scheduledAt.getTime() <= Date.now()) throw new Error("Showing must be scheduled in the future");

  let contactId = input.contactId;
  if (!contactId) {
    if (!input.contact?.firstName?.trim() || !input.contact?.lastName?.trim()) {
      throw new Error("Contact ID or contact name is required");
    }
    const created = await createReContact(tenantId, userId, userEmail, {
      firstName: input.contact.firstName,
      lastName: input.contact.lastName,
      email: input.contact.email,
      phone: input.contact.phone,
      role: "buyer",
    });
    contactId = created.id;
  } else {
    const contact = await prisma.reContact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) throw new Error("Contact not found");
  }

  const showing = await prisma.reShowing.create({
    data: {
      tenantId,
      listingId: input.listingId,
      contactId,
      scheduledAt,
      notes: input.notes?.trim() || null,
      status: "scheduled",
    },
    include: { listing: true, contact: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "re_showing.created",
    entityType: "re_showing",
    entityId: showing.id,
    metadata: { listingId: input.listingId, scheduledAt: scheduledAt.toISOString() },
  });

  return formatShowing(showing);
}

export async function updateReShowingStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  showingId: string,
  status: string,
) {
  if (!SHOWING_STATUSES.has(status)) throw new Error("Invalid showing status");

  const existing = await prisma.reShowing.findFirst({ where: { id: showingId, tenantId } });
  if (!existing) throw new Error("Showing not found");

  const showing = await prisma.reShowing.update({
    where: { id: showingId },
    data: { status },
    include: { listing: true, contact: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "re_showing.status_updated",
    entityType: "re_showing",
    entityId: showingId,
    metadata: { status },
  });

  return formatShowing(showing);
}

export async function listReDeals(tenantId: string, status?: string) {
  const deals = await prisma.reDeal.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      listing: true,
      buyerContact: true,
      _count: { select: { notes: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return deals.map(formatDeal);
}

export async function createReDeal(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    listingId: string;
    title: string;
    status?: string;
    offerAmountCents?: number;
    buyerContactId?: string;
  },
) {
  const listing = await prisma.reListing.findFirst({
    where: { id: input.listingId, tenantId },
  });
  if (!listing) throw new Error("Listing not found");
  if (!input.title.trim()) throw new Error("Deal title is required");

  const status = input.status ?? "offer";
  if (!DEAL_STATUSES.has(status)) throw new Error("Invalid deal status");

  if (input.buyerContactId) {
    const buyer = await prisma.reContact.findFirst({
      where: { id: input.buyerContactId, tenantId },
    });
    if (!buyer) throw new Error("Buyer contact not found");
  }

  const deal = await prisma.reDeal.create({
    data: {
      tenantId,
      listingId: input.listingId,
      title: input.title.trim(),
      status,
      offerAmountCents: input.offerAmountCents ?? null,
      buyerContactId: input.buyerContactId || null,
    },
    include: {
      listing: true,
      buyerContact: true,
      _count: { select: { notes: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "re_deal.created",
    entityType: "re_deal",
    entityId: deal.id,
    metadata: { listingId: input.listingId, status },
  });

  return formatDeal(deal);
}

export async function updateReDealStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  dealId: string,
  status: string,
) {
  if (!DEAL_STATUSES.has(status)) throw new Error("Invalid deal status");

  const existing = await prisma.reDeal.findFirst({ where: { id: dealId, tenantId } });
  if (!existing) throw new Error("Deal not found");

  const deal = await prisma.reDeal.update({
    where: { id: dealId },
    data: { status },
    include: {
      listing: true,
      buyerContact: true,
      _count: { select: { notes: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "re_deal.status_updated",
    entityType: "re_deal",
    entityId: dealId,
    metadata: { status },
  });

  return formatDeal(deal);
}

export async function listReDealNotes(tenantId: string, dealId: string) {
  const deal = await prisma.reDeal.findFirst({ where: { id: dealId, tenantId } });
  if (!deal) throw new Error("Deal not found");

  const notes = await prisma.reDealNote.findMany({
    where: { dealId },
    include: { user: { select: { id: true, email: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return notes.map((n) => ({
    id: n.id,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
    author: {
      id: n.user.id,
      email: n.user.email,
      displayName: n.user.displayName,
    },
  }));
}

export async function createReDealNote(
  tenantId: string,
  userId: string,
  userEmail: string,
  dealId: string,
  body: string,
) {
  const deal = await prisma.reDeal.findFirst({ where: { id: dealId, tenantId } });
  if (!deal) throw new Error("Deal not found");
  if (!body.trim()) throw new Error("Note body is required");

  const note = await prisma.reDealNote.create({
    data: { dealId, userId, body: body.trim() },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "re_deal.note_added",
    entityType: "re_deal_note",
    entityId: note.id,
    metadata: { dealId },
  });

  return {
    id: note.id,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    author: {
      id: note.user.id,
      email: note.user.email,
      displayName: note.user.displayName,
    },
  };
}

function formatContact(contact: {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt: Date;
}) {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    createdAt: contact.createdAt.toISOString(),
  };
}

function formatListing(listing: {
  id: string;
  address: string;
  city: string;
  province: string | null;
  postalCode: string | null;
  mlsNumber: string | null;
  listPriceCents: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  sellerContact?: { firstName: string; lastName: string } | null;
  assignedAgent?: { id: string; email: string; displayName: string | null } | null;
  _count?: { showings: number; deals: number };
}) {
  return {
    id: listing.id,
    address: listing.address,
    city: listing.city,
    province: listing.province,
    postalCode: listing.postalCode,
    mlsNumber: listing.mlsNumber,
    listPriceCents: listing.listPriceCents,
    status: listing.status,
    sellerName: listing.sellerContact
      ? `${listing.sellerContact.firstName} ${listing.sellerContact.lastName}`
      : null,
    assignedAgent: listing.assignedAgent
      ? {
          id: listing.assignedAgent.id,
          email: listing.assignedAgent.email,
          displayName: listing.assignedAgent.displayName,
        }
      : null,
    showingCount: listing._count?.showings ?? 0,
    dealCount: listing._count?.deals ?? 0,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}

function formatShowing(showing: {
  id: string;
  scheduledAt: Date;
  status: string;
  notes: string | null;
  listing: { id: string; address: string; city: string };
  contact: { firstName: string; lastName: string; email: string | null };
}) {
  return {
    id: showing.id,
    scheduledAt: showing.scheduledAt.toISOString(),
    status: showing.status,
    notes: showing.notes,
    listing: {
      id: showing.listing.id,
      address: showing.listing.address,
      city: showing.listing.city,
    },
    contactName: `${showing.contact.firstName} ${showing.contact.lastName}`,
    contactEmail: showing.contact.email,
  };
}

function formatDeal(deal: {
  id: string;
  title: string;
  status: string;
  offerAmountCents: number | null;
  createdAt: Date;
  updatedAt: Date;
  listing: { id: string; address: string; city: string };
  buyerContact?: { firstName: string; lastName: string } | null;
  _count?: { notes: number };
}) {
  return {
    id: deal.id,
    title: deal.title,
    status: deal.status,
    offerAmountCents: deal.offerAmountCents,
    listing: {
      id: deal.listing.id,
      address: deal.listing.address,
      city: deal.listing.city,
    },
    buyerName: deal.buyerContact
      ? `${deal.buyerContact.firstName} ${deal.buyerContact.lastName}`
      : null,
    noteCount: deal._count?.notes ?? 0,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  };
}
