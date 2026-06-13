import { Link } from "react-router-dom";
import type { PublicPanelPreview } from "../types/site";

type Props = {
  preview: PublicPanelPreview;
};

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export function HeroStatsPanel({ preview }: Props) {
  return (
    <div className="hero-stats-panel" aria-label="Live panel preview">
      <div className="hero-stats-panel-glow" aria-hidden />

      <div className="panel-preview">
        <div className="panel-preview-bar">
          <i />
          <i />
          <i />
          <span className="panel-preview-title">HostNet Panel</span>
        </div>

        <div className="panel-preview-body">
          <div className="preview-account-row">
            <div>
              <span className="preview-label">Signed in as</span>
              <strong className="preview-account">{preview.accountLabel}</strong>
            </div>
            {preview.planName && <span className="badge">{preview.planName}</span>}
          </div>

          <div className="preview-meters">
            <div className="preview-meter preview-meter--large">
              <label>
                <span>Disk usage</span>
                <span>{preview.diskPercent}%</span>
              </label>
              <div className="preview-meter-track">
                <div className="preview-meter-fill" style={{ width: `${preview.diskPercent}%` }} />
              </div>
              <span className="preview-meter-detail">
                {formatMb(preview.diskUsedMb)} of {formatMb(preview.diskQuotaMb)}
              </span>
            </div>
            <div className="preview-meter preview-meter--large">
              <label>
                <span>Bandwidth</span>
                <span>{preview.bandwidthPercent}%</span>
              </label>
              <div className="preview-meter-track">
                <div
                  className="preview-meter-fill preview-meter-fill--bandwidth"
                  style={{ width: `${preview.bandwidthPercent}%` }}
                />
              </div>
              <span className="preview-meter-detail">
                {formatMb(preview.bandwidthUsedMb)} of {formatMb(preview.bandwidthMb)}
              </span>
            </div>
          </div>

          <div className="preview-tiles preview-tiles--large">
            <div className="preview-tile">
              <strong>{preview.domains}</strong>
              <span>Domains</span>
            </div>
            <div className="preview-tile">
              <strong>{preview.emailBoxes}</strong>
              <span>Mailboxes</span>
            </div>
            <div className="preview-tile">
              <strong>{preview.databases}</strong>
              <span>Databases</span>
            </div>
            <div className="preview-tile preview-tile--status">
              <strong>{preview.uptime}</strong>
              <span>Uptime</span>
            </div>
          </div>

          <div className="preview-status-row">
            <span className={preview.sslActive ? "preview-pill preview-pill--ok" : "preview-pill"}>
              SSL {preview.sslActive ? "Active" : "Off"}
            </span>
            <span className="preview-pill">Backups enabled</span>
            <span className="preview-pill">Live from API</span>
          </div>

          <Link to="/panel/login" className="btn btn-primary preview-cta">
            Open your panel →
          </Link>
        </div>
      </div>
    </div>
  );
}
