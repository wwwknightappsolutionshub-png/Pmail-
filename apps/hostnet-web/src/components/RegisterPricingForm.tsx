import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { FormFieldDefinition, PublicFormDefinition } from "../types/site";
import { GoogleRecaptcha } from "./GoogleRecaptcha";
import customPricingHero from "../assets/custom-pricing-hero.svg?url";
import "./RegisterPricingForm.css";

type FormMode = "membership" | "inquiry";

function readAttribution() {
  const params = new URLSearchParams(window.location.search);
  const storedRef = sessionStorage.getItem("pmail_referral_ref") ?? undefined;
  return {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    referrer: document.referrer || undefined,
    referralRef: params.get("ref") ?? storedRef,
  };
}

function emptyValues(fields: FormFieldDefinition[]) {
  return Object.fromEntries(fields.map((f) => [f.key, ""]));
}

function DynamicFields({
  fields,
  values,
  onChange,
}: {
  fields: FormFieldDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <>
      {fields.map((field) => (
        <label key={field.key} className={field.type === "textarea" ? "register-field-full" : undefined}>
          {field.label}
          {field.type === "textarea" ? (
            <textarea
              required={field.required}
              value={values[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          ) : field.type === "select" ? (
            <select
              className="register-branded-select"
              required={field.required}
              value={values[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
            >
              <option value="">Select…</option>
              {(field.options ?? []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              required={field.required}
              type={field.type}
              value={values[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          )}
          {field.helpText ? <span className="muted admin-field-hint">{field.helpText}</span> : null}
        </label>
      ))}
    </>
  );
}

function FormSideArt({ mode, heroImageUrl }: { mode: FormMode; heroImageUrl?: string | null }) {
  const imageSrc = heroImageUrl?.trim() || customPricingHero;
  const copy =
    mode === "membership"
      ? {
          title: "Tailored hosting & mail",
          body: "Every deployment is scoped to your team size, compliance needs, and product mix.",
          bullets: [
            "Sample panel credentials within minutes",
            "Full provisioning in 4–8 hours",
            "PMail+ and Bespoke Mail options",
          ],
        }
      : {
          title: "Talk to our team",
          body: "Questions about enterprise scale, reseller programs, or regulated workloads?",
          bullets: [
            "Dedicated solutions review",
            "Security & compliance guidance",
            "Custom integration scoping",
          ],
        };

  return (
    <div className={`register-pricing-art register-pricing-art--${mode === "membership" ? "pricing" : "contact"}`}>
      <img
        src={imageSrc}
        alt="Prohost Cloud control panel and infrastructure"
        className="register-pricing-hero-img"
        width={640}
        height={480}
        loading="lazy"
      />
      <h3>{copy.title}</h3>
      <p>{copy.body}</p>
      <ul>
        {copy.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function RegisterPricingForm({ heroImageUrl }: { heroImageUrl?: string | null } = {}) {
  const [forms, setForms] = useState<PublicFormDefinition[]>([]);
  const [mode, setMode] = useState<FormMode>("membership");
  const [values, setValues] = useState<Record<string, string>>({});
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    api.publicForms().then((res) => setForms(res.forms)).catch(() => setForms([]));
  }, []);

  const membershipForm = useMemo(() => forms.find((f) => f.formKey === "membership"), [forms]);
  const inquiryForm = useMemo(() => forms.find((f) => f.formKey === "inquiry"), [forms]);
  const activeForm = mode === "membership" ? membershipForm : inquiryForm;

  useEffect(() => {
    if (activeForm) setValues(emptyValues(activeForm.fields));
    setError("");
    setCaptchaToken("");
  }, [activeForm?.id, mode]);

  function updateField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeForm) return;
    if (mode === "membership" && !consentPrivacy) {
      setError("Please accept the privacy notice.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const attribution = readAttribution();
      if (mode === "membership") {
        await api.submitMembership({
          payload: values,
          consentPrivacy: true,
          captchaToken,
          ...attribution,
        });
        setSuccess({
          title: "Registration received",
          body: "Check your work email for sample panel credentials. Full provisioning typically completes within 4–8 hours.",
        });
      } else {
        await api.submitInquiry({ payload: values, captchaToken, ...attribution });
        setSuccess({
          title: "Inquiry sent",
          body: "We received your message and sent a confirmation to your email. Our team will respond shortly.",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="register-pricing-success">
        <h3>{success.title}</h3>
        <p className="muted">{success.body}</p>
        {mode === "membership" ? (
          <Link to="/panel/login" className="btn btn-primary">
            Sign in to sample panel
          </Link>
        ) : null}
        <button type="button" className="btn btn-secondary" onClick={() => setSuccess(null)}>
          Submit another
        </button>
      </div>
    );
  }

  if (!activeForm) {
    return <p className="muted">Loading form…</p>;
  }

  return (
    <div className="register-pricing-layout">
      <FormSideArt mode={mode} heroImageUrl={heroImageUrl} />
      <form className="register-pricing-form" onSubmit={(e) => void handleSubmit(e)}>
        <div className="register-mode-switch" role="tablist" aria-label="Form type">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "membership"}
            className={mode === "membership" ? "active" : ""}
            onClick={() => setMode("membership")}
          >
            Get Custom Price
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "inquiry"}
            className={mode === "inquiry" ? "active" : ""}
            onClick={() => setMode("inquiry")}
          >
            Contact Us
          </button>
          <span className={`register-mode-slider ${mode === "inquiry" ? "right" : ""}`} aria-hidden />
        </div>

        {activeForm.description ? <p className="muted register-form-desc">{activeForm.description}</p> : null}

        <div className="register-pricing-grid">
          <DynamicFields fields={activeForm.fields} values={values} onChange={updateField} />
        </div>

        {mode === "membership" ? (
          <label className="register-pricing-consent">
            <input type="checkbox" checked={consentPrivacy} onChange={(e) => setConsentPrivacy(e.target.checked)} required />
            I agree to the processing of my contact details per the{" "}
            <a href="/api/public/privacy" target="_blank" rel="noreferrer">
              privacy notice
            </a>
            .
          </label>
        ) : null}

        <GoogleRecaptcha onToken={setCaptchaToken} onExpire={() => setCaptchaToken("")} />

        {error ? <p className="register-pricing-error">{error}</p> : null}

        <button
          type="submit"
          className="btn btn-primary register-pricing-submit"
          disabled={submitting || (mode === "membership" && !consentPrivacy)}
        >
          {submitting ? "Submitting…" : mode === "membership" ? "Register" : "Submit"}
        </button>
        <p className="register-pricing-note muted">No public pricing — every deployment is scoped to your requirements.</p>
      </form>
    </div>
  );
}
