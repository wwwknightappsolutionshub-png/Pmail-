import { FormEvent, useState } from "react";
import { api } from "../api/client";
import "./SendForSignatureButton.css";

const ESIGN_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

interface SendForSignatureButtonProps {
  folder: string;
  uid: number;
  messageSubject: string;
  attachment: { partId: string; filename: string; contentType?: string };
  enabled: boolean;
  onCreated?: (handoff: { to: string; subject: string; html: string; text: string }) => void;
}

export function SendForSignatureButton({
  folder,
  uid,
  messageSubject,
  attachment,
  enabled,
  onCreated,
}: SendForSignatureButtonProps) {
  const [open, setOpen] = useState(false);
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [subject, setSubject] = useState(`Please sign: ${attachment.filename}`);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!enabled) return null;
  if (attachment.contentType && !ESIGN_MIME.has(attachment.contentType)) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await api.createEsignFromAttachment({
        folder,
        messageUid: uid,
        partId: attachment.partId,
        signerEmail: signerEmail.trim(),
        signerName: signerName.trim(),
        subject: subject.trim(),
        message: message.trim(),
        messageSubjectSnapshot: messageSubject,
      });
      const handoff = await api.getEsignComposeHandoff(result.request.id);
      setOpen(false);
      onCreated?.(handoff.compose);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send for signature");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button type="button" className="send-for-signature-btn" onClick={() => setOpen(true)}>
        Send for signature
      </button>
      {open ? (
        <div className="send-for-signature-overlay" role="presentation" onClick={() => setOpen(false)}>
          <form
            className="send-for-signature-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void handleSubmit(e)}
          >
            <h3>Send for signature</h3>
            <p className="send-for-signature-file">{attachment.filename}</p>
            <label>
              <span>Signer email</span>
              <input type="email" required value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
            </label>
            <label>
              <span>Signer name</span>
              <input type="text" required value={signerName} onChange={(e) => setSignerName(e.target.value)} />
            </label>
            <label>
              <span>Subject</span>
              <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label>
              <span>Message</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
            </label>
            {error ? <p className="send-for-signature-error">{error}</p> : null}
            <div className="send-for-signature-actions">
              <button type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send via Dropbox Sign"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
