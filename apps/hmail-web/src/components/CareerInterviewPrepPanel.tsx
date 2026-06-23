import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type InterviewPrepResult, type JobApplicationRow } from "../api/client";
import "./CareerInterviewPrepPanel.css";

const REGION_OPTIONS = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "UK", label: "United Kingdom" },
  { code: "ME", label: "Middle East" },
  { code: "INTL", label: "International" },
];

function formatPrepForClipboard(prep: InterviewPrepResult): string {
  const lines: string[] = [
    `Interview prep — ${prep.targetRole ?? "Role"} (${prep.region})`,
    "",
    ...prep.questions.flatMap((item, index) => [
      `${index + 1}. ${item.question}`,
      ...item.answerOutline.map((point) => `   - ${point}`),
      ...(item.tips.length ? [`   Tips: ${item.tips.join("; ")}`] : []),
      "",
    ]),
    "General tips:",
    ...prep.generalTips.map((tip) => `- ${tip}`),
  ];
  return lines.join("\n");
}

export function CareerInterviewPrepPanel() {
  const [searchParams] = useSearchParams();
  const prefillApplicationId = searchParams.get("applicationId") ?? "";
  const [loadingApps, setLoadingApps] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [applications, setApplications] = useState<JobApplicationRow[]>([]);
  const [sourceMode, setSourceMode] = useState<"paste" | "application">("paste");
  const [jobDescription, setJobDescription] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [region, setRegion] = useState("US");
  const [prep, setPrep] = useState<InterviewPrepResult | null>(null);

  const loadApplications = useCallback(async () => {
    setLoadingApps(true);
    try {
      const res = await api.listJobApplications();
      setApplications(res.applications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load applications");
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    if (prefillApplicationId && applications.some((app) => app.id === prefillApplicationId)) {
      setSourceMode("application");
      setApplicationId(prefillApplicationId);
    }
  }, [prefillApplicationId, applications]);

  const selectedApplication = useMemo(
    () => applications.find((app) => app.id === applicationId) ?? null,
    [applications, applicationId],
  );

  useEffect(() => {
    if (sourceMode === "application" && selectedApplication) {
      setTargetRole(selectedApplication.roleTitle);
    }
  }, [sourceMode, selectedApplication]);

  const generate = async (event?: FormEvent) => {
    event?.preventDefault();
    setGenerating(true);
    setError("");
    setNotice("");
    setPrep(null);
    try {
      const res = await api.generateInterviewPrep({
        jobDescription: sourceMode === "paste" ? jobDescription : undefined,
        applicationId: sourceMode === "application" ? applicationId || undefined : undefined,
        targetRole: targetRole.trim() || undefined,
        region,
      });
      setPrep(res.prep);
      setNotice("Interview prep generated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Interview prep failed");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!prep) return;
    setNotice("");
    setError("");
    try {
      await navigator.clipboard.writeText(formatPrepForClipboard(prep));
      setNotice("Copied to clipboard.");
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  return (
    <div className="career-interview-prep">
      <div className="career-workspace-title-row">
        <div>
          <h1>Interview prep</h1>
          <p>Paste a job description or pick a tracked application to generate likely questions and answer outlines.</p>
        </div>
      </div>

      {error ? <p className="career-workspace-error">{error}</p> : null}
      {notice ? <p className="career-workspace-notice">{notice}</p> : null}

      <form className="career-interview-prep-form" onSubmit={(event) => void generate(event)}>
        <fieldset>
          <legend>Source</legend>
          <label className="career-interview-prep-radio">
            <input
              type="radio"
              name="prep-source"
              checked={sourceMode === "paste"}
              onChange={() => setSourceMode("paste")}
            />
            Paste job description
          </label>
          <label className="career-interview-prep-radio">
            <input
              type="radio"
              name="prep-source"
              checked={sourceMode === "application"}
              onChange={() => setSourceMode("application")}
            />
            Use tracked application
          </label>
        </fieldset>

        {sourceMode === "paste" ? (
          <label>
            Job description
            <textarea
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job posting or key responsibilities/requirements…"
              required
            />
          </label>
        ) : (
          <label>
            Application
            <select
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              disabled={loadingApps}
              required
            >
              <option value="">Select application…</option>
              {applications.map((application) => (
                <option key={application.id} value={application.id}>
                  {application.company} — {application.roleTitle}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="career-interview-prep-inline">
          <label>
            Target role
            <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Optional override" />
          </label>
          <label>
            Region
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGION_OPTIONS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="submit" className="career-workspace-btn" disabled={generating}>
          {generating ? "Generating…" : "Generate prep"}
        </button>
      </form>

      {prep ? (
        <section className="career-interview-prep-results">
          <div className="career-interview-prep-results-header">
            <h2>Likely questions</h2>
            <button type="button" className="career-workspace-btn subtle" onClick={() => void copyToClipboard()}>
              Copy to clipboard
            </button>
          </div>
          <p className="career-interview-prep-meta">
            {prep.targetRole ? `${prep.targetRole} · ` : ""}
            {prep.region} · Source: {prep.source === "application" ? "application" : "job description"}
          </p>
          <div className="career-interview-prep-questions">
            {prep.questions.map((item, index) => (
              <article key={`${item.question}-${index}`} className="career-interview-prep-card">
                <h3>
                  {index + 1}. {item.question}
                </h3>
                {item.answerOutline.length > 0 ? (
                  <>
                    <h4>Answer outline</h4>
                    <ul>
                      {item.answerOutline.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {item.tips.length > 0 ? (
                  <>
                    <h4>Tips</h4>
                    <ul>
                      {item.tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </article>
            ))}
          </div>
          {prep.generalTips.length > 0 ? (
            <div className="career-interview-prep-general">
              <h3>General tips</h3>
              <ul>
                {prep.generalTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
