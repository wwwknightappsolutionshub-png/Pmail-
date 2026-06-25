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
import { tenantHasAddonAccess } from "../services/addon.service.js";
import {
  createAutoReply,
  createSignature,
  deleteAutoReply,
  deleteSignature,
  getComposeSettings,
  updateAutoReply,
  updateComposeSettings,
  updateSignature,
} from "../services/compose-settings.service.js";
import {
  getTrackingById,
  listSentTracking,
} from "../services/tracking.service.js";
import { getPublicApiBaseUrl } from "../lib/public-url.js";
import {
  cancelUndoOutgoingMail,
  executeOutgoingMailSend,
  getUndoSendSeconds,
  queueUndoOutgoingMail,
  type OutgoingMailPayload,
} from "../services/mail-outgoing.service.js";
import { getSessionTokenFromRequest } from "../services/auth.service.js";
import { isPmailTesterEmail } from "../services/pmail-tester.service.js";
import { requireAddon } from "../middleware/requireAddon.js";
import {
  activateMailAccount,
  createUserMailAccount,
  deleteUserMailAccount,
  ensurePrimaryMailAccount,
  listUserMailAccounts,
  MULTI_INBOX_ADDON_SLUG,
  resolveRequestMailCredentials,
} from "../services/mail-account.service.js";
import { getMailAccountsUnreadSummary } from "../services/mail-account-unread.service.js";
import { scheduleAutoReferralForAccount } from "../services/mail-account-referral.service.js";
import { listRecipientSuggestions } from "../services/recipient-suggestions.service.js";
import {
  buildVaultDownloadUrl,
  deleteMailVaultFile,
  FILE_VAULT_ADDON_SLUG,
  listMailVaultFiles,
  uploadMailVaultFile,
} from "../services/file-vault.service.js";
import {
  executeMessageUnsubscribe,
  getUnsubscribeOptionsForMessage,
  INBOX_CLEANUP_ADDON_SLUG,
  listCleanupSenders,
  listUnsubscribeLogs,
  runSenderCleanup,
} from "../services/inbox-cleanup.service.js";
import {
  ATTACHMENT_CATEGORIZE_ADDON_SLUG,
  categorizeMessageAttachments,
  exportCategorizedAttachmentToVault,
  listCategorySummary,
  listCategorizedAttachments,
  scanAndCategorizeAttachments,
  updateAttachmentCategory,
} from "../services/attachment-categorize.service.js";
import {
  buildEsignComposeHandoff,
  createEsignRequestFromAttachment,
  createEsignRequestFromUpload,
  ESIGN_FROM_EMAIL_ADDON_SLUG,
  getEsignRequest,
  listEsignRequests,
  refreshEsignRequestStatus,
} from "../services/esign.service.js";
import {
  acknowledgeEmailSlaAlert,
  dismissEmailSlaThread,
  EMAIL_SLA_TRACKER_ADDON_SLUG,
  exportEmailSlaReport,
  getEmailSlaComposeHandoff,
  getEmailSlaSettings,
  listEmailSlaAlerts,
  listEmailSlaThreads,
  scanEmailSlaThreads,
  updateEmailSlaSettings,
} from "../services/email-sla.service.js";
import {
  acceptJobHunterTierBDisclosure,
  deleteJobHunterInferences,
  getJobHunterConsentStatus,
  getJobHunterSettings,
  JOB_HUNTER_ADDON_SLUG,
  updateJobHunterSettings,
} from "../services/job-hunter-settings.service.js";
import {
  getUserDocumentDownload,
  listAttachableCareerDocuments,
  listUserDocuments,
  setUserDocumentPinned,
} from "../services/job-hunter-documents.service.js";
import { ESIGN_DOCUMENT_MIME } from "../lib/esign-mime.js";
import type { MailSlaThreadStatus } from "../lib/email-sla.js";
import { ATTACHMENT_CATEGORIES } from "../lib/attachment-category.js";

async function mailCredentials(req: Request) {
  return resolveRequestMailCredentials(req);
}

export const mailRouter = Router();

mailRouter.use(requireAuth);

mailRouter.get("/folders", async (req, res, next) => {
  try {
    const folders = await listFolders(await mailCredentials(req));
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
    const folder = await createMailbox(await mailCredentials(req), name, parentPath);
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

    const result = await listMessages(await mailCredentials(req), folder, {
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

    const normalizedFolder = folder.trim().toLowerCase();
    const authUser = req.auth?.user;
    if (
      authUser &&
      (normalizedFolder === "inbox" || normalizedFolder === "sent") &&
      !isPmailTesterEmail(authUser.email)
    ) {
      const { syncCareerMailSignalsForUser } = await import("../services/job-hunter-applications.service.js");
      void syncCareerMailSignalsForUser(authUser.tenantId, authUser.id).catch(() => undefined);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/messages/:uid", async (req, res, next) => {
  try {
    const folder = String(req.query.folder ?? "INBOX");
    const uid = Number(req.params.uid);
    const message = await getMessage(await mailCredentials(req), folder, uid);
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    if (!message.seen) {
      await setMessageFlags(await mailCredentials(req), folder, uid, { seen: true });
      message.seen = true;
    }

    res.json({ message });
  } catch (err) {
    next(err);
  }
});

/** Undo-send queue is disabled until PMail+ operates as a full ESP. */
const UNDO_SEND_ENABLED = false;

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
  vaultFileIds: z.array(z.string().uuid()).optional(),
  userDocumentIds: z.array(z.string().uuid()).optional(),
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
    const creds = await mailCredentials(req);
    const payload: OutgoingMailPayload = {
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
      trackingEnabled: body.trackingEnabled,
      vaultFileIds: body.vaultFileIds,
      userDocumentIds: body.userDocumentIds,
      attachments: body.attachments,
    };

    if (payload.vaultFileIds?.length) {
      const vaultEntitled = await tenantHasAddonAccess(auth.user.tenant.id, FILE_VAULT_ADDON_SLUG, auth.user.id);
      if (!vaultEntitled) {
        res.status(403).json({ error: "File vault addon required" });
        return;
      }
    }
    if (payload.userDocumentIds?.length) {
      const jobHunterEntitled = await tenantHasAddonAccess(
        auth.user.tenant.id,
        JOB_HUNTER_ADDON_SLUG,
        auth.user.id,
      );
      if (!jobHunterEntitled) {
        res.status(403).json({ error: "Job Hunter addon required" });
        return;
      }
    }
    if (payload.trackingEnabled) {
      const trackingEntitled = await tenantHasAddonAccess(auth.user.tenant.id, "open-tracking", auth.user.id);
      if (!trackingEntitled) {
        res.status(403).json({ error: "Open tracking addon required" });
        return;
      }
    }

    const undoSeconds = UNDO_SEND_ENABLED ? await getUndoSendSeconds(auth.user.id) : 0;
    if (undoSeconds > 0) {
      const queued = await queueUndoOutgoingMail({
        tenantId: auth.user.tenant.id,
        userId: auth.user.id,
        payload,
        undoSeconds,
      });
      res.status(202).json({
        queued: true,
        pendingId: queued.pendingId,
        undoSeconds: queued.undoSeconds,
        undoUntil: queued.undoUntil,
        subject: queued.subject,
        to: queued.to,
      });
      return;
    }

    const result = await executeOutgoingMailSend({
      tenantId: auth.user.tenant.id,
      userId: auth.user.id,
      credentials: creds,
      apiPublicBase: getPublicApiBaseUrl(req),
      payload,
    });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.post("/send/:pendingId/undo", async (req, res, next) => {
  try {
    const cancelled = await cancelUndoOutgoingMail(req.auth!.user.id, String(req.params.pendingId));
    if (!cancelled) {
      res.status(404).json({ error: "Pending send not found or already sent" });
      return;
    }
    res.json({ ok: true, cancelled: true });
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
      await mailCredentials(req),
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
    await setMessageFlags(await mailCredentials(req), folder, uid, { seen, flagged });
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
    await moveMessage(await mailCredentials(req), folder, uid, targetFolder);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

mailRouter.delete("/messages/:uid", async (req, res, next) => {
  try {
    const folder = String(req.query.folder ?? "INBOX");
    const uid = Number(req.params.uid);
    await deleteMessage(await mailCredentials(req), folder, uid);
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
    const file = await downloadAttachment(await mailCredentials(req), folder, uid, partId);
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
      undoSendSeconds:
        req.body?.undoSendSeconds !== undefined ? Number(req.body.undoSendSeconds) : undefined,
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

const mailAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  label: z.string().optional(),
  providerPreset: z.string().min(1),
  imapHost: z.string().optional(),
  imapPort: z.coerce.number().int().min(1).max(65535).optional(),
  imapSecure: z.boolean().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
});

mailRouter.get("/accounts", requireAddon(MULTI_INBOX_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    await ensurePrimaryMailAccount(auth.user, auth.mailPassword);
    const result = await listUserMailAccounts(auth.user.id, auth.activeMailAccountId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/accounts/unread-summary", requireAddon(MULTI_INBOX_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    await ensurePrimaryMailAccount(auth.user, auth.mailPassword);
    const summary = await getMailAccountsUnreadSummary(auth.user.id, auth.activeMailAccountId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/recipient-suggestions", async (req, res, next) => {
  try {
    const auth = req.auth!;
    const credentials = await resolveRequestMailCredentials(req);
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const suggestions = await listRecipientSuggestions({
      userId: auth.user.id,
      credentials,
      userEmail: credentials.email,
      query,
      limit: Number.isFinite(limit) ? limit : 20,
    });
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

mailRouter.post("/accounts", requireAddon(MULTI_INBOX_ADDON_SLUG), async (req, res, next) => {
  try {
    const body = mailAccountSchema.parse(req.body);
    const auth = req.auth!;
    await ensurePrimaryMailAccount(auth.user, auth.mailPassword);
    const account = await createUserMailAccount(auth.user, body);
    const listed = await listUserMailAccounts(auth.user.id, auth.activeMailAccountId);
    const apiPublicBase = getPublicApiBaseUrl(req);
    scheduleAutoReferralForAccount({
      userId: auth.user.id,
      tenantId: auth.user.tenant.id,
      accountId: account.id,
      displayName: auth.user.displayName,
      apiPublicBase,
    });
    res.status(201).json({
      account: listed.accounts.find((row) => row.id === account.id),
      activeMailAccountId: listed.activeMailAccountId,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid request" });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.post("/accounts/:id/activate", requireAddon(MULTI_INBOX_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const token = getSessionTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const account = await activateMailAccount(token, auth.user.id, String(req.params.id));
    if (!account) {
      res.status(404).json({ error: "Mail account not found" });
      return;
    }
    scheduleAutoReferralForAccount({
      userId: auth.user.id,
      tenantId: auth.user.tenant.id,
      accountId: account.id,
      displayName: auth.user.displayName,
      apiPublicBase: getPublicApiBaseUrl(req),
    });
    const result = await listUserMailAccounts(auth.user.id, account.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

mailRouter.delete("/accounts/:id", requireAddon(MULTI_INBOX_ADDON_SLUG), async (req, res, next) => {
  try {
    const deleted = await deleteUserMailAccount(req.auth!.user.id, String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: "Mail account not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

const vaultUploadSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  dataBase64: z.string().min(1),
});

mailRouter.get("/vault", requireAddon(FILE_VAULT_ADDON_SLUG), async (req, res, next) => {
  try {
    const files = await listMailVaultFiles(req.auth!.user.id);
    const apiPublicBase = getPublicApiBaseUrl(req);
    res.json({
      files: files.map((file) => {
        const { downloadToken, ...safeFile } = file;
        return {
          ...safeFile,
          downloadUrl: buildVaultDownloadUrl(downloadToken, apiPublicBase),
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

mailRouter.post("/vault", requireAddon(FILE_VAULT_ADDON_SLUG), async (req, res, next) => {
  try {
    const body = vaultUploadSchema.parse(req.body);
    const auth = req.auth!;
    const file = await uploadMailVaultFile(auth.user.tenant.id, auth.user.id, body);
    const { downloadToken, ...safeFile } = file;
    const downloadUrl = buildVaultDownloadUrl(downloadToken, getPublicApiBaseUrl(req));
    res.status(201).json({ file: { ...safeFile, downloadUrl } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid request" });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.delete("/vault/:id", requireAddon(FILE_VAULT_ADDON_SLUG), async (req, res, next) => {
  try {
    const deleted = await deleteMailVaultFile(req.auth!.user.id, String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: "Vault file not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const pinDocumentSchema = z.object({
  isPinned: z.boolean(),
});

mailRouter.get("/documents", async (req, res, next) => {
  try {
    const documents = await listUserDocuments(req.auth!.user.id);
    res.json({ documents });
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/documents/attachable/career", requireAddon(JOB_HUNTER_ADDON_SLUG), async (req, res, next) => {
  try {
    const documents = await listAttachableCareerDocuments(req.auth!.user.id);
    res.json({ documents });
  } catch (err) {
    next(err);
  }
});

mailRouter.patch("/documents/:id/pin", async (req, res, next) => {
  try {
    const body = pinDocumentSchema.parse(req.body);
    const document = await setUserDocumentPinned(req.auth!.user.id, String(req.params.id), body.isPinned);
    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json({ document });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    next(err);
  }
});

mailRouter.get("/documents/:id/download", async (req, res, next) => {
  try {
    const auth = req.auth!;
    const downloaded = await getUserDocumentDownload(auth.user.id, auth.user.tenant.id, String(req.params.id));
    if (!downloaded) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.setHeader("Content-Type", downloaded.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${downloaded.filename}"`);
    res.send(downloaded.buffer);
  } catch (err) {
    next(err);
  }
});

const senderCleanupSchema = z.object({
  folder: z.string().min(1),
  senderKey: z.string().min(1),
  action: z.enum(["delete", "archive", "markRead"]),
});

const messageUnsubscribeSchema = z.object({
  folder: z.string().min(1),
  uid: z.coerce.number().int().positive(),
  preferredUrl: z.string().url().optional(),
});

mailRouter.get("/cleanup/senders", requireAddon(INBOX_CLEANUP_ADDON_SLUG), async (req, res, next) => {
  try {
    const folder = typeof req.query.folder === "string" && req.query.folder.trim() ? req.query.folder : "INBOX";
    const result = await listCleanupSenders(await mailCredentials(req), folder);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

mailRouter.post("/cleanup/senders/action", requireAddon(INBOX_CLEANUP_ADDON_SLUG), async (req, res, next) => {
  try {
    const body = senderCleanupSchema.parse(req.body);
    const result = await runSenderCleanup(
      await mailCredentials(req),
      body.folder,
      body.senderKey,
      body.action,
    );
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid request" });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.get("/cleanup/unsubscribe", requireAddon(INBOX_CLEANUP_ADDON_SLUG), async (req, res, next) => {
  try {
    const folder = typeof req.query.folder === "string" ? req.query.folder : "";
    const uid = Number(req.query.uid);
    if (!folder || !Number.isFinite(uid) || uid <= 0) {
      res.status(400).json({ error: "folder and uid are required" });
      return;
    }
    const result = await getUnsubscribeOptionsForMessage(await mailCredentials(req), folder, uid);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

mailRouter.post("/cleanup/unsubscribe", requireAddon(INBOX_CLEANUP_ADDON_SLUG), async (req, res, next) => {
  try {
    const body = messageUnsubscribeSchema.parse(req.body);
    const auth = req.auth!;
    const result = await executeMessageUnsubscribe({
      tenantId: auth.user.tenant.id,
      userId: auth.user.id,
      credentials: await mailCredentials(req),
      folder: body.folder,
      uid: body.uid,
      preferredUrl: body.preferredUrl,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid request" });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.get("/cleanup/logs", requireAddon(INBOX_CLEANUP_ADDON_SLUG), async (req, res, next) => {
  try {
    const logs = await listUnsubscribeLogs(req.auth!.user.id);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

const attachmentCategorySchema = z.object({
  category: z.enum(ATTACHMENT_CATEGORIES as unknown as [string, ...string[]]),
});

const attachmentScanSchema = z.object({
  folder: z.string().min(1).default("INBOX"),
});

mailRouter.get("/attachments/categories", requireAddon(ATTACHMENT_CATEGORIZE_ADDON_SLUG), async (req, res, next) => {
  try {
    const categories = await listCategorySummary(req.auth!.user.id);
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/attachments/categorized", requireAddon(ATTACHMENT_CATEGORIZE_ADDON_SLUG), async (req, res, next) => {
  try {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const folder = typeof req.query.folder === "string" ? req.query.folder : undefined;
    const attachments = await listCategorizedAttachments(req.auth!.user.id, { category, folder });
    res.json({ attachments });
  } catch (err) {
    next(err);
  }
});

mailRouter.post("/attachments/scan", requireAddon(ATTACHMENT_CATEGORIZE_ADDON_SLUG), async (req, res, next) => {
  try {
    const body = attachmentScanSchema.parse(req.body ?? {});
    const auth = req.auth!;
    const result = await scanAndCategorizeAttachments({
      tenantId: auth.user.tenant.id,
      userId: auth.user.id,
      credentials: await mailCredentials(req),
      folder: body.folder,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid request" });
      return;
    }
    next(err);
  }
});

mailRouter.get("/attachments/message", requireAddon(ATTACHMENT_CATEGORIZE_ADDON_SLUG), async (req, res, next) => {
  try {
    const folder = typeof req.query.folder === "string" ? req.query.folder : "";
    const uid = Number(req.query.uid);
    if (!folder || !Number.isFinite(uid) || uid <= 0) {
      res.status(400).json({ error: "folder and uid are required" });
      return;
    }
    const auth = req.auth!;
    const result = await categorizeMessageAttachments({
      tenantId: auth.user.tenant.id,
      userId: auth.user.id,
      credentials: await mailCredentials(req),
      folder,
      uid,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

mailRouter.patch("/attachments/:id/category", requireAddon(ATTACHMENT_CATEGORIZE_ADDON_SLUG), async (req, res, next) => {
  try {
    const body = attachmentCategorySchema.parse(req.body);
    const updated = await updateAttachmentCategory(req.auth!.user.id, String(req.params.id), body.category);
    if (!updated) {
      res.status(404).json({ error: "Attachment record not found" });
      return;
    }
    res.json({ attachment: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Invalid request" });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.post("/attachments/:id/vault", requireAddon(ATTACHMENT_CATEGORIZE_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const result = await exportCategorizedAttachmentToVault({
      tenantId: auth.user.tenant.id,
      userId: auth.user.id,
      credentials: await mailCredentials(req),
      recordId: String(req.params.id),
    });
    if (!result) {
      res.status(404).json({ error: "Attachment record not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

const esignUploadSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  dataBase64: z.string().min(1),
  signerEmail: z.string().email(),
  signerName: z.string().min(1),
  subject: z.string().min(1),
  message: z.string().default(""),
});

const esignFromAttachmentSchema = z.object({
  folder: z.string().min(1),
  messageUid: z.coerce.number().int().positive(),
  partId: z.string().min(1),
  signerEmail: z.string().email(),
  signerName: z.string().min(1),
  subject: z.string().min(1),
  message: z.string().default(""),
  messageSubjectSnapshot: z.string().optional(),
});

mailRouter.get("/esign", requireAddon(ESIGN_FROM_EMAIL_ADDON_SLUG), async (req, res, next) => {
  try {
    const requests = await listEsignRequests(req.auth!.user.id, getPublicApiBaseUrl(req));
    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/esign/mime-types", requireAddon(ESIGN_FROM_EMAIL_ADDON_SLUG), async (_req, res) => {
  res.json({ mimeTypes: Object.keys(ESIGN_DOCUMENT_MIME) });
});

mailRouter.get("/esign/:id", requireAddon(ESIGN_FROM_EMAIL_ADDON_SLUG), async (req, res, next) => {
  try {
    const request = await getEsignRequest(req.auth!.user.id, String(req.params.id), getPublicApiBaseUrl(req));
    if (!request) {
      res.status(404).json({ error: "E-sign request not found" });
      return;
    }
    res.json({ request });
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/esign/:id/compose-handoff", requireAddon(ESIGN_FROM_EMAIL_ADDON_SLUG), async (req, res, next) => {
  try {
    const request = await getEsignRequest(req.auth!.user.id, String(req.params.id), getPublicApiBaseUrl(req));
    if (!request) {
      res.status(404).json({ error: "E-sign request not found" });
      return;
    }
    res.json({
      compose: buildEsignComposeHandoff({
        signerEmail: request.signerEmail,
        signerName: request.signerName,
        subject: request.subject,
        message: request.message,
        documentName: request.documentName,
        signingUrl: request.signingUrl,
        documentDownloadUrl: request.documentDownloadUrl,
      }),
    });
  } catch (err) {
    next(err);
  }
});

mailRouter.post("/esign/upload", requireAddon(ESIGN_FROM_EMAIL_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const body = esignUploadSchema.parse(req.body);
    if (!ESIGN_DOCUMENT_MIME[body.mimeType]) {
      res.status(400).json({ error: "Only PDF and Word documents can be sent for e-sign" });
      return;
    }
    const request = await createEsignRequestFromUpload({
      tenantId: auth.user.tenant.id,
      userId: auth.user.id,
      ...body,
      apiPublicBase: getPublicApiBaseUrl(req),
    });
    res.status(201).json({ request });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.post("/esign/from-attachment", requireAddon(ESIGN_FROM_EMAIL_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const body = esignFromAttachmentSchema.parse(req.body);
    const request = await createEsignRequestFromAttachment({
      tenantId: auth.user.tenant.id,
      userId: auth.user.id,
      credentials: await mailCredentials(req),
      ...body,
      apiPublicBase: getPublicApiBaseUrl(req),
    });
    res.status(201).json({ request });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.post("/esign/:id/refresh", requireAddon(ESIGN_FROM_EMAIL_ADDON_SLUG), async (req, res, next) => {
  try {
    const request = await refreshEsignRequestStatus(
      req.auth!.user.id,
      String(req.params.id),
      getPublicApiBaseUrl(req),
    );
    if (!request) {
      res.status(404).json({ error: "E-sign request not found" });
      return;
    }
    res.json({ request });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

const slaSettingsSchema = z.object({
  responseHours: z.coerce.number().int().min(1).max(720).optional(),
  atRiskRatio: z.coerce.number().min(0.1).max(0.99).optional(),
  scanFolder: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

mailRouter.get("/sla/settings", requireAddon(EMAIL_SLA_TRACKER_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const settings = await getEmailSlaSettings(auth.user.tenant.id, auth.user.id);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

mailRouter.put("/sla/settings", requireAddon(EMAIL_SLA_TRACKER_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const body = slaSettingsSchema.parse(req.body);
    const settings = await updateEmailSlaSettings(auth.user.tenant.id, auth.user.id, body);
    res.json({ settings });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    next(err);
  }
});

mailRouter.get("/sla/threads", requireAddon(EMAIL_SLA_TRACKER_ADDON_SLUG), async (req, res, next) => {
  try {
    const allowed = new Set(["open", "at_risk", "breached", "responded", "dismissed"]);
    const statusParam = req.query.status ? String(req.query.status) : undefined;
    const status = statusParam && allowed.has(statusParam) ? (statusParam as MailSlaThreadStatus) : undefined;
    const threads = await listEmailSlaThreads(req.auth!.user.id, status);
    res.json({ threads });
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/sla/alerts", requireAddon(EMAIL_SLA_TRACKER_ADDON_SLUG), async (req, res, next) => {
  try {
    const alerts = await listEmailSlaAlerts(req.auth!.user.id);
    res.json({ alerts });
  } catch (err) {
    next(err);
  }
});

mailRouter.post("/sla/scan", requireAddon(EMAIL_SLA_TRACKER_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const folder = req.body?.folder ? String(req.body.folder) : undefined;
    const result = await scanEmailSlaThreads({
      tenantId: auth.user.tenant.id,
      userId: auth.user.id,
      credentials: await mailCredentials(req),
      folder,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.post("/sla/threads/:id/dismiss", requireAddon(EMAIL_SLA_TRACKER_ADDON_SLUG), async (req, res, next) => {
  try {
    const thread = await dismissEmailSlaThread(req.auth!.user.id, String(req.params.id));
    if (!thread) {
      res.status(404).json({ error: "SLA thread not found" });
      return;
    }
    res.json({ thread });
  } catch (err) {
    next(err);
  }
});

mailRouter.post("/sla/alerts/:id/acknowledge", requireAddon(EMAIL_SLA_TRACKER_ADDON_SLUG), async (req, res, next) => {
  try {
    const alert = await acknowledgeEmailSlaAlert(req.auth!.user.id, String(req.params.id));
    if (!alert) {
      res.status(404).json({ error: "SLA alert not found" });
      return;
    }
    res.json({ alert });
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/sla/threads/:id/compose-handoff", requireAddon(EMAIL_SLA_TRACKER_ADDON_SLUG), async (req, res, next) => {
  try {
    const compose = await getEmailSlaComposeHandoff(req.auth!.user.id, String(req.params.id));
    if (!compose) {
      res.status(404).json({ error: "SLA thread not found" });
      return;
    }
    res.json({ compose });
  } catch (err) {
    next(err);
  }
});

mailRouter.post("/sla/reports/export", requireAddon(EMAIL_SLA_TRACKER_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const report = await exportEmailSlaReport({
      tenantId: auth.user.tenant.id,
      userId: auth.user.id,
      apiPublicBase: getPublicApiBaseUrl(req),
    });
    res.status(201).json({ report });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

const jobHunterSettingsSchema = z.object({
  regionCode: z.enum(["US", "CA", "UK", "ME", "INTL"]).optional(),
  enabled: z.boolean().optional(),
  pause90Days: z.boolean().optional(),
  clearPause: z.boolean().optional(),
  manualJobHuntingOverride: z.boolean().optional(),
  mailAccountScan: z
    .array(
      z.object({
        mailAccountId: z.string().uuid(),
        scanEnabled: z.boolean(),
      }),
    )
    .optional(),
});

mailRouter.get("/job-hunter/consent", requireAddon(JOB_HUNTER_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const consent = await getJobHunterConsentStatus(auth.user.tenant.id, auth.user.id);
    res.json({ consent });
  } catch (err) {
    next(err);
  }
});

mailRouter.post("/job-hunter/consent", requireAddon(JOB_HUNTER_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const settings = await acceptJobHunterTierBDisclosure(auth.user.tenant.id, auth.user.id);
    res.status(201).json({ settings });
  } catch (err) {
    next(err);
  }
});

mailRouter.get("/job-hunter/settings", requireAddon(JOB_HUNTER_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const settings = await getJobHunterSettings(auth.user.tenant.id, auth.user.id);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

mailRouter.put("/job-hunter/settings", requireAddon(JOB_HUNTER_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const body = jobHunterSettingsSchema.parse(req.body);
    const settings = await updateJobHunterSettings(auth.user.tenant.id, auth.user.id, body);
    res.json({ settings });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

mailRouter.post("/job-hunter/inferences/delete", requireAddon(JOB_HUNTER_ADDON_SLUG), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const settings = await deleteJobHunterInferences(auth.user.tenant.id, auth.user.id);
    res.json({ settings });
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
