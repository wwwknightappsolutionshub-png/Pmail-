import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import type { PanelDashboard, PanelView } from "../../types/site";
import "./Panel.css";

const HMAIL_URL = import.meta.env.VITE_HMAIL_URL ?? "http://localhost:5173/login/demo";

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
  const [files, setFiles] = useState<Array<{ name: string; type: string; size: number | null }>>([]);
  const [databases, setDatabases] = useState<Array<{ id: string; name: string; sizeMb: number }>>([]);
  const [domains, setDomains] = useState<Array<{ domain: string; documentRoot: string; ssl: boolean }>>([]);
  const [emailAccounts, setEmailAccounts] = useState<Array<{ address: string; quotaMb: number; usedMb: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .panelDashboard()
      .then(setDashboard)
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (view === "files") api.panelFiles().then((r) => setFiles(r.entries)).catch(() => {});
    if (view === "databases") api.panelDatabases().then((r) => setDatabases(r.databases)).catch(() => {});
    if (view === "domains") api.panelDomains().then((r) => setDomains(r.domains)).catch(() => {});
    if (view === "email") api.panelEmail().then((r) => setEmailAccounts(r.accounts)).catch(() => {});
  }, [view]);

  async function logout() {
    await api.panelLogout();
    navigate("/panel/login");
  }

  if (loading) return <div className="loading-state">Loading panel…</div>;
  if (!dashboard) return <Navigate to="/panel/login" replace />;

  const account = dashboard.account;

  return (
    <div className="panel-shell">
      <aside className="panel-sidebar">
        <div className="panel-sidebar-brand">
          Host<span>Net</span>
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
          <Link to="/" className="btn btn-ghost">
            HostNet site
          </Link>
        </header>

        <main className="panel-content">
          {view === "dashboard" && (
            <>
              <div className="panel-welcome">
                <h1>Welcome back, {account.username}</h1>
                <p className="muted">Home directory: {account.homePath}</p>
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
                  href={`${HMAIL_URL.replace(/\/login\/.*$/, "")}/login/${account.tenant.slug}`}
                  className="panel-quick-card"
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>hmail</strong>
                  Webmail
                </a>
              </div>
            </>
          )}

          {view === "files" && (
            <div className="panel-section">
              <h2>File Manager — {account.homePath}</h2>
              <ul className="panel-list">
                {files.map((entry) => (
                  <li key={entry.name}>
                    <span>
                      {entry.type === "dir" ? "📁" : "📄"} {entry.name}
                    </span>
                    <span className="muted">{entry.type === "dir" ? "folder" : `${entry.size} B`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {view === "databases" && (
            <div className="panel-section">
              <h2>MySQL Databases</h2>
              <ul className="panel-list">
                {databases.map((db) => (
                  <li key={db.id}>
                    <span>{db.name}</span>
                    <span className="muted">{db.sizeMb} MB</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {view === "domains" && (
            <div className="panel-section">
              <h2>Domains</h2>
              <ul className="panel-list">
                {domains.map((d) => (
                  <li key={d.domain}>
                    <span>
                      {d.domain} {d.ssl && <span className="badge">SSL</span>}
                    </span>
                    <span className="muted">{d.documentRoot}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {view === "email" && (
            <div className="panel-section">
              <h2>Email Accounts</h2>
              <ul className="panel-list">
                {emailAccounts.map((box) => (
                  <li key={box.address}>
                    <span>{box.address}</span>
                    <span className="muted">
                      {box.usedMb} / {box.quotaMb} MB
                    </span>
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: "1rem" }}>
                <a href={`${HMAIL_URL.replace(/\/login\/.*$/, "")}/login/${account.tenant.slug}`} target="_blank" rel="noreferrer">
                  Open hmail webmail →
                </a>
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
