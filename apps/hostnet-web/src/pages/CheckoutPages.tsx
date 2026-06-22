import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import "../components/CheckoutModal.css";

export function CheckoutMockPage() {
  const [params] = useSearchParams();
  const checkoutId = params.get("checkoutId");
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    tenantSlug: string;
    panelLoginId: string;
    panelPassword: string;
    pmailUserEmail: string;
  } | null>(null);

  useEffect(() => {
    if (!checkoutId) {
      setStatus("error");
      setMessage("Missing checkout session");
      return;
    }
    api
      .mockCompletePayment(checkoutId)
      .then((res) => {
        setStatus("done");
        if (res.provisioning) {
          setCredentials(res.provisioning);
          sessionStorage.setItem(`checkout_credentials_${checkoutId}`, JSON.stringify(res.provisioning));
        }
      })
      .catch((err: Error) => {
        setStatus("error");
        setMessage(err.message);
      });
  }, [checkoutId]);

  return (
    <div className="checkout-page container">
      <div className="card">
        {status === "loading" && <p>Completing demo payment…</p>}
        {status === "done" && (
          <>
            <h1>Payment complete</h1>
            <p className="muted">Your subscription is now active (demo mode).</p>
            {credentials && (
              <div className="checkout-credentials">
                <p>
                  <strong>Panel login:</strong> {credentials.panelLoginId}
                </p>
                <p>
                  <strong>Panel password:</strong> {credentials.panelPassword}
                </p>
                <p>
                  <strong>PMail+ tenant:</strong> {credentials.tenantSlug}
                </p>
                <p>
                  <strong>PMail+ user:</strong> {credentials.pmailUserEmail}
                </p>
              </div>
            )}
            <Link to={`/checkout/success?checkoutId=${checkoutId ?? ""}`} className="btn btn-primary">
              Continue
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h1>Payment failed</h1>
            <p className="error-banner">{message}</p>
            <Link to="/" className="btn btn-secondary">
              Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const checkoutId = params.get("checkoutId");
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [panelLoginId, setPanelLoginId] = useState<string | null>(null);

  useEffect(() => {
    if (!checkoutId) return;
    const cached = sessionStorage.getItem(`checkout_credentials_${checkoutId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          tenantSlug: string;
          panelLoginId: string;
        };
        setTenantSlug(parsed.tenantSlug);
        setPanelLoginId(parsed.panelLoginId);
      } catch {
        // ignore
      }
    }
    api.getPaymentCheckout(checkoutId).then((res) => {
      setTenantSlug(res.checkout.tenantSlug ?? res.checkout.provisioning?.tenantSlug ?? null);
      setPanelLoginId(res.checkout.provisioning?.panelLoginId ?? null);
    });
  }, [checkoutId]);

  return (
    <div className="checkout-page container">
      <div className="card">
        <h1>Thank you</h1>
        <p className="muted">Payment received. Your hosting account and PMail+ tenant are ready.</p>
        {tenantSlug && (
          <p>
            <strong>Tenant slug:</strong> {tenantSlug}
          </p>
        )}
        {panelLoginId && (
          <p>
            <strong>Panel login:</strong> {panelLoginId}
          </p>
        )}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "1rem", flexWrap: "wrap" }}>
          <Link to="/panel/login" className="btn btn-primary">
            Open panel
          </Link>
          {tenantSlug && (
            <a href={`${import.meta.env.VITE_HMAIL_URL ?? "http://localhost:5173/login"}/${tenantSlug}`} className="btn btn-secondary">
              Open PMail+
            </a>
          )}
          <Link to="/" className="btn btn-secondary">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CheckoutCancelPage() {
  return (
    <div className="checkout-page container">
      <div className="card">
        <h1>Checkout cancelled</h1>
        <p className="muted">No charge was made.</p>
        <Link to="/#plans" className="btn btn-primary">
          Back to plans
        </Link>
      </div>
    </div>
  );
}
