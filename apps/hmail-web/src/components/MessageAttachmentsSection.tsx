import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { useAddons } from "../context/AddonContext";
import { SendForSignatureButton } from "./SendForSignatureButton";
import "../components/MailToolbar.css";
import "./MessageAttachmentsSection.css";

type MailAttachment = {
  filename: string;
  contentType: string;
  size: number;
  partId: string;
};

type CategoryRecord = {
  partId: string;
  category: string;
  categoryLabel: string;
  id: string;
  vaultFileId: string | null;
};

type ComposeHandoff = { to: string; subject: string; html: string; text: string };

type Props = {
  folder: string;
  uid: number;
  messageSubject: string;
  attachments: MailAttachment[];
  categorizeEnabled: boolean;
  esignEnabled: boolean;
  onComposeHandoff: (handoff: ComposeHandoff) => void;
  onVaultExported: (vaultFileId: string) => void;
};

function isImageAttachment(attachment: MailAttachment): boolean {
  if (attachment.contentType.toLowerCase().startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|tiff?)$/i.test(attachment.filename);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function MessageAttachmentsSection({
  folder,
  uid,
  messageSubject,
  attachments,
  categorizeEnabled,
  esignEnabled,
  onComposeHandoff,
  onVaultExported,
}: Props) {
  const { hasAddon } = useAddons();
  const vaultEnabled = hasAddon("file-vault-functionality");
  const [imagesOpen, setImagesOpen] = useState(false);
  const [records, setRecords] = useState<CategoryRecord[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState("");

  const { images, other } = useMemo(() => {
    const imageList: MailAttachment[] = [];
    const otherList: MailAttachment[] = [];
    for (const attachment of attachments) {
      if (isImageAttachment(attachment)) imageList.push(attachment);
      else otherList.push(attachment);
    }
    return { images: imageList, other: otherList };
  }, [attachments]);

  const byPartId = useMemo(() => new Map(records.map((row) => [row.partId, row])), [records]);

  useEffect(() => {
    setImagesOpen(false);
  }, [folder, uid]);

  useEffect(() => {
    if (!categorizeEnabled || !imagesOpen || images.length === 0) return;
    let cancelled = false;
    setLoadingCategories(true);
    setCategoryError("");
    void api
      .categorizeMessageAttachments(folder, uid)
      .then((result) => {
        if (!cancelled) setRecords(result.attachments);
      })
      .catch((err) => {
        if (!cancelled) {
          setCategoryError(err instanceof Error ? err.message : "Failed to categorize attachments");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categorizeEnabled, imagesOpen, images.length, folder, uid]);

  if (attachments.length === 0) return null;

  const renderAttachmentRow = (att: MailAttachment, showVault: boolean) => {
    const record = byPartId.get(att.partId);
    return (
      <div key={att.partId} className="message-attachments-item">
        <a
          href={api.attachmentUrl(folder, uid, att.partId)}
          target="_blank"
          rel="noreferrer"
          className="message-attachments-item-link"
        >
          <span className="message-attachments-item-name">{att.filename}</span>
          <span className="message-attachments-item-size">{formatSize(att.size)}</span>
        </a>
        <div className="message-attachments-item-actions">
          <SendForSignatureButton
            folder={folder}
            uid={uid}
            messageSubject={messageSubject}
            attachment={{ partId: att.partId, filename: att.filename, contentType: att.contentType }}
            enabled={esignEnabled}
            onCreated={onComposeHandoff}
          />
          {showVault && vaultEnabled && record ? (
            <button
              type="button"
              className="message-attachments-vault-btn"
              disabled={exportingId === record.id}
              onClick={() => {
                setExportingId(record.id);
                setCategoryError("");
                void api
                  .exportCategorizedAttachmentToVault(record.id)
                  .then((result) => {
                    onVaultExported(result.vaultFileId);
                  })
                  .catch((err) => {
                    setCategoryError(err instanceof Error ? err.message : "Vault export failed");
                  })
                  .finally(() => setExportingId(null));
              }}
            >
              {record.vaultFileId ? "In vault" : exportingId === record.id ? "Saving…" : "Save to vault"}
            </button>
          ) : null}
          {showVault && record?.categoryLabel ? (
            <span className="message-attachments-category">{record.categoryLabel}</span>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="attachments message-attachments-section">
      {other.map((att) => (
        <span key={att.partId} className="attachment-row">
          <a href={api.attachmentUrl(folder, uid, att.partId)} target="_blank" rel="noreferrer">
            {att.filename} ({formatSize(att.size)})
          </a>
          <SendForSignatureButton
            folder={folder}
            uid={uid}
            messageSubject={messageSubject}
            attachment={{ partId: att.partId, filename: att.filename, contentType: att.contentType }}
            enabled={esignEnabled}
            onCreated={onComposeHandoff}
          />
        </span>
      ))}

      {images.length > 0 ? (
        <button
          type="button"
          className="message-attachments-images-link"
          onClick={() => setImagesOpen(true)}
        >
          Images ({images.length})
        </button>
      ) : null}

      {imagesOpen
        ? createPortal(
            <div
              className="mail-modal-overlay message-attachments-modal-overlay"
              onClick={() => setImagesOpen(false)}
            >
              <div
                className="mail-modal message-attachments-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="message-attachments-modal-title"
              >
                <header className="mail-modal-header">
                  <h3 id="message-attachments-modal-title">Images ({images.length})</h3>
                  <button
                    type="button"
                    className="mail-modal-close"
                    onClick={() => setImagesOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </header>
                <div className="mail-modal-body message-attachments-modal-body">
                  {loadingCategories ? (
                    <p className="message-attachments-muted">Loading image options…</p>
                  ) : null}
                  {categoryError ? (
                    <p className="message-attachments-error" role="alert">
                      {categoryError}
                    </p>
                  ) : null}
                  <div className="message-attachments-list">
                    {images.map((att) => renderAttachmentRow(att, categorizeEnabled))}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
