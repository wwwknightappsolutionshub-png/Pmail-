import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import "./AdminDashboard.css";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@hostnet.local");
  const [password, setPassword] = useState("changeme123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.adminLogin({ email, password });
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-wrap">
      <div className="card admin-login-card">
        <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>HostNet Admin</h1>
        <p className="muted">Unified backend for landing page, hosting plans, and hmail add-on marketing.</p>
        {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p style={{ marginTop: "1rem" }}>
          <Link to="/">← Back to landing page</Link>
        </p>
      </div>
    </div>
  );
}
