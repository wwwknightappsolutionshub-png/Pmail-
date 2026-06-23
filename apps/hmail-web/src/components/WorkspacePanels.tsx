import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { api } from "../api/client";
import { useAddons } from "../context/AddonContext";
import type { ComposeInitial } from "./ComposeModal";
import type { BusinessVertical } from "../types/mail";
import {
  ACCOUNTING_NAV,
  B2B_NAV,
  HEALTHCARE_NAV,
  PHASE_1_NAV,
  PHASE_2_NAV,
  REAL_ESTATE_NAV,
  RECRUITMENT_NAV,
} from "../constants/addonTools";
import "./MailViews.css";
import "./PlatformToolsPanel.css";
import "./ComposeSettingsPanel.css";
import { PlatformToolsResults, PlatformToolsSection, PlatformToolsShell } from "./PlatformToolsShell";
import { PlatformFolderSelect } from "./PlatformFolderSelect";
import {
  buildSignatureHtml,
  buildSignaturePlainText,
  emptySignatureFields,
  parseSignatureBody,
  readSignatureAvatarFile,
  type SignatureFieldValues,
} from "../utils/signatureBuilder";

export { WorkspaceCrmPanel } from "./WorkspaceCrmPanel";
export { WorkspaceRemindersPanel } from "./WorkspaceRemindersPanel";

function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function ComposeSettingsPanel({ onMessage }: { onMessage?: (message: string) => void } = {}) {
  const { data, loading, error, refresh } = useLoad(() => api.composeSettings().then((r) => r.settings));
  const [displayName, setDisplayName] = useState("");
  const [sigForm, setSigForm] = useState({ id: "", name: "", body: "", avatarUrl: "", isDefault: false });
  const [sigFields, setSigFields] = useState<SignatureFieldValues>(emptySignatureFields());
  const [avatarFileName, setAvatarFileName] = useState("");
  const [sigNotice, setSigNotice] = useState("");
  const [sigError, setSigError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [replyForm, setReplyForm] = useState({ id: "", name: "", subject: "", body: "", enabled: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.displayName) setDisplayName(data.displayName);
  }, [data?.displayName]);

  const saveDisplayName = async () => {
    setSaving(true);
    try {
      await api.updateComposeSettings({ displayName });
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const resetSignatureForm = () => {
    setSigForm({ id: "", name: "", body: "", avatarUrl: "", isDefault: false });
    setSigFields(emptySignatureFields());
    setAvatarFileName("");
    setSigError("");
    setSigNotice("");
  };

  const onAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSigError("");
    try {
      const dataUrl = await readSignatureAvatarFile(file);
      setSigForm((current) => ({ ...current, avatarUrl: dataUrl }));
      setAvatarFileName(file.name);
      setSigNotice("Avatar ready. Save signature to apply.");
    } catch (err) {
      setSigError(err instanceof Error ? err.message : "Could not upload image.");
    }
  };

  const saveSignature = async () => {
    const signatureName = sigForm.name.trim() || sigFields.fullName.trim() || "Default signature";
    const body = buildSignatureHtml(sigFields);
    if (!sigFields.fullName.trim()) {
      setSigError("Name is required for your signature.");
      return;
    }
    if (!sigFields.email.trim() && !sigFields.phone.trim()) {
      setSigError("Add at least an email or phone number.");
      return;
    }

    setSaving(true);
    setSigError("");
    setSigNotice("");
    try {
      const payload = {
        name: signatureName,
        body,
        avatarUrl: sigForm.avatarUrl || undefined,
        isDefault: sigForm.isDefault,
      };
      const wasEdit = Boolean(sigForm.id);
      if (sigForm.id) {
        await api.updateSignature(sigForm.id, payload);
      } else {
        await api.createSignature(payload);
      }
      setSigForm({ id: "", name: "", body: "", avatarUrl: "", isDefault: false });
      setSigFields(emptySignatureFields());
      setAvatarFileName("");
      setSigError("");
      await refresh();
      const notice = wasEdit ? "Signature updated." : "Signature saved.";
      setSigNotice(notice);
      onMessage?.(notice);
    } catch (err) {
      setSigError(err instanceof Error ? err.message : "Could not save signature.");
    } finally {
      setSaving(false);
    }
  };

  const signaturePreviewHtml = buildSignatureHtml(sigFields);

  const resetAutoReplyForm = () => setReplyForm({ id: "", name: "", subject: "", body: "", enabled: true });

  const saveAutoReply = async () => {
    const payload = {
      name: replyForm.name,
      subject: replyForm.subject,
      body: replyForm.body,
      enabled: replyForm.enabled,
    };
    if (replyForm.id) {
      await api.updateAutoReply(replyForm.id, payload);
    } else {
      await api.createAutoReply(payload);
    }
    resetAutoReplyForm();
    await refresh();
  };

  if (loading) return <p className="mail-view-empty">Loading compose settings…</p>;
  if (error) return <p className="mail-view-error">{error}</p>;
  if (!data) return null;

  const activeAutoReply = data.autoReplies.find((rule) => rule.id === data.activeAutoReplyId);

  return (
    <div className="mail-view-panel brand-settings">
      <header className="brand-settings-hero">
        <p className="brand-settings-kicker">PMail+ identity</p>
        <h2>Brand settings</h2>
        <p>Sender display name, send delays, signatures, and vacation auto-replies for your workspace.</p>
      </header>

      <div className="brand-settings-quick-grid">
        <section className="brand-settings-card" aria-labelledby="brand-sender-title">
          <div className="brand-settings-card-head">
            <span className="brand-settings-icon" aria-hidden="true">
              ID
            </span>
            <div>
              <h3 id="brand-sender-title">Custom sender name</h3>
              <p>Shown in the From header recipients see in their inbox.</p>
            </div>
          </div>
          <div className="brand-settings-inline-field">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Doe"
              aria-label="Custom sender name"
            />
            <button
              type="button"
              className="brand-settings-btn brand-settings-btn--primary"
              disabled={saving}
              onClick={() => void saveDisplayName()}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </section>

        <section className="brand-settings-card" aria-labelledby="brand-undo-title">
          <div className="brand-settings-card-head">
            <span className="brand-settings-icon" aria-hidden="true">
              UNDO
            </span>
            <div>
              <h3 id="brand-undo-title">Undo send</h3>
              <p>Brief delay before mail leaves PMail+ so you can cancel a mistaken send.</p>
            </div>
          </div>
          <div className="brand-settings-field">
            <select
              value={data.undoSendSeconds ?? 10}
              aria-label="Undo send delay"
              onChange={(e) =>
                void api.updateComposeSettings({ undoSendSeconds: Number(e.target.value) }).then(refresh)
              }
            >
              <option value={0}>Off — send immediately</option>
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={20}>20 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </div>
        </section>
      </div>

      <section className="brand-settings-card brand-settings-card--wide" aria-labelledby="brand-autoreply-title">
        <div className="brand-settings-toggle-row">
          <div className="brand-settings-card-head">
            <span className="brand-settings-icon" aria-hidden="true">
              AR
            </span>
            <div>
              <h3 id="brand-autoreply-title">Auto-reply master switch</h3>
              <p>
                {data.autoReplyEnabled
                  ? activeAutoReply
                    ? `Active rule: ${activeAutoReply.name}`
                    : "Enabled — choose an active rule below"
                  : "Vacation and out-of-office replies are off"}
              </p>
            </div>
          </div>
          <label className="brand-settings-switch" aria-label="Enable vacation auto-replies">
            <input
              type="checkbox"
              checked={data.autoReplyEnabled}
              onChange={(e) => void api.updateComposeSettings({ autoReplyEnabled: e.target.checked }).then(refresh)}
            />
            <span className="brand-settings-switch-track">
              <span className="brand-settings-switch-thumb" />
            </span>
          </label>
        </div>
      </section>

      <section className="brand-settings-section" aria-labelledby="brand-signatures-title">
        <header className="brand-settings-section-head">
          <div>
            <h3 id="brand-signatures-title">Signature designer</h3>
            <p>Build reusable signatures with optional avatar or logo.</p>
          </div>
          <span className="brand-settings-count">{data.signatures.length} saved</span>
        </header>

        <div className="brand-settings-designer">
          <div className="brand-settings-designer-form">
            <input
              placeholder="Signature label (optional)"
              value={sigForm.name}
              onChange={(e) => setSigForm({ ...sigForm, name: e.target.value })}
            />
            <div className="brand-settings-signature-fields">
              <input
                placeholder="Name"
                value={sigFields.fullName}
                onChange={(e) => setSigFields({ ...sigFields, fullName: e.target.value })}
                aria-label="Signature name"
              />
              <input
                placeholder="Position"
                value={sigFields.position}
                onChange={(e) => setSigFields({ ...sigFields, position: e.target.value })}
                aria-label="Signature position"
              />
              <input
                placeholder="Email"
                type="email"
                value={sigFields.email}
                onChange={(e) => setSigFields({ ...sigFields, email: e.target.value })}
                aria-label="Signature email"
              />
              <input
                placeholder="Phone"
                value={sigFields.phone}
                onChange={(e) => setSigFields({ ...sigFields, phone: e.target.value })}
                aria-label="Signature phone"
              />
            </div>
            <div className="brand-settings-social-fields">
              <span className="brand-settings-social-label">Social links</span>
              <div className="brand-settings-social-grid">
                <input
                  placeholder="LinkedIn URL"
                  value={sigFields.linkedin}
                  onChange={(e) => setSigFields({ ...sigFields, linkedin: e.target.value })}
                  aria-label="LinkedIn URL"
                />
                <input
                  placeholder="X / Twitter URL"
                  value={sigFields.twitter}
                  onChange={(e) => setSigFields({ ...sigFields, twitter: e.target.value })}
                  aria-label="X URL"
                />
                <input
                  placeholder="Facebook URL"
                  value={sigFields.facebook}
                  onChange={(e) => setSigFields({ ...sigFields, facebook: e.target.value })}
                  aria-label="Facebook URL"
                />
                <input
                  placeholder="Instagram URL"
                  value={sigFields.instagram}
                  onChange={(e) => setSigFields({ ...sigFields, instagram: e.target.value })}
                  aria-label="Instagram URL"
                />
              </div>
            </div>
            <div className="brand-settings-upload-row">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/*"
                className="brand-settings-file-input"
                onChange={(e) => void onAvatarUpload(e)}
                aria-label="Upload avatar from local device"
              />
              {sigForm.avatarUrl ? (
                <img src={sigForm.avatarUrl} alt="" className="brand-settings-avatar-preview" />
              ) : null}
              <button
                type="button"
                className="brand-settings-btn brand-settings-btn--secondary"
                onClick={() => avatarInputRef.current?.click()}
              >
                Upload from local device
              </button>
              {sigForm.avatarUrl ? (
                <span className="brand-settings-upload-meta">
                  {avatarFileName || "Image ready"}
                  <button
                    type="button"
                    className="brand-settings-btn brand-settings-btn--ghost"
                    onClick={() => {
                      setSigForm((current) => ({ ...current, avatarUrl: "" }));
                      setAvatarFileName("");
                    }}
                  >
                    Remove
                  </button>
                </span>
              ) : null}
            </div>
            <p className="brand-settings-format-hint">
              Format: Name | Position | Email | Phone | Social icons
            </p>
            {sigError ? <p className="brand-settings-form-error">{sigError}</p> : null}
            {sigNotice ? <p className="brand-settings-form-notice">{sigNotice}</p> : null}
            <label className="brand-settings-check">
              <input
                type="checkbox"
                checked={sigForm.isDefault}
                onChange={(e) => setSigForm({ ...sigForm, isDefault: e.target.checked })}
              />
              Make this the default signature
            </label>
            <div className="brand-settings-actions">
              <button
                type="button"
                className="brand-settings-btn brand-settings-btn--primary"
                disabled={saving}
                onClick={() => void saveSignature()}
              >
                {saving ? "Saving…" : sigForm.id ? "Update signature" : "Add signature"}
              </button>
              {sigForm.id ? (
                <button type="button" className="brand-settings-btn brand-settings-btn--secondary" onClick={resetSignatureForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>

          <aside className="brand-settings-preview" aria-label="Signature preview">
            <span className="brand-settings-preview-label">Live preview</span>
            <div className="brand-settings-preview-body">
              {sigForm.avatarUrl ? (
                <img src={sigForm.avatarUrl} alt="" />
              ) : (
                <div className="brand-settings-avatar-fallback" aria-hidden="true">
                  S
                </div>
              )}
              <iframe title="Signature preview" sandbox="" srcDoc={signaturePreviewHtml || "<p>Your signature preview appears here.</p>"} />
            </div>
          </aside>
        </div>

        <div className="brand-settings-list">
          {data.signatures.map((sig) => (
            <article
              key={sig.id}
              className={`brand-settings-list-card ${data.activeSignatureId === sig.id ? "brand-settings-list-card--active" : ""}`}
            >
              <div className="brand-settings-actions">
                <strong>{sig.name}</strong>
                {data.activeSignatureId === sig.id ? <span className="brand-settings-pill">Active</span> : null}
              </div>
              {sig.avatarUrl ? (
                <p>{sig.avatarUrl.startsWith("data:") ? "Avatar uploaded" : "Avatar attached"}</p>
              ) : null}
              <p>{buildSignaturePlainText(parseSignatureBody(sig.body))}</p>
              <div className="brand-settings-mini-preview">
                <iframe title={`${sig.name} preview`} sandbox="" srcDoc={sig.body} />
              </div>
              <div className="brand-settings-actions">
                <button
                  type="button"
                  className="brand-settings-btn brand-settings-btn--ghost"
                  onClick={() => {
                    setSigForm({
                      id: sig.id,
                      name: sig.name,
                      body: sig.body,
                      avatarUrl: sig.avatarUrl ?? "",
                      isDefault: sig.isDefault,
                    });
                    setSigFields(parseSignatureBody(sig.body));
                    setAvatarFileName(sig.avatarUrl ? "Saved image" : "");
                    setSigError("");
                    setSigNotice("");
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="brand-settings-btn brand-settings-btn--secondary"
                  onClick={() => void api.updateComposeSettings({ activeSignatureId: sig.id }).then(refresh)}
                >
                  {data.activeSignatureId === sig.id ? "Active" : "Set active"}
                </button>
                <button
                  type="button"
                  className="brand-settings-btn brand-settings-btn--secondary"
                  onClick={() => void api.deleteSignature(sig.id).then(refresh)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="brand-settings-section" aria-labelledby="brand-replies-title">
        <header className="brand-settings-section-head">
          <div>
            <h3 id="brand-replies-title">Auto-replies</h3>
            <p>Create vacation or triggered reply rules and choose which one is active.</p>
          </div>
          <span className="brand-settings-count">{data.autoReplies.length} rules</span>
        </header>

        <div className="brand-settings-designer">
          <div className="brand-settings-designer-form">
            <input placeholder="Rule name" value={replyForm.name} onChange={(e) => setReplyForm({ ...replyForm, name: e.target.value })} />
            <input placeholder="Subject" value={replyForm.subject} onChange={(e) => setReplyForm({ ...replyForm, subject: e.target.value })} />
            <textarea placeholder="Reply body" value={replyForm.body} onChange={(e) => setReplyForm({ ...replyForm, body: e.target.value })} />
            <div className="brand-settings-toggle-row brand-settings-toggle-row--compact">
              <span className="brand-settings-toggle-label">Enable this rule</span>
              <label className="brand-settings-switch" aria-label="Enable this auto-reply rule">
                <input
                  type="checkbox"
                  checked={replyForm.enabled}
                  onChange={(e) => setReplyForm({ ...replyForm, enabled: e.target.checked })}
                />
                <span className="brand-settings-switch-track">
                  <span className="brand-settings-switch-thumb" />
                </span>
              </label>
            </div>
            <div className="brand-settings-actions">
              <button type="button" className="brand-settings-btn brand-settings-btn--primary" onClick={() => void saveAutoReply()}>
                {replyForm.id ? "Update auto-reply" : "Add auto-reply"}
              </button>
              {replyForm.id ? (
                <button type="button" className="brand-settings-btn brand-settings-btn--secondary" onClick={resetAutoReplyForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>

          <aside className="brand-settings-preview" aria-label="Auto-reply preview">
            <span className="brand-settings-preview-label">Reply preview</span>
            <strong>{replyForm.subject || "Auto-reply subject"}</strong>
            <p>{replyForm.body || "Auto-reply body preview appears here."}</p>
          </aside>
        </div>

        <div className="brand-settings-list">
          {data.autoReplies.map((rule) => (
            <article
              key={rule.id}
              className={`brand-settings-list-card ${data.activeAutoReplyId === rule.id ? "brand-settings-list-card--active" : ""}`}
            >
              <div className="brand-settings-actions">
                <strong>{rule.name}</strong>
                {data.activeAutoReplyId === rule.id ? <span className="brand-settings-pill">Active</span> : null}
              </div>
              <p>
                {rule.subject} · {rule.enabled ? "enabled" : "disabled"}
              </p>
              <p>{rule.body}</p>
              <div className="brand-settings-actions">
                <button
                  type="button"
                  className="brand-settings-btn brand-settings-btn--ghost"
                  onClick={() =>
                    setReplyForm({
                      id: rule.id,
                      name: rule.name,
                      subject: rule.subject,
                      body: rule.body,
                      enabled: rule.enabled,
                    })
                  }
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="brand-settings-btn brand-settings-btn--secondary"
                  onClick={() => void api.updateComposeSettings({ activeAutoReplyId: rule.id }).then(refresh)}
                >
                  {data.activeAutoReplyId === rule.id ? "Active rule" : "Set active"}
                </button>
                <button
                  type="button"
                  className="brand-settings-btn brand-settings-btn--secondary"
                  onClick={() => void api.updateAutoReply(rule.id, { enabled: !rule.enabled }).then(refresh)}
                >
                  {rule.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  className="brand-settings-btn brand-settings-btn--secondary"
                  onClick={() => void api.deleteAutoReply(rule.id).then(refresh)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function Mail2PdfPanel() {
  const [folder, setFolder] = useState("");
  const [exportingUid, setExportingUid] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const { data, loading, error, refresh } = useLoad(
    () =>
      folder
        ? api.messages(folder, { page: 1, pageSize: 30 }).then((result) => result.messages)
        : Promise.resolve([]),
    [folder],
  );

  const handleExport = async (uid: number) => {
    if (!folder) return;
    setExportingUid(uid);
    setActionError("");
    setNotice("");
    try {
      const { message } = await api.message(folder, uid);
      const blob = await api.mail2pdf({
        subject: message.subject,
        from: message.from,
        to: message.to,
        date: message.date,
        body: message.html ?? message.text ?? "",
        cc: message.cc,
        attachments: message.attachments?.map((attachment) => attachment.filename) ?? [],
      });
      const url = URL.createObjectURL(blob.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = blob.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice(`Exported “${message.subject}” to PDF.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "PDF export failed");
    } finally {
      setExportingUid(null);
    }
  };

  return (
    <PlatformToolsShell>
      <header className="mail-view-header platform-tools-hero">
        <div className="platform-tools-hero__text">
          <p className="platform-tools-hero__eyebrow">Platform tool</p>
          <h2>Mail 2 PDF</h2>
          <p>Export any message from your mailbox to a downloadable PDF — from the sidebar or the read pane.</p>
        </div>
      </header>
      <div className="platform-tools-command">
        <div className="platform-tools-command__head">
          <h3 className="platform-tools-command__title">Choose folder</h3>
          <p className="platform-tools-command__subtitle">Pick a mailbox folder, then export individual messages as PDF.</p>
        </div>
        <div className="platform-tools-command__row">
          <PlatformFolderSelect
            id="mail2pdf-folder"
            label="Mailbox folder"
            value={folder}
            onChange={setFolder}
            disabled={loading || exportingUid !== null}
          />
          <div className="platform-tools-command__actions">
            <button
              type="button"
              className="mail-toolbar-btn"
              disabled={loading || !folder}
              onClick={() => void refresh()}
            >
              Refresh
            </button>
          </div>
        </div>
        {notice ? <div className="platform-tools-stat-banner platform-tools-stat-banner--success">{notice}</div> : null}
      </div>
      {loading ? <p className="mail-view-empty">Loading messages…</p> : null}
      {error ? <p className="platform-tools-alert platform-tools-alert--error" role="alert">{error}</p> : null}
      {actionError ? <p className="platform-tools-alert platform-tools-alert--error" role="alert">{actionError}</p> : null}
      <PlatformToolsResults title="Messages">
        <div className="feature-list">
          {(data ?? []).map((message) => (
            <article key={message.uid} className="feature-list-card">
              <strong>{message.subject || "(No subject)"}</strong>
              <p>
                {message.from} · {new Date(message.date).toLocaleString()}
              </p>
              <div className="inbox-cleanup-actions">
                <button
                  type="button"
                  className="mail-toolbar-btn mail-toolbar-btn--primary"
                  disabled={exportingUid !== null}
                  onClick={() => void handleExport(message.uid)}
                >
                  {exportingUid === message.uid ? "Exporting…" : "Export PDF"}
                </button>
              </div>
            </article>
          ))}
          {!loading && folder && (data ?? []).length === 0 ? (
            <p className="platform-tools-empty">No messages in this folder yet.</p>
          ) : null}
          {!folder ? (
            <p className="platform-tools-empty">Select a folder to browse messages for PDF export.</p>
          ) : null}
        </div>
      </PlatformToolsResults>
    </PlatformToolsShell>
  );
}

export function OpenTrackingPanel() {
  const { data, loading, error } = useLoad(() => api.mailTracking().then((r) => r.tracking));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: detail, loading: detailLoading, error: detailError } = useLoad(
    () =>
      selectedId
        ? api.mailTrackingDetail(selectedId).then((r) => r.tracking)
        : Promise.resolve(null),
    [selectedId],
  );

  return (
    <PlatformToolsShell>
      <header className="mail-view-header">
        <h2>Open &amp; link tracking</h2>
        <p>Recipient opens and link clicks on sent mail with tracking enabled.</p>
      </header>
      {loading ? <p className="mail-view-empty">Loading tracking…</p> : null}
      {error ? <p className="platform-tools-alert platform-tools-alert--error" role="alert">{error}</p> : null}
      <PlatformToolsResults title="Tracked messages">
        <div className="feature-list">
        {(data ?? []).map((row) => (
          <article key={row.id} className="feature-list-card">
            <strong>{row.subject}</strong>
            <p>
              To: {row.toEmail} · Opens: {row.openCount} · Link clicks: {row.totalLinkClicks}
              {row.linkCount > 0 ? ` (${row.linkCount} tracked link${row.linkCount === 1 ? "" : "s"})` : ""}
            </p>
            <p>
              {row.firstOpenedAt
                ? `First opened ${new Date(row.firstOpenedAt).toLocaleString()}`
                : "Not opened yet"}
            </p>
            {row.linkCount > 0 ? (
              <button
                type="button"
                className="mail-toolbar-btn"
                onClick={() => setSelectedId(selectedId === row.id ? null : row.id)}
              >
                {selectedId === row.id ? "Hide link details" : "View link details"}
              </button>
            ) : null}
            {selectedId === row.id ? (
              <div style={{ marginTop: "0.75rem" }}>
                {detailLoading ? <p className="mail-view-empty">Loading links…</p> : null}
                {detailError ? <p className="mail-view-error">{detailError}</p> : null}
                {detail?.links.map((link) => (
                  <div key={link.id} style={{ marginTop: "0.5rem" }}>
                    <p>
                      <strong>Clicks: {link.clickCount}</strong>
                    </p>
                    <p className="muted" style={{ wordBreak: "break-all" }}>
                      {link.originalUrl}
                    </p>
                    <p className="muted">
                      {link.firstClickedAt
                        ? `First clicked ${new Date(link.firstClickedAt).toLocaleString()}`
                        : "Not clicked yet"}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
        {!loading && (data ?? []).length === 0 && !error ? (
          <p className="platform-tools-empty">No tracked messages yet. Enable tracking when composing outbound mail.</p>
        ) : null}
        </div>
      </PlatformToolsResults>
    </PlatformToolsShell>
  );
}

function formatVaultBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileVaultPanel() {
  const { data, loading, error, refresh } = useLoad(() => api.listVaultFiles().then((r) => r.files));
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [copyId, setCopyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setActionError("");
    try {
      for (const file of Array.from(files)) {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] ?? "");
          };
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        });
        await api.uploadVaultFile({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          dataBase64: content,
        });
      }
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionError("");
    try {
      await api.deleteVaultFile(id);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleCopyLink = async (id: string, url: string) => {
    setActionError("");
    try {
      await navigator.clipboard.writeText(url);
      setCopyId(id);
      window.setTimeout(() => setCopyId(null), 2000);
    } catch {
      setActionError("Could not copy link to clipboard");
    }
  };

  return (
    <PlatformToolsShell>
      <header className="mail-view-header">
        <h2>File vault</h2>
        <p>Store large files and share secure download links in outbound mail.</p>
      </header>
      <PlatformToolsSection title="Upload" pin>
        <div className="feature-form platform-tools-upload-bar">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              void handleUpload(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="mail-toolbar-btn mail-toolbar-btn--primary"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload file"}
          </button>
        </div>
      </PlatformToolsSection>
      {loading ? <p className="mail-view-empty">Loading vault…</p> : null}
      {error ? <p className="platform-tools-alert platform-tools-alert--error" role="alert">{error}</p> : null}
      {actionError ? <p className="platform-tools-alert platform-tools-alert--error" role="alert">{actionError}</p> : null}
      <PlatformToolsResults title="Stored files">
        <div className="feature-list">
        {(data ?? []).map((file) => (
          <article key={file.id} className="feature-list-card">
            <strong>{file.originalName}</strong>
            <p>
              {formatVaultBytes(file.fileSizeBytes)} · Downloads: {file.downloadCount} · Expires{" "}
              {new Date(file.expiresAt).toLocaleDateString()}
            </p>
            <div className="inbox-cleanup-actions">
              <button
                type="button"
                className="mail-toolbar-btn"
                onClick={() => void handleCopyLink(file.id, file.downloadUrl)}
              >
                {copyId === file.id ? "Copied" : "Copy download link"}
              </button>
              <button type="button" className="mail-toolbar-btn" onClick={() => void handleDelete(file.id)}>
                Remove
              </button>
            </div>
          </article>
        ))}
        {!loading && (data ?? []).length === 0 ? (
          <p className="platform-tools-empty">No vault files yet. Upload a file or attach large files from compose.</p>
        ) : null}
        </div>
      </PlatformToolsResults>
    </PlatformToolsShell>
  );
}

export function InboxCleanupPanel() {
  const [folder, setFolder] = useState("");
  const [senders, setSenders] = useState<
    Array<{
      senderKey: string;
      senderEmail: string;
      displayFrom: string;
      messageCount: number;
      unreadCount: number;
      newestDate: string | null;
      hasUnsubscribe: boolean;
    }>
  >([]);
  const [logs, setLogs] = useState<
    Array<{
      id: string;
      senderEmail: string;
      status: string;
      createdAt: string;
      unsubscribeUrl: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!folder) return;
    setLoading(true);
    setError("");
    try {
      const [senderResult, logResult] = await Promise.all([
        api.listCleanupSenders(folder),
        api.listUnsubscribeLogs(),
      ]);
      setSenders(senderResult.senders);
      setScannedCount(senderResult.scannedCount);
      setLogs(logResult.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox cleanup");
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = async (senderKey: string, action: "delete" | "archive" | "markRead") => {
    setBusyKey(`${senderKey}:${action}`);
    setActionError("");
    setActionNotice("");
    try {
      const result = await api.runSenderCleanup({ folder, senderKey, action });
      await refresh();
      setActionNotice(
        `${result.processedCount} message${result.processedCount === 1 ? "" : "s"} updated for ${result.senderEmail}`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Cleanup action failed");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <PlatformToolsShell>
      <header className="mail-view-header">
        <h2>Inbox cleanup</h2>
        <p>Review high-volume senders and bulk clean your mailbox. Unsubscribe from individual messages in the read view.</p>
      </header>
      <PlatformToolsSection pin>
        <div className="platform-tools-command">
          <div className="platform-tools-command__head">
            <h3 className="platform-tools-command__title">Scan mailbox</h3>
            <p className="platform-tools-command__subtitle">Find high-volume senders and bulk-clean messages in a folder.</p>
          </div>
          <div className="platform-tools-command__row">
            <PlatformFolderSelect
              id="inbox-cleanup-folder"
              label="Mailbox folder"
              value={folder}
              onChange={setFolder}
              disabled={loading}
            />
            <div className="platform-tools-command__actions">
              <button type="button" className="mail-toolbar-btn mail-toolbar-btn--primary" onClick={() => void refresh()} disabled={loading || !folder}>
                {loading ? "Scanning…" : "Rescan folder"}
              </button>
            </div>
          </div>
        </div>
      </PlatformToolsSection>
      {loading ? <p className="mail-view-empty">Scanning mailbox senders…</p> : null}
      {error ? <p className="platform-tools-alert platform-tools-alert--error" role="alert">{error}</p> : null}
      {actionError ? <p className="platform-tools-alert platform-tools-alert--error" role="alert">{actionError}</p> : null}
      {actionNotice ? <p className="platform-tools-notice">{actionNotice}</p> : null}
      {!loading ? (
        <p className="mail-view-muted">Scanned {scannedCount} recent message{scannedCount === 1 ? "" : "s"}.</p>
      ) : null}
      <PlatformToolsResults title="Sender clusters">
        <div className="feature-list">
        {senders.map((sender) => (
          <article key={sender.senderKey} className="feature-list-card">
            <strong>{sender.displayFrom}</strong>
            <p>
              {sender.messageCount} message{sender.messageCount === 1 ? "" : "s"}
              {sender.unreadCount > 0 ? ` · ${sender.unreadCount} unread` : ""}
              {sender.hasUnsubscribe ? " · Unsubscribe available" : ""}
            </p>
            {sender.newestDate ? (
              <p className="mail-view-muted">Latest: {new Date(sender.newestDate).toLocaleString()}</p>
            ) : null}
            <div className="inbox-cleanup-actions">
              <button
                type="button"
                className="mail-toolbar-btn"
                disabled={busyKey === `${sender.senderKey}:markRead`}
                onClick={() => void runAction(sender.senderKey, "markRead")}
              >
                Mark all read
              </button>
              <button
                type="button"
                className="mail-toolbar-btn"
                disabled={busyKey === `${sender.senderKey}:archive`}
                onClick={() => void runAction(sender.senderKey, "archive")}
              >
                Archive all
              </button>
              <button
                type="button"
                className="mail-toolbar-btn"
                disabled={busyKey === `${sender.senderKey}:delete`}
                onClick={() => void runAction(sender.senderKey, "delete")}
              >
                Delete all
              </button>
            </div>
          </article>
        ))}
        {!loading && senders.length === 0 ? (
          <p className="platform-tools-empty">No sender clusters found in this folder scan.</p>
        ) : null}
        </div>
      </PlatformToolsResults>
      {logs.length > 0 ? (
        <PlatformToolsResults title="Recent unsubscribes">
          <section className="inbox-cleanup-logs">
          <ul>
            {logs.map((log) => (
              <li key={log.id}>
                <strong>{log.senderEmail}</strong> — {log.status} · {new Date(log.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
          </section>
        </PlatformToolsResults>
      ) : null}
    </PlatformToolsShell>
  );
}

export function AttachmentCategorizePanel() {
  const { hasAddon } = useAddons();
  const [folder, setFolder] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ category: string; label: string; count: number }>>([]);
  const [attachments, setAttachments] = useState<
    Array<{
      id: string;
      filename: string;
      category: string;
      categoryLabel: string;
      messageSubject: string;
      messageFrom: string;
      messageDate: string;
      vaultFileId: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const vaultEnabled = hasAddon("file-vault-functionality");

  const refresh = useCallback(async () => {
    if (!folder) return;
    setLoading(true);
    setError("");
    try {
      const [summary, listed] = await Promise.all([
        api.listAttachmentCategories(),
        api.listCategorizedAttachments(activeCategory ? { category: activeCategory, folder } : { folder }),
      ]);
      setCategories(summary.categories);
      setAttachments(listed.attachments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categorized attachments");
    } finally {
      setLoading(false);
    }
  }, [activeCategory, folder]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleScan = async () => {
    if (!folder) return;
    setScanning(true);
    setError("");
    setNotice("");
    try {
      const result = await api.scanAttachmentCategories(folder);
      setNotice(`Scanned ${result.scannedMessages} messages · ${result.upsertedAttachments} attachments categorized`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleCategoryChange = async (id: string, category: string) => {
    setError("");
    try {
      await api.updateAttachmentCategory(id, category);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    }
  };

  const handleVaultExport = async (id: string) => {
    setError("");
    try {
      const result = await api.exportCategorizedAttachmentToVault(id);
      setNotice(result.reused ? "Attachment already in vault" : "Saved to file vault");
      await refresh();
      return result.vaultFileId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vault export failed");
      return null;
    }
  };

  return (
    <PlatformToolsShell>
      <header className="mail-view-header platform-tools-hero">
        <div className="platform-tools-hero__text">
          <p className="platform-tools-hero__eyebrow">Platform tool</p>
          <h2>Attachment categories</h2>
          <p>Auto-classify inbox attachments by type and business category. Export to vault for compose handoff.</p>
        </div>
      </header>
      <div className="platform-tools-command">
        <div className="platform-tools-command__head">
          <h3 className="platform-tools-command__title">Scan &amp; classify</h3>
          <p className="platform-tools-command__subtitle">Choose a mailbox folder, run a scan, then filter results by category.</p>
        </div>
        <div className="platform-tools-command__row">
          <PlatformFolderSelect
            id="attachment-categorize-folder"
            label="Mailbox folder"
            value={folder}
            onChange={setFolder}
            disabled={scanning || loading}
          />
          <div className="platform-tools-command__actions">
            <button
              type="button"
              className="mail-toolbar-btn mail-toolbar-btn--primary"
              disabled={scanning || !folder}
              onClick={() => void handleScan()}
            >
              {scanning ? "Scanning…" : "Scan attachments"}
            </button>
            <button type="button" className="mail-toolbar-btn" disabled={loading || !folder} onClick={() => void refresh()}>
              Refresh
            </button>
          </div>
        </div>
        {notice ? <div className="platform-tools-stat-banner platform-tools-stat-banner--success">{notice}</div> : null}
        <div className="platform-tools-chip-row" role="tablist" aria-label="Category filters">
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === null}
            className={`platform-tools-chip${activeCategory === null ? " is-active" : ""}`}
            onClick={() => setActiveCategory(null)}
          >
            All
          </button>
          {categories
            .filter((row) => row.count > 0)
            .map((row) => (
              <button
                key={row.category}
                type="button"
                role="tab"
                aria-selected={activeCategory === row.category}
                className={`platform-tools-chip${activeCategory === row.category ? " is-active" : ""}`}
                onClick={() => setActiveCategory(row.category)}
              >
                {row.label}
                <span className="platform-tools-chip__count">{row.count}</span>
              </button>
            ))}
        </div>
      </div>
      {loading ? <p className="mail-view-empty">Loading categories…</p> : null}
      {error ? <p className="platform-tools-alert platform-tools-alert--error" role="alert">{error}</p> : null}
      <PlatformToolsResults title="Classified attachments">
        <div className="feature-list">
        {attachments.map((attachment) => (
          <article key={attachment.id} className="feature-list-card">
            <strong>{attachment.filename}</strong>
            <p>
              {attachment.categoryLabel} · {attachment.messageSubject}
            </p>
            <p className="mail-view-muted">
              From {attachment.messageFrom} · {new Date(attachment.messageDate).toLocaleString()}
            </p>
            <div className="inbox-cleanup-actions">
              <select
                value={attachment.category}
                onChange={(e) => void handleCategoryChange(attachment.id, e.target.value)}
              >
                {categories.map((row) => (
                  <option key={row.category} value={row.category}>
                    {row.label}
                  </option>
                ))}
              </select>
              {vaultEnabled ? (
                <button type="button" className="mail-toolbar-btn" onClick={() => void handleVaultExport(attachment.id)}>
                  {attachment.vaultFileId ? "In vault" : "Save to vault"}
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {!loading && attachments.length === 0 ? (
          <p className="platform-tools-empty">No categorized attachments yet. Run a scan to classify mailbox files.</p>
        ) : null}
        </div>
      </PlatformToolsResults>
    </PlatformToolsShell>
  );
}

const INDUSTRY_TOOLS = [
  { slug: "matter-registry", label: "Matter registry" },
  { slug: "listing-board", label: "Listing board" },
  { slug: "patient-registry", label: "Patient registry" },
  { slug: "deadline-guard", label: "Deadline guard" },
] as const;

function verticalToolLinks(vertical: BusinessVertical | null | undefined) {
  switch (vertical) {
    case "legal":
      return [...PHASE_1_NAV, ...PHASE_2_NAV];
    case "accounting":
      return ACCOUNTING_NAV;
    case "real-estate":
      return REAL_ESTATE_NAV;
    case "recruitment":
      return RECRUITMENT_NAV;
    case "b2b-services":
      return B2B_NAV;
    case "healthcare":
      return HEALTHCARE_NAV;
    default:
      return [];
  }
}

export function IndustryToolsPanel({
  businessVertical,
  onSelectView,
}: {
  businessVertical?: BusinessVertical | null;
  onSelectView?: (view: string) => void;
}) {
  const verticalLinks = verticalToolLinks(businessVertical);
  const [toolSlug, setToolSlug] = useState<string>(INDUSTRY_TOOLS[0].slug);
  const { data, loading, error, refresh } = useLoad(
    () => api.industryToolState(toolSlug).then((r) => r.state),
    [toolSlug],
  );
  const [newItem, setNewItem] = useState("");

  const addItem = async () => {
    if (!newItem.trim()) return;
    await api.industryToolAction(toolSlug, "add-item", { label: newItem.trim() });
    setNewItem("");
    await refresh();
  };

  const removeItem = async (id: string) => {
    await api.industryToolAction(toolSlug, "remove-item", { id });
    await refresh();
  };

  const items = Array.isArray(data?.items) ? (data.items as Array<{ id: string; label: string }>) : [];

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Industry tools</h2>
        <p>Jump to your vertical workspace panels or manage quick operational checklists.</p>
      </header>
      {verticalLinks.length > 0 ? (
        <section className="feature-list">
          <h3>{businessVertical?.replace("-", " ") ?? "Industry"} panels</h3>
          {verticalLinks.map((link) => (
            <article key={link.view} className="feature-list-card">
              <strong>{link.label}</strong>
              <button type="button" className="mail-toolbar-btn" onClick={() => onSelectView?.(link.view)}>
                Open panel
              </button>
            </article>
          ))}
        </section>
      ) : (
        <p className="muted">Select an industry workspace from Add-ons to unlock vertical tool shortcuts.</p>
      )}
      <section className="feature-form" style={{ marginTop: "1.5rem" }}>
        <h3>Quick checklists</h3>
        <select value={toolSlug} onChange={(e) => setToolSlug(e.target.value)}>
          {INDUSTRY_TOOLS.map((tool) => (
            <option key={tool.slug} value={tool.slug}>
              {tool.label}
            </option>
          ))}
        </select>
        <input placeholder="New item label" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
        <button type="button" className="mail-toolbar-btn" onClick={() => void addItem()}>
          Add item
        </button>
      </section>
      {loading ? <p className="mail-view-empty">Loading tool…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      {data ? (
        <p className="muted" style={{ margin: "0.5rem 0" }}>
          {String(data.title ?? toolSlug)}
          {typeof data.activeCount === "number" ? ` · ${data.activeCount} active` : ""}
        </p>
      ) : null}
      <div className="feature-list">
        {items.map((item) => (
          <article key={item.id} className="feature-list-card">
            <strong>{item.label}</strong>
            <button type="button" className="mail-toolbar-btn" onClick={() => void removeItem(item.id)}>
              Remove
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

export { CalendarPanel } from "./CalendarPanel";

type EsignRequestRow = {
  id: string;
  documentName: string;
  status: string;
  signerEmail: string;
  signerName: string;
  signingUrl: string | null;
  documentDownloadUrl: string | null;
  createdAt: string;
};

interface EsignPanelProps {
  onComposeHandoff?: (handoff: { to: string; subject: string; html: string; text: string }) => void;
}

export function EsignPanel({ onComposeHandoff }: EsignPanelProps) {
  const { data, loading, error, refresh } = useLoad(() => api.listEsignRequests().then((r) => r.requests));
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [subject, setSubject] = useState("Please sign this document");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requests = (data ?? []) as EsignRequestRow[];

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!signerEmail.trim() || !signerName.trim() || !subject.trim()) {
      setActionError("Signer email, signer name, and subject are required");
      return;
    }
    setSubmitting(true);
    setActionError("");
    setNotice("");
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      });
      const result = await api.createEsignUpload({
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        dataBase64,
        signerEmail: signerEmail.trim(),
        signerName: signerName.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setNotice(`Sent "${result.request.documentName}" for signature`);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "E-sign request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async (id: string) => {
    setActionError("");
    try {
      await api.refreshEsignRequest(id);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Refresh failed");
    }
  };

  const handleCompose = async (id: string) => {
    if (!onComposeHandoff) return;
    setActionError("");
    try {
      const result = await api.getEsignComposeHandoff(id);
      onComposeHandoff(result.compose);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Compose handoff failed");
    }
  };

  return (
    <PlatformToolsShell layout="split">
      <header className="mail-view-header platform-tools-split-header">
        <h2>E-sign</h2>
        <p>Send PDF or Word documents for signature via Dropbox Sign. Share secure download links and compose follow-ups.</p>
      </header>
      <PlatformToolsSection pin className="platform-tools-split-primary">
      <div className="feature-form esign-upload-form">
        <label>
          <span>Signer email</span>
          <input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="signer@company.com" />
        </label>
        <label>
          <span>Signer name</span>
          <input type="text" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Full name" />
        </label>
        <label>
          <span>Subject</span>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label>
          <span>Message</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Optional note for the signer" />
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={(e) => {
            void handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="mail-toolbar-btn mail-toolbar-btn--primary"
          disabled={submitting}
          onClick={() => fileInputRef.current?.click()}
        >
          {submitting ? "Sending…" : "Upload & send for signature"}
        </button>
      </div>
      </PlatformToolsSection>
      <div className="platform-tools-split-secondary">
      {loading ? <p className="mail-view-empty">Loading e-sign requests…</p> : null}
      {error ? <p className="platform-tools-alert platform-tools-alert--error" role="alert">{error}</p> : null}
      {actionError ? <p className="platform-tools-alert platform-tools-alert--error" role="alert">{actionError}</p> : null}
      {notice ? <p className="platform-tools-notice">{notice}</p> : null}
      <PlatformToolsResults title="Signature requests">
        <div className="feature-list">
        {requests.map((row) => (
          <article key={row.id} className="feature-list-card esign-request-card">
            <div>
              <strong>{row.documentName}</strong>
              <p className="mail-view-muted">
                {row.signerName} · {row.signerEmail} · {row.status.replace(/_/g, " ")}
              </p>
            </div>
            <div className="esign-request-actions">
              {row.signingUrl ? (
                <a href={row.signingUrl} target="_blank" rel="noreferrer" className="mail-toolbar-btn">
                  Signing link
                </a>
              ) : null}
              {row.documentDownloadUrl ? (
                <a href={row.documentDownloadUrl} target="_blank" rel="noreferrer" className="mail-toolbar-btn">
                  Document copy
                </a>
              ) : null}
              {onComposeHandoff ? (
                <button type="button" className="mail-toolbar-btn" onClick={() => void handleCompose(row.id)}>
                  Compose to signer
                </button>
              ) : null}
              <button type="button" className="mail-toolbar-btn" onClick={() => void handleRefresh(row.id)}>
                Refresh status
              </button>
            </div>
          </article>
        ))}
        {!loading && requests.length === 0 ? (
          <p className="platform-tools-empty">No signature requests yet. Upload a document above to send your first envelope.</p>
        ) : null}
        </div>
      </PlatformToolsResults>
      </div>
    </PlatformToolsShell>
  );
}

type SlaThreadRow = {
  id: string;
  subject: string;
  fromEmail: string;
  fromDisplay: string;
  status: string;
  remainingLabel: string | null;
  deadlineAt: string;
  folder: string;
  messageUid: number;
};

interface EmailSlaPanelProps {
  onComposeHandoff?: (handoff: ComposeInitial) => void;
}

export function EmailSlaPanel({ onComposeHandoff }: EmailSlaPanelProps) {
  const { data: settings, loading: settingsLoading, error: settingsError, refresh: refreshSettings } = useLoad(() =>
    api.getEmailSlaSettings().then((r) => r.settings),
  );
  const { data: threads, loading: threadsLoading, error: threadsError, refresh: refreshThreads } = useLoad(() =>
    api.listEmailSlaThreads().then((r) => r.threads),
  );
  const { data: alerts, loading: alertsLoading, error: alertsError, refresh: refreshAlerts } = useLoad(() =>
    api.listEmailSlaAlerts().then((r) => r.alerts),
  );
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [scanning, setScanning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [responseHours, setResponseHours] = useState(24);
  const [atRiskRatio, setAtRiskRatio] = useState(0.8);
  const [scanFolder, setScanFolder] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!settings) return;
    setResponseHours(settings.responseHours);
    setAtRiskRatio(settings.atRiskRatio);
    setScanFolder(settings.scanFolder);
    setEnabled(settings.enabled);
  }, [settings]);

  const threadRows = (threads ?? []) as SlaThreadRow[];

  const handleSaveSettings = async () => {
    setActionError("");
    try {
      await api.updateEmailSlaSettings({ responseHours, atRiskRatio, scanFolder, enabled });
      await refreshSettings();
      setNotice("SLA settings saved");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save settings");
    }
  };

  const handleScan = async () => {
    if (!scanFolder) return;
    setScanning(true);
    setActionError("");
    setNotice("");
    try {
      const result = await api.scanEmailSlaThreads(scanFolder);
      setNotice(
        `Scanned ${result.scannedMessages} messages · ${result.createdThreads} new threads · ${result.updatedThreads} updated`,
      );
      await Promise.all([refreshThreads(), refreshAlerts()]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleDismiss = async (id: string) => {
    setActionError("");
    try {
      await api.dismissEmailSlaThread(id);
      await Promise.all([refreshThreads(), refreshAlerts()]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Dismiss failed");
    }
  };

  const handleAckAlert = async (id: string) => {
    setActionError("");
    try {
      await api.acknowledgeEmailSlaAlert(id);
      await refreshAlerts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Acknowledge failed");
    }
  };

  const handleCompose = async (id: string) => {
    if (!onComposeHandoff) return;
    setActionError("");
    try {
      const result = await api.getEmailSlaComposeHandoff(id);
      onComposeHandoff(result.compose);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Compose handoff failed");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setActionError("");
    try {
      const result = await api.exportEmailSlaReport();
      setNotice(`Report exported (${result.report.rowCount} threads)`);
      window.open(result.report.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <PlatformToolsShell layout="split">
      <header className="mail-view-header platform-tools-split-header">
        <h2>Email SLA tracker</h2>
        <p>Track inbound thread response times, surface at-risk and breached conversations, and reply before deadlines slip.</p>
      </header>
      <PlatformToolsSection title="Settings" pin className="platform-tools-split-primary">
      <div className="feature-form email-sla-settings">
        <label>
          <span>Response target (hours)</span>
          <input type="number" min={1} max={720} value={responseHours} onChange={(e) => setResponseHours(Number(e.target.value))} />
        </label>
        <label>
          <span>At-risk threshold (0.1–0.99 of SLA)</span>
          <input
            type="number"
            min={0.1}
            max={0.99}
            step={0.05}
            value={atRiskRatio}
            onChange={(e) => setAtRiskRatio(Number(e.target.value))}
          />
        </label>
        <PlatformFolderSelect
          id="email-sla-folder"
          label="Mailbox folder"
          value={scanFolder}
          onChange={setScanFolder}
        />
        <label className="email-sla-enabled">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span>Enable SLA tracking</span>
        </label>
        <div className="email-sla-settings-actions">
          <button type="button" className="mail-toolbar-btn mail-toolbar-btn--primary" disabled={settingsLoading} onClick={() => void handleSaveSettings()}>
            Save settings
          </button>
          <button type="button" className="mail-toolbar-btn" disabled={scanning || !scanFolder} onClick={() => void handleScan()}>
            {scanning ? "Scanning…" : "Scan inbox"}
          </button>
          <button type="button" className="mail-toolbar-btn" disabled={exporting} onClick={() => void handleExport()}>
            {exporting ? "Exporting…" : "Export CSV report"}
          </button>
        </div>
      </div>
      </PlatformToolsSection>
      <div className="platform-tools-split-secondary">
      {settingsLoading || threadsLoading || alertsLoading ? <p className="mail-view-empty">Loading SLA data…</p> : null}
      {settingsError || threadsError || alertsError ? (
        <p className="platform-tools-alert platform-tools-alert--error" role="alert">
          {settingsError ?? threadsError ?? alertsError}
        </p>
      ) : null}
      {actionError ? <p className="platform-tools-alert platform-tools-alert--error" role="alert">{actionError}</p> : null}
      {notice ? <p className="platform-tools-notice">{notice}</p> : null}
      {(alerts ?? []).length > 0 ? (
        <PlatformToolsResults title="Breach alerts">
          <div className="feature-list">
            {(alerts ?? []).map((alert) => (
              <article key={alert.id} className="feature-list-card email-sla-alert-card">
                <strong>{alert.thread.subject}</strong>
                <p className="mail-view-muted">
                  {alert.thread.fromDisplay} · {alert.alertType.replace(/_/g, " ")} · {alert.thread.remainingLabel ?? "Needs response"}
                </p>
                <div className="email-sla-thread-actions">
                  {onComposeHandoff ? (
                    <button type="button" className="mail-toolbar-btn" onClick={() => void handleCompose(alert.thread.id)}>
                      Reply now
                    </button>
                  ) : null}
                  <button type="button" className="mail-toolbar-btn" onClick={() => void handleAckAlert(alert.id)}>
                    Acknowledge
                  </button>
                </div>
              </article>
            ))}
          </div>
        </PlatformToolsResults>
      ) : null}
      <PlatformToolsResults title="Tracked threads">
        <div className="feature-list">
          {threadRows.length === 0 ? (
            <p className="platform-tools-empty">No SLA threads yet. Scan your inbox to start tracking.</p>
          ) : null}
          {threadRows.map((row) => (
            <article key={row.id} className={`feature-list-card email-sla-thread-${row.status}`}>
              <div>
                <strong>{row.subject}</strong>
                <p className="mail-view-muted">
                  {row.fromDisplay} · <span className={`email-sla-status email-sla-status--${row.status}`}>{row.status.replace(/_/g, " ")}</span>
                  {row.remainingLabel ? ` · ${row.remainingLabel}` : ""}
                </p>
              </div>
              <div className="email-sla-thread-actions">
                {onComposeHandoff && row.status !== "responded" && row.status !== "dismissed" ? (
                  <button type="button" className="mail-toolbar-btn" onClick={() => void handleCompose(row.id)}>
                    Reply
                  </button>
                ) : null}
                {row.status !== "dismissed" && row.status !== "responded" ? (
                  <button type="button" className="mail-toolbar-btn" onClick={() => void handleDismiss(row.id)}>
                    Dismiss
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </PlatformToolsResults>
      </div>
    </PlatformToolsShell>
  );
}
