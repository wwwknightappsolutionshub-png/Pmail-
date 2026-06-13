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
