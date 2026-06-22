import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { resolveFolderKind } from "./FolderNav";
import type { MailFolder, MailMessageSummary } from "../types/mail";

type Props = {
  inboxPath: string | undefined;
  onOpenMessage: (folder: string, uid: number) => void;
};

export function DocumentsPanel({ inboxPath, onOpenMessage }: Props) {
  const [messages, setMessages] = useState<MailMessageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!inboxPath) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api.messages(inboxPath, { page: 1, pageSize: 200, sortBy: "date", sortOrder: "desc" });
      setMessages(result.messages.filter((message) => message.hasAttachments));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [inboxPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => messages, [messages]);

  return (
    <div className="mail-view-panel documents-view-panel">
      <header className="mail-view-header">
        <h2>Documents</h2>
        <p>Messages with attachments from your mailbox.</p>
      </header>
      {loading ? <p className="mail-view-empty">Loading documents…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      {!loading && rows.length === 0 ? <p className="mail-view-empty">No messages with attachments found.</p> : null}
      {rows.length > 0 ? (
        <div className="documents-table-wrap">
          <table className="documents-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>From</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((message) => (
                <tr key={`${message.folder}-${message.uid}`}>
                  <td>
                    <button
                      type="button"
                      className="documents-link-btn"
                      onClick={() => onOpenMessage(message.folder, message.uid)}
                    >
                      {message.subject || "(No subject)"}
                    </button>
                  </td>
                  <td>{message.from}</td>
                  <td>{new Date(message.date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export function resolveInboxPath(folders: MailFolder[]): string | undefined {
  return folders.find((folder) => resolveFolderKind(folder) === "inbox")?.path;
}
