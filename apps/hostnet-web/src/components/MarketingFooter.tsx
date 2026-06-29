import { Link } from "react-router-dom";
import { ProhostLogo } from "./ProhostLogo";

export function MarketingFooter() {
  return (
    <footer className="landing-foot">
      <div className="container landing-foot-inner">
        <ProhostLogo size="sm" />
        <p className="muted">Enterprise hosting, mail, and infrastructure.</p>
        <div className="landing-foot-links">
          <Link to="/admin/login">Admin</Link>
          <Link to="/#register">Custom pricing</Link>
          <Link to="/use-case">Use cases</Link>
        </div>
      </div>
    </footer>
  );
}
