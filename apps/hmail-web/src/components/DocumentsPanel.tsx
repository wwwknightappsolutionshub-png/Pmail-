import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type UserDocumentRow } from "../api/client";
import { resolveFolderKind } from "./FolderNav";
import type { MailFolder, MailMessageSummary } from "../types/mail";
import "./DocumentsPanel.css";

type Props = {
  inboxPath: string | undefined;
  onOpenMessage: (folder: string, uid: number) => void;
  jobHunterEnabled?: boolean;
};

export function DocumentsPanel({ inboxPath, onOpenMessage, jobHunterEnabled }: Props) {
  const [messages, setMessages] = useState<MailMessageSummary[]>([]);
  const [userDocuments, setUserDocuments] = useState<UserDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const docsRes = await api.listUserDocuments();
      setUserDocuments(docsRes.documents);

      if (!inboxPath) {
        setMessages([]);
        return;
      }
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

  const careerDocuments = useMemo(
    () => userDocuments.filter((doc) => doc.isCareerCv),
    [userDocuments],
  );

  const togglePin = async (document: UserDocumentRow) => {
    setNotice("");
    setError("");
    try {
      await api.pinUserDocument(document.id, !document.isPinned);
      setNotice(document.isPinned ? "Document unpinned." : "Document pinned.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update pin");
    }
  };

  const downloadDocument = async (document: UserDocumentRow) => {
    setError("");
    try {
      const { blob, filename } = await api.downloadUserDocument(document.id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  return (
    <div className="mail-view-panel documents-view-panel">
      <header className="mail-view-header">
        <h2>Documents</h2>
        <p>Career CVs you saved from Job Hunter appear pinned at the top, plus mailbox messages with attachments.</p>
      </header>

      {loading ? <p className="mail-view-empty">Loading documents…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      {notice ? <p className="documents-notice">{notice}</p> : null}

      {!loading && jobHunterEnabled && careerDocuments.length > 0 ? (
        <section className="documents-career-section">
          <h3>Career CVs</h3>
          <div className="documents-table-wrap">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {careerDocuments.map((document) => (
                  <tr key={document.id} className={document.isPinned ? "documents-row-pinned" : undefined}>
                    <td>
                      <span className="documents-career-badge">Career CV</span>
                      {document.filename}
                    </td>
                    <td>{new Date(document.updatedAt).toLocaleString()}</td>
                    <td className="documents-actions">
                      <button type="button" className="documents-link-btn" onClick={() => void downloadDocument(document)}>
                        Download
                      </button>
                      <button type="button" className="documents-link-btn" onClick={() => void togglePin(document)}>
                        {document.isPinned ? "Unpin" : "Pin"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!loading && messages.length === 0 && careerDocuments.length === 0 ? (
        <p className="mail-view-empty">No documents yet. Export a CV from Job Hunter or receive mail with attachments.</p>
      ) : null}

      {!loading && messages.length > 0 ? (
        <section className="documents-mail-section">
          <h3>Mail attachments</h3>
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
                {messages.map((message) => (
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
        </section>
      ) : null}
    </div>
  );
}

export function resolveInboxPath(folders: MailFolder[]): string | undefined {
  return folders.find((folder) => resolveFolderKind(folder) === "inbox")?.path;
}
