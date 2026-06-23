import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type JobHunterCvTemplateMeta } from "../api/client";
import { useCareerWorkspace } from "../context/CareerWorkspaceContext";
import "./CareerCvHubPanel.css";

const REGION_OPTIONS = [
  { code: "", label: "All countries" },
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "UK", label: "United Kingdom" },
  { code: "ME", label: "Middle East" },
  { code: "INTL", label: "International" },
];

const EXPERIENCE_OPTIONS = [
  { code: "", label: "All levels" },
  { code: "entry", label: "Entry level" },
  { code: "mid", label: "Mid level" },
  { code: "senior", label: "Senior level" },
];

const SORT_OPTIONS = [
  { code: "profession", label: "Profession" },
  { code: "country", label: "Country" },
  { code: "experience", label: "Experience level" },
] as const;

type ProfessionGroup = {
  profession: string;
  label: string;
  templates: JobHunterCvTemplateMeta[];
};

function experienceLabel(level: string): string {
  if (level === "entry") return "Entry";
  if (level === "mid") return "Mid";
  if (level === "senior") return "Senior";
  return level;
}

export function CareerCvHubPanel() {
  const navigate = useNavigate();
  const { canWrite, regionCode } = useCareerWorkspace();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<ProfessionGroup[]>([]);
  const [region, setRegion] = useState(regionCode || "");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]["code"]>("profession");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (region) params.set("region", region);
      if (experienceLevel) params.set("experienceLevel", experienceLevel);
      if (sortBy) params.set("sortBy", sortBy);
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await api.listJobHunterCvTemplates(query);
      setGroups(res.groupedByProfession ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load CV templates");
    } finally {
      setLoading(false);
    }
  }, [region, experienceLevel, sortBy]);

  useEffect(() => {
    void load();
  }, [load]);

  const useTemplate = async (templateId: string) => {
    if (!canWrite) {
      setError("Subscribe to Job Hunter to use templates.");
      return;
    }
    setCreating(templateId);
    setError("");
    try {
      const res = await api.createJobHunterCvDocument({ templateId, region: region || undefined });
      navigate(`/career/build/${res.document.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create CV from template");
    } finally {
      setCreating(null);
    }
  };

  return (
    <section className="career-jh-panel career-cv-hub">
      <header className="career-cv-hub-header">
        <div>
          <h2>CV Hub — Template Central</h2>
          <p>ATS-ready samples by profession. Pick a template to open the builder wizard with real content pre-filled.</p>
        </div>
      </header>

      <div className="career-cv-hub-filters">
        <label>
          Country
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGION_OPTIONS.map((opt) => (
              <option key={opt.code || "all"} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Experience level
          <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
            {EXPERIENCE_OPTIONS.map((opt) => (
              <option key={opt.code || "all"} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort by
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="career-workspace-error">{error}</p> : null}
      {loading ? <p className="career-cv-hub-loading">Loading templates…</p> : null}

      {!loading
        ? groups.map((group) => (
            <section key={group.profession} className="career-cv-hub-group">
              <h3>{group.label}</h3>
              <div className="career-cv-hub-grid">
                {group.templates.map((template) => (
                  <article key={template.id} className="career-cv-hub-card">
                    <div className="career-cv-hub-card-badges">
                      <span>{template.region}</span>
                      <span>{experienceLabel(template.experienceLevel ?? "mid")}</span>
                    </div>
                    <h4>{template.title}</h4>
                    <p>{template.description}</p>
                    <p className="career-cv-hub-card-meta">
                      {template.industry.replace(/-/g, " ")} · ATS standard
                    </p>
                    <button
                      type="button"
                      className="career-workspace-btn career-workspace-btn--primary"
                      disabled={!canWrite || creating === template.id}
                      onClick={() => void useTemplate(template.id)}
                    >
                      {creating === template.id ? "Opening…" : "Use template"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))
        : null}
    </section>
  );
}
