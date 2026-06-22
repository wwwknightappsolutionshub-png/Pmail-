import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProhostLogo } from "../../components/ProhostLogo";
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
      <aside className="admin-login-brand">
        <div className="admin-login-brand-content">
          <ProhostLogo size="md" />
          <h1>Platform Administration</h1>
          <p>
            Secure operations console for Prohost Cloud — manage tenants, hosting, mail services, and
            platform configuration from one place.
          </p>
          <ul className="admin-login-features">
            <li>Unified tenant and hosting account management</li>
            <li>Marketing content and plan catalog control</li>
            <li>Lead pipeline and provisioning workflows</li>
            <li>Audit trail and infrastructure monitoring</li>
          </ul>
        </div>
        <p className="admin-login-brand-footer">© Prohost Cloud · Authorized personnel only</p>
      </aside>

      <div className="admin-login-panel">
        <div className="card admin-login-card">
          <h2>Sign in</h2>
          <p className="login-subtitle">Enter your platform administrator credentials.</p>
          {error && <div className="error-banner">{error}</div>}
          <form className="form-grid" onSubmit={onSubmit}>
            <label>
              Work email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Authenticating…" : "Sign in to console"}
            </button>
          </form>
          <p className="admin-login-back">
            <Link to="/">← Return to public site</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
