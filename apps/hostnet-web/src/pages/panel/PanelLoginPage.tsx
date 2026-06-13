import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import "./Panel.css";

export function PanelLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("demo");
  const [domain, setDomain] = useState("hostnet.local");
  const [password, setPassword] = useState("panel123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.panelLogin({ username, domain, password });
      navigate("/panel");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel-login-wrap">
      <div className="card panel-login-card">
        <h1>HostNet Panel</h1>
        <p className="muted">Sign in with your hosting account credentials.</p>
        {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label>
            Domain
            <input value={domain} onChange={(e) => setDomain(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="panel-login-hint">
          Demo: <code>demo</code> @ <code>hostnet.local</code> / <code>panel123</code>
        </div>
        <p style={{ marginTop: "1rem" }}>
          <Link to="/">← Back to HostNet</Link>
        </p>
      </div>
    </div>
  );
}
