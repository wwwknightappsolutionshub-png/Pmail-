import { Link, useParams } from "react-router-dom";
import { BespokeMailDemo } from "../components/demo/BespokeMailDemo";
import "../components/demo/BespokeMailDemo.css";
import { getBespokeMailDemo } from "../data/bespokeMailDemoData";
import { BESPOKE_MAIL_USE_CASES } from "../data/bespokeMailUseCases";
import "./LandingPage.css";
import "./UseCasePage.css";

export function UseCaseDemoPage() {
  const { useCaseId } = useParams<{ useCaseId: string }>();
  const demo = useCaseId ? getBespokeMailDemo(useCaseId) : undefined;
  const useCase = BESPOKE_MAIL_USE_CASES.find((entry) => entry.id === useCaseId);

  if (!demo || !useCase) {
    return (
      <div className="landing use-case-demo-page">
        <div className="container use-case-demo-missing">
          <h1 className="landing-section-title">Demo not found</h1>
          <p className="muted">That industry demo is not available yet.</p>
          <Link to="/use-case" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Back to use cases
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="use-case-demo-page">
      <div className="use-case-demo-referral-note" role="note">
        Interactive demo — Refer a friend sends real invitations only after you sign in to PMail+.
      </div>
      <BespokeMailDemo demo={demo} />
    </div>
  );
}
