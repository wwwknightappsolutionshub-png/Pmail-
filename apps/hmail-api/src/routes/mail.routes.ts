import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  appendToSentFolder,
  bulkMessageAction,
  createMailbox,
  deleteMessage,
  downloadAttachment,
  getMessage,
  listFolders,
  listMessages,
  moveMessage,
  setMessageFlags,
} from "../services/imap.service.js";
import { sendMail } from "../services/smtp.service.js";
import { tenantHasAddonAccess } from "../services/addon.service.js";
import {
  createAutoReply,
  createSignature,
  deleteAutoReply,
  deleteSignature,
  getComposeSettings,
  getComposeSettingsByUserId,
  updateAutoReply,
  updateComposeSettings,
  updateSignature,
} from "../services/compose-settings.service.js";
import {
  buildTrackingPixelUrl,
  createSentTracking,
  getTrackingById,
  injectTrackingPixel,
  listSentTracking,
} from "../services/tracking.service.js";
import { getPublicApiBaseUrl } from "../lib/public-url.js";
import { resolveAuthMailConfig } from "../services/auth.service.js";

function mailCredentials(req: Request) {
  const auth = req.auth!;
  const mailConfig = resolveAuthMailConfig(auth.user);
  if (!mailConfig) {
    throw new Error("Mail provider configuration missing");
  }
  return {
    email: auth.user.email,
    password: auth.mailPassword,
    mailConfig,
  };
}

export const mailRouter = Router();

mailRouter.use(requireAuth);

mailRouter.get("/folders", async (req, res, next) => {
  try {
    const folders = await listFolders(mailCredentials(req));
    res.json({ folders });
  } catch (err) {
    next(err);
  }
});

mailRouter.post("/folders", async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "Folder name is required" });
      return;
    }
    const parentPath = req.body?.parentPath ? String(req.body.parentPath) : undefined;
    const folder = await createMailbox(mailCredentials(req), name, parentPath);
    res.status(201).json({ folder });
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/messages", async (req, res, next) => {
  try {
    const folder = String(req.query.folder ?? "INBOX");
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? req.query.limit ?? 30);
    const offset = Number(req.query.offset ?? (page - 1) * pageSize);
    const search = req.query.search ? String(req.query.search) : undefined;
    const searchField = req.query.searchField
      ? (String(req.query.searchField) as "date" | "sender" | "subject" | "recipient" | "body")
      : undefined;
    const searchQuery = req.query.searchQuery ? String(req.query.searchQuery) : undefined;
    const filter = req.query.filter
      ? (String(req.query.filter) as "all" | "unread" | "read" | "starred")
      : undefined;
    const sortBy = req.query.sortBy
      ? (String(req.query.sortBy) as "date" | "subject" | "sender")
      : "date";
    const sortOrder = req.query.sortOrder
      ? (String(req.query.sortOrder) as "asc" | "desc")
      : "desc";

    const result = await listMessages(mailCredentials(req), folder, {
      page,
      pageSize,
      offset,
      search,
      searchField,
      searchQuery,
      filter,
      sortBy,
      sortOrder,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/messages/:uid", async (req, res, next) => {
  try {
    const folder = String(req.query.folder ?? "INBOX");
    const uid = Number(req.params.uid);
    const message = await getMessage(mailCredentials(req), folder, uid);
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    if (!message.seen) {
      await setMessageFlags(mailCredentials(req), folder, uid, { seen: true });
      message.seen = true;
    }

    res.json({ message });
  } catch (err) {
    next(err);
  }
});

const sendSchema = z.object({
  to: z.string().min(3),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
  replyTo: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.string().optional(),
  priority: z.enum(["normal", "high"]).optional(),
  requestReadReceipt: z.boolean().optional(),
  trackingEnabled: z.boolean().optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string().min(1),
        content: z.string().min(1),
        contentType: z.string().optional(),
      }),
    )
    .optional(),
});

mailRouter.post("/send", async (req, res, next) => {
  try {
    const body = sendSchema.parse(req.body);
    const auth = req.auth!;
    const mailConfig = resolveAuthMailConfig(auth.user);
    if (!mailConfig) {
      res.status(500).json({ error: "Mail provider configuration missing" });
      return;
    }

    if (!body.text?.trim() && !body.html?.trim()) {
      res.status(400).json({ error: "Message body is required" });
      return;
    }

    const composeSettings = await getComposeSettingsByUserId(auth.user.id);
    const displayName = composeSettings.displayName?.trim();
    let htmlBody = body.html;
    let trackingRecord: Awaited<ReturnType<typeof createSentTracking>> | null = null;

    const wantsTracking = Boolean(body.trackingEnabled);
    if (wantsTracking) {
      const entitled = await tenantHasAddonAccess(auth.user.tenant.id, "open-tracking");
      if (!entitled) {
        res.status(403).json({ error: "Open tracking addon required" });
        return;
      }
      trackingRecord = await createSentTracking(auth.user.id, {
        toEmail: body.to,
        subject: body.subject,
      });
      const pixelUrl = buildTrackingPixelUrl(trackingRecord.trackingToken, getPublicApiBaseUrl(req));
      if (htmlBody) {
        htmlBody = injectTrackingPixel(htmlBody, pixelUrl);
      }
    }

    const mailInput = {
      email: auth.user.email,
      password: auth.mailPassword,
      mailConfig,
      fromName: displayName || undefined,
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      text: body.text,
      html: htmlBody,
      replyTo: body.replyTo,
      inReplyTo: body.inReplyTo,
      references: body.references,
      priority: body.priority,
      requestReadReceipt: body.requestReadReceipt,
      attachments: body.attachments?.map((att) => ({
        filename: att.filename,
        content: Buffer.from(att.content, "base64"),
        contentType: att.contentType,
      })),
    };

    const result = await sendMail(mailInput);

    if (trackingRecord && result.messageId) {
      await prisma.sentMessageTracking.update({
        where: { id: trackingRecord.id },
        data: { smtpMessageId: result.messageId },
      });
    }

    let sentFolder: string | null = null;
    try {
      sentFolder = await appendToSentFolder(
        {
          email: auth.user.email,
          password: auth.mailPassword,
          mailConfig,
        },
        mailInput,
        result.messageId,
      );
    } catch (appendErr) {
      console.warn("Sent folder append failed:", appendErr);
    }

    res.status(201).json({
      ...result,
      sentFolder: sentFolder ?? undefined,
      trackingId: trackingRecord?.id,
    });
  } catch (err) {
    next(err);
  }
});

mailRouter.post("/messages/bulk", async (req, res, next) => {
  try {
    const folder = String(req.body?.folder ?? "INBOX");
    const uids = Array.isArray(req.body?.uids) ? req.body.uids.map(Number).filter(Boolean) : [];
    const action = String(req.body?.action ?? "");
    const targetFolder = req.body?.targetFolder ? String(req.body.targetFolder) : undefined;

    if (!uids.length) {
      res.status(400).json({ error: "No messages selected" });
      return;
    }

    const validActions = ["markRead", "markUnread", "delete", "move", "reportSpam"];
    if (!validActions.includes(action)) {
      res.status(400).json({ error: "Invalid bulk action" });
      return;
    }

    await bulkMessageAction(
      mailCredentials(req),
      folder,
      uids,
      action as "markRead" | "markUnread" | "delete" | "move" | "reportSpam",
      targetFolder,
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

mailRouter.patch("/messages/:uid/flags", async (req, res, next) => {
  try {
    const folder = String(req.query.folder ?? "INBOX");
    const uid = Number(req.params.uid);
    const { seen, flagged } = req.body as { seen?: boolean; flagged?: boolean };
    await setMessageFlags(mailCredentials(req), folder, uid, { seen, flagged });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

mailRouter.post("/messages/:uid/move", async (req, res, next) => {
  try {
    const folder = String(req.query.folder ?? "INBOX");
    const uid = Number(req.params.uid);
    const targetFolder = String(req.body.targetFolder);
    await moveMessage(mailCredentials(req), folder, uid, targetFolder);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

mailRouter.delete("/messages/:uid", async (req, res, next) => {
  try {
    const folder = String(req.query.folder ?? "INBOX");
    const uid = Number(req.params.uid);
    await deleteMessage(mailCredentials(req), folder, uid);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/messages/:uid/attachments/:partId", async (req, res, next) => {
  try {
    const folder = String(req.query.folder ?? "INBOX");
    const uid = Number(req.params.uid);
    const partId = String(req.params.partId);
    const file = await downloadAttachment(mailCredentials(req), folder, uid, partId);
    if (!file) {
      res.status(404).json({ error: "Attachment not found" });
      return;
    }

    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.send(file.content);
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/compose-settings", async (req, res, next) => {
  try {
    const auth = req.auth!;
    const settings = await getComposeSettings(auth.user.id, auth.user.tenant.id, auth.user.businessVertical);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

mailRouter.patch("/compose-settings", async (req, res, next) => {
  try {
    const auth = req.auth!;
    await updateComposeSettings(auth.user.id, auth.user.tenant.id, {
      displayName: req.body?.displayName ? String(req.body.displayName) : undefined,
      autoReplyEnabled: typeof req.body?.autoReplyEnabled === "boolean" ? req.body.autoReplyEnabled : undefined,
      activeSignatureId: req.body?.activeSignatureId ? String(req.body.activeSignatureId) : undefined,
      activeAutoReplyId: req.body?.activeAutoReplyId ? String(req.body.activeAutoReplyId) : undefined,
    });
    const settings = await getComposeSettings(auth.user.id, auth.user.tenant.id, auth.user.businessVertical);
    res.json({ settings });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.post("/signatures", async (req, res, next) => {
  try {
    const signature = await createSignature(req.auth!.user.id, {
      name: String(req.body?.name ?? ""),
      body: String(req.body?.body ?? ""),
      avatarUrl: req.body?.avatarUrl ? String(req.body.avatarUrl) : undefined,
      isDefault: Boolean(req.body?.isDefault),
    });
    res.status(201).json({ signature });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.patch("/signatures/:id", async (req, res, next) => {
  try {
    const signature = await updateSignature(req.auth!.user.id, String(req.params.id), {
      name: req.body?.name ? String(req.body.name) : undefined,
      body: req.body?.body ? String(req.body.body) : undefined,
      avatarUrl: req.body?.avatarUrl ? String(req.body.avatarUrl) : undefined,
      isDefault: typeof req.body?.isDefault === "boolean" ? req.body.isDefault : undefined,
    });
    res.json({ signature });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.delete("/signatures/:id", async (req, res, next) => {
  try {
    await deleteSignature(req.auth!.user.id, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.post("/auto-replies", async (req, res, next) => {
  try {
    const auth = req.auth!;
    const autoReply = await createAutoReply(auth.user.id, auth.user.tenant.id, {
      name: String(req.body?.name ?? ""),
      subject: String(req.body?.subject ?? ""),
      body: String(req.body?.body ?? ""),
      enabled: Boolean(req.body?.enabled),
    });
    res.status(201).json({ autoReply });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.patch("/auto-replies/:id", async (req, res, next) => {
  try {
    const auth = req.auth!;
    const autoReply = await updateAutoReply(auth.user.id, auth.user.tenant.id, String(req.params.id), {
      name: req.body?.name ? String(req.body.name) : undefined,
      subject: req.body?.subject ? String(req.body.subject) : undefined,
      body: req.body?.body ? String(req.body.body) : undefined,
      enabled: typeof req.body?.enabled === "boolean" ? req.body.enabled : undefined,
    });
    res.json({ autoReply });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.delete("/auto-replies/:id", async (req, res, next) => {
  try {
    const auth = req.auth!;
    await deleteAutoReply(auth.user.id, auth.user.tenant.id, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.get("/tracking", async (req, res, next) => {
  try {
    const entitled = await tenantHasAddonAccess(req.auth!.user.tenant.id, "open-tracking");
    if (!entitled) {
      res.status(403).json({ error: "Open tracking addon required" });
      return;
    }
    const tracking = await listSentTracking(req.auth!.user.id);
    res.json({ tracking });
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/tracking/:id", async (req, res, next) => {
  try {
    const entitled = await tenantHasAddonAccess(req.auth!.user.tenant.id, "open-tracking");
    if (!entitled) {
      res.status(403).json({ error: "Open tracking addon required" });
      return;
    }
    const row = await getTrackingById(req.auth!.user.id, String(req.params.id));
    if (!row) {
      res.status(404).json({ error: "Tracking record not found" });
      return;
    }
    res.json({ tracking: row });
  } catch (err) {
    next(err);
  }
});
