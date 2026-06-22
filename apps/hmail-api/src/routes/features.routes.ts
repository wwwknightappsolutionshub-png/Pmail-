import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireAddon } from "../middleware/requireAddon.js";
import { listImmigrationTemplates } from "../services/templates.service.js";
import {
  cancelScheduledMessage,
  createScheduledMessage,
  listScheduledMessages,
} from "../services/scheduled.service.js";
import {
  createClient,
  createMatter,
  getMatterChecklist,
  listClients,
  listMatters,
  toggleChecklistItem,
} from "../services/desk.service.js";
import { listComplianceLogs } from "../services/compliance.service.js";
import {
  classifyAndStoreMessage,
  createDeadline,
  createPortalAccess,
  createPortalDocumentRequest,
  linkMailToMatter,
  listDeadlines,
  listIrccClassifications,
  listMailLinks,
  listPortalDocuments,
} from "../services/ircc-features.service.js";
import {
  createReContact,
  createReDeal,
  createReDealNote,
  createReListing,
  createReShowing,
  listReContacts,
  listReDealNotes,
  listReDeals,
  listReListings,
  listReShowings,
  updateReDealStatus,
  updateReListingStatus,
  updateReShowingStatus,
} from "../services/real-estate.service.js";
import { listRealEstateTemplates } from "../services/real-estate-templates.service.js";
import { registerIndustryVerticalRoutes } from "./industry-vertical.routes.js";
import {
  createCrmRecord,
  createReminder,
  createCalendarEvent,
  deleteCrmRecord,
  deleteReminder,
  deleteCalendarEvent,
  getCalendarSettings,
  getCalendarTeamCapacity,
  getIndustryToolState,
  listCalendarEvents,
  listCrmRecords,
  listPipelineStages,
  listReminders,
  runIndustryToolAction,
  saveIndustryToolState,
  setCalendarProviderConnection,
  syncCalendarProviders,
  updateCalendarEvent,
  updateCalendarReminderSequences,
  updateCalendarSettings,
  updateCrmRecord,
  updateReminder,
} from "../services/workspace.service.js";

export const featuresRouter = Router();

featuresRouter.use(requireAuth);

function ctx(req: Parameters<typeof requireAuth>[0]) {
  return {
    tenantId: req.auth!.user.tenant.id,
    userId: req.auth!.user.id,
    userEmail: req.auth!.user.email,
  };
}

// ── Phase 1: Immigration Template Pack ──────────────────────────
featuresRouter.get("/templates", requireAddon("immigration-templates"), async (req, res, next) => {
  try {
    const templates = await listImmigrationTemplates(ctx(req).tenantId);
    res.json({ templates });
  } catch (err) {
    next(err);
  }
});

// ── Phase 1: Scheduled Send ───────────────────────────────────
featuresRouter.get("/scheduled", requireAddon("scheduled-send"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    const messages = await listScheduledMessages(tenantId, userId);
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

featuresRouter.post("/scheduled", requireAddon("scheduled-send"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const message = await createScheduledMessage(tenantId, userId, userEmail, {
      to: String(req.body?.to ?? ""),
      cc: req.body?.cc ? String(req.body.cc) : undefined,
      bcc: req.body?.bcc ? String(req.body.bcc) : undefined,
      subject: String(req.body?.subject ?? ""),
      text: req.body?.text ? String(req.body.text) : undefined,
      html: req.body?.html ? String(req.body.html) : undefined,
      scheduledFor: String(req.body?.scheduledFor ?? ""),
    });
    res.status(201).json({ message });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.delete("/scheduled/:id", requireAddon("scheduled-send"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    await cancelScheduledMessage(tenantId, userId, userEmail, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// ── Phase 1: Immigration Desk ─────────────────────────────────
featuresRouter.get("/desk/clients", requireAddon("immigration-desk"), async (req, res, next) => {
  try {
    const clients = await listClients(ctx(req).tenantId);
    res.json({ clients });
  } catch (err) {
    next(err);
  }
});

featuresRouter.post("/desk/clients", requireAddon("immigration-desk"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const client = await createClient(tenantId, userId, userEmail, {
      firstName: String(req.body?.firstName ?? ""),
      lastName: String(req.body?.lastName ?? ""),
      email: req.body?.email ? String(req.body.email) : undefined,
      phone: req.body?.phone ? String(req.body.phone) : undefined,
    });
    res.status(201).json({ client });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.get("/desk/matters", requireAddon("immigration-desk"), async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search) : undefined;
    const matters = await listMatters(ctx(req).tenantId, search);
    res.json({ matters });
  } catch (err) {
    next(err);
  }
});

featuresRouter.post("/desk/matters", requireAddon("immigration-desk"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const matter = await createMatter(tenantId, userId, userEmail, {
      clientId: String(req.body?.clientId ?? ""),
      title: String(req.body?.title ?? ""),
      uci: req.body?.uci ? String(req.body.uci) : undefined,
      program: req.body?.program ? String(req.body.program) : undefined,
      status: req.body?.status ? String(req.body.status) : undefined,
    });
    res.status(201).json({ matter });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// ── Phase 1: Program Checklists ─────────────────────────────
featuresRouter.get(
  "/checklists/:matterId",
  requireAddon("program-checklists"),
  async (req, res, next) => {
    try {
      const data = await getMatterChecklist(String(req.params.matterId), ctx(req).tenantId);
      res.json(data);
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  },
);

featuresRouter.patch(
  "/checklists/:matterId/items/:itemId",
  requireAddon("program-checklists"),
  async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const item = await toggleChecklistItem(
        tenantId,
        userId,
        userEmail,
        String(req.params.matterId),
        String(req.params.itemId),
        Boolean(req.body?.isComplete),
      );
      res.json({ item });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  },
);

// ── Phase 1: Compliance Pack ──────────────────────────────────
featuresRouter.get("/compliance/audit", requireAddon("compliance-pack"), async (req, res, next) => {
  try {
    const logs = await listComplianceLogs(ctx(req).tenantId);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

// ── Phase 2: IRCC Mail Intelligence ───────────────────────────
featuresRouter.get("/ircc/classifications", requireAddon("ircc-mail-intel"), async (req, res, next) => {
  try {
    const priority = req.query.priority ? String(req.query.priority) : undefined;
    const classifications = await listIrccClassifications(ctx(req).tenantId, priority);
    res.json({ classifications });
  } catch (err) {
    next(err);
  }
});

featuresRouter.post("/ircc/classify", requireAddon("ircc-mail-intel"), async (req, res, next) => {
  try {
    const { tenantId } = ctx(req);
    const classification = await classifyAndStoreMessage(
      tenantId,
      String(req.body?.folder ?? "INBOX"),
      Number(req.body?.messageUid),
      String(req.body?.sender ?? ""),
      String(req.body?.subject ?? ""),
    );
    res.status(201).json({ classification });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// ── Phase 2: Case-Linked Mail ─────────────────────────────────
featuresRouter.get("/mail-links", requireAddon("case-linked-mail"), async (req, res, next) => {
  try {
    const matterId = req.query.matterId ? String(req.query.matterId) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const links = await listMailLinks(ctx(req).tenantId, matterId, search);
    res.json({ links });
  } catch (err) {
    next(err);
  }
});

featuresRouter.post("/mail-links", requireAddon("case-linked-mail"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const link = await linkMailToMatter(tenantId, userId, userEmail, {
      matterId: String(req.body?.matterId ?? ""),
      folder: String(req.body?.folder ?? ""),
      messageUid: Number(req.body?.messageUid),
      subject: req.body?.subject ? String(req.body.subject) : undefined,
    });
    res.status(201).json({ link });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// ── Phase 2: Deadline Guard ───────────────────────────────────
featuresRouter.get("/deadlines", requireAddon("deadline-guard"), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const deadlines = await listDeadlines(ctx(req).tenantId, status);
    res.json({ deadlines });
  } catch (err) {
    next(err);
  }
});

featuresRouter.post("/deadlines", requireAddon("deadline-guard"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const deadline = await createDeadline(tenantId, userId, userEmail, {
      matterId: String(req.body?.matterId ?? ""),
      title: String(req.body?.title ?? ""),
      dueAt: String(req.body?.dueAt ?? ""),
      source: req.body?.source ? String(req.body.source) : undefined,
    });
    res.status(201).json({ deadline });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// ── Phase 2: Client Portal ────────────────────────────────────
featuresRouter.post("/portal/:matterId/access", requireAddon("client-portal"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const access = await createPortalAccess(tenantId, userId, userEmail, String(req.params.matterId));
    res.status(201).json({ access });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.get("/portal/:matterId/documents", requireAddon("client-portal"), async (req, res, next) => {
  try {
    const documents = await listPortalDocuments(ctx(req).tenantId, String(req.params.matterId));
    res.json({ documents });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.post("/portal/:matterId/documents", requireAddon("client-portal"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const document = await createPortalDocumentRequest(
      tenantId,
      userId,
      userEmail,
      String(req.params.matterId),
      String(req.body?.label ?? ""),
    );
    res.status(201).json({ document });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// ── Real estate: Listing Board (re-listing-board) ─────────────
featuresRouter.get("/real-estate/contacts", requireAddon("re-listing-board"), async (req, res, next) => {
  try {
    const contacts = await listReContacts(
      ctx(req).tenantId,
      req.query.role ? String(req.query.role) : undefined,
    );
    res.json({ contacts });
  } catch (err) {
    next(err);
  }
});

featuresRouter.post("/real-estate/contacts", requireAddon("re-listing-board"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const contact = await createReContact(tenantId, userId, userEmail, {
      firstName: String(req.body?.firstName ?? ""),
      lastName: String(req.body?.lastName ?? ""),
      email: req.body?.email ? String(req.body.email) : undefined,
      phone: req.body?.phone ? String(req.body.phone) : undefined,
      role: req.body?.role ? String(req.body.role) : undefined,
    });
    res.status(201).json({ contact });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.get("/real-estate/listings", requireAddon("re-listing-board"), async (req, res, next) => {
  try {
    const listings = await listReListings(
      ctx(req).tenantId,
      req.query.status ? String(req.query.status) : undefined,
    );
    res.json({ listings });
  } catch (err) {
    next(err);
  }
});

featuresRouter.post("/real-estate/listings", requireAddon("re-listing-board"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const listing = await createReListing(tenantId, userId, userEmail, {
      address: String(req.body?.address ?? ""),
      city: String(req.body?.city ?? ""),
      province: req.body?.province ? String(req.body.province) : undefined,
      postalCode: req.body?.postalCode ? String(req.body.postalCode) : undefined,
      mlsNumber: req.body?.mlsNumber ? String(req.body.mlsNumber) : undefined,
      listPriceCents: req.body?.listPriceCents != null ? Number(req.body.listPriceCents) : undefined,
      status: req.body?.status ? String(req.body.status) : undefined,
      sellerContactId: req.body?.sellerContactId ? String(req.body.sellerContactId) : undefined,
    });
    res.status(201).json({ listing });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.patch("/real-estate/listings/:id", requireAddon("re-listing-board"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const listing = await updateReListingStatus(
      tenantId,
      userId,
      userEmail,
      String(req.params.id),
      String(req.body?.status ?? ""),
    );
    res.json({ listing });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// ── Real estate: Showing Scheduler (re-showing-scheduler) ───────
featuresRouter.get("/real-estate/showings", requireAddon("re-showing-scheduler"), async (req, res, next) => {
  try {
    const showings = await listReShowings(
      ctx(req).tenantId,
      req.query.status ? String(req.query.status) : undefined,
    );
    res.json({ showings });
  } catch (err) {
    next(err);
  }
});

featuresRouter.post("/real-estate/showings", requireAddon("re-showing-scheduler"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const showing = await createReShowing(tenantId, userId, userEmail, {
      listingId: String(req.body?.listingId ?? ""),
      contactId: req.body?.contactId ? String(req.body.contactId) : undefined,
      contact: req.body?.contact as { firstName: string; lastName: string; email?: string; phone?: string } | undefined,
      scheduledAt: String(req.body?.scheduledAt ?? ""),
      notes: req.body?.notes ? String(req.body.notes) : undefined,
    });
    res.status(201).json({ showing });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.patch("/real-estate/showings/:id", requireAddon("re-showing-scheduler"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const showing = await updateReShowingStatus(
      tenantId,
      userId,
      userEmail,
      String(req.params.id),
      String(req.body?.status ?? ""),
    );
    res.json({ showing });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// ── Real estate: Quick Replies (re-quick-replies) ───────────────
featuresRouter.get("/real-estate/templates", requireAddon("re-quick-replies"), async (req, res, next) => {
  try {
    const templates = await listRealEstateTemplates(ctx(req).tenantId);
    res.json({ templates });
  } catch (err) {
    next(err);
  }
});

// ── Real estate: Deal Room (re-deal-room) ─────────────────────
featuresRouter.get("/real-estate/deals", requireAddon("re-deal-room"), async (req, res, next) => {
  try {
    const deals = await listReDeals(
      ctx(req).tenantId,
      req.query.status ? String(req.query.status) : undefined,
    );
    res.json({ deals });
  } catch (err) {
    next(err);
  }
});

featuresRouter.post("/real-estate/deals", requireAddon("re-deal-room"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const deal = await createReDeal(tenantId, userId, userEmail, {
      listingId: String(req.body?.listingId ?? ""),
      title: String(req.body?.title ?? ""),
      status: req.body?.status ? String(req.body.status) : undefined,
      offerAmountCents: req.body?.offerAmountCents != null ? Number(req.body.offerAmountCents) : undefined,
      buyerContactId: req.body?.buyerContactId ? String(req.body.buyerContactId) : undefined,
    });
    res.status(201).json({ deal });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.patch("/real-estate/deals/:id", requireAddon("re-deal-room"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const deal = await updateReDealStatus(
      tenantId,
      userId,
      userEmail,
      String(req.params.id),
      String(req.body?.status ?? ""),
    );
    res.json({ deal });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.get("/real-estate/deals/:id/notes", requireAddon("re-deal-room"), async (req, res, next) => {
  try {
    const notes = await listReDealNotes(ctx(req).tenantId, String(req.params.id));
    res.json({ notes });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.post("/real-estate/deals/:id/notes", requireAddon("re-deal-room"), async (req, res, next) => {
  try {
    const { tenantId, userId, userEmail } = ctx(req);
    const note = await createReDealNote(
      tenantId,
      userId,
      userEmail,
      String(req.params.id),
      String(req.body?.body ?? ""),
    );
    res.status(201).json({ note });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

registerIndustryVerticalRoutes(featuresRouter, ctx);

// ── Bespoke Workspace: CRM, reminders, industry tools ───────────
featuresRouter.get("/workspace/stages", requireAddon("bespoke-workspace"), async (req, res, next) => {
  try {
    const stages = await listPipelineStages(ctx(req).tenantId);
    res.json({ stages });
  } catch (err) {
    next(err);
  }
});

featuresRouter.get("/workspace/crm", requireAddon("bespoke-workspace"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    const records = await listCrmRecords(tenantId, userId, req.query.search ? String(req.query.search) : undefined);
    res.json({ records });
  } catch (err) {
    next(err);
  }
});

featuresRouter.post("/workspace/crm", requireAddon("bespoke-workspace"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    const record = await createCrmRecord(tenantId, userId, {
      name: String(req.body?.name ?? ""),
      email: String(req.body?.email ?? ""),
      phone: req.body?.phone ? String(req.body.phone) : undefined,
      organization: req.body?.organization ? String(req.body.organization) : undefined,
      stage: req.body?.stage ? String(req.body.stage) : undefined,
      notes: req.body?.notes ? String(req.body.notes) : undefined,
    });
    res.status(201).json({ record });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.patch("/workspace/crm/:id", requireAddon("bespoke-workspace"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    const record = await updateCrmRecord(tenantId, userId, String(req.params.id), {
      name: req.body?.name ? String(req.body.name) : undefined,
      phone: req.body?.phone ? String(req.body.phone) : undefined,
      organization: req.body?.organization ? String(req.body.organization) : undefined,
      stage: req.body?.stage ? String(req.body.stage) : undefined,
      notes: req.body?.notes ? String(req.body.notes) : undefined,
    });
    res.json({ record });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.delete("/workspace/crm/:id", requireAddon("bespoke-workspace"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    await deleteCrmRecord(tenantId, userId, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.get("/workspace/reminders", requireAddon("bespoke-workspace"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    const status = req.query.status ? (String(req.query.status) as "pending" | "done" | "all") : "pending";
    const reminders = await listReminders(tenantId, userId, status);
    res.json({ reminders });
  } catch (err) {
    next(err);
  }
});

featuresRouter.post("/workspace/reminders", requireAddon("bespoke-workspace"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    const reminder = await createReminder(tenantId, userId, {
      title: String(req.body?.title ?? ""),
      dueAt: String(req.body?.dueAt ?? ""),
      crmRecordId: req.body?.crmRecordId ? String(req.body.crmRecordId) : undefined,
      channel: req.body?.channel ? String(req.body.channel) : undefined,
    });
    res.status(201).json({ reminder });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.patch("/workspace/reminders/:id", requireAddon("bespoke-workspace"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    const reminder = await updateReminder(tenantId, userId, String(req.params.id), {
      title: req.body?.title ? String(req.body.title) : undefined,
      dueAt: req.body?.dueAt ? String(req.body.dueAt) : undefined,
      status: req.body?.status ? String(req.body.status) : undefined,
      channel: req.body?.channel ? String(req.body.channel) : undefined,
    });
    res.json({ reminder });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.delete("/workspace/reminders/:id", requireAddon("bespoke-workspace"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    await deleteReminder(tenantId, userId, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.get("/workspace/calendar", requireAddon("full-calendar-functionality"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    const events = await listCalendarEvents(
      tenantId,
      userId,
      typeof req.query.from === "string" ? req.query.from : undefined,
      typeof req.query.to === "string" ? req.query.to : undefined,
    );
    res.json({ events });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.post("/workspace/calendar", requireAddon("full-calendar-functionality"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    const event = await createCalendarEvent(tenantId, userId, req.body ?? {});
    res.status(201).json({ event });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.patch("/workspace/calendar/:id", requireAddon("full-calendar-functionality"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    const event = await updateCalendarEvent(tenantId, userId, String(req.params.id), req.body ?? {});
    res.json({ event });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.delete("/workspace/calendar/:id", requireAddon("full-calendar-functionality"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    await deleteCalendarEvent(tenantId, userId, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.get("/workspace/calendar/settings", requireAddon("full-calendar-functionality"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    const settings = await getCalendarSettings(tenantId, userId);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

featuresRouter.put("/workspace/calendar/settings", requireAddon("full-calendar-functionality"), async (req, res, next) => {
  try {
    const { userId } = ctx(req);
    await updateCalendarSettings(userId, req.body ?? {});
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.post(
  "/workspace/calendar/providers/:provider/connect",
  requireAddon("full-calendar-functionality"),
  async (req, res, next) => {
    try {
      const { tenantId, userId } = ctx(req);
      const provider = String(req.params.provider);
      if (provider !== "google" && provider !== "microsoft") {
        res.status(400).json({ error: "Invalid provider" });
        return;
      }
      await setCalendarProviderConnection(tenantId, userId, provider, true);
      const settings = await getCalendarSettings(tenantId, userId);
      res.json({ settings });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  },
);

featuresRouter.post(
  "/workspace/calendar/providers/:provider/disconnect",
  requireAddon("full-calendar-functionality"),
  async (req, res, next) => {
    try {
      const { tenantId, userId } = ctx(req);
      const provider = String(req.params.provider);
      if (provider !== "google" && provider !== "microsoft") {
        res.status(400).json({ error: "Invalid provider" });
        return;
      }
      await setCalendarProviderConnection(tenantId, userId, provider, false);
      const settings = await getCalendarSettings(tenantId, userId);
      res.json({ settings });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  },
);

featuresRouter.post("/workspace/calendar/sync", requireAddon("full-calendar-functionality"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    await syncCalendarProviders(tenantId, userId);
    const settings = await getCalendarSettings(tenantId, userId);
    res.json({ settings });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.put("/workspace/calendar/reminder-sequences", requireAddon("full-calendar-functionality"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    const sequences = Array.isArray(req.body?.sequences) ? req.body.sequences : [];
    await updateCalendarReminderSequences(userId, sequences);
    await syncCalendarProviders(tenantId, userId);
    const settings = await getCalendarSettings(tenantId, userId);
    res.json({ settings });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.get("/workspace/calendar/capacity", requireAddon("full-calendar-functionality"), async (req, res, next) => {
  try {
    const { tenantId } = ctx(req);
    const weekStart = typeof req.query.weekStart === "string" ? req.query.weekStart : undefined;
    const capacity = await getCalendarTeamCapacity(tenantId, weekStart);
    res.json(capacity);
  } catch (err) {
    next(err);
  }
});

featuresRouter.get("/workspace/industry/:toolSlug", requireAddon("bespoke-workspace"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    const state = await getIndustryToolState(tenantId, userId, String(req.params.toolSlug));
    res.json({ state });
  } catch (err) {
    next(err);
  }
});

featuresRouter.put("/workspace/industry/:toolSlug", requireAddon("bespoke-workspace"), async (req, res, next) => {
  try {
    const { tenantId, userId } = ctx(req);
    await saveIndustryToolState(tenantId, userId, String(req.params.toolSlug), req.body?.state ?? {});
    const state = await getIndustryToolState(tenantId, userId, String(req.params.toolSlug));
    res.json({ state });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

featuresRouter.post(
  "/workspace/industry/:toolSlug/actions/:action",
  requireAddon("bespoke-workspace"),
  async (req, res, next) => {
    try {
      const { tenantId, userId } = ctx(req);
      const state = await runIndustryToolAction(
        tenantId,
        userId,
        String(req.params.toolSlug),
        String(req.params.action),
        req.body ?? {},
      );
      res.json({ state });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  },
);
