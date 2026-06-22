import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type { GrowthPlanSlug } from "../../types/growth";
import { GROWTH_PLAN_LABELS } from "../../types/growth";
import "./Growth.css";

type Props = {
  planSlug: GrowthPlanSlug;
  onClose: () => void;
  onComplete?: () => void;
};

export function GrowthPlanCheckoutModal({ planSlug, onClose, onComplete }: Props) {
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState("mock");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.panelMe().then((res) => {
      const account = res.account;
      setEmail(`${account.username}@${account.domain}`);
    });
    void api.paymentProviders().then((res) => {
      setProvider(res.providers[0]?.id ?? "mock");
    });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.growthPlanCheckout({
        planSlug,
        provider: provider as "mock" | "stripe" | "paystack",
        customerEmail: email.trim(),
      });
      if (res.checkout.checkoutUrl) {
        window.location.href = res.checkout.checkoutUrl;
        return;
      }
      onComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Checkout failed");
      setBusy(false);
    }
  }

  return (
    <div className="growth-modal-overlay" role="dialog" aria-modal="true">
      <div className="growth-modal card">
        <div className="growth-modal-head">
          <h2>Upgrade to {GROWTH_PLAN_LABELS[planSlug]}</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted">Subscribe via your existing Prohost tenant — no new organization required.</p>
        {error ? <div className="error-banner">{error}</div> : null}
        <form className="growth-form" onSubmit={handleSubmit}>
          <label>
            Billing email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Payment provider
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="mock">Demo checkout</option>
              <option value="stripe">Stripe</option>
              <option value="paystack">Paystack</option>
            </select>
          </label>
          <div className="growth-action-row">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Starting checkout…" : "Continue to checkout"}
            </button>
            <Link to="/growth/settings" className="btn btn-secondary" onClick={onClose}>
              Compare plans
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
