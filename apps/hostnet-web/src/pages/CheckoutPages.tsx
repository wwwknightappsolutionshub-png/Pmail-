import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import "../components/CheckoutModal.css";

export function CheckoutMockPage() {
  const [params] = useSearchParams();
  const checkoutId = params.get("checkoutId");
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!checkoutId) {
      setStatus("error");
      setMessage("Missing checkout session");
      return;
    }
    api
      .mockCompletePayment(checkoutId)
      .then(() => setStatus("done"))
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
            <Link to="/checkout/success" className="btn btn-primary">
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
  return (
    <div className="checkout-page container">
      <div className="card">
        <h1>Thank you</h1>
        <p className="muted">Payment received. Your plan or add-on will be active shortly.</p>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "1rem" }}>
          <Link to="/panel/login" className="btn btn-primary">
            Open panel
          </Link>
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
