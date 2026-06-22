import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { resolvePrimarySiteUrl } from "../../lib/siteUrl";
import type { GrowthWorkspace } from "../../types/growth";
import { GrowthWizardField, GrowthWizardStepIntro } from "./GrowthWizardField";
import {
  STEP1_HINTS,
  STEP2_HINTS,
  STEP3_HINTS,
  STEP4_HINTS,
  STEP5_HINTS,
  STEP6_HINTS,
} from "./growthWizardHints";
import "./Growth.css";

const COMM_STYLES = ["professional", "friendly", "luxury", "corporate", "playful", "technical"] as const;

type Step1 = {
  businessName: string;
  industry: string;
  website: string;
  serviceArea: string;
  productsServices: string;
  averageCustomerValue: string;
  monthlyRevenueGoal: string;
  monthlyMarketingBudget: string;
};

const emptyStep1: Step1 = {
  businessName: "",
  industry: "",
  website: "",
  serviceArea: "",
  productsServices: "",
  averageCustomerValue: "",
  monthlyRevenueGoal: "",
  monthlyMarketingBudget: "",
};

export function GrowthOnboardingPage() {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<GrowthWorkspace | null>(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [step1, setStep1] = useState<Step1>(emptyStep1);
  const [step2, setStep2] = useState({
    idealCustomer: "",
    customerProblems: "",
    desiredOutcomes: "",
    customerObjections: "",
    existingCustomerExamples: "",
  });
  const [step3, setStep3] = useState({
    competitorUrls: "",
    competitorNames: "",
    whyBetter: "",
    whyDifferent: "",
  });
  const [step4, setStep4] = useState({
    mainOffer: "",
    upsells: "",
    freeConsultation: false,
    discounts: "",
    guarantees: "",
  });
  const [step5, setStep5] = useState({ style: "professional" as (typeof COMM_STYLES)[number], notes: "" });
  const [step6Assets, setStep6Assets] = useState<Array<{ kind: string; url: string; fileName: string }>>([]);

  useEffect(() => {
    void api
      .growthWorkspace()
      .then((res) => {
        setWorkspace(res.workspace);
        setStep(res.workspace.wizard.currentStep || 1);
        hydrate(res.workspace);
        if (!res.workspace.wizard.steps.step1) {
          setStep1((prev) => ({
            ...prev,
            website: prev.website || resolvePrimarySiteUrl("hostnet.local"),
          }));
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Failed to load workspace");
      });
  }, []);

  function hydrate(ws: GrowthWorkspace) {
    if (ws.wizard.steps.step1) {
      const raw = ws.wizard.steps.step1 as Partial<Step1>;
      setStep1({
        ...emptyStep1,
        ...raw,
        website: raw.website == null ? "" : String(raw.website),
      });
    }
    if (ws.wizard.steps.step2) setStep2((s) => ({ ...s, ...ws.wizard.steps.step2 }));
    if (ws.wizard.steps.step3) {
      const raw = ws.wizard.steps.step3 as {
        competitorUrls?: string[];
        competitorNames?: string[];
        whyBetter?: string;
        whyDifferent?: string;
      };
      setStep3({
        competitorUrls: (raw.competitorUrls ?? []).join("\n"),
        competitorNames: (raw.competitorNames ?? []).join("\n"),
        whyBetter: raw.whyBetter ?? "",
        whyDifferent: raw.whyDifferent ?? "",
      });
    }
    if (ws.wizard.steps.step4) setStep4((s) => ({ ...s, ...ws.wizard.steps.step4 }));
    if (ws.wizard.steps.step5) setStep5((s) => ({ ...s, ...ws.wizard.steps.step5 }));
    if (ws.wizard.steps.step6) {
      const raw = ws.wizard.steps.step6 as { assets?: Array<{ kind: string; url: string; fileName: string }> };
      setStep6Assets(raw.assets ?? []);
    }
  }

  async function saveStep(e: FormEvent, nextStep?: number) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let payload: Record<string, unknown> = {};
      if (step === 1) {
        payload = {
          ...step1,
          website: step1.website.trim(),
        };
      }
      if (step === 2) payload = step2;
      if (step === 3) {
        payload = {
          competitorUrls: step3.competitorUrls
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          competitorNames: step3.competitorNames
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          whyBetter: step3.whyBetter,
          whyDifferent: step3.whyDifferent,
        };
      }
      if (step === 4) payload = step4;
      if (step === 5) payload = step5;
      if (step === 6) payload = { assets: step6Assets };

      const res = await api.growthSaveWizardStep(step, payload);
      setWorkspace(res.workspace);
      if (nextStep) setStep(nextStep);
      else if (step < 6) setStep(step + 1);
      setMessage(`Step ${step} saved`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function completeWizard() {
    setBusy(true);
    setError("");
    try {
      const res = await api.growthCompleteWizard();
      setWorkspace(res.workspace);
      setMessage("Wizard complete — analysis pipeline queued.");
      navigate("/growth/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete wizard");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAsset(file: File, kind: string) {
    const dataBase64 = await fileToBase64(file);
    const res = await api.growthUploadAsset({
      fileName: file.name,
      mimeType: file.type,
      dataBase64,
    });
    setStep6Assets((prev) => [...prev, { kind, url: res.asset.url, fileName: res.asset.fileName }]);
  }

  return (
    <div className="growth-card">
      <h1>Business onboarding wizard</h1>
      <p className="muted">
        Six steps to configure your Prohost Growth workspace. Each field includes guidance — use suggestions as
        starting points and edit them to match your business.
      </p>

      <div className="growth-steps">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <span
            key={n}
            className={`growth-step-pill${n === step ? " active" : ""}${(workspace?.wizardStep ?? 0) >= n ? " done" : ""}`}
          >
            Step {n}
          </span>
        ))}
      </div>

      <GrowthWizardStepIntro step={step} />

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <p className="muted">{message}</p> : null}

      {step === 1 ? (
        <form className="growth-form-grid" onSubmit={(e) => void saveStep(e)}>
          <GrowthWizardField
            label="Business name"
            hint={STEP1_HINTS.businessName.hint}
            example={STEP1_HINTS.businessName.example}
            value={step1.businessName}
            onChange={(businessName) => setStep1({ ...step1, businessName })}
            required
          />
          <GrowthWizardField
            label="Industry"
            hint={STEP1_HINTS.industry.hint}
            example={STEP1_HINTS.industry.example}
            value={step1.industry}
            onChange={(industry) => setStep1({ ...step1, industry })}
            required
          />
          <GrowthWizardField
            label="Website"
            hint={STEP1_HINTS.website.hint}
            example={STEP1_HINTS.website.example}
            value={step1.website}
            onChange={(website) => setStep1({ ...step1, website })}
            placeholder="https://yoursite.com (optional)"
          />
          <GrowthWizardField
            label="Service area"
            hint={STEP1_HINTS.serviceArea.hint}
            example={STEP1_HINTS.serviceArea.example}
            value={step1.serviceArea}
            onChange={(serviceArea) => setStep1({ ...step1, serviceArea })}
            required
          />
          <GrowthWizardField
            label="Products / services"
            hint={STEP1_HINTS.productsServices.hint}
            example={STEP1_HINTS.productsServices.example}
            full
            multiline
            rows={4}
            value={step1.productsServices}
            onChange={(productsServices) => setStep1({ ...step1, productsServices })}
            required
          />
          <GrowthWizardField
            label="Average customer value"
            hint={STEP1_HINTS.averageCustomerValue.hint}
            example={STEP1_HINTS.averageCustomerValue.example}
            value={step1.averageCustomerValue}
            onChange={(averageCustomerValue) => setStep1({ ...step1, averageCustomerValue })}
            required
          />
          <GrowthWizardField
            label="Monthly revenue goal"
            hint={STEP1_HINTS.monthlyRevenueGoal.hint}
            example={STEP1_HINTS.monthlyRevenueGoal.example}
            value={step1.monthlyRevenueGoal}
            onChange={(monthlyRevenueGoal) => setStep1({ ...step1, monthlyRevenueGoal })}
            required
          />
          <GrowthWizardField
            label="Monthly marketing budget"
            hint={STEP1_HINTS.monthlyMarketingBudget.hint}
            example={STEP1_HINTS.monthlyMarketingBudget.example}
            value={step1.monthlyMarketingBudget}
            onChange={(monthlyMarketingBudget) => setStep1({ ...step1, monthlyMarketingBudget })}
            required
          />
          <div className="growth-actions full">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save & continue
            </button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form className="growth-form-grid" onSubmit={(e) => void saveStep(e)}>
          <GrowthWizardField
            label="Ideal customer"
            hint={STEP2_HINTS.idealCustomer.hint}
            example={STEP2_HINTS.idealCustomer.example}
            full
            multiline
            value={step2.idealCustomer}
            onChange={(idealCustomer) => setStep2({ ...step2, idealCustomer })}
            required
          />
          <GrowthWizardField
            label="Problems they have"
            hint={STEP2_HINTS.customerProblems.hint}
            example={STEP2_HINTS.customerProblems.example}
            full
            multiline
            value={step2.customerProblems}
            onChange={(customerProblems) => setStep2({ ...step2, customerProblems })}
            required
          />
          <GrowthWizardField
            label="Outcomes they want"
            hint={STEP2_HINTS.desiredOutcomes.hint}
            example={STEP2_HINTS.desiredOutcomes.example}
            full
            multiline
            value={step2.desiredOutcomes}
            onChange={(desiredOutcomes) => setStep2({ ...step2, desiredOutcomes })}
            required
          />
          <GrowthWizardField
            label="Objections"
            hint={STEP2_HINTS.customerObjections.hint}
            example={STEP2_HINTS.customerObjections.example}
            full
            multiline
            rows={2}
            value={step2.customerObjections}
            onChange={(customerObjections) => setStep2({ ...step2, customerObjections })}
            required
          />
          <GrowthWizardField
            label="Existing customer examples"
            hint={STEP2_HINTS.existingCustomerExamples.hint}
            example={STEP2_HINTS.existingCustomerExamples.example}
            full
            multiline
            rows={2}
            value={step2.existingCustomerExamples}
            onChange={(existingCustomerExamples) => setStep2({ ...step2, existingCustomerExamples })}
          />
          <div className="growth-actions full">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save & continue
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <form className="growth-form-grid" onSubmit={(e) => void saveStep(e)}>
          <GrowthWizardField
            label="Competitor URLs (one per line)"
            hint={STEP3_HINTS.competitorUrls.hint}
            example={STEP3_HINTS.competitorUrls.example}
            full
            multiline
            value={step3.competitorUrls}
            onChange={(competitorUrls) => setStep3({ ...step3, competitorUrls })}
          />
          <GrowthWizardField
            label="Competitor names (one per line)"
            hint={STEP3_HINTS.competitorNames.hint}
            example={STEP3_HINTS.competitorNames.example}
            full
            multiline
            value={step3.competitorNames}
            onChange={(competitorNames) => setStep3({ ...step3, competitorNames })}
          />
          <GrowthWizardField
            label="What makes you better?"
            hint={STEP3_HINTS.whyBetter.hint}
            example={STEP3_HINTS.whyBetter.example}
            full
            multiline
            value={step3.whyBetter}
            onChange={(whyBetter) => setStep3({ ...step3, whyBetter })}
            required
          />
          <GrowthWizardField
            label="What makes you different?"
            hint={STEP3_HINTS.whyDifferent.hint}
            example={STEP3_HINTS.whyDifferent.example}
            full
            multiline
            value={step3.whyDifferent}
            onChange={(whyDifferent) => setStep3({ ...step3, whyDifferent })}
            required
          />
          <div className="growth-actions full">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save & continue
            </button>
          </div>
        </form>
      ) : null}

      {step === 4 ? (
        <form className="growth-form-grid" onSubmit={(e) => void saveStep(e)}>
          <GrowthWizardField
            label="Main offer"
            hint={STEP4_HINTS.mainOffer.hint}
            example={STEP4_HINTS.mainOffer.example}
            full
            multiline
            value={step4.mainOffer}
            onChange={(mainOffer) => setStep4({ ...step4, mainOffer })}
            required
          />
          <GrowthWizardField
            label="Upsells"
            hint={STEP4_HINTS.upsells.hint}
            example={STEP4_HINTS.upsells.example}
            full
            multiline
            rows={2}
            value={step4.upsells}
            onChange={(upsells) => setStep4({ ...step4, upsells })}
          />
          <label className="full growth-field-block">
            <span className="growth-field-label">Free consultation?</span>
            <span className="growth-field-hint">{STEP4_HINTS.freeConsultation.hint}</span>
            <span className="growth-checkbox-row">
              <input
                type="checkbox"
                checked={step4.freeConsultation}
                onChange={(e) => setStep4({ ...step4, freeConsultation: e.target.checked })}
              />
              Yes — we offer a free consultation, audit, or discovery call
            </span>
          </label>
          <GrowthWizardField
            label="Discounts"
            hint={STEP4_HINTS.discounts.hint}
            example={STEP4_HINTS.discounts.example}
            value={step4.discounts}
            onChange={(discounts) => setStep4({ ...step4, discounts })}
          />
          <GrowthWizardField
            label="Guarantees"
            hint={STEP4_HINTS.guarantees.hint}
            example={STEP4_HINTS.guarantees.example}
            full
            multiline
            rows={2}
            value={step4.guarantees}
            onChange={(guarantees) => setStep4({ ...step4, guarantees })}
          />
          <div className="growth-actions full">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(3)}>
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save & continue
            </button>
          </div>
        </form>
      ) : null}

      {step === 5 ? (
        <form className="growth-form-grid" onSubmit={(e) => void saveStep(e)}>
          <label className="full growth-field-block">
            <span className="growth-field-label">Communication style</span>
            <span className="growth-field-hint">{STEP5_HINTS.style.hint}</span>
            <select
              value={step5.style}
              onChange={(e) => setStep5({ ...step5, style: e.target.value as (typeof COMM_STYLES)[number] })}
            >
              {COMM_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="growth-style-note">{STEP5_HINTS.style.examples[step5.style]}</span>
          </label>
          <GrowthWizardField
            label="Notes"
            hint={STEP5_HINTS.notes.hint}
            example={STEP5_HINTS.notes.example}
            full
            multiline
            value={step5.notes}
            onChange={(notes) => setStep5({ ...step5, notes })}
          />
          <div className="growth-actions full">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(4)}>
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save & continue
            </button>
          </div>
        </form>
      ) : null}

      {step === 6 ? (
        <form className="growth-form-grid" onSubmit={(e) => void saveStep(e)}>
          <label className="full growth-field-block">
            <span className="growth-field-label">Upload logo</span>
            <span className="growth-field-hint">{STEP6_HINTS.logo.hint}</span>
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void uploadAsset(e.target.files[0], "logo")} />
          </label>
          <label className="full growth-field-block">
            <span className="growth-field-label">Upload brand guide (PDF)</span>
            <span className="growth-field-hint">{STEP6_HINTS.brandGuide.hint}</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => e.target.files?.[0] && void uploadAsset(e.target.files[0], "brand_guide")}
            />
          </label>
          <label className="full growth-field-block">
            <span className="growth-field-label">Upload image</span>
            <span className="growth-field-hint">{STEP6_HINTS.image.hint}</span>
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void uploadAsset(e.target.files[0], "image")} />
          </label>
          {step6Assets.length > 0 ? (
            <ul className="growth-agent-list full">
              {step6Assets.map((a) => (
                <li key={a.url}>
                  {a.kind}: {a.fileName ?? a.url}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="growth-actions full">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(5)}>
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save assets
            </button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void completeWizard()}>
              Complete wizard & run analysis
            </button>
          </div>
        </form>
      ) : null}

      {workspace?.wizard.completed ? (
        <p style={{ marginTop: "1rem" }}>
          <Link to="/growth/dashboard">Open Growth dashboard →</Link>
        </p>
      ) : null}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
