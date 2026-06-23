import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAddons } from "../context/AddonContext";
import "./AttachmentCategoryBadges.css";

type CategoryRecord = {
  partId: string;
  category: string;
  categoryLabel: string;
  id: string;
  vaultFileId: string | null;
};

interface AttachmentCategoryBadgesProps {
  folder: string;
  uid: number;
  enabled: boolean;
  attachments: Array<{ partId: string; filename: string }>;
  onVaultExported?: (vaultFileId: string) => void;
}

export function AttachmentCategoryBadges({
  folder,
  uid,
  enabled,
  attachments,
  onVaultExported,
}: AttachmentCategoryBadgesProps) {
  const { hasAddon } = useAddons();
  const [records, setRecords] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const vaultEnabled = hasAddon("file-vault-functionality");

  useEffect(() => {
    if (!enabled) {
      setRecords([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    void api
      .categorizeMessageAttachments(folder, uid)
      .then((result) => {
        if (!cancelled) setRecords(result.attachments);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to categorize attachments");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, folder, uid]);

  const byPartId = useMemo(() => new Map(records.map((row) => [row.partId, row])), [records]);

  if (!enabled) return null;

  return (
    <div className="attachment-category-badges">
      {loading ? <p className="attachment-category-muted">Categorizing attachments…</p> : null}
      {error ? <p className="attachment-category-error">{error}</p> : null}
      {attachments.map((attachment) => {
        const record = byPartId.get(attachment.partId);
        if (!record) return null;
        return (
          <div key={attachment.partId} className="attachment-category-row">
            <span className="attachment-category-badge">{record.categoryLabel}</span>
            {vaultEnabled ? (
              <button
                type="button"
                className="attachment-category-vault-btn"
                disabled={exportingId === record.id}
                onClick={() => {
                  setExportingId(record.id);
                  setError("");
                  void api
                    .exportCategorizedAttachmentToVault(record.id)
                    .then((result) => {
                      onVaultExported?.(result.vaultFileId);
                    })
                    .catch((err) => {
                      setError(err instanceof Error ? err.message : "Vault export failed");
                    })
                    .finally(() => setExportingId(null));
                }}
              >
                {record.vaultFileId ? "In vault" : exportingId === record.id ? "Saving…" : "Save to vault"}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
