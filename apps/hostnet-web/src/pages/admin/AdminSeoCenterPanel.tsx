import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../api/client";
import type {
  PlatformMarketingArticle,
  PlatformSeoOverview,
  PlatformSeoSettings,
  PlatformSeoTask,
  PlatformSeoTaskSeverity,
} from "../../types/site";
import { AdminPageHeader } from "./AdminPageHeader";
import "./AdminDashboard.css";

type PanelTab = "overview" | "articles" | "keywords" | "settings";

function errMsg(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function severityClass(severity: PlatformSeoTaskSeverity): string {
  switch (severity) {
    case "critical":
      return "admin-seo-severity-critical";
    case "warning":
      return "admin-seo-severity-warning";
    case "ok":
      return "admin-seo-severity-ok";
    default:
      return "admin-seo-severity-info";
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

const EMPTY_ARTICLE = {
  title: "",
  slug: "",
  excerpt: "",
  bodyHtml: "<p></p>",
  metaTitle: "",
  metaDescription: "",
  locale: "en-CA",
  faqText: "",
  isPublished: false,
};

export function AdminSeoCenterPanel({
  onError,
  onMessage,
}: {
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [panelTab, setPanelTab] = useState<PanelTab>("overview");
  const [overview, setOverview] = useState<PlatformSeoOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [articles, setArticles] = useState<PlatformMarketingArticle[]>([]);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [articleForm, setArticleForm] = useState(EMPTY_ARTICLE);
  const [settingsForm, setSettingsForm] = useState<Partial<PlatformSeoSettings>>({});
  const [newKeyword, setNewKeyword] = useState("");
  const [newKeywordPath, setNewKeywordPath] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, articlesRes] = await Promise.all([api.adminSeoOverview(), api.adminSeoArticles()]);
      setOverview(overviewRes.overview);
      setArticles(articlesRes.articles);
      setSettingsForm(overviewRes.overview.settings);
    } catch (err) {
      onError(errMsg(err, "Failed to load SEO center"));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const openTasks = useMemo(
    () => (overview?.tasks ?? []).filter((task) => task.status === "pending"),
    [overview?.tasks],
  );

  async function handleScan(period: "weekly" | "monthly") {
    setBusy(`scan-${period}`);
    try {
      await api.adminSeoScan(period);
      onMessage(`${period === "weekly" ? "Weekly" : "Monthly"} SEO scan complete`);
      await load();
    } catch (err) {
      onError(errMsg(err, "SEO scan failed"));
    } finally {
      setBusy(null);
    }
  }

  async function handleGscSync() {
    setBusy("gsc");
    try {
      const res = await api.adminSeoSyncGsc();
      onMessage(res.connected ? "Synced keyword data from Search Console" : "GSC API not configured — use settings");
      await load();
    } catch (err) {
      onError(errMsg(err, "GSC sync failed"));
    } finally {
      setBusy(null);
    }
  }

  async function completeTask(task: PlatformSeoTask) {
    setBusy(task.id);
    try {
      await api.adminSeoCompleteTask(task.id);
      onMessage("Task marked complete");
      await load();
    } catch (err) {
      onError(errMsg(err, "Failed to update task"));
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setBusy("settings");
    try {
      const payload: Parameters<typeof api.adminSeoUpdateSettings>[0] = {
        siteUrl: settingsForm.siteUrl,
        gscPropertyUrl: settingsForm.gscPropertyUrl,
        ga4MeasurementId: settingsForm.ga4MeasurementId,
        bingSiteVerification: settingsForm.bingSiteVerification,
        defaultLocale: settingsForm.defaultLocale,
        alternateLocales: settingsForm.alternateLocales,
      };
      const token = (settingsForm as { gscRefreshToken?: string }).gscRefreshToken?.trim();
      if (token) payload.gscRefreshToken = token;

      const res = await api.adminSeoUpdateSettings(payload);
      setSettingsForm(res.settings);
      onMessage("SEO settings saved");
      await load();
    } catch (err) {
      onError(errMsg(err, "Failed to save settings"));
    } finally {
      setBusy(null);
    }
  }

  function startNewArticle() {
    setEditingArticleId("new");
    setArticleForm(EMPTY_ARTICLE);
    setPanelTab("articles");
  }

  function editArticle(article: PlatformMarketingArticle) {
    setEditingArticleId(article.id);
    setArticleForm({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt ?? "",
      bodyHtml: article.bodyHtml,
      metaTitle: article.metaTitle ?? "",
      metaDescription: article.metaDescription ?? "",
      locale: article.locale,
      faqText: article.faq.map((item) => `${item.question}|||${item.answer}`).join("\n"),
      isPublished: article.isPublished,
    });
    setPanelTab("articles");
  }

  async function saveArticle(e: FormEvent) {
    e.preventDefault();
    setBusy("article");
    const faq = articleForm.faqText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [question, answer] = line.split("|||");
        return { question: question?.trim() ?? "", answer: answer?.trim() ?? "" };
      })
      .filter((item) => item.question && item.answer);

    const body = {
      title: articleForm.title,
      slug: articleForm.slug || undefined,
      excerpt: articleForm.excerpt || null,
      bodyHtml: articleForm.bodyHtml,
      metaTitle: articleForm.metaTitle || null,
      metaDescription: articleForm.metaDescription || null,
      locale: articleForm.locale,
      faq,
      isPublished: articleForm.isPublished,
    };

    try {
      if (editingArticleId === "new") {
        await api.adminSeoCreateArticle(body);
        onMessage("Article created");
      } else if (editingArticleId) {
        await api.adminSeoUpdateArticle(editingArticleId, body);
        onMessage("Article updated");
      }
      setEditingArticleId(null);
      await load();
    } catch (err) {
      onError(errMsg(err, "Failed to save article"));
    } finally {
      setBusy(null);
    }
  }

  async function addKeyword(e: FormEvent) {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    setBusy("keyword");
    try {
      await api.adminSeoUpsertKeyword({ keyword: newKeyword.trim(), targetPath: newKeywordPath.trim() || null });
      setNewKeyword("");
      setNewKeywordPath("");
      onMessage("Keyword saved");
      await load();
    } catch (err) {
      onError(errMsg(err, "Failed to save keyword"));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="muted">Loading SEO command center…</p>;
  }

  const settings = overview?.settings;
  const gscUrl = settings?.gscOverviewUrl ?? "https://search.google.com/search-console";

  return (
    <div className="admin-seo-center">
      <AdminPageHeader
        title="SEO command center"
        description="Monitor Prohost discoverability, recurring tasks, Search Console metrics, and marketing articles."
        actions={
          <>
            <a href={gscUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
              Open Search Console
            </a>
            <button type="button" className="btn btn-secondary btn-sm" disabled={!!busy} onClick={() => void handleScan("weekly")}>
              Run weekly scan
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => void handleGscSync()}>
              Sync GSC data
            </button>
          </>
        }
      />

      <div className="admin-seo-summary-grid">
        <div className="admin-seo-summary-card">
          <span className="admin-seo-summary-label">Health score</span>
          <strong className="admin-seo-summary-value">{overview?.healthScore ?? "—"}</strong>
        </div>
        <div className="admin-seo-summary-card">
          <span className="admin-seo-summary-label">Actions needed</span>
          <strong className={`admin-seo-summary-value ${overview?.actionCount ? "admin-seo-severity-warning" : "admin-seo-severity-ok"}`}>
            {overview?.actionCount ?? 0}
          </strong>
        </div>
        <div className="admin-seo-summary-card">
          <span className="admin-seo-summary-label">Sitemap URLs</span>
          <strong className="admin-seo-summary-value">{overview?.latestSnapshot?.sitemapUrlCount ?? "—"}</strong>
        </div>
        <div className="admin-seo-summary-card">
          <span className="admin-seo-summary-label">Avg position (28d)</span>
          <strong className="admin-seo-summary-value">
            {overview?.latestSnapshot?.avgPosition != null ? `#${overview.latestSnapshot.avgPosition}` : "—"}
          </strong>
        </div>
      </div>

      <div className="admin-seo-tabs" role="tablist">
        {(["overview", "articles", "keywords", "settings"] as PanelTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={panelTab === tab}
            className={`admin-seo-tab${panelTab === tab ? " active" : ""}`}
            onClick={() => setPanelTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {panelTab === "overview" ? (
        <section className="admin-seo-panel">
          <h3>Recurring tasks</h3>
          <p className="muted">Color-coded actions for better visibility and ranking. Complete tasks to reschedule the next due date.</p>
          <div className="admin-seo-task-list">
            {openTasks.length === 0 ? <p className="muted">No open tasks — great work.</p> : null}
            {openTasks.map((task) => (
              <article key={task.id} className={`admin-seo-task-card ${severityClass(task.severity)}`}>
                <div>
                  <span className={`admin-seo-task-badge ${severityClass(task.severity)}`}>{task.severity}</span>
                  <h4>{task.title}</h4>
                  {task.description ? <p className="muted">{task.description}</p> : null}
                  <p className="admin-seo-task-meta muted">
                    {task.cadence} · due {formatDate(task.dueAt)}
                  </p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" disabled={busy === task.id} onClick={() => void completeTask(task)}>
                  Mark done
                </button>
              </article>
            ))}
          </div>

          <h3 style={{ marginTop: "2rem" }}>Weekly trend</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Captured</th>
                  <th>Health</th>
                  <th>URLs</th>
                  <th>Avg pos</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.weeklySnapshots ?? []).map((snap) => (
                  <tr key={snap.id}>
                    <td>{formatDate(snap.capturedAt)}</td>
                    <td>{snap.healthScore}</td>
                    <td>{snap.sitemapUrlCount}</td>
                    <td>{snap.avgPosition ?? "—"}</td>
                    <td>{snap.totalImpressions}</td>
                    <td>{snap.totalClicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {panelTab === "articles" ? (
        <section className="admin-seo-panel">
          <div className="admin-seo-panel-head">
            <h3>Resources / blog articles</h3>
            <button type="button" className="btn btn-primary btn-sm" onClick={startNewArticle}>
              New article
            </button>
          </div>

          {editingArticleId ? (
            <form className="admin-seo-form" onSubmit={(e) => void saveArticle(e)}>
              <label>
                Title
                <input value={articleForm.title} onChange={(e) => setArticleForm((f) => ({ ...f, title: e.target.value }))} required />
              </label>
              <label>
                Slug
                <input value={articleForm.slug} onChange={(e) => setArticleForm((f) => ({ ...f, slug: e.target.value }))} placeholder="auto-from-title" />
              </label>
              <label>
                Excerpt
                <textarea value={articleForm.excerpt} rows={2} onChange={(e) => setArticleForm((f) => ({ ...f, excerpt: e.target.value }))} />
              </label>
              <label>
                Body HTML
                <textarea value={articleForm.bodyHtml} rows={8} onChange={(e) => setArticleForm((f) => ({ ...f, bodyHtml: e.target.value }))} />
              </label>
              <label>
                SEO title
                <input value={articleForm.metaTitle} onChange={(e) => setArticleForm((f) => ({ ...f, metaTitle: e.target.value }))} />
              </label>
              <label>
                SEO description
                <textarea value={articleForm.metaDescription} rows={2} onChange={(e) => setArticleForm((f) => ({ ...f, metaDescription: e.target.value }))} />
              </label>
              <label>
                Locale (hreflang)
                <input value={articleForm.locale} onChange={(e) => setArticleForm((f) => ({ ...f, locale: e.target.value }))} />
              </label>
              <label>
                FAQ items (one per line: Question|||Answer)
                <textarea value={articleForm.faqText} rows={4} onChange={(e) => setArticleForm((f) => ({ ...f, faqText: e.target.value }))} />
              </label>
              <label className="admin-seo-checkbox">
                <input type="checkbox" checked={articleForm.isPublished} onChange={(e) => setArticleForm((f) => ({ ...f, isPublished: e.target.checked }))} />
                Published
              </label>
              <div className="admin-seo-form-actions">
                <button type="submit" className="btn btn-primary" disabled={busy === "article"}>
                  Save article
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingArticleId(null)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Slug</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <tr key={article.id}>
                      <td>{article.title}</td>
                      <td>/blog/{article.slug}</td>
                      <td>{article.isPublished ? "Published" : "Draft"}</td>
                      <td>{formatDate(article.updatedAt)}</td>
                      <td>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => editArticle(article)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {panelTab === "keywords" ? (
        <section className="admin-seo-panel">
          <h3>Tracked keywords</h3>
          <form className="admin-seo-inline-form" onSubmit={(e) => void addKeyword(e)}>
            <input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder="Keyword" />
            <input value={newKeywordPath} onChange={(e) => setNewKeywordPath(e.target.value)} placeholder="Target path (optional)" />
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy === "keyword"}>
              Add
            </button>
          </form>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Position</th>
                  <th>Δ</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>Synced</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.keywords ?? []).map((kw) => (
                  <tr key={kw.id}>
                    <td>{kw.keyword}</td>
                    <td>{kw.currentPosition != null ? `#${Math.round(kw.currentPosition)}` : "—"}</td>
                    <td>{kw.positionDelta != null ? (kw.positionDelta > 0 ? `↑${kw.positionDelta}` : kw.positionDelta < 0 ? `↓${Math.abs(kw.positionDelta)}` : "—") : "—"}</td>
                    <td>{kw.impressions ?? "—"}</td>
                    <td>{kw.clicks ?? "—"}</td>
                    <td>{formatDate(kw.lastSyncedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {panelTab === "settings" ? (
        <section className="admin-seo-panel">
          <h3>Platform SEO settings</h3>
          <form className="admin-seo-form" onSubmit={(e) => void saveSettings(e)}>
            <label>
              Marketing site URL
              <input value={settingsForm.siteUrl ?? ""} onChange={(e) => setSettingsForm((f) => ({ ...f, siteUrl: e.target.value }))} />
            </label>
            <label>
              GSC property URL
              <input
                value={settingsForm.gscPropertyUrl ?? ""}
                onChange={(e) => setSettingsForm((f) => ({ ...f, gscPropertyUrl: e.target.value }))}
                placeholder="sc-domain:prohost.cloud"
              />
            </label>
            <label>
              GSC OAuth refresh token
              <input
                type="password"
                placeholder={settings?.gscConfigured ? "Configured — enter to replace" : "Optional — enables API sync"}
                onChange={(e) => setSettingsForm((f) => ({ ...f, gscRefreshToken: e.target.value }))}
              />
            </label>
            <label>
              GA4 measurement ID
              <input
                value={settingsForm.ga4MeasurementId ?? ""}
                onChange={(e) => setSettingsForm((f) => ({ ...f, ga4MeasurementId: e.target.value }))}
                placeholder="G-XXXXXXXX"
              />
            </label>
            <label>
              Bing site verification
              <input
                value={settingsForm.bingSiteVerification ?? ""}
                onChange={(e) => setSettingsForm((f) => ({ ...f, bingSiteVerification: e.target.value }))}
              />
            </label>
            <label>
              Default locale
              <input value={settingsForm.defaultLocale ?? "en-CA"} onChange={(e) => setSettingsForm((f) => ({ ...f, defaultLocale: e.target.value }))} />
            </label>
            <label>
              Alternate locales (comma-separated, for hreflang)
              <input
                value={(settingsForm.alternateLocales ?? []).join(", ")}
                onChange={(e) =>
                  setSettingsForm((f) => ({
                    ...f,
                    alternateLocales: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                  }))
                }
                placeholder="fr-CA"
              />
            </label>
            <p className="muted">
              Also set <code>VITE_GOOGLE_SITE_VERIFICATION</code>, <code>PUBLIC_SITE_URL</code>, and{" "}
              <code>GOOGLE_SEARCH_CONSOLE_CLIENT_ID/SECRET</code> in production <code>.env</code> before builds.
            </p>
            <button type="submit" className="btn btn-primary" disabled={busy === "settings"}>
              Save settings
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
