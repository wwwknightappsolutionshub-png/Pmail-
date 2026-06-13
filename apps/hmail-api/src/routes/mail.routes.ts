import { Router, type Request } from "express";
import { z } from "zod";
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

function mailCredentials(req: Request) {
  const auth = req.auth!;
  const mailConfig = auth.user.tenant.mail;
  if (!mailConfig) {
    throw new Error("Tenant mail configuration missing");
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
    const mailConfig = auth.user.tenant.mail;
    if (!mailConfig) {
      res.status(500).json({ error: "Tenant mail configuration missing" });
      return;
    }

    if (!body.text?.trim() && !body.html?.trim()) {
      res.status(400).json({ error: "Message body is required" });
      return;
    }

    const mailInput = {
      email: auth.user.email,
      password: auth.mailPassword,
      mailConfig,
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      text: body.text,
      html: body.html,
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

    res.status(201).json({ ...result, sentFolder: sentFolder ?? undefined });
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
