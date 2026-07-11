import { MarketingFooter } from "../components/MarketingFooter";
import { MarketingHeader } from "../components/MarketingHeader";
import "./LandingPage.css";
import "./PmailLaunchPage.css";

const HMAIL_LOGIN =
  (import.meta.env.VITE_HMAIL_URL as string | undefined)?.replace(/\/login\/?$/, "") ||
  "https://mail.prohost.cloud";
const LOGIN_URL = `${HMAIL_LOGIN}/login`;
const UI_DEMO_URL = "/use-case/demo/legal";

const FEATURES: Array<{ title: string; body: string }> = [
  {
    title: "Modern business inbox",
    body: "Fast compose, folders, signatures, and multi-mailbox switching — run client mail from one branded workspace.",
  },
  {
    title: "Open Tracking",
    body: "See opens and link clicks so you follow up when interest is hot — not days later.",
  },
  {
    title: "File Vault",
    body: "Send large files via secure download links (up to 100 MB) instead of failed attachments.",
  },
  {
    title: "Auto Reply",
    body: "Acknowledge unread inquiries automatically when you are offline, with templates you control.",
  },
  {
    title: "Calendar & scheduled send",
    body: "Plan meetings and time sends from the same workspace as your mail.",
  },
  {
    title: "WhatsApp handoff",
    body: "Move a conversation from email to WhatsApp without losing context.",
  },
  {
    title: "Mail 2 PDF",
    body: "Export email trails to audit-ready PDFs for records and handoffs.",
  },
  {
    title: "Inbox cleanup & categorization",
    body: "Clean noisy senders, unsubscribe cleanly, and auto-group invoices, receipts, and contracts.",
  },
  {
    title: "E-Sign from Email",
    body: "Send contracts for signature from the thread that already has the PDF.",
  },
  {
    title: "Email SLA Tracker",
    body: "Spot at-risk client threads before response deadlines slip.",
  },
  {
    title: "Industry workspaces",
    body: "Unlock legal/immigration, real estate, accounting, recruitment, B2B, or healthcare tools on the same mailbox.",
  },
  {
    title: "Upgrade on your terms",
    body: "Start with mail; subscribe only to Platform or vertical bundles you need.",
  },
];

const PROBLEMS = [
  "Scattered tools for mail, files, calendars, and follow-ups",
  "No visibility when clients open critical messages",
  "Attachment limits and messy document handoffs",
  "Industry workflows trapped outside the inbox",
];

/**
 * WhatsApp / social share landing for launch campaign #1.
 * Branded page → login / signup / prospect demo registration.
 */
export function PmailLaunchPage() {
  return (
    <div className="landing pmail-launch-page">
      <MarketingHeader active="bespoke" />

      <section className="pmail-launch-hero section-pad">
        <div className="container pmail-launch-hero-inner">
          <p className="section-eyebrow">PMail+ · Mail workspace</p>
          <h1 className="landing-section-title pmail-launch-title">Business email shouldn’t stop at the inbox</h1>
          <p className="pmail-launch-lead muted">
            PMail+ is a branded mail workspace that turns everyday email into client work, follow-ups, and operations —
            without stacking five extra apps.
          </p>
          <div className="pmail-launch-cta-row">
            <a className="btn btn-primary" href={LOGIN_URL}>
              Start with PMail+
            </a>
            <a className="btn btn-secondary" href={LOGIN_URL}>
              Try a sample demo (register on login)
            </a>
          </div>
          <p className="pmail-launch-note muted">
            Demo mailboxes are provisioned after you register on the login form — not with a shared password. Prefer a
            UI preview first?{" "}
            <a href={UI_DEMO_URL}>Open the interactive demo</a>.
          </p>
        </div>
      </section>

      <section className="section-pad section-pad--alt">
        <div className="container">
          <h2 className="landing-section-title">Problems PMail+ is here to solve</h2>
          <ul className="pmail-launch-problems">
            {PROBLEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-pad">
        <div className="container">
          <h2 className="landing-section-title">What you get</h2>
          <p className="muted pmail-launch-section-lead">
            Twelve workspace capabilities that live next to the same branded mailbox you use every day.
          </p>
          <div className="pmail-launch-feature-grid">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="pmail-launch-feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
          <div className="pmail-launch-cta-row pmail-launch-cta-row--footer">
            <a className="btn btn-primary" href={LOGIN_URL}>
              Start with PMail+
            </a>
          </div>
          <p className="pmail-launch-foot muted">Same branded domain. More capability when your work needs it.</p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
