import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, type ApplyAssistQueueItem, type ApplyAssistWallet } from "../api/client";
import { useAddons } from "../context/AddonContext";
import "./CareerApplyAssistPanel.css";

const REGION_OPTIONS = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "UK", label: "United Kingdom" },
  { code: "ME", label: "Middle East" },
  { code: "INTL", label: "International" },
];

export function CareerApplyAssistPanel() {
  const { hasAddon } = useAddons();
  const [searchParams] = useSearchParams();
  const hasApplyAssist = hasAddon("job-apply-assist-functionality");

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<ApplyAssistWallet | null>(null);
  const [items, setItems] = useState<ApplyAssistQueueItem[]>([]);
  const [documents, setDocuments] = useState<Array<{ id: string; filename: string }>>([]);
  const [assistCopy, setAssistCopy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const [channel, setChannel] = useState<"email_apply" | "linkedin_assist" | "indeed_assist">("email_apply");
  const [targetRole, setTargetRole] = useState("");
  const [region, setRegion] = useState("US");
  const [careersEmail, setCareersEmail] = useState("");
  const [company, setCompany] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [userDocumentId, setUserDocumentId] = useState("");

  const [reviewItem, setReviewItem] = useState<ApplyAssistQueueItem | null>(null);
  const [subjectOverride, setSubjectOverride] = useState("");
  const [bodyTextOverride, setBodyTextOverride] = useState("");
  const [userSubmitted, setUserSubmitted] = useState(false);

  const load = useCallback(async () => {
    if (!hasApplyAssist) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [walletRes, queueRes, setupRes] = await Promise.all([
        api.getApplyAssistWallet(),
        api.listApplyAssistQueue(),
        api.getApplyAssistSetup(),
      ]);
      setWallet(walletRes.wallet);
      setItems(queueRes.items);
      setDocuments(setupRes.setup.documents);
      setAssistCopy(setupRes.setup.linkedInIndeedCopy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Apply Assist");
    } finally {
      setLoading(false);
    }
  }, [hasApplyAssist]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const company = searchParams.get("company");
    const role = searchParams.get("role");
    if (company) setCompany(company);
    if (role) setTargetRole(role);
  }, [searchParams]);

  const reviewPrefill = useMemo(() => reviewItem?.prefilled ?? null, [reviewItem]);

  const openReview = (item: ApplyAssistQueueItem) => {
    setReviewItem(item);
    setUserSubmitted(false);
    if (item.prefilled?.channel === "email_apply") {
      setSubjectOverride(item.prefilled.subject ?? "");
      setBodyTextOverride(item.prefilled.bodyText ?? "");
    }
  };

  const onQueue = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { item } = await api.createApplyAssistQueueItem({
        channel,
        targetRole,
        region,
        careersEmail: channel === "email_apply" ? careersEmail : undefined,
        jobUrl: channel === "email_apply" ? jobUrl || undefined : jobUrl,
        company: company || undefined,
        userDocumentId: userDocumentId || undefined,
      });
      const { item: prefilled } = await api.prefillApplyAssistQueueItem(item.id);
      setItems((prev) => [prefilled, ...prev.filter((row) => row.id !== item.id)]);
      openReview(prefilled);
      setNotice("Prefill ready — review before confirming.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue assist");
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    if (!reviewItem) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api.confirmApplyAssistQueueItem(reviewItem.id, {
        userSubmitted: reviewItem.channel === "email_apply" ? undefined : userSubmitted,
        subjectOverride: reviewItem.channel === "email_apply" ? subjectOverride : undefined,
        bodyTextOverride: reviewItem.channel === "email_apply" ? bodyTextOverride : undefined,
      });
      setWallet(result.wallet);
      setItems((prev) => prev.map((row) => (row.id === reviewItem.id ? result.queue : row)));
      setReviewItem(null);
      setNotice(
        reviewItem.channel === "email_apply"
          ? "Application email sent. One credit deducted."
          : "Assist recorded after your manual submission. One credit deducted.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm assist");
    } finally {
      setBusy(false);
    }
  };

  const onPurchaseCredits = async () => {
    setPurchasing(true);
    setError("");
    try {
      const { checkout } = await api.purchaseApplyAssistCredits({ provider: "mock" });
      if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start credit purchase");
    } finally {
      setPurchasing(false);
    }
  };

  if (!hasApplyAssist) {
    return (
      <section className="apply-assist-panel apply-assist-panel--locked">
        <h2>Apply Assist</h2>
        <p>Prefill email applications with your Career CV — you review and confirm every send.</p>
        <Link className="apply-assist-cta" to="/addons?highlight=job-apply-assist-functionality">
          Get Apply Assist
        </Link>
      </section>
    );
  }

  if (loading) {
    return <p className="apply-assist-loading">Loading Apply Assist…</p>;
  }

  return (
    <section className="apply-assist-panel">
      <header className="apply-assist-head">
        <div>
          <h2>Apply Assist</h2>
          <p>Prefill + your confirm only. PMail+ never submits to LinkedIn or Indeed on your behalf.</p>
        </div>
        {wallet ? (
          <aside className="apply-assist-wallet" aria-label="Credit balance">
            <strong>{wallet.balance}</strong>
            <span>credits</span>
            <small>
              {wallet.remainingToday} of {wallet.dailyCap} assists left today
            </small>
            <button type="button" className="apply-assist-buy" disabled={purchasing} onClick={() => void onPurchaseCredits()}>
              {purchasing ? "Starting…" : `Buy ${wallet.creditsPerPack} credits — $${(wallet.creditPackPriceCents / 100).toFixed(2)}`}
            </button>
          </aside>
        ) : null}
      </header>

      {error ? (
        <div className="apply-assist-alert apply-assist-alert--error" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="apply-assist-alert apply-assist-alert--ok" role="status">
          {notice}
        </div>
      ) : null}

      <form className="apply-assist-form" onSubmit={(event) => void onQueue(event)}>
        <h3>Choose a channel</h3>
        <div className="apply-assist-channels" role="radiogroup" aria-label="Apply channel">
          {[
            {
              id: "email_apply" as const,
              title: "Email apply",
              description: "Prefill a careers inbox message with your CV attached. You confirm before send.",
              badge: "Primary",
            },
            {
              id: "linkedin_assist" as const,
              title: "LinkedIn assist",
              description: "Open the posting, paste our cover blurb, and confirm after you submit manually.",
              badge: "Assist only",
            },
            {
              id: "indeed_assist" as const,
              title: "Indeed assist",
              description: "Checklist + cover copy for Indeed applications — PMail+ never auto-submits.",
              badge: "Assist only",
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`apply-assist-channel-card${channel === item.id ? " apply-assist-channel-card--active" : ""}`}
              onClick={() => setChannel(item.id)}
            >
              <span className="apply-assist-channel-badge">{item.badge}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </button>
          ))}
        </div>

        <h3>Job details</h3>
        <label>
          Target role
          <input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} required maxLength={200} />
        </label>
        <label>
          Region
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            {REGION_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        {channel === "email_apply" ? (
          <label>
            Careers / jobs email
            <input
              type="email"
              value={careersEmail}
              onChange={(event) => setCareersEmail(event.target.value)}
              required
              placeholder="careers@company.com"
            />
          </label>
        ) : (
          <label>
            Job posting URL
            <input
              type="url"
              value={jobUrl}
              onChange={(event) => setJobUrl(event.target.value)}
              required
              placeholder="https://…"
            />
          </label>
        )}
        <label>
          Company (optional)
          <input value={company} onChange={(event) => setCompany(event.target.value)} maxLength={200} />
        </label>
        <label>
          Career CV from Documents
          <select value={userDocumentId} onChange={(event) => setUserDocumentId(event.target.value)}>
            <option value="">None</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.filename}
              </option>
            ))}
          </select>
        </label>
        {channel !== "email_apply" ? <p className="apply-assist-disclaimer">{assistCopy}</p> : null}
        <button type="submit" className="apply-assist-submit" disabled={busy}>
          {busy ? "Prefilling…" : "Queue & prefill"}
        </button>
      </form>

      {reviewItem && reviewPrefill ? (
        <section className="apply-assist-review" aria-label="Review before confirm">
          <h3>Review before confirm</h3>
          {reviewPrefill.channel === "email_apply" ? (
            <>
              <p>
                <strong>To:</strong> {reviewPrefill.toEmail ?? reviewItem.careersEmail}
              </p>
              <label>
                Subject
                <input value={subjectOverride} onChange={(event) => setSubjectOverride(event.target.value)} />
              </label>
              <label>
                Message
                <textarea
                  rows={12}
                  value={bodyTextOverride}
                  onChange={(event) => setBodyTextOverride(event.target.value)}
                />
              </label>
              {reviewItem.userDocumentId ? (
                <p className="apply-assist-attach-note">Your selected Career CV will be attached when you confirm send.</p>
              ) : null}
            </>
          ) : (
            <>
              {reviewPrefill.openUrl ? (
                <p>
                  <a href={reviewPrefill.openUrl} target="_blank" rel="noreferrer">
                    Open job posting
                  </a>{" "}
                  and apply manually — PMail+ does not submit for you.
                </p>
              ) : null}
              <div className="apply-assist-blurb">
                <h4>Cover blurb</h4>
                <pre>{reviewPrefill.coverBlurb}</pre>
              </div>
              {reviewPrefill.checklist?.length ? (
                <ul className="apply-assist-checklist">
                  {reviewPrefill.checklist.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              <p className="apply-assist-disclaimer">{reviewPrefill.assistDisclaimer}</p>
              <label className="apply-assist-checkbox">
                <input type="checkbox" checked={userSubmitted} onChange={(event) => setUserSubmitted(event.target.checked)} />
                I submitted this application myself on the job site
              </label>
            </>
          )}
          <div className="apply-assist-review-actions">
            <button type="button" className="apply-assist-cancel" onClick={() => setReviewItem(null)} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="apply-assist-confirm"
              disabled={busy || (reviewPrefill.channel !== "email_apply" && !userSubmitted)}
              onClick={() => void onConfirm()}
            >
              {busy ? "Confirming…" : reviewPrefill.channel === "email_apply" ? "Confirm & send email" : "Confirm assist"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="apply-assist-history">
        <h3>Recent queue</h3>
        {items.length === 0 ? <p>No queued assists yet.</p> : null}
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.targetRole}</strong>
                <span>{item.channel.replace(/_/g, " ")}</span>
                <span className={`apply-assist-status apply-assist-status--${item.status}`}>{item.status}</span>
              </div>
              {item.status === "prefilled" ? (
                <button type="button" onClick={() => openReview(item)}>
                  Review
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
