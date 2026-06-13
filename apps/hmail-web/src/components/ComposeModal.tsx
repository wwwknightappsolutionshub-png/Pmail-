import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { htmlToPlainText, RichTextEditor } from "./RichTextEditor";
import "./ComposeModal.css";

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
}

interface ComposeModalProps {
  open: boolean;
  onClose: () => void;
  onSent: (sentFolder?: string) => void;
  initial?: ComposeInitial;
}

const MAX_ATTACHMENTS = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

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

export function ComposeModal({ open, onClose, onSent, initial }: ComposeModalProps) {
  const { user } = useAuth();
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
  const [priority, setPriority] = useState<"normal" | "high">("normal");
  const [requestReadReceipt, setRequestReadReceipt] = useState(false);
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
    setBodyHtml(initial?.html ?? (initial?.text ? `<p>${initial.text.replace(/\n/g, "<br>")}</p>` : ""));
    setAttachments([]);
    setPriority("normal");
    setRequestReadReceipt(false);
    setError("");
    setDiscardConfirm(false);
  }, [open, initial]);

  if (!open) return null;

  const totalAttachmentBytes = attachments.reduce((sum, a) => sum + a.file.size, 0);

  const handleAddAttachments = (files: FileList | null) => {
    if (!files) return;
    setError("");

    const incoming = Array.from(files);
    if (attachments.length + incoming.length > MAX_ATTACHMENTS) {
      setError(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
      return;
    }

    for (const file of incoming) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name} exceeds ${formatBytes(MAX_FILE_BYTES)} limit.`);
        return;
      }
    }

    if (totalAttachmentBytes + incoming.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_BYTES) {
      setError(`Total attachments cannot exceed ${formatBytes(MAX_TOTAL_BYTES)}.`);
      return;
    }

    setAttachments((prev) => [
      ...prev,
      ...incoming.map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
      })),
    ]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDiscard = () => {
    if (!discardConfirm) {
      setDiscardConfirm(true);
      return;
    }
    onClose();
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
        attachments: encodedAttachments.length ? encodedAttachments : undefined,
      });

      onSent(result.sentFolder);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="compose-overlay" onClick={onClose}>
      <div className="compose-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="compose-header">
          <div>
            <h3 className="compose-title">{modeTitle(mode)}</h3>
            <p className="compose-subtitle">Enterprise mail composer</p>
          </div>
          <div className="compose-header-actions">
            <button type="button" className="compose-icon-btn" onClick={handleDiscard} title="Discard">
              {discardConfirm ? "Confirm discard" : "Discard"}
            </button>
            <button type="button" className="compose-icon-btn" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="compose-form">
          <div className="compose-form-body">
          <div className="compose-field compose-field--from">
            <span className="compose-label">From</span>
            <span className="compose-from-value">{user?.email}</span>
          </div>

          <div className="compose-field">
            <span className="compose-label">To</span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@company.com; colleague@company.com"
              required
            />
            <div className="compose-field-actions">
              {!showCc ? (
                <button type="button" className="compose-link-btn" onClick={() => setShowCc(true)}>
                  Cc
                </button>
              ) : null}
              {!showBcc ? (
                <button type="button" className="compose-link-btn" onClick={() => setShowBcc(true)}>
                  Bcc
                </button>
              ) : null}
            </div>
          </div>

          {showCc ? (
            <div className="compose-field">
              <span className="compose-label">Cc</span>
              <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Optional recipients" />
            </div>
          ) : null}

          {showBcc ? (
            <div className="compose-field">
              <span className="compose-label">Bcc</span>
              <input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="Hidden recipients" />
            </div>
          ) : null}

          <div className="compose-field">
            <span className="compose-label">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              required
            />
          </div>

          <div className="compose-editor-wrap">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                handleAddAttachments(e.target.files);
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
                  <button
                    type="button"
                    className="rte-tool rte-tool--attach"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Attach
                  </button>
                </>
              }
            />
          </div>

          {attachments.length > 0 ? (
            <div className="compose-attachments">
              <p className="compose-attachments-title">Attachments ({attachments.length})</p>
              <ul>
                {attachments.map((att) => (
                  <li key={att.id}>
                    <span className="compose-attachment-name">{att.file.name}</span>
                    <span className="compose-attachment-size">{formatBytes(att.file.size)}</span>
                    <button type="button" onClick={() => removeAttachment(att.id)} aria-label="Remove attachment">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? <div className="compose-error">{error}</div> : null}
          </div>

          <footer className="compose-footer">
            <span className="compose-footer-meta">
              {attachments.length > 0
                ? `${attachments.length} file${attachments.length === 1 ? "" : "s"} · ${formatBytes(totalAttachmentBytes)}`
                : "HTML + plain text"}
            </span>
            <div className="compose-footer-actions">
              <button type="button" className="compose-secondary-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="compose-primary-btn" disabled={sending}>
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
