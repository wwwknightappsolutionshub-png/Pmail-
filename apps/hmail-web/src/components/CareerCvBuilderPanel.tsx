import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  api,
  type JobHunterCvContent,
  type JobHunterCvDocumentRow,
  type JobHunterCvTemplateMeta,
} from "../api/client";
import { useCareerWorkspace } from "../context/CareerWorkspaceContext";
import { getCvWizardSuggestions } from "../data/career-cv-wizard-suggestions";
import "./CareerCvBuilderPanel.css";

const WIZARD_STEPS = [
  { id: "start", label: "Start", hint: "Title & region" },
  { id: "profile", label: "Profile", hint: "Contact & summary" },
  { id: "experience", label: "Experience", hint: "Work history" },
  { id: "education", label: "Education", hint: "Skills & certs" },
  { id: "review", label: "Review", hint: "Preview & export" },
] as const;

const REGION_OPTIONS = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "UK", label: "United Kingdom" },
  { code: "ME", label: "Middle East" },
  { code: "INTL", label: "International" },
];

function emptyContent(): JobHunterCvContent {
  return {
    fullName: "",
    contact: { email: "", phone: "", location: "" },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    certifications: [],
  };
}

function CvPreview({ content, region }: { content: JobHunterCvContent; region: string }) {
  const contactParts = [
    content.contact.email,
    content.contact.phone,
    content.contact.location,
    content.contact.linkedIn,
  ].filter(Boolean);

  return (
    <article className="career-cv-preview">
      <header>
        <h1>{content.fullName || "Your name"}</h1>
        <p className="career-cv-preview-contact">{contactParts.join(" | ") || "Contact details"}</p>
      </header>
      <section>
        <h2>Professional Summary</h2>
        <p>{content.summary || "—"}</p>
      </section>
      <section>
        <h2>Experience</h2>
        {content.experience.length === 0 ? (
          <p>—</p>
        ) : (
          content.experience.map((job, index) => (
            <div key={`${job.company}-${index}`} className="career-cv-preview-block">
              <h3>
                {job.title} — {job.company}
              </h3>
              <p className="career-cv-preview-meta">
                {job.location} | {job.startDate} – {job.endDate}
              </p>
              <ul>
                {job.bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
      <section>
        <h2>Education</h2>
        {content.education.length === 0 ? (
          <p>—</p>
        ) : (
          content.education.map((edu, index) => (
            <div key={`${edu.school}-${index}`} className="career-cv-preview-block">
              <h3>{edu.degree}</h3>
              <p className="career-cv-preview-meta">
                {edu.school}
                {edu.year ? ` — ${edu.year}` : ""}
              </p>
              {edu.details ? <p>{edu.details}</p> : null}
            </div>
          ))
        )}
      </section>
      <section>
        <h2>Skills</h2>
        <p>{content.skills.join(", ") || "—"}</p>
      </section>
      {content.certifications.length > 0 ? (
        <section>
          <h2>Certifications</h2>
          <ul>
            {content.certifications.map((cert, index) => (
              <li key={`${cert.name}-${index}`}>
                {cert.name} — {cert.issuer}
                {cert.year ? ` (${cert.year})` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="career-cv-preview-region">Region: {region}</p>
    </article>
  );
}

export function CareerCvBuilderPanel() {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();
  const { canWrite, regionCode: settingsRegion } = useCareerWorkspace();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [wizardStep, setWizardStep] = useState(0);

  const [documentId, setDocumentId] = useState<string | null>(routeId ?? null);
  const [title, setTitle] = useState("Untitled CV");
  const [region, setRegion] = useState("US");
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [content, setContent] = useState<JobHunterCvContent>(emptyContent);

  const [documents, setDocuments] = useState<JobHunterCvDocumentRow[]>([]);
  const [templates, setTemplates] = useState<JobHunterCvTemplateMeta[]>([]);
  const [roleCategories, setRoleCategories] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [filterRegion, setFilterRegion] = useState(settingsRegion || "US");
  const [filterRole, setFilterRole] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");

  const skillsText = useMemo(() => content.skills.join(", "), [content.skills]);

  const loadTemplates = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterRegion) params.set("region", filterRegion);
    if (filterRole) params.set("role", filterRole);
    if (filterIndustry) params.set("industry", filterIndustry);
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await api.listJobHunterCvTemplates(query);
    setTemplates(res.templates);
    setRoleCategories(res.filters.roleCategories);
    setIndustries(res.filters.industries);
  }, [filterRegion, filterRole, filterIndustry]);

  const loadDocument = useCallback(async (id: string) => {
    const res = await api.getJobHunterCvDocument(id);
    setDocumentId(res.document.id);
    setTitle(res.document.title);
    setRegion(res.document.region);
    setRole(res.document.role ?? "");
    setIndustry(res.document.industry ?? "");
    setContent(res.document.content);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    void (async () => {
      try {
        const listRes = await api.listJobHunterCvDocuments();
        if (cancelled) return;
        setDocuments(listRes.documents);

        if (routeId) {
          await loadDocument(routeId);
          setWizardStep(0);
        } else {
          setDocumentId(null);
          setContent(emptyContent());
          setTitle("Untitled CV");
          setFilterRegion(settingsRegion || "US");
        }

        await loadTemplates();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load CV builder");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeId, loadDocument, loadTemplates, settingsRegion]);

  useEffect(() => {
    if (loading) return;
    void loadTemplates().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load templates");
    });
  }, [filterRegion, filterRole, filterIndustry, loading, loadTemplates]);

  const updateExperience = (index: number, field: keyof JobHunterCvContent["experience"][number], value: string) => {
    setContent((prev) => {
      const next = [...prev.experience];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, experience: next };
    });
  };

  const updateExperienceBullets = (index: number, value: string) => {
    setContent((prev) => {
      const next = [...prev.experience];
      next[index] = { ...next[index], bullets: value.split("\n").map((line) => line.trim()).filter(Boolean) };
      return { ...prev, experience: next };
    });
  };

  const addExperience = () => {
    setContent((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { title: "", company: "", location: "", startDate: "", endDate: "", bullets: [] },
      ],
    }));
  };

  const addEducation = () => {
    setContent((prev) => ({
      ...prev,
      education: [...prev.education, { degree: "", school: "", year: "" }],
    }));
  };

  const updateEducation = (index: number, field: keyof JobHunterCvContent["education"][number], value: string) => {
    setContent((prev) => {
      const next = [...prev.education];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, education: next };
    });
  };

  const addCertification = () => {
    setContent((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { name: "", issuer: "", year: "" }],
    }));
  };

  const updateCertification = (
    index: number,
    field: keyof JobHunterCvContent["certifications"][number],
    value: string,
  ) => {
    setContent((prev) => {
      const next = [...prev.certifications];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, certifications: next };
    });
  };

  const createFromTemplate = async (templateId: string) => {
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const res = await api.createJobHunterCvDocument({
        templateId,
        region: filterRegion || undefined,
      });
      setNotice("CV created from template.");
      navigate(`/career/build/${res.document.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create CV");
    } finally {
      setCreating(false);
    }
  };

  const createBlank = async () => {
    setCreating(true);
    setError("");
    try {
      const suggestions = getCvWizardSuggestions(filterRegion || "US");
      const res = await api.createJobHunterCvDocument({
        title: suggestions.title,
        region: filterRegion || "US",
        role: suggestions.role,
        industry: suggestions.industry,
        content: suggestions.content,
      });
      navigate(`/career/build/${res.document.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create blank CV");
    } finally {
      setCreating(false);
    }
  };

  const saveDocument = async (event?: FormEvent, publishToDocuments = false) => {
    event?.preventDefault();
    if (!canWrite) {
      setError("Subscribe to Job Hunter to save CVs.");
      return;
    }
    if (!documentId) {
      setError("Select or create a CV first.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await api.updateJobHunterCvDocument(documentId, {
        title,
        region,
        role: role || undefined,
        industry: industry || undefined,
        content,
      });
      setTitle(res.document.title);
      setContent(res.document.content);
      if (publishToDocuments) {
        await api.publishJobHunterDocument({ cvDocumentId: documentId, isPinned: true });
        setNotice("CV saved and added to Documents.");
      } else {
        setNotice("CV saved.");
      }
      const listRes = await api.listJobHunterCvDocuments();
      setDocuments(listRes.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = async (publishToDocuments = false) => {
    if (!canWrite) {
      setError("Subscribe to Job Hunter to export CVs.");
      return;
    }
    if (!documentId) {
      setError("Save a CV before exporting.");
      return;
    }
    setExporting(true);
    setError("");
    try {
      const { blob, filename } = await api.exportJobHunterCvPdf(documentId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      if (publishToDocuments) {
        await api.publishJobHunterDocument({ cvDocumentId: documentId, isPinned: true });
        setNotice("PDF exported and added to Documents.");
      } else {
        setNotice("PDF exported.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <p className="career-cv-loading">Loading CV builder…</p>;
  }

  return (
    <div className="career-cv-builder">
      <div className="career-cv-builder-top">
        <div>
          <h1>CV Builder</h1>
          <p>Pick a template or resume a saved CV, then walk through the guided builder wizard.</p>
        </div>
        <div className="career-cv-builder-actions">
          {documentId && wizardStep === WIZARD_STEPS.length - 1 ? (
            <>
              <button type="button" className="career-workspace-btn subtle" onClick={() => navigate("/career/build")}>
                New / templates
              </button>
              <button
                type="button"
                className="career-workspace-btn"
                disabled={saving || !canWrite}
                onClick={() => void saveDocument()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="career-workspace-btn"
                disabled={exporting || !canWrite}
                onClick={() => void exportPdf()}
              >
                {exporting ? "Exporting…" : "Export PDF"}
              </button>
            </>
          ) : documentId ? (
            <button type="button" className="career-workspace-btn subtle" onClick={() => navigate("/career/build")}>
              Exit wizard
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="career-workspace-error">{error}</p> : null}
      {notice ? <p className="career-workspace-notice">{notice}</p> : null}

      {!documentId ? (
        <section className="career-cv-gallery">
          <div className="career-cv-gallery-sidebar">
            <h2>Your CVs</h2>
            {documents.length === 0 ? (
              <p className="career-cv-muted">No saved CVs yet.</p>
            ) : (
              <ul className="career-cv-doc-list">
                {documents.map((doc) => (
                  <li key={doc.id}>
                    <button type="button" onClick={() => navigate(`/career/build/${doc.id}`)}>
                      <strong>{doc.title}</strong>
                      <span>
                        {doc.region} · {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="career-workspace-btn btn-block" disabled={creating || !canWrite} onClick={() => void createBlank()}>
              {creating ? "Creating…" : "Start blank CV wizard"}
            </button>
          </div>

          <div className="career-cv-gallery-main">
            <div className="career-cv-filters">
              <label>
                Region
                <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
                  {REGION_OPTIONS.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Role
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                  <option value="">All roles</option>
                  {roleCategories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Industry
                <select value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)}>
                  <option value="">All industries</option>
                  {industries.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="career-cv-template-grid">
              {templates.map((template) => (
                <article key={template.id} className="career-cv-template-card">
                  <h3>{template.title}</h3>
                  <p>{template.description}</p>
                  <p className="career-cv-template-meta">
                    {template.region} · {template.roleCategory} · {template.industry}
                  </p>
                  <button
                    type="button"
                    className="career-workspace-btn"
                    disabled={creating || !canWrite}
                    onClick={() => void createFromTemplate(template.id)}
                  >
                    Use template
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <div className="career-cv-wizard">
          <ol className="career-cv-wizard-steps" aria-label="CV builder steps">
            {WIZARD_STEPS.map((step, index) => (
              <li
                key={step.id}
                className={`career-cv-wizard-step${index === wizardStep ? " career-cv-wizard-step--active" : ""}${
                  index < wizardStep ? " career-cv-wizard-step--done" : ""
                }`}
              >
                <button type="button" onClick={() => setWizardStep(index)} disabled={index > wizardStep}>
                  <span>{index + 1}</span>
                  <strong>{step.label}</strong>
                  <small>{step.hint}</small>
                </button>
              </li>
            ))}
          </ol>

          <div className="career-cv-wizard-body">
            <div className="career-cv-wizard-panel">
              {wizardStep === 0 ? (
                <div className="career-cv-wizard-step-content">
                  <header className="career-cv-wizard-step-header">
                    <p className="career-cv-wizard-step-eyebrow">Step 1 of 5</p>
                    <h2>Start your CV</h2>
                    <p className="career-cv-wizard-step-lead">Name this document and choose the target market.</p>
                  </header>

                  <div className="career-cv-wizard-form">
                    <label className="career-cv-field career-cv-field--full">
                      <span className="career-cv-field-label">Document title</span>
                      <input
                        className="career-cv-field-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        disabled={!canWrite}
                        placeholder="e.g. Product Manager CV — UK"
                      />
                    </label>

                    <div className="career-cv-field-row">
                      <label className="career-cv-field">
                        <span className="career-cv-field-label">Region</span>
                        <select
                          className="career-cv-field-input"
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          disabled={!canWrite}
                        >
                          {REGION_OPTIONS.map((item) => (
                            <option key={item.code} value={item.code}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="career-cv-field">
                        <span className="career-cv-field-label">Role category</span>
                        <input
                          className="career-cv-field-input"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          placeholder="e.g. engineering"
                          disabled={!canWrite}
                        />
                      </label>
                    </div>

                    <label className="career-cv-field career-cv-field--full">
                      <span className="career-cv-field-label">Industry</span>
                      <input
                        className="career-cv-field-input"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        placeholder="e.g. technology"
                        disabled={!canWrite}
                      />
                      <span className="career-cv-field-hint">Used to tailor templates and ATS suggestions for your market.</span>
                    </label>
                  </div>
                </div>
              ) : null}

              {wizardStep === 1 ? (
                <div className="career-cv-wizard-step-content">
                  <header className="career-cv-wizard-step-header">
                    <p className="career-cv-wizard-step-eyebrow">Step 2 of 5</p>
                    <h2>Profile</h2>
                    <p className="career-cv-wizard-step-lead">How recruiters reach you and your headline summary.</p>
                  </header>

                  <div className="career-cv-wizard-form">
                    <label className="career-cv-field career-cv-field--full">
                      <span className="career-cv-field-label">Full name</span>
                      <input
                        className="career-cv-field-input"
                        value={content.fullName}
                        onChange={(e) => setContent((prev) => ({ ...prev, fullName: e.target.value }))}
                        disabled={!canWrite}
                      />
                    </label>

                    <div className="career-cv-field-row">
                      <label className="career-cv-field">
                        <span className="career-cv-field-label">Email</span>
                        <input
                          className="career-cv-field-input"
                          type="email"
                          value={content.contact.email}
                          onChange={(e) =>
                            setContent((prev) => ({ ...prev, contact: { ...prev.contact, email: e.target.value } }))
                          }
                          disabled={!canWrite}
                        />
                      </label>
                      <label className="career-cv-field">
                        <span className="career-cv-field-label">Phone</span>
                        <input
                          className="career-cv-field-input"
                          value={content.contact.phone}
                          onChange={(e) =>
                            setContent((prev) => ({ ...prev, contact: { ...prev.contact, phone: e.target.value } }))
                          }
                          disabled={!canWrite}
                        />
                      </label>
                    </div>

                    <div className="career-cv-field-row">
                      <label className="career-cv-field">
                        <span className="career-cv-field-label">Location</span>
                        <input
                          className="career-cv-field-input"
                          value={content.contact.location}
                          onChange={(e) =>
                            setContent((prev) => ({ ...prev, contact: { ...prev.contact, location: e.target.value } }))
                          }
                          disabled={!canWrite}
                        />
                      </label>
                      <label className="career-cv-field">
                        <span className="career-cv-field-label">LinkedIn (optional)</span>
                        <input
                          className="career-cv-field-input"
                          value={content.contact.linkedIn ?? ""}
                          onChange={(e) =>
                            setContent((prev) => ({ ...prev, contact: { ...prev.contact, linkedIn: e.target.value } }))
                          }
                          disabled={!canWrite}
                        />
                      </label>
                    </div>

                    <label className="career-cv-field career-cv-field--full">
                      <span className="career-cv-field-label">Professional summary</span>
                      <textarea
                        className="career-cv-field-input career-cv-field-textarea"
                        rows={5}
                        value={content.summary}
                        onChange={(e) => setContent((prev) => ({ ...prev, summary: e.target.value }))}
                        disabled={!canWrite}
                        placeholder="2–3 sentences on your experience and what you're looking for."
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {wizardStep === 2 ? (
                <div className="career-cv-wizard-step-content">
                  <header className="career-cv-wizard-step-header">
                    <p className="career-cv-wizard-step-eyebrow">Step 3 of 5</p>
                    <h2>Experience</h2>
                    <p className="career-cv-wizard-step-lead">Add roles with impact bullets — one bullet per line.</p>
                  </header>

                  <div className="career-cv-wizard-form">
                    {content.experience.map((job, index) => (
                      <div key={index} className="career-cv-repeat-block">
                        <p className="career-cv-repeat-block-title">Role {index + 1}</p>
                        <div className="career-cv-field-row">
                          <label className="career-cv-field">
                            <span className="career-cv-field-label">Job title</span>
                            <input
                              className="career-cv-field-input"
                              value={job.title}
                              onChange={(e) => updateExperience(index, "title", e.target.value)}
                              disabled={!canWrite}
                            />
                          </label>
                          <label className="career-cv-field">
                            <span className="career-cv-field-label">Company</span>
                            <input
                              className="career-cv-field-input"
                              value={job.company}
                              onChange={(e) => updateExperience(index, "company", e.target.value)}
                              disabled={!canWrite}
                            />
                          </label>
                        </div>
                        <label className="career-cv-field career-cv-field--full">
                          <span className="career-cv-field-label">Location</span>
                          <input
                            className="career-cv-field-input"
                            value={job.location}
                            onChange={(e) => updateExperience(index, "location", e.target.value)}
                            disabled={!canWrite}
                          />
                        </label>
                        <div className="career-cv-field-row">
                          <label className="career-cv-field">
                            <span className="career-cv-field-label">Start</span>
                            <input
                              className="career-cv-field-input"
                              value={job.startDate}
                              onChange={(e) => updateExperience(index, "startDate", e.target.value)}
                              placeholder="Jan 2022"
                              disabled={!canWrite}
                            />
                          </label>
                          <label className="career-cv-field">
                            <span className="career-cv-field-label">End</span>
                            <input
                              className="career-cv-field-input"
                              value={job.endDate}
                              onChange={(e) => updateExperience(index, "endDate", e.target.value)}
                              placeholder="Present"
                              disabled={!canWrite}
                            />
                          </label>
                        </div>
                        <label className="career-cv-field career-cv-field--full">
                          <span className="career-cv-field-label">Bullets (one per line)</span>
                          <textarea
                            className="career-cv-field-input career-cv-field-textarea"
                            rows={4}
                            value={job.bullets.join("\n")}
                            onChange={(e) => updateExperienceBullets(index, e.target.value)}
                            disabled={!canWrite}
                          />
                        </label>
                      </div>
                    ))}
                    <button type="button" className="career-workspace-btn subtle" onClick={addExperience} disabled={!canWrite}>
                      Add experience
                    </button>
                  </div>
                </div>
              ) : null}

              {wizardStep === 3 ? (
                <div className="career-cv-wizard-step-content">
                  <header className="career-cv-wizard-step-header">
                    <p className="career-cv-wizard-step-eyebrow">Step 4 of 5</p>
                    <h2>Education & skills</h2>
                    <p className="career-cv-wizard-step-lead">Credentials, skills, and certifications.</p>
                  </header>

                  <div className="career-cv-wizard-form">
                    {content.education.map((edu, index) => (
                      <div key={index} className="career-cv-repeat-block">
                        <p className="career-cv-repeat-block-title">Education {index + 1}</p>
                        <label className="career-cv-field career-cv-field--full">
                          <span className="career-cv-field-label">Degree</span>
                          <input
                            className="career-cv-field-input"
                            value={edu.degree}
                            onChange={(e) => updateEducation(index, "degree", e.target.value)}
                            disabled={!canWrite}
                          />
                        </label>
                        <div className="career-cv-field-row">
                          <label className="career-cv-field">
                            <span className="career-cv-field-label">School</span>
                            <input
                              className="career-cv-field-input"
                              value={edu.school}
                              onChange={(e) => updateEducation(index, "school", e.target.value)}
                              disabled={!canWrite}
                            />
                          </label>
                          <label className="career-cv-field">
                            <span className="career-cv-field-label">Year</span>
                            <input
                              className="career-cv-field-input"
                              value={edu.year}
                              onChange={(e) => updateEducation(index, "year", e.target.value)}
                              disabled={!canWrite}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="career-workspace-btn subtle" onClick={addEducation} disabled={!canWrite}>
                      Add education
                    </button>

                    <label className="career-cv-field career-cv-field--full">
                      <span className="career-cv-field-label">Comma-separated skills</span>
                      <textarea
                        className="career-cv-field-input career-cv-field-textarea"
                        rows={3}
                        value={skillsText}
                        onChange={(e) =>
                          setContent((prev) => ({
                            ...prev,
                            skills: e.target.value
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          }))
                        }
                        disabled={!canWrite}
                        placeholder="React, TypeScript, project management"
                      />
                    </label>

                    {content.certifications.map((cert, index) => (
                      <div key={index} className="career-cv-repeat-block">
                        <p className="career-cv-repeat-block-title">Certification {index + 1}</p>
                        <label className="career-cv-field career-cv-field--full">
                          <span className="career-cv-field-label">Certification</span>
                          <input
                            className="career-cv-field-input"
                            value={cert.name}
                            onChange={(e) => updateCertification(index, "name", e.target.value)}
                            disabled={!canWrite}
                          />
                        </label>
                        <div className="career-cv-field-row">
                          <label className="career-cv-field">
                            <span className="career-cv-field-label">Issuer</span>
                            <input
                              className="career-cv-field-input"
                              value={cert.issuer}
                              onChange={(e) => updateCertification(index, "issuer", e.target.value)}
                              disabled={!canWrite}
                            />
                          </label>
                          <label className="career-cv-field">
                            <span className="career-cv-field-label">Year</span>
                            <input
                              className="career-cv-field-input"
                              value={cert.year}
                              onChange={(e) => updateCertification(index, "year", e.target.value)}
                              disabled={!canWrite}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="career-workspace-btn subtle" onClick={addCertification} disabled={!canWrite}>
                      Add certification
                    </button>
                  </div>
                </div>
              ) : null}

              {wizardStep === 4 ? (
                <div className="career-cv-wizard-step-content">
                  <header className="career-cv-wizard-step-header">
                    <p className="career-cv-wizard-step-eyebrow">Step 5 of 5</p>
                    <h2>Review & export</h2>
                    <p className="career-cv-wizard-step-lead">Check the ATS-friendly preview, then save or export your PDF.</p>
                  </header>
                  <div className="career-cv-wizard-review-actions">
                    <button type="button" className="career-workspace-btn" disabled={saving || !canWrite} onClick={() => void saveDocument()}>
                      {saving ? "Saving…" : "Save CV"}
                    </button>
                    <button
                      type="button"
                      className="career-workspace-btn subtle"
                      disabled={saving || !canWrite}
                      onClick={() => void saveDocument(undefined, true)}
                    >
                      Save & add to Documents
                    </button>
                    <button type="button" className="career-workspace-btn" disabled={exporting || !canWrite} onClick={() => void exportPdf()}>
                      {exporting ? "Exporting…" : "Export PDF"}
                    </button>
                    <button
                      type="button"
                      className="career-workspace-btn subtle"
                      disabled={exporting || !canWrite}
                      onClick={() => void exportPdf(true)}
                    >
                      Export & add to Documents
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="career-cv-wizard-nav">
                <button
                  type="button"
                  className="career-workspace-btn subtle"
                  disabled={wizardStep === 0}
                  onClick={() => setWizardStep((step) => Math.max(0, step - 1))}
                >
                  Back
                </button>
                {wizardStep < WIZARD_STEPS.length - 1 ? (
                  <button
                    type="button"
                    className="career-workspace-btn"
                    onClick={() => {
                      if (canWrite && documentId) void saveDocument();
                      setWizardStep((step) => Math.min(WIZARD_STEPS.length - 1, step + 1));
                    }}
                  >
                    {wizardStep === WIZARD_STEPS.length - 2 ? "Review" : "Continue"}
                  </button>
                ) : null}
              </div>
            </div>

            <aside className="career-cv-preview-pane">
              <h2>Live preview</h2>
              <CvPreview content={content} region={region} />
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
