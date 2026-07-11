import type { CSSProperties } from "react";
import { PmailLaunchLeadCapture } from "../components/PmailLaunchLeadCapture";
import { PmailLaunchUseCases } from "../components/PmailLaunchUseCases";
import { markPrimaryCtaEngaged, PMAIL_WHATSAPP_HELP_URL } from "../lib/pmailLaunchCta";
import "./LandingPage.css";
import "./PmailLaunchPage.css";

const HMAIL_LOGIN =
  (import.meta.env.VITE_HMAIL_URL as string | undefined)?.replace(/\/login\/?$/, "") ||
  "https://mail.prohost.cloud";
const LOGIN_URL = `${HMAIL_LOGIN}/login`;
const DEMO_LOGIN_URL = `${LOGIN_URL}?access=prospect`;
const UI_DEMO_URL = "/use-case/demo/legal";

const FEATURES: Array<{ title: string; body: string; tone: string }> = [
  {
    title: "Modern business inbox",
    body: "Fast compose, folders, signatures, and multi-mailbox switching — run client mail from one branded workspace.",
    tone: "teal",
  },
  {
    title: "Open Tracking",
    body: "See opens and link clicks so you follow up when interest is hot — not days later.",
    tone: "cyan",
  },
  {
    title: "File Vault",
    body: "Send large files via secure download links (up to 100 MB) instead of failed attachments.",
    tone: "sky",
  },
  {
    title: "Auto Reply",
    body: "Acknowledge unread inquiries automatically when you are offline, with templates you control.",
    tone: "emerald",
  },
  {
    title: "Calendar & scheduled send",
    body: "Plan meetings and time sends from the same workspace as your mail.",
    tone: "amber",
  },
  {
    title: "WhatsApp handoff",
    body: "Move a conversation from email to WhatsApp without losing context.",
    tone: "lime",
  },
  {
    title: "Mail 2 PDF",
    body: "Export email trails to audit-ready PDFs for records and handoffs.",
    tone: "slate",
  },
  {
    title: "Inbox cleanup & categorization",
    body: "Clean noisy senders, unsubscribe cleanly, and auto-group invoices, receipts, and contracts.",
    tone: "teal",
  },
  {
    title: "E-Sign from Email",
    body: "Send contracts for signature from the thread that already has the PDF.",
    tone: "cyan",
  },
  {
    title: "Email SLA Tracker",
    body: "Spot at-risk client threads before response deadlines slip.",
    tone: "sky",
  },
  {
    title: "Industry workspaces",
    body: "Unlock legal/immigration, real estate, accounting, recruitment, B2B, or healthcare tools on the same mailbox.",
    tone: "emerald",
  },
  {
    title: "Upgrade on your terms",
    body: "Start with mail; subscribe only to Platform or vertical bundles you need.",
    tone: "amber",
  },
];

const PROBLEMS: Array<{ title: string; body: string }> = [
  {
    title: "Too many apps",
    body:
      "Mail, files, calendars, CRM, and follow-ups live in separate tools, so teams waste time switching tabs instead of finishing client work in one place.",
  },
  {
    title: "No open insight",
    body:
      "You send important emails without knowing who opened them or when, so follow-ups are guesswork and hot leads go cold.",
  },
  {
    title: "Files keep failing",
    body:
      "Large attachments bounce, get lost in threads, or force awkward workarounds — document handoffs become messy and hard to track.",
  },
  {
    title: "Work outside inbox",
    body:
      "Industry workflows for legal, immigration, accounting, and sales sit outside email, so context splits across systems and deadlines slip.",
  },
];

type ProviderCutout = {
  id: string;
  name: string;
  tag: string;
  mark: string;
};

const PROVIDER_CUTOUTS: ProviderCutout[] = [
  { id: "gmail", name: "Gmail", tag: "Inbox · your existing mailbox", mark: "M" },
  { id: "m365", name: "Microsoft 365", tag: "Outlook · keep your address", mark: "O" },
  { id: "aol", name: "AOL Mail", tag: "Classic inbox · still yours", mark: "A" },
  { id: "yahoo", name: "Yahoo Mail", tag: "Personal & business mail", mark: "Y" },
  { id: "proton", name: "Proton Mail", tag: "Encrypted inbox · same address", mark: "P" },
  { id: "thunderbird", name: "Thunderbird", tag: "Desktop mail · IMAP ready", mark: "T" },
  { id: "hostinger", name: "Hostinger", tag: "Branded domain mailbox", mark: "H" },
];

/**
 * WhatsApp / social share landing for launch campaign #1.
 * Branded page → login / signup / prospect demo registration.
 */
function PmailBrandBar({ variant }: { variant: "header" | "footer" }) {
  const Tag = variant === "header" ? "header" : "footer";
  return (
    <Tag className={`pmail-launch-brand-bar pmail-launch-brand-bar--${variant}`}>
      <div className="pmail-launch-brand-bar-inner">
        <div className="pmail-launch-brand-lockup">
          <img
            className="pmail-launch-brand-mark"
            src="/images/pmail-plus-mark.png"
            alt=""
            width={36}
            height={36}
            decoding="async"
          />
          <strong className="pmail-launch-brand-logo">PMail+</strong>
        </div>
        <span className="pmail-launch-brand-tag">MAIL WORKSPACE</span>
      </div>
    </Tag>
  );
}

/** Visual-only PMail+ app chrome — matches product topbar; not interactive. */
function PmailPlaceholderNav() {
  const tabs: Array<{ label: string; badge?: string; active?: boolean }> = [
    { label: "Workspace", active: true },
    { label: "Contacts", badge: "0" },
    { label: "CRM" },
    { label: "Reminders", badge: "0" },
    { label: "Calendar", badge: "0" },
    { label: "Messaging", badge: "16" },
    { label: "Brand Settings" },
    { label: "Career" },
  ];

  return (
    <div className="pmail-launch-placeholder-chrome" aria-hidden="true">
      <div className="pmail-launch-placeholder-nav">
        <div className="pmail-launch-placeholder-nav-inner">
          <div className="pmail-launch-placeholder-search">
            <span className="pmail-launch-placeholder-search-icon" />
            <span className="pmail-launch-placeholder-search-field">Search mail</span>
            <span className="pmail-launch-placeholder-search-filter" />
          </div>
          <div className="pmail-launch-placeholder-actions">
            <span className="pmail-launch-placeholder-btn">
              <span className="pmail-launch-placeholder-ico pmail-launch-placeholder-ico--refer" />
              Refer a friend
            </span>
            <span className="pmail-launch-placeholder-btn">
              <span className="pmail-launch-placeholder-ico pmail-launch-placeholder-ico--cart" />
              Addon marketplace
            </span>
            <span className="pmail-launch-placeholder-btn">
              <span className="pmail-launch-placeholder-ico pmail-launch-placeholder-ico--moon" />
              Dark UI
            </span>
            <span className="pmail-launch-placeholder-btn">
              <span className="pmail-launch-placeholder-ico pmail-launch-placeholder-ico--logout" />
              Sign out
            </span>
            <span className="pmail-launch-placeholder-avatar">PH</span>
          </div>
        </div>
      </div>

      <div className="pmail-launch-placeholder-tabs">
        <div className="pmail-launch-placeholder-tabs-inner">
          {tabs.map((tab) => (
            <span
              key={tab.label}
              className={`pmail-launch-placeholder-tab${tab.active ? " pmail-launch-placeholder-tab--active" : ""}`}
            >
              {tab.active ? <span className="pmail-launch-placeholder-tab-ico" /> : null}
              {tab.label}
              {tab.badge != null ? <span className="pmail-launch-placeholder-tab-badge">{tab.badge}</span> : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Visual: stylized provider cutouts with PMail+ as the rising extra layer. */
function PmailLayerVisual() {
  return (
    <div className="pmail-launch-layer-visual" aria-hidden="true">
      <div className="pmail-launch-layer-stack">
        {PROVIDER_CUTOUTS.map((provider) => (
          <article
            key={provider.id}
            className={`pmail-launch-cutout pmail-launch-cutout--provider pmail-launch-cutout--${provider.id}`}
          >
            <header className="pmail-launch-cutout-head">
              <span className={`pmail-launch-cutout-logo pmail-launch-cutout-logo--${provider.id}`}>
                {provider.mark}
              </span>
              <div>
                <strong>{provider.name}</strong>
                <span>{provider.tag}</span>
              </div>
            </header>
            <div className="pmail-launch-cutout-rows">
              <span />
              <span />
              {provider.id === "gmail" || provider.id === "m365" ? <span /> : null}
            </div>
            {provider.id === "gmail" ? <span className="pmail-launch-cutout-compose">Compose</span> : null}
          </article>
        ))}

        <article className="pmail-launch-cutout pmail-launch-cutout--plus">
          <span className="pmail-launch-layer-badge">Extra layer</span>
          <header className="pmail-launch-cutout-head">
            <span className="pmail-launch-cutout-logo pmail-launch-cutout-logo--plus">
              <img src="/images/pmail-plus-mark.png" alt="" width={22} height={22} decoding="async" />
            </span>
            <div>
              <strong>PMail+</strong>
              <span>Productivity &amp; organization on top</span>
            </div>
          </header>
          <ul className="pmail-launch-layer-chips">
            <li>Tracking</li>
            <li>File vault</li>
            <li>CRM</li>
            <li>E-sign</li>
          </ul>
          <span className="pmail-launch-cutout-shine" />
        </article>
      </div>
      <p className="pmail-launch-layer-caption">Not a new inbox. An upgrade layer.</p>
    </div>
  );
}

export function PmailLaunchPage() {
  return (
    <div className="landing pmail-launch-page">
      <PmailBrandBar variant="header" />
      <PmailPlaceholderNav />

      <section className="pmail-launch-hero section-pad" aria-label="PMail+ launch">
        <div className="pmail-launch-hero-bg" aria-hidden="true">
          <span className="pmail-launch-hero-grid" />
          <span className="pmail-launch-hero-wash" />
          <span className="pmail-launch-orb pmail-launch-orb--a" />
          <span className="pmail-launch-orb pmail-launch-orb--b" />
          <span className="pmail-launch-orb pmail-launch-orb--c" />
          <span className="pmail-launch-beam" />
        </div>

        <div className="container pmail-launch-hero-grid-layout">
          <div className="pmail-launch-hero-copy">
            <p className="pmail-launch-kicker">Not another Gmail. Not another M365.</p>
            <h1 className="landing-section-title pmail-launch-title">
              Keep your mailbox. Add the missing productivity layer.
            </h1>
            <p className="pmail-launch-intro muted">
              PMail+ sits on top of the email you already use — Gmail, Microsoft 365, or your branded domain. You don’t
              create a new inbox. You unlock tracking, files, CRM, calendar, and industry tools as an extra block of
              organization around the mail you already send.
            </p>
            <p className="pmail-launch-layer-callout">
              Same address. Same providers. One extra layer for client work, follow-ups, and operations.
            </p>
            <div className="pmail-launch-cta-row">
              <a className="btn btn-primary" href={LOGIN_URL} onClick={markPrimaryCtaEngaged}>
                Start with PMail+
              </a>
              <a className="btn btn-secondary" href={DEMO_LOGIN_URL} onClick={markPrimaryCtaEngaged}>
                Try a sample demo (register on login)
              </a>
            </div>
            <p className="pmail-launch-note muted">
              Demo mailboxes are provisioned after you register on the login form — not with a shared password. Prefer a
              UI preview first?{" "}
              <a href={UI_DEMO_URL}>Open the interactive demo</a>.
            </p>
          </div>

          <div className="pmail-launch-hero-visual">
            <PmailLayerVisual />
          </div>
        </div>
      </section>

      <section className="section-pad section-pad--alt pmail-launch-problems-section">
        <div className="container">
          <header className="pmail-launch-problems-header">
            <h2 className="pmail-launch-problems-title">Why You Should Switch To PMail+ Workspace</h2>
            <p className="pmail-launch-problems-lead muted">
              You don’t create a new email id. Pmail+ Workspace is built rather to solve the Organizational,
              Centralizational, Flexibility and Productivity pitfalls that exist in the current mail system.
            </p>
          </header>
          <div className="pmail-launch-problems-grid">
            {PROBLEMS.map((item, index) => (
              <article
                key={item.title}
                className="pmail-launch-problem-card"
                style={{ "--problem-i": index } as CSSProperties}
              >
                <span className="pmail-launch-problem-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad pmail-launch-features-section">
        <div className="pmail-launch-features-bg" aria-hidden="true" />
        <div className="container pmail-launch-features-inner">
          <header className="pmail-launch-features-header">
            <h2 className="landing-section-title pmail-launch-features-title">What PMail+ Promises at its core</h2>
            <p className="muted pmail-launch-section-lead">
              Twelve workspace capabilities that live next to the same branded mailbox you use every day.
            </p>
          </header>
          <div className="pmail-launch-feature-grid">
            {FEATURES.map((feature, index) => (
              <article
                key={feature.title}
                className={`pmail-launch-feature-card pmail-launch-feature-card--${feature.tone}`}
                style={{ "--feature-i": index } as CSSProperties}
              >
                <span className="pmail-launch-feature-glow" aria-hidden="true" />
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
          <div className="pmail-launch-features-footer">
            <a className="btn btn-primary" href={LOGIN_URL} onClick={markPrimaryCtaEngaged}>
              Start with PMail+
            </a>
            <p className="pmail-launch-foot muted">Same branded domain. More capability when your work needs it.</p>
          </div>
        </div>
      </section>

      <PmailLaunchUseCases />

      <section className="section-pad pmail-launch-after-uc-cta" aria-label="Get started">
        <div className="container">
          <div className="pmail-launch-cta-row pmail-launch-cta-row--band">
            <a className="btn btn-primary" href={LOGIN_URL} onClick={markPrimaryCtaEngaged}>
              Start with PMail+
            </a>
            <a className="btn btn-secondary" href={DEMO_LOGIN_URL} onClick={markPrimaryCtaEngaged}>
              Try a sample demo (register on login)
            </a>
            <a
              className="btn pmail-launch-wa-btn"
              href={PMAIL_WHATSAPP_HELP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Need Help?
            </a>
          </div>
        </div>
      </section>

      <PmailBrandBar variant="footer" />
      <PmailLaunchLeadCapture />
    </div>
  );
}
