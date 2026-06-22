import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { resolvePrimarySiteUrl } from "../../lib/siteUrl";
import type { PanelDashboard, PanelView } from "../../types/site";
import "./Panel.css";

const PMAIL_URL = import.meta.env.VITE_HMAIL_URL ?? "http://localhost:5173/login";

const NAV: Array<{ id: PanelView; label: string; icon: string }> = [
  { id: "dashboard", label: "Home", icon: "⌂" },
  { id: "files", label: "Files", icon: "▤" },
  { id: "email", label: "Email", icon: "✉" },
  { id: "databases", label: "Databases", icon: "⬡" },
  { id: "domains", label: "Domains", icon: "◎" },
];

export function PanelDashboardPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<PanelView>("dashboard");
  const [dashboard, setDashboard] = useState<PanelDashboard | null>(null);
  const [files, setFiles] = useState<Array<{ id: string; name: string; type: string; size: number | null }>>([]);
  const [databases, setDatabases] = useState<Array<{ id: string; name: string; sizeMb: number }>>([]);
  const [domains, setDomains] = useState<Array<{ domain: string; documentRoot: string; ssl: boolean }>>([]);
  const [emailAccounts, setEmailAccounts] = useState<
    Array<{ id: string; address: string; quotaMb: number; usedMb: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [actionError, setActionError] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [newDbName, setNewDbName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newMailbox, setNewMailbox] = useState("");
  const [showSampleToast, setShowSampleToast] = useState(false);

  async function refreshDashboard() {
    const data = await api.panelDashboard();
    setDashboard(data);
  }

  async function refreshFiles() {
    const r = await api.panelFiles();
    setFiles(r.entries);
  }

  async function refreshDatabases() {
    const r = await api.panelDatabases();
    setDatabases(r.databases);
  }

  async function refreshDomains() {
    const r = await api.panelDomains();
    setDomains(r.domains);
  }

  async function refreshEmail() {
    const r = await api.panelEmail();
    setEmailAccounts(r.accounts);
  }

  useEffect(() => {
    api
      .panelMe()
      .then((res) => {
        if (res.account.isSampleDemo) setShowSampleToast(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setAuthError("");
    api
      .panelDashboard()
      .then(setDashboard)
      .catch((err: unknown) => {
        setDashboard(null);
        if (err instanceof ApiError && err.status === 401) {
          setAuthError("");
          return;
        }
        const hint =
          err instanceof ApiError
            ? err.message
            : "Could not reach the API. Start hmail-api (port 4000) and use http://localhost:5174/panel/login";
        setAuthError(hint);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setActionError("");
    if (view === "files") void refreshFiles().catch(() => {});
    if (view === "databases") void refreshDatabases().catch(() => {});
    if (view === "domains") void refreshDomains().catch(() => {});
    if (view === "email") void refreshEmail().catch(() => {});
  }, [view]);

  async function runAction(action: () => Promise<void>) {
    setActionError("");
    try {
      await action();
      await refreshDashboard();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function logout() {
    await api.panelLogout();
    navigate("/panel/login");
  }

  if (loading) return <div className="panel-login-wrap loading-state">Loading panel…</div>;
  if (authError) {
    return (
      <div className="panel-login-wrap">
        <div className="card panel-login-card">
          <h1>Panel unavailable</h1>
          <p className="muted">{authError}</p>
          <p className="panel-login-hint">
            Ensure the API is running, then sign in at <Link to="/panel/login">/panel/login</Link> with{" "}
            <code>demo</code> @ <code>hostnet.local</code> / <code>panel123</code>.
          </p>
          <Link to="/" className="btn btn-secondary">
            Back to marketing site
          </Link>
        </div>
      </div>
    );
  }
  if (!dashboard) return <Navigate to="/panel/login" replace />;

  const account = dashboard.account;
  const primarySiteUrl = resolvePrimarySiteUrl(account.domain);

  return (
    <div className="panel-shell">
      {showSampleToast ? (
        <div className="panel-sample-toast" role="status">
          <div>
            <strong>Sample panel</strong>
            <p>
              Explore this demo environment while we prepare your full deployment. Provisioning typically completes
              within 4–8 hours.
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setShowSampleToast(false)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ) : null}
      <aside className="panel-sidebar">
        <div className="panel-sidebar-brand">
          Prohost<span>Cloud</span>
        </div>
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`panel-nav-btn${view === item.id ? " active" : ""}`}
            onClick={() => setView(item.id)}
          >
            <span className="panel-nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
        <Link to="/growth/dashboard" className="panel-nav-btn">
          <span className="panel-nav-icon">◆</span>
          Prohost Growth
        </Link>
        <button type="button" className="panel-nav-btn" style={{ marginTop: "auto" }} onClick={logout}>
          <span className="panel-nav-icon">⎋</span>
          Logout
        </button>
      </aside>

      <div className="panel-main">
        <header className="panel-topbar">
          <div className="panel-topbar-user">
            {account.username}@{account.domain}
            <span>{account.plan?.name ?? "Hosting"} plan</span>
          </div>
          <a href={primarySiteUrl} className="btn btn-ghost panel-topbar-site-link" target="_blank" rel="noreferrer">
            {primarySiteUrl.replace(/^https?:\/\//, "")}
          </a>
        </header>

        <main className="panel-content">
          {actionError ? <p className="panel-action-error">{actionError}</p> : null}

          {view === "dashboard" && (
            <>
              <div className="panel-welcome">
                <h1>Welcome back, {account.username}</h1>
                <p className="muted">Home directory: {account.homePath}</p>
              </div>
              <div className="panel-site-card">
                <div>
                  <span className="panel-site-label">Primary website</span>
                  <a href={primarySiteUrl} target="_blank" rel="noreferrer" className="panel-site-url">
                    {primarySiteUrl}/
                  </a>
                </div>
                <a href={primarySiteUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                  Visit site
                </a>
              </div>
              <div className="panel-stats">
                <div className="panel-stat-card">
                  <label>
                    <span>Disk</span>
                    <span>{dashboard.stats.diskPercent}%</span>
                  </label>
                  <div className="panel-stat-track">
                    <div className="panel-stat-fill disk" style={{ width: `${dashboard.stats.diskPercent}%` }} />
                  </div>
                  <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.82rem" }}>
                    {account.diskUsedMb} MB of {account.diskQuotaMb} MB
                  </p>
                </div>
                <div className="panel-stat-card">
                  <label>
                    <span>Bandwidth</span>
                    <span>{dashboard.stats.bandwidthPercent}%</span>
                  </label>
                  <div className="panel-stat-track">
                    <div
                      className="panel-stat-fill bandwidth"
                      style={{ width: `${dashboard.stats.bandwidthPercent}%` }}
                    />
                  </div>
                  <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.82rem" }}>
                    {account.bandwidthUsedMb} MB of {account.bandwidthMb} MB
                  </p>
                </div>
              </div>
              <div className="panel-quick">
                <button type="button" className="panel-quick-card" onClick={() => setView("files")}>
                  <strong>{dashboard.stats.domains}</strong>
                  Domains
                </button>
                <button type="button" className="panel-quick-card" onClick={() => setView("email")}>
                  <strong>{dashboard.stats.emailBoxes}</strong>
                  Mailboxes
                </button>
                <button type="button" className="panel-quick-card" onClick={() => setView("databases")}>
                  <strong>{dashboard.stats.databases}</strong>
                  Databases
                </button>
                <a
                  href={`${PMAIL_URL.replace(/\/login\/.*$/, "")}/login/${account.tenant.slug}`}
                  className="panel-quick-card"
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>PMail+</strong>
                  Webmail
                </a>
              </div>
            </>
          )}

          {view === "files" && (
            <div className="panel-section">
              <h2>File Manager — {account.homePath}</h2>
              <form
                className="panel-inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void runAction(async () => {
                    await api.createPanelFile({ name: newFileName, type: "file", content: "" });
                    setNewFileName("");
                    await refreshFiles();
                  });
                }}
              >
                <input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="New file name"
                  required
                />
                <button type="submit" className="btn btn-secondary">
                  Create file
                </button>
              </form>
              <ul className="panel-list">
                {files.map((entry) => (
                  <li key={entry.id}>
                    <span>
                      {entry.type === "dir" ? "📁" : "📄"} {entry.name}
                    </span>
                    <span className="panel-list-actions">
                      <span className="muted">{entry.type === "dir" ? "folder" : `${entry.size ?? 0} B`}</span>
                      {entry.type !== "dir" ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() =>
                            void runAction(async () => {
                              await api.deletePanelFile(entry.id);
                              await refreshFiles();
                            })
                          }
                        >
                          Delete
                        </button>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {view === "databases" && (
            <div className="panel-section">
              <h2>MySQL Databases</h2>
              <form
                className="panel-inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void runAction(async () => {
                    await api.createPanelDatabase(newDbName);
                    setNewDbName("");
                    await refreshDatabases();
                  });
                }}
              >
                <input value={newDbName} onChange={(e) => setNewDbName(e.target.value)} placeholder="Database name" required />
                <button type="submit" className="btn btn-secondary">
                  Create database
                </button>
              </form>
              <ul className="panel-list">
                {databases.map((db) => (
                  <li key={db.id}>
                    <span>{db.name}</span>
                    <span className="panel-list-actions">
                      <span className="muted">{db.sizeMb} MB</span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() =>
                          void runAction(async () => {
                            await api.deletePanelDatabase(db.id);
                            await refreshDatabases();
                          })
                        }
                      >
                        Delete
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {view === "domains" && (
            <div className="panel-section">
              <h2>Domains</h2>
              <form
                className="panel-inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void runAction(async () => {
                    await api.createPanelDomain(newDomain);
                    setNewDomain("");
                    await refreshDomains();
                  });
                }}
              >
                <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="addon.example.com" required />
                <button type="submit" className="btn btn-secondary">
                  Add domain
                </button>
              </form>
              <ul className="panel-list">
                {domains.map((d) => {
                  const visitUrl = resolvePrimarySiteUrl(d.domain);
                  return (
                    <li key={d.domain}>
                      <span>
                        {d.domain} {d.ssl && <span className="badge">SSL</span>}
                      </span>
                      <span className="panel-list-actions">
                        <span className="muted">{d.documentRoot}</span>
                        <a href={visitUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                          Visit
                        </a>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {view === "email" && (
            <div className="panel-section">
              <h2>Email Accounts</h2>
              <form
                className="panel-inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void runAction(async () => {
                    await api.createPanelMailbox({ address: newMailbox });
                    setNewMailbox("");
                    await refreshEmail();
                  });
                }}
              >
                <input
                  value={newMailbox}
                  onChange={(e) => setNewMailbox(e.target.value)}
                  placeholder={`user@${account.domain}`}
                  required
                />
                <button type="submit" className="btn btn-secondary">
                  Create mailbox
                </button>
              </form>
              <ul className="panel-list">
                {emailAccounts.map((box) => (
                  <li key={box.id}>
                    <span>{box.address}</span>
                    <span className="panel-list-actions">
                      <span className="muted">
                        {box.usedMb} / {box.quotaMb} MB
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() =>
                          void runAction(async () => {
                            await api.deletePanelMailbox(box.id);
                            await refreshEmail();
                          })
                        }
                      >
                        Delete
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: "1rem" }}>
                <a href={`${PMAIL_URL.replace(/\/login\/.*$/, "")}/login/${account.tenant.slug}`} target="_blank" rel="noreferrer">
                  Open PMail+ webmail →
                </a>
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
