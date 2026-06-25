import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, type UserDocumentRow } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useAddons } from "../context/AddonContext";
import { htmlToPlainText, RichTextEditor } from "./RichTextEditor";
import type { PendingUndoSend } from "./UndoSendToast";
import { isCvLikeAttachment } from "../lib/cvAttachmentDetect";
import "@hostnet-demo/components/demo/BespokeMailDemo.css";
import { RecipientTypeahead } from "./RecipientTypeahead";
import "./ComposeModal.css";

export type { PendingUndoSend };

export type ComposeMode = "new" | "reply" | "replyAll" | "forward";

export interface ComposeAttachment {
  id: string;
  file: File;
}

export interface ComposeInitial {
  mode?: ComposeMode;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  html?: string;
  text?: string;
  inReplyTo?: string;
  references?: string;
  vaultFileIds?: string[];
}

interface ComposeModalProps {
  open: boolean;
  onClose: () => void;
  onSent: (result?: { sentFolder?: string; pendingUndo?: PendingUndoSend }) => void;
  initial?: ComposeInitial;
  onCvAttachmentAdded?: (file: File) => void;
  jobHunterEnabled?: boolean;
  themeVersion?: "dark" | "light";
}

const MAX_ATTACHMENTS = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const VAULT_MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

interface ComposeVaultFile {
  id: string;
  originalName: string;
  fileSizeBytes: number;
}

interface ComposeCareerDocument {
  id: string;
  filename: string;
  mimeType: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function modeTitle(mode: ComposeMode) {
  switch (mode) {
    case "reply":
      return "Reply";
    case "replyAll":
      return "Reply all";
    case "forward":
      return "Forward";
    default:
      return "New message";
  }
}

export function ComposeModal({
  open,
  onClose,
  onSent,
  initial,
  onCvAttachmentAdded,
  jobHunterEnabled,
  themeVersion = "dark",
}: ComposeModalProps) {
  const { user } = useAuth();
  const { hasAddon } = useAddons();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ComposeMode>("new");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([]);
  const [vaultFiles, setVaultFiles] = useState<ComposeVaultFile[]>([]);
  const [careerDocuments, setCareerDocuments] = useState<ComposeCareerDocument[]>([]);
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [careerPickerOpen, setCareerPickerOpen] = useState(false);
  const [vaultLibrary, setVaultLibrary] = useState<ComposeVaultFile[]>([]);
  const [careerLibrary, setCareerLibrary] = useState<UserDocumentRow[]>([]);
  const [vaultLibraryLoading, setVaultLibraryLoading] = useState(false);
  const [careerLibraryLoading, setCareerLibraryLoading] = useState(false);
  const [uploadingVault, setUploadingVault] = useState(false);
  const [priority, setPriority] = useState<"normal" | "high">("normal");
  const [requestReadReceipt, setRequestReadReceipt] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [fromDisplayName, setFromDisplayName] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [discardConfirm, setDiscardConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;

    const nextMode = initial?.mode ?? "new";
    setMode(nextMode);
    setTo(initial?.to ?? "");
    setCc(initial?.cc ?? "");
    setBcc(initial?.bcc ?? "");
    setShowCc(Boolean(initial?.cc));
    setShowBcc(Boolean(initial?.bcc));
    setSubject(initial?.subject ?? "");
    const initialHtml = initial?.html ?? (initial?.text ? `<p>${initial.text.replace(/\n/g, "<br>")}</p>` : "");
    setAttachments([]);
    setVaultFiles([]);
    setCareerDocuments([]);
    setVaultPickerOpen(false);
    setCareerPickerOpen(false);
    setVaultLibrary([]);
    setCareerLibrary([]);
    const vaultSeedIds = initial?.vaultFileIds ?? [];
    if (vaultSeedIds.length > 0 && hasAddon("file-vault-functionality")) {
      void api
        .listVaultFiles()
        .then(({ files }) => {
          const selected = files.filter((file) => vaultSeedIds.includes(file.id));
          setVaultFiles(
            selected.map((file) => ({
              id: file.id,
              originalName: file.originalName,
              fileSizeBytes: file.fileSizeBytes,
              downloadUrl: file.downloadUrl,
            })),
          );
        })
        .catch(() => undefined);
    }
    setPriority("normal");
    setRequestReadReceipt(false);
    setTrackingEnabled(false);
    setShowSchedule(false);
    setScheduleDate("");
    setScheduleTime("09:00");
    setMinimized(false);
    setMaximized(false);
    setShowSendMenu(false);
    setPosition({ x: 0, y: 0 });
    setDragging(null);
    setError("");
    setDiscardConfirm(false);

    void api
      .composeSettings()
      .then(({ settings }) => {
        setFromDisplayName(settings.displayName);
        if (nextMode === "new") {
          const activeSig = settings.signatures.find((s) => s.id === settings.activeSignatureId);
          if (activeSig?.body) {
            const sigBlock = activeSig.body.trim();
            setBodyHtml(initialHtml ? `${initialHtml}<br><br>${sigBlock}` : sigBlock);
            return;
          }
          if (settings.defaultBrandedSignature?.html) {
            const sigBlock = settings.defaultBrandedSignature.html.trim();
            setBodyHtml(initialHtml ? `${initialHtml}${sigBlock}` : sigBlock);
            return;
          }
        }
        setBodyHtml(initialHtml);
      })
      .catch(() => setBodyHtml(initialHtml));
  }, [open, initial, hasAddon]);

  useEffect(() => {
    if (!dragging) return undefined;

    const handleMouseMove = (event: MouseEvent) => {
      setPosition({
        x: dragging.originX + event.clientX - dragging.startX,
        y: dragging.originY + event.clientY - dragging.startY,
      });
    };
    const handleMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  if (!open) return null;

  const totalAttachmentBytes = attachments.reduce((sum, a) => sum + a.file.size, 0);
  const totalVaultBytes = vaultFiles.reduce((sum, file) => sum + file.fileSizeBytes, 0);
  const totalAttachmentItems = attachments.length + vaultFiles.length + careerDocuments.length;

  const handleAddAttachments = async (files: FileList | null) => {
    if (!files) return;
    setError("");

    const incoming = Array.from(files);
    const totalItems = totalAttachmentItems + incoming.length;
    if (totalItems > MAX_ATTACHMENTS) {
      setError(`Maximum ${MAX_ATTACHMENTS} attachments or vault links allowed.`);
      return;
    }

    const smallFiles: File[] = [];
    const largeFiles: File[] = [];

    for (const file of incoming) {
      if (file.size > VAULT_MAX_FILE_BYTES) {
        setError(`${file.name} exceeds ${formatBytes(VAULT_MAX_FILE_BYTES)} vault limit.`);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        if (!hasAddon("file-vault-functionality")) {
          setError(
            `${file.name} exceeds ${formatBytes(MAX_FILE_BYTES)}. Enable File Vault to send larger files as secure links.`,
          );
          return;
        }
        largeFiles.push(file);
        continue;
      }
      smallFiles.push(file);
    }

    if (smallFiles.length > 0) {
      if (totalAttachmentBytes + smallFiles.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_BYTES) {
        setError(`Inline attachments cannot exceed ${formatBytes(MAX_TOTAL_BYTES)} total.`);
        return;
      }
      setAttachments((prev) => [
        ...prev,
        ...smallFiles.map((file) => ({
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
        })),
      ]);

      if (jobHunterEnabled && onCvAttachmentAdded) {
        for (const file of smallFiles) {
          if (isCvLikeAttachment(file)) {
            onCvAttachmentAdded(file);
            break;
          }
        }
      }
    }

    if (largeFiles.length === 0) {
      return;
    }

    setUploadingVault(true);
    try {
      const uploaded: ComposeVaultFile[] = [];
      for (const file of largeFiles) {
        const content = await readFileAsBase64(file);
        const result = await api.uploadVaultFile({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          dataBase64: content,
        });
        uploaded.push({
          id: result.file.id,
          originalName: result.file.originalName,
          fileSizeBytes: result.file.fileSizeBytes,
        });
      }
      setVaultFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vault upload failed");
    } finally {
      setUploadingVault(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const removeVaultFile = (id: string) => {
    setVaultFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const removeCareerDocument = (id: string) => {
    setCareerDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const openVaultPicker = async () => {
    setVaultPickerOpen(true);
    setVaultLibraryLoading(true);
    setError("");
    try {
      const { files } = await api.listVaultFiles();
      setVaultLibrary(
        files.map((file) => ({
          id: file.id,
          originalName: file.originalName,
          fileSizeBytes: file.fileSizeBytes,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vault files");
    } finally {
      setVaultLibraryLoading(false);
    }
  };

  const addVaultFileFromLibrary = (file: ComposeVaultFile) => {
    if (vaultFiles.some((existing) => existing.id === file.id)) {
      return;
    }
    if (totalAttachmentItems + 1 > MAX_ATTACHMENTS) {
      setError(`Maximum ${MAX_ATTACHMENTS} attachments or vault links allowed.`);
      return;
    }
    setVaultFiles((prev) => [...prev, file]);
    setVaultPickerOpen(false);
  };

  const openCareerPicker = async () => {
    setCareerPickerOpen(true);
    setCareerLibraryLoading(true);
    setError("");
    try {
      const { documents } = await api.listAttachableCareerDocuments();
      setCareerLibrary(documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load career documents");
    } finally {
      setCareerLibraryLoading(false);
    }
  };

  const addCareerDocumentFromLibrary = (document: UserDocumentRow) => {
    if (careerDocuments.some((existing) => existing.id === document.id)) {
      return;
    }
    if (totalAttachmentItems + 1 > MAX_ATTACHMENTS) {
      setError(`Maximum ${MAX_ATTACHMENTS} attachments or vault links allowed.`);
      return;
    }
    setCareerDocuments((prev) => [
      ...prev,
      { id: document.id, filename: document.filename, mimeType: document.mimeType },
    ]);
    setCareerPickerOpen(false);
  };

  const handleDiscard = () => {
    if (!discardConfirm) {
      setDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const handleScheduleSend = async () => {
    setSending(true);
    setError("");

    const plain = htmlToPlainText(bodyHtml);
    if (!to.trim() || !subject.trim() || !plain || !scheduleDate || !scheduleTime) {
      setError("To, subject, body, schedule date, and schedule time are required.");
      setSending(false);
      return;
    }

    try {
      await api.createScheduled({
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        text: plain,
        html: bodyHtml,
        scheduledFor: new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString(),
      });
      onSent(undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule message");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");

    const plain = htmlToPlainText(bodyHtml);
    if (!plain) {
      setError("Message body cannot be empty.");
      setSending(false);
      return;
    }

    try {
      const encodedAttachments = await Promise.all(
        attachments.map(async (att) => ({
          filename: att.file.name,
          content: await readFileAsBase64(att.file),
          contentType: att.file.type || "application/octet-stream",
        })),
      );

      const result = await api.send({
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        text: plain,
        html: bodyHtml,
        inReplyTo: initial?.inReplyTo,
        references: initial?.references,
        priority,
        requestReadReceipt,
        trackingEnabled: hasAddon("open-tracking") ? trackingEnabled : undefined,
        vaultFileIds: vaultFiles.length ? vaultFiles.map((file) => file.id) : undefined,
        userDocumentIds: careerDocuments.length ? careerDocuments.map((doc) => doc.id) : undefined,
        attachments: encodedAttachments.length ? encodedAttachments : undefined,
      });

      if (result.queued) {
        onSent({
          pendingUndo: {
            pendingId: result.pendingId,
            undoUntil: result.undoUntil,
            undoSeconds: result.undoSeconds,
            subject: result.subject,
            to: result.to,
          },
        });
        onClose();
        return;
      }

      onSent({ sentFolder: result.sentFolder });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const subjectLabel = subject.trim() || modeTitle(mode);
  const windowStyle = maximized ? undefined : { transform: `translate(${position.x}px, ${position.y}px)` };

  const composeWindow = minimized ? (
    <div className="gmail-compose gmail-compose--minimized" style={windowStyle}>
      <button type="button" className="gmail-compose__restore" onClick={() => setMinimized(false)}>
        {subjectLabel}
      </button>
      <button type="button" className="gmail-compose__win-btn" onClick={handleDiscard} aria-label="Discard">
        ×
      </button>
    </div>
  ) : (
    <div
      className={`gmail-compose${maximized ? " gmail-compose--maximized" : ""}`}
      role="dialog"
      aria-label={modeTitle(mode)}
      aria-modal="false"
      style={windowStyle}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <header
        className="gmail-compose__titlebar gmail-compose__titlebar--draggable"
        onMouseDown={(event) => {
          if (maximized) return;
          setDragging({
            startX: event.clientX,
            startY: event.clientY,
            originX: position.x,
            originY: position.y,
          });
        }}
      >
        <span>{subjectLabel}</span>
        <div className="gmail-compose__window-actions" onMouseDown={(event) => event.stopPropagation()}>
          <button type="button" className="gmail-compose__win-btn" onClick={() => setMinimized(true)} aria-label="Minimize">
            −
          </button>
          <button
            type="button"
            className="gmail-compose__win-btn"
            onClick={() => setMaximized((value) => !value)}
            aria-label={maximized ? "Restore" : "Maximize"}
          >
            {maximized ? "⧉" : "□"}
          </button>
          <button type="button" className="gmail-compose__win-btn" onClick={handleDiscard} aria-label="Discard">
            {discardConfirm ? "!" : "×"}
          </button>
        </div>
      </header>

      <form className="gmail-compose__form" onSubmit={handleSubmit}>
        <div className="gmail-compose__row">
          <span className="gmail-compose__label">From</span>
          <span className="gmail-compose__static">
            {fromDisplayName ? `${fromDisplayName} <${user?.email}>` : user?.email}
          </span>
        </div>

        <div className="gmail-compose__row gmail-compose__row--split">
          <span className="gmail-compose__label">To</span>
          <RecipientTypeahead value={to} onChange={setTo} placeholder="Recipients" />
          {!showCc && !showBcc ? (
            <button type="button" className="gmail-compose__cc-toggle" onClick={() => setShowCc(true)}>
              Cc Bcc
            </button>
          ) : null}
        </div>

        {showCc ? (
          <div className="gmail-compose__row">
            <span className="gmail-compose__label">Cc</span>
            <input
              className="gmail-compose__input"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Cc recipients"
            />
          </div>
        ) : null}

        {showBcc ? (
          <div className="gmail-compose__row">
            <span className="gmail-compose__label">Bcc</span>
            <input
              className="gmail-compose__input"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="Bcc recipients"
            />
          </div>
        ) : null}

        {showCc && !showBcc ? (
          <div className="gmail-compose__row gmail-compose__row--actions">
            <button type="button" className="gmail-compose__cc-toggle" onClick={() => setShowBcc(true)}>
              Bcc
            </button>
          </div>
        ) : null}

        <div className="gmail-compose__row">
          <span className="gmail-compose__label">Subject</span>
          <input
            className="gmail-compose__input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            required
          />
        </div>

        <div className="gmail-compose__editor">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              void handleAddAttachments(e.target.files);
              e.target.value = "";
            }}
          />
          <RichTextEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            placeholder="Write your message…"
            toolbarExtra={
              <>
                <label className="rte-toolbar-control">
                  <span className="rte-toolbar-control-label">Priority</span>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as "normal" | "high")}
                    aria-label="Priority"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="rte-toolbar-control rte-toolbar-control--check">
                  <input
                    type="checkbox"
                    checked={requestReadReceipt}
                    onChange={(e) => setRequestReadReceipt(e.target.checked)}
                  />
                  <span>Read receipt</span>
                </label>
                {hasAddon("open-tracking") ? (
                  <label className="rte-toolbar-control rte-toolbar-control--check">
                    <input
                      type="checkbox"
                      checked={trackingEnabled}
                      onChange={(e) => setTrackingEnabled(e.target.checked)}
                    />
                    <span>Open &amp; link tracking</span>
                  </label>
                ) : null}
                <button
                  type="button"
                  className="rte-tool rte-tool--attach"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingVault}
                >
                  {uploadingVault ? "Uploading…" : "Attach"}
                </button>
                {hasAddon("file-vault-functionality") ? (
                  <button type="button" className="rte-tool" onClick={() => void openVaultPicker()}>
                    From vault
                  </button>
                ) : null}
                {jobHunterEnabled ? (
                  <button type="button" className="rte-tool" onClick={() => void openCareerPicker()}>
                    Career CV
                  </button>
                ) : null}
              </>
            }
          />
        </div>

        {attachments.length > 0 || vaultFiles.length > 0 || careerDocuments.length > 0 ? (
          <div className="gmail-compose__attachments">
            {attachments.map((att) => (
              <div key={att.id} className="gmail-compose__attachment-chip">
                <span>📎 {att.file.name}</span>
                <button type="button" onClick={() => removeAttachment(att.id)} aria-label="Remove attachment">
                  ×
                </button>
              </div>
            ))}
            {vaultFiles.map((file) => (
              <div key={file.id} className="gmail-compose__attachment-chip">
                <span>🗄 {file.originalName}</span>
                <button type="button" onClick={() => removeVaultFile(file.id)} aria-label="Remove vault link">
                  ×
                </button>
              </div>
            ))}
            {careerDocuments.map((document) => (
              <div key={document.id} className="gmail-compose__attachment-chip">
                <span>📄 {document.filename}</span>
                <button type="button" onClick={() => removeCareerDocument(document.id)} aria-label="Remove career document">
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {vaultPickerOpen ? (
          <div className="gmail-compose__schedule-panel gmail-compose__picker-panel">
            <p className="gmail-compose__picker-title">Insert from file vault</p>
            {vaultLibraryLoading ? <p className="muted">Loading vault…</p> : null}
            {!vaultLibraryLoading && vaultLibrary.length === 0 ? <p className="muted">No vault files available.</p> : null}
            <ul className="gmail-compose__picker-list">
              {vaultLibrary.map((file) => (
                <li key={file.id}>
                  <span>{file.originalName}</span>
                  <button type="button" onClick={() => addVaultFileFromLibrary(file)}>
                    Insert
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="gmail-compose__discard" onClick={() => setVaultPickerOpen(false)}>
              Close
            </button>
          </div>
        ) : null}

        {careerPickerOpen ? (
          <div className="gmail-compose__schedule-panel gmail-compose__picker-panel">
            <p className="gmail-compose__picker-title">Attach Career CV</p>
            {careerLibraryLoading ? <p className="muted">Loading career documents…</p> : null}
            {!careerLibraryLoading && careerLibrary.length === 0 ? (
              <p className="muted">No career documents yet. Save a CV from Job Hunter first.</p>
            ) : null}
            <ul className="gmail-compose__picker-list">
              {careerLibrary.map((document) => (
                <li key={document.id}>
                  <span>{document.filename}</span>
                  <button type="button" onClick={() => addCareerDocumentFromLibrary(document)}>
                    Attach
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="gmail-compose__discard" onClick={() => setCareerPickerOpen(false)}>
              Close
            </button>
          </div>
        ) : null}

        {showSchedule ? (
          <div className="gmail-compose__schedule-panel">
            <label className="gmail-compose__schedule-field">
              <span>Date</span>
              <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
            </label>
            <label className="gmail-compose__schedule-field">
              <span>Time</span>
              <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={sending || !hasAddon("scheduled-send")}
              onClick={() => void handleScheduleSend()}
            >
              Schedule send
            </button>
          </div>
        ) : null}

        {error ? <div className="gmail-compose__error">{error}</div> : null}

        <footer className="gmail-compose__footer">
          <div className="gmail-compose__send-wrap">
            <button type="submit" className="gmail-compose__send" disabled={sending}>
              {sending ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              className="gmail-compose__send-menu"
              aria-label="Send options"
              onClick={() => setShowSendMenu((value) => !value)}
            >
              ▾
            </button>
            {showSendMenu ? (
              <div className="gmail-compose__send-dropdown">
                <button type="submit">Send now</button>
                <button
                  type="button"
                  disabled={!hasAddon("scheduled-send")}
                  onClick={() => {
                    setShowSchedule(true);
                    setShowSendMenu(false);
                  }}
                >
                  Schedule send
                </button>
              </div>
            ) : null}
          </div>

          <div className="gmail-compose__toolbar">
            <button type="button" className="gmail-compose__tool" title="Attach file" onClick={() => fileInputRef.current?.click()}>
              📎
            </button>
            {hasAddon("file-vault-functionality") ? (
              <button type="button" className="gmail-compose__tool" title="From vault" onClick={() => void openVaultPicker()}>
                🗄
              </button>
            ) : null}
          </div>

          <span className="gmail-compose__meta">
            {totalAttachmentItems > 0
              ? `${totalAttachmentItems} file${totalAttachmentItems === 1 ? "" : "s"} · ${formatBytes(totalAttachmentBytes + totalVaultBytes)}`
              : null}
          </span>

          <button type="button" className="gmail-compose__discard" onClick={onClose}>
            Discard
          </button>
        </footer>
      </form>
    </div>
  );

  return createPortal(
    <div className={`gmail-compose-portal${themeVersion === "light" ? " gmail-compose-portal--light" : ""}`}>
      {composeWindow}
    </div>,
    document.body,
  );
}
