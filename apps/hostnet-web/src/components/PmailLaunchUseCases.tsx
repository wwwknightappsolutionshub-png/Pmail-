import { useEffect, useState } from "react";
import "./PmailLaunchUseCases.css";

type UseCaseId =
  | "standard"
  | "legal"
  | "immigration"
  | "accounting"
  | "b2b"
  | "real-estate"
  | "recruitment"
  | "healthcare";

type SnapshotId = "workspace" | "inbox" | "crm" | "reminders" | "contacts" | "attachments";

const USE_CASES: Array<{ id: UseCaseId; label: string }> = [
  { id: "standard", label: "Standard" },
  { id: "legal", label: "Legal" },
  { id: "immigration", label: "Immigration Consultant" },
  { id: "accounting", label: "Accounting" },
  { id: "b2b", label: "B2B" },
  { id: "real-estate", label: "Real Estate" },
  { id: "recruitment", label: "Recruitment" },
  { id: "healthcare", label: "Healthcare" },
];

const SNAPSHOTS: Array<{ id: SnapshotId; label: string }> = [
  { id: "workspace", label: "Workspace view" },
  { id: "inbox", label: "Inbox categorization" },
  { id: "crm", label: "CRM view" },
  { id: "reminders", label: "Reminder view" },
  { id: "contacts", label: "Contacts view" },
  { id: "attachments", label: "Attachment categories" },
];

const CONTEXT: Record<
  UseCaseId,
  {
    brand: string;
    workspaceFocus: string;
    inboxCats: string[];
    crmTitle: string;
    crmRows: Array<{ name: string; stage: string }>;
    reminders: string[];
    contacts: Array<{ name: string; role: string }>;
    attachments: string[];
  }
> = {
  standard: {
    brand: "PMail+ Workspace",
    workspaceFocus: "Client mail + productivity tools",
    inboxCats: ["Clients", "Invoices", "Follow-ups", "Internal"],
    crmTitle: "Pipeline",
    crmRows: [
      { name: "Acme Co", stage: "Qualified" },
      { name: "Northwind", stage: "Proposal" },
      { name: "Bright Labs", stage: "Won" },
    ],
    reminders: ["Send proposal pack", "Follow up open tracking", "Renewal check-in"],
    contacts: [
      { name: "Jordan Lee", role: "Account lead" },
      { name: "Sam Ortiz", role: "Ops" },
      { name: "Priya Shah", role: "Finance" },
    ],
    attachments: ["Contracts", "Invoices", "Receipts", "Other"],
  },
  legal: {
    brand: "Legal Workspace",
    workspaceFocus: "Matters, filings & client mail",
    inboxCats: ["Matters", "Court", "Clients", "Discovery"],
    crmTitle: "Matter pipeline",
    crmRows: [
      { name: "Chen v. Apex", stage: "Discovery" },
      { name: "River Trust", stage: "Hearing" },
      { name: "Oak Holdings", stage: "Retainer" },
    ],
    reminders: ["Filing deadline — Fri", "Partner review", "Client update call"],
    contacts: [
      { name: "Alex Chen", role: "Client" },
      { name: "Judge Park", role: "Court" },
      { name: "Maya Brooks", role: "Opposing counsel" },
    ],
    attachments: ["Pleadings", "Exhibits", "Retainer", "Correspondence"],
  },
  immigration: {
    brand: "Immigration Workspace",
    workspaceFocus: "Cases, IRCC mail & document packs",
    inboxCats: ["Cases", "IRCC", "Clients", "Biometrics"],
    crmTitle: "Case pipeline",
    crmRows: [
      { name: "Family sponsorship", stage: "Docs" },
      { name: "Work permit", stage: "Submitted" },
      { name: "PR pathway", stage: "Review" },
    ],
    reminders: ["Biometrics window", "Missing docs chase", "Decision follow-up"],
    contacts: [
      { name: "Elena Rossi", role: "Applicant" },
      { name: "IRCC portal", role: "Authority" },
      { name: "Omar Khan", role: "Sponsor" },
    ],
    attachments: ["Forms", "Passports", "Proof of funds", "Letters"],
  },
  accounting: {
    brand: "Accounting Workspace",
    workspaceFocus: "Clients, filings & document chase",
    inboxCats: ["Clients", "Tax", "Bank", "Payroll"],
    crmTitle: "Client pipeline",
    crmRows: [
      { name: "Vista Retail", stage: "Docs due" },
      { name: "Green CPA", stage: "Review" },
      { name: "Summit LLC", stage: "Filed" },
    ],
    reminders: ["T2 filing due", "Bookkeeping close", "Client doc request"],
    contacts: [
      { name: "Chris Vale", role: "Client" },
      { name: "Nina Park", role: "Bookkeeper" },
      { name: "CRA notices", role: "Authority" },
    ],
    attachments: ["Returns", "Statements", "Receipts", "Working papers"],
  },
  b2b: {
    brand: "B2B Workspace",
    workspaceFocus: "Accounts, proposals & SLAs",
    inboxCats: ["Accounts", "Proposals", "Support", "Billing"],
    crmTitle: "Account pipeline",
    crmRows: [
      { name: "Helix MSP", stage: "Proposal" },
      { name: "Orbit Agency", stage: "Negotiation" },
      { name: "Pulse Co", stage: "Active" },
    ],
    reminders: ["SLA review", "QBR prep", "Contract renewal"],
    contacts: [
      { name: "Dana Wells", role: "Buyer" },
      { name: "Theo Grant", role: "CSM" },
      { name: "Billing desk", role: "Finance" },
    ],
    attachments: ["SOWs", "SLAs", "Invoices", "Decks"],
  },
  "real-estate": {
    brand: "Real Estate Workspace",
    workspaceFocus: "Listings, offers & showings",
    inboxCats: ["Buyers", "Sellers", "Offers", "MLS"],
    crmTitle: "Deal pipeline",
    crmRows: [
      { name: "14 Oak Street", stage: "Showing" },
      { name: "Harbor Condo", stage: "Offer" },
      { name: "Lakeview Lot", stage: "Closing" },
    ],
    reminders: ["Open house", "Offer expiry", "Inspection follow-up"],
    contacts: [
      { name: "Riley Quinn", role: "Buyer" },
      { name: "Pat Morgan", role: "Seller" },
      { name: "MLS alerts", role: "Feed" },
    ],
    attachments: ["Listings", "Offers", "Disclosures", "Photos"],
  },
  recruitment: {
    brand: "Recruitment Workspace",
    workspaceFocus: "Candidates, clients & interviews",
    inboxCats: ["Candidates", "Clients", "Interviews", "Offers"],
    crmTitle: "Placement pipeline",
    crmRows: [
      { name: "Senior FE role", stage: "Screen" },
      { name: "Ops Manager", stage: "Interview" },
      { name: "Finance Lead", stage: "Offer" },
    ],
    reminders: ["Interview tomorrow", "Scorecard due", "Client debrief"],
    contacts: [
      { name: "Jamie Cole", role: "Candidate" },
      { name: "Ava Stone", role: "Hiring mgr" },
      { name: "Talent ops", role: "Internal" },
    ],
    attachments: ["CVs", "Scorecards", "Offers", "JD packs"],
  },
  healthcare: {
    brand: "Healthcare Workspace",
    workspaceFocus: "Referrals, auth & care mail",
    inboxCats: ["Patients", "Referrals", "Auth", "Clinics"],
    crmTitle: "Care pipeline",
    crmRows: [
      { name: "Referral — cardio", stage: "Triage" },
      { name: "Prior auth", stage: "Pending" },
      { name: "Follow-up visit", stage: "Scheduled" },
    ],
    reminders: ["Callback list", "Auth expiry", "Referral chase"],
    contacts: [
      { name: "Dr. Kim", role: "Referrer" },
      { name: "Care desk", role: "Clinic" },
      { name: "Patient liaison", role: "Support" },
    ],
    attachments: ["Referrals", "Auth forms", "Results", "Notes"],
  },
};

function SnapshotFrame({
  useCaseId,
  snapshotId,
}: {
  useCaseId: UseCaseId;
  snapshotId: SnapshotId;
}) {
  const ctx = CONTEXT[useCaseId];

  return (
    <div className={`pmail-uc-shot pmail-uc-shot--${snapshotId}`} data-usecase={useCaseId}>
      <header className="pmail-uc-shot-chrome">
        <span className="pmail-uc-shot-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <strong>{ctx.brand}</strong>
        <span className="pmail-uc-shot-badge">{SNAPSHOTS.find((s) => s.id === snapshotId)?.label}</span>
      </header>

      {snapshotId === "workspace" ? (
        <div className="pmail-uc-shot-body pmail-uc-shot-workspace">
          <aside>
            {["Workspace", "Inbox", "CRM", "Reminders", "Contacts"].map((item, i) => (
              <span key={item} className={i === 0 ? "is-active" : undefined}>
                {item}
              </span>
            ))}
          </aside>
          <div className="pmail-uc-shot-main">
            <p className="pmail-uc-shot-kicker">{ctx.workspaceFocus}</p>
            <div className="pmail-uc-shot-tiles">
              <article>
                <strong>Mail layer</strong>
                <span>Same address · Gmail / M365</span>
              </article>
              <article>
                <strong>Productivity</strong>
                <span>Tracking · files · calendar</span>
              </article>
              <article>
                <strong>Industry tools</strong>
                <span>Unlocked for {USE_CASES.find((u) => u.id === useCaseId)?.label}</span>
              </article>
            </div>
          </div>
        </div>
      ) : null}

      {snapshotId === "inbox" ? (
        <div className="pmail-uc-shot-body pmail-uc-shot-inbox">
          <div className="pmail-uc-shot-cats">
            {ctx.inboxCats.map((cat, i) => (
              <span key={cat} className={i === 0 ? "is-active" : undefined}>
                {cat}
              </span>
            ))}
          </div>
          <ul>
            {ctx.inboxCats.slice(0, 3).map((cat, i) => (
              <li key={cat}>
                <b>{cat}</b>
                <span>{i === 0 ? "3 new · needs reply" : i === 1 ? "1 tracked open" : "Docs attached"}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {snapshotId === "crm" ? (
        <div className="pmail-uc-shot-body pmail-uc-shot-crm">
          <p className="pmail-uc-shot-kicker">{ctx.crmTitle}</p>
          <div className="pmail-uc-shot-crm-rows">
            {ctx.crmRows.map((row) => (
              <div key={row.name}>
                <strong>{row.name}</strong>
                <span>{row.stage}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {snapshotId === "reminders" ? (
        <div className="pmail-uc-shot-body pmail-uc-shot-reminders">
          <p className="pmail-uc-shot-kicker">Upcoming</p>
          <ul>
            {ctx.reminders.map((item, i) => (
              <li key={item}>
                <span className={`pmail-uc-shot-dot pmail-uc-shot-dot--${i}`} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {snapshotId === "contacts" ? (
        <div className="pmail-uc-shot-body pmail-uc-shot-contacts">
          {ctx.contacts.map((c) => (
            <div key={c.name} className="pmail-uc-shot-contact">
              <span className="pmail-uc-shot-avatar">{c.name.slice(0, 1)}</span>
              <div>
                <strong>{c.name}</strong>
                <span>{c.role}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {snapshotId === "attachments" ? (
        <div className="pmail-uc-shot-body pmail-uc-shot-attachments">
          <div className="pmail-uc-shot-attach-grid">
            {ctx.attachments.map((label) => (
              <article key={label}>
                <span className="pmail-uc-shot-file" aria-hidden="true" />
                <strong>{label}</strong>
                <span>Auto-sorted from inbox</span>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PmailLaunchUseCases() {
  const [useCaseId, setUseCaseId] = useState<UseCaseId>("legal");
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    setSlide(0);
  }, [useCaseId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlide((prev) => (prev + 1) % SNAPSHOTS.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [useCaseId]);

  const snapshot = SNAPSHOTS[slide]!;

  return (
    <section className="section-pad section-pad--alt pmail-uc-section" aria-label="Use cases">
      <div className="container">
        <header className="pmail-uc-header">
          <h2 className="landing-section-title pmail-uc-title">Use Cases</h2>
          <p className="muted pmail-uc-lead">
            Pick your work type, then browse the workspace snapshots that sit on top of the mailbox you already use.
          </p>
        </header>

        <div className="pmail-uc-grid">
          <div className="pmail-uc-list" role="tablist" aria-label="User categories">
            {USE_CASES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={useCaseId === item.id}
                className={`pmail-uc-btn${useCaseId === item.id ? " is-active" : ""}`}
                onClick={() => setUseCaseId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="pmail-uc-carousel">
            <div className="pmail-uc-carousel-stage" aria-live="polite">
              <SnapshotFrame useCaseId={useCaseId} snapshotId={snapshot.id} />
            </div>

            <div className="pmail-uc-carousel-controls">
              <button
                type="button"
                className="pmail-uc-nav"
                aria-label="Previous snapshot"
                onClick={() => setSlide((prev) => (prev - 1 + SNAPSHOTS.length) % SNAPSHOTS.length)}
              >
                ‹
              </button>
              <div className="pmail-uc-dots" role="tablist" aria-label="Snapshot slides">
                {SNAPSHOTS.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={slide === index}
                    aria-label={item.label}
                    className={`pmail-uc-dot${slide === index ? " is-active" : ""}`}
                    onClick={() => setSlide(index)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="pmail-uc-nav"
                aria-label="Next snapshot"
                onClick={() => setSlide((prev) => (prev + 1) % SNAPSHOTS.length)}
              >
                ›
              </button>
            </div>
            <p className="pmail-uc-slide-label muted">
              {USE_CASES.find((u) => u.id === useCaseId)?.label} · {snapshot.label}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
