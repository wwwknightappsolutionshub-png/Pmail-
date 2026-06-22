import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { PaymentProviderInfo } from "../types/site";
import { slugifyOrgName } from "../utils/slugify";
import "./CheckoutModal.css";

export type CheckoutProduct = {
  productType: "hosting_plan" | "addon";
  productSlug: string;
  productName: string;
  amountCents: number;
};

type Props = {
  product: CheckoutProduct | null;
  onClose: () => void;
};

export function CheckoutModal({ product, onClose }: Props) {
  const [providers, setProviders] = useState<PaymentProviderInfo[]>([]);
  const [provider, setProvider] = useState<string>("mock");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedDomain = useMemo(() => {
    const slug = slugifyOrgName(orgName);
    return slug ? `${slug}.hostnet.local` : "";
  }, [orgName]);

  useEffect(() => {
    api
      .paymentProviders()
      .then((res) => {
        setProviders(res.providers);
        setProvider(res.providers[0]?.id ?? "mock");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (!product) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createPaymentCheckout({
        provider: provider as "stripe" | "paystack" | "mock",
        productType: product!.productType,
        productSlug: product!.productSlug,
        customerEmail: email,
        provision: {
          orgName: orgName.trim(),
          domain: (domain || suggestedDomain).trim(),
        },
      });
      if (res.checkout.checkoutUrl) {
        window.location.href = res.checkout.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Checkout failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="checkout-overlay" role="dialog" aria-modal="true">
      <div className="checkout-modal card">
        <div className="checkout-modal-head">
          <h2>Checkout</h2>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted">
          <strong>{product.productName}</strong> — ${(product.amountCents / 100).toFixed(2)}
        </p>

        {loading ? (
          <p className="muted">Loading payment options…</p>
        ) : (
          <form className="form-grid" onSubmit={submit}>
            <label>
              Organization name
              <input value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
            </label>
            <label>
              Work email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Panel domain
              <input
                value={domain || suggestedDomain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder={suggestedDomain || "your-org.hostnet.local"}
              />
              <small className="muted">Used for panel login and PMail+ tenant slug</small>
            </label>
            <label>
              Payment provider
              <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            {error && <div className="error-banner">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Redirecting…" : "Continue to payment"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
