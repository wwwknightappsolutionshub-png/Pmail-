import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import "./PmailLaunchLeadCapture.css";

const DISMISS_KEY = "pmail-launch-lead-dismissed-until";
const SUBMITTED_KEY = "pmail-launch-lead-submitted";

function wasDismissedRecently() {
  try {
    if (localStorage.getItem(SUBMITTED_KEY) === "1") return true;
    const until = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function markDismissed(days = 7) {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
  } catch {
    /* ignore */
  }
}

function markSubmitted() {
  try {
    localStorage.setItem(SUBMITTED_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Soft reward capture for WhatsApp / social visitors.
 * Triggers: scroll depth, dwell time, desktop exit-intent.
 */
export function PmailLaunchLeadCapture() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (wasDismissedRecently()) return;

    let shown = false;
    const show = () => {
      if (shown || wasDismissedRecently()) return;
      shown = true;
      setOpen(true);
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      if (window.scrollY / max >= 0.45) show();
    };

    const onExit = (e: MouseEvent) => {
      if (e.clientY <= 8) show();
    };

    const timer = window.setTimeout(show, 22000);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onExit);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onExit);
    };
  }, []);

  function dismiss() {
    markDismissed(7);
    setOpen(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() && !phone.trim()) {
      setError("Add an email or WhatsApp number");
      return;
    }
    if (!consent) {
      setError("Consent is required to send the launch pack");
      return;
    }
    setBusy(true);
    try {
      await api.submitLaunchLead({
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        consentPrivacy: true,
        consentContact: true,
      });
      markSubmitted();
      setDone(true);
      window.setTimeout(() => setOpen(false), 2200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your details");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="pmail-launch-lead" role="dialog" aria-label="Launch pack signup">
      <div className="pmail-launch-lead-card">
        <button type="button" className="pmail-launch-lead-close" onClick={dismiss} aria-label="Dismiss">
          ×
        </button>
        {done ? (
          <div className="pmail-launch-lead-done">
            <strong>You’re on the list</strong>
            <p>We’ll send the PMail+ launch pack shortly.</p>
          </div>
        ) : (
          <>
            <p className="pmail-launch-lead-eyebrow">Launch reward</p>
            <h3>Get the free PMail+ launch pack</h3>
            <p className="pmail-launch-lead-copy">
              Leave your email or WhatsApp number — walkthrough tips, vertical demo links, and early access notes. No new
              inbox required.
            </p>
            <form className="pmail-launch-lead-form" onSubmit={onSubmit}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </label>
              <label>
                <span>WhatsApp / phone</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44…"
                  autoComplete="tel"
                />
              </label>
              <label className="pmail-launch-lead-consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>I agree to be contacted about PMail+ launch resources.</span>
              </label>
              {error ? <p className="pmail-launch-lead-error">{error}</p> : null}
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Saving…" : "Send me the pack"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
