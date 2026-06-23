import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type CvRatingResult } from "../api/client";
import { useCareerWorkspace } from "../context/CareerWorkspaceContext";
import "./CareerScannerPanel.css";

export type CareerScannerPreload = {
  file: File;
  fromToastOptIn: boolean;
};

interface CareerScannerPanelProps {
  preload?: CareerScannerPreload | null;
  onPreloadConsumed?: () => void;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function scoreClass(score: number): string {
  if (score >= 80) return "good";
  if (score >= 60) return "mid";
  return "low";
}

export function CareerScannerPanel({ preload, onPreloadConsumed }: CareerScannerPanelProps) {
  const { canWrite } = useCareerWorkspace();
  const [regions, setRegions] = useState<Array<{ code: string; label: string }>>([]);
  const [region, setRegion] = useState("US");
  const [targetRole, setTargetRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fromToastOptIn, setFromToastOptIn] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [rating, setRating] = useState<CvRatingResult | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [savingToDocuments, setSavingToDocuments] = useState(false);
  const [documentsNotice, setDocumentsNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadingRegions(true);
    api
      .getJobHunterScannerRegions()
      .then((res) => {
        if (cancelled) return;
        setRegions(res.regions);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load regions");
      })
      .finally(() => {
        if (!cancelled) setLoadingRegions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!preload) return;

    setFile(preload.file);
    setFromToastOptIn(preload.fromToastOptIn);
    setRating(null);
    setError("");
    onPreloadConsumed?.();

    if (!preload.fromToastOptIn) return;

    let cancelled = false;
    setRatingLoading(true);

    void (async () => {
      try {
        const dataBase64 = await readFileAsBase64(preload.file);
        const result = await api.rateJobHunterCv({
          fileName: preload.file.name,
          mimeType: preload.file.type || "application/octet-stream",
          dataBase64,
          region,
          targetRole: targetRole.trim() || undefined,
          fromToastOptIn: true,
        });
        if (!cancelled) setRating(result.rating);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Rating failed");
      } finally {
        if (!cancelled) setRatingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [preload, onPreloadConsumed, region, targetRole]);

  const handleFileChange = (files: FileList | null) => {
    const next = files?.[0];
    if (!next) return;
    setFile(next);
    setFromToastOptIn(false);
    setRating(null);
    setError("");
  };

  const runRating = useCallback(async () => {
    if (!file) {
      setError("Choose a PDF or Word CV to rate.");
      return;
    }
    setRatingLoading(true);
    setError("");
    setRating(null);
    try {
      const dataBase64 = await readFileAsBase64(file);
      const result = await api.rateJobHunterCv({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataBase64,
        region,
        targetRole: targetRole.trim() || undefined,
        fromToastOptIn,
      });
      setRating(result.rating);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rating failed");
    } finally {
      setRatingLoading(false);
    }
  }, [file, region, targetRole, fromToastOptIn]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runRating();
  };

  const saveToDocuments = async () => {
    if (!file) {
      setError("Choose a CV file before saving to Documents.");
      return;
    }
    setSavingToDocuments(true);
    setError("");
    setDocumentsNotice("");
    try {
      const dataBase64 = await readFileAsBase64(file);
      await api.publishJobHunterDocument({
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        dataBase64,
        source: "job_hunter_scanner",
        isPinned: true,
      });
      setDocumentsNotice("CV saved to Documents and pinned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save to Documents");
    } finally {
      setSavingToDocuments(false);
    }
  };

  return (
    <div className="career-scanner-panel">
      <header className="career-scanner-header">
        <h2>Scan CV</h2>
        <p>Benchmark your resume against industry, country, and ATS standards — then apply suggested fixes in the builder.</p>
      </header>

      <div className="career-scanner-layout">
        <section className="career-scanner-uploaded" aria-label="Uploaded CV">
          <h3>Uploaded</h3>
          <form className="career-scanner-form" onSubmit={onSubmit}>
            <label className="career-scanner-field">
              <span>CV file (PDF or DOCX)</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => handleFileChange(e.target.files)}
              />
              {file ? <small className="career-scanner-file-name">{file.name}</small> : null}
            </label>

            <label className="career-scanner-field">
              <span>Target country / region</span>
              <select value={region} disabled={loadingRegions} onChange={(e) => setRegion(e.target.value)}>
                {regions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="career-scanner-field">
              <span>Target role & industry</span>
              <input
                type="text"
                value={targetRole}
                placeholder="e.g. Product Manager — SaaS"
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </label>

            {error ? <p className="career-scanner-error">{error}</p> : null}
            {documentsNotice ? <p className="career-scanner-notice">{documentsNotice}</p> : null}

            <div className="career-scanner-upload-actions">
              <button type="submit" className="career-scanner-submit" disabled={ratingLoading || !file || !canWrite}>
                {ratingLoading ? "Analyzing…" : "Benchmark CV"}
              </button>
              <button
                type="button"
                className="career-scanner-save-documents"
                disabled={!file || savingToDocuments}
                onClick={() => void saveToDocuments()}
              >
                {savingToDocuments ? "Saving…" : "Save to Documents"}
              </button>
            </div>
          </form>

          {rating ? (
            <div className="career-scanner-uploaded-scores">
              <div className={`career-scanner-overall ${scoreClass(rating.overallScore)}`}>
                <span className="career-scanner-overall-label">ATS score</span>
                <strong>{rating.overallScore}</strong>
              </div>
              <div className="career-scanner-categories">
                {(
                  [
                    ["ATS", rating.categories.ats],
                    ["Format", rating.categories.format],
                    ["Keywords", rating.categories.keywords],
                    ["Sections", rating.categories.sections],
                  ] as const
                ).map(([label, cat]) => (
                  <article key={label} className="career-scanner-category">
                    <header>
                      <span>{label}</span>
                      <strong className={scoreClass(cat.score)}>{cat.score}</strong>
                    </header>
                    <p>{cat.notes}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <p className="career-scanner-placeholder">Upload a CV to see your benchmark scores here.</p>
          )}
        </section>

        <section className="career-scanner-suggested" aria-label="Suggested improvements">
          <h3>Suggested</h3>
          {rating ? (
            <>
              <div className="career-scanner-region-notes">
                <h4>Country & industry guidance ({rating.region})</h4>
                <p>{rating.regionNotes}</p>
              </div>
              <div className="career-scanner-improvements">
                <h4>Recommended edits</h4>
                <ul>
                  {rating.improvements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <p className="career-scanner-next-step">
                <Link className="career-workspace-btn" to="/career/build">
                  Apply suggestions in CV Builder
                </Link>
              </p>
            </>
          ) : (
            <p className="career-scanner-placeholder">
              Suggestions for ATS keywords, section order, and regional formatting appear here after you benchmark an upload.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
