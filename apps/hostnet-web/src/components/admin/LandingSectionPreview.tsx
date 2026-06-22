import { getLandingSectionMeta } from "../../data/landingSectionCatalog";
import { parseBulletCard } from "../../lib/landingContent";
import {
  landingSectionBulletVariant,
  landingSectionEyebrow,
  landingSectionFeaturesCopy,
  landingSectionPlatformCopy,
  landingSectionUsesSubtitleAsLead,
  type LandingBulletVariant,
} from "../../lib/landingSectionUi";
import { SectionRichText } from "../SectionRichText";
import "./LandingSectionPreview.css";

export type LandingSectionDraft = {
  sectionKey: string;
  title: string;
  subtitle: string;
  body: string;
  bulletPoints: string[];
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
  isPublished: boolean;
};

function PreviewBullets({ lines, variant }: { lines: string[]; variant: LandingBulletVariant }) {
  if (lines.length === 0) return null;

  if (variant === "stack") {
    return (
      <div className="lp-preview-stack">
        {lines.map((line) => {
          const card = parseBulletCard(line);
          return (
            <article key={line} className="lp-preview-stack-card">
              <h4>{card.title}</h4>
              {card.description ? <p>{card.description}</p> : null}
            </article>
          );
        })}
      </div>
    );
  }

  if (variant === "rail") {
    return (
      <div className="lp-preview-rail">
        {lines.map((line, idx) => {
          const card = parseBulletCard(line);
          return (
            <article key={line} className="lp-preview-rail-item">
              <span>{String(idx + 1).padStart(2, "0")}</span>
              <div>
                <h4>{card.title}</h4>
                {card.description ? <p>{card.description}</p> : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  if (variant === "suite") {
    return (
      <div className="lp-preview-suite">
        {lines.map((line, idx) => {
          const card = parseBulletCard(line);
          return (
            <article key={line} className={`lp-preview-suite-card${idx === 1 ? " featured" : ""}`}>
              <h4>{card.title}</h4>
              {card.description ? <p>{card.description}</p> : null}
            </article>
          );
        })}
      </div>
    );
  }

  if (variant === "security") {
    return (
      <div className="lp-preview-security-list">
        {lines.map((line) => (
          <div key={line} className="lp-preview-security-item">
            <span className="lp-preview-security-dot" aria-hidden />
            {parseBulletCard(line).title}
          </div>
        ))}
      </div>
    );
  }

  if (variant === "chips") {
    return (
      <div className="lp-preview-chips">
        {lines.map((line) => (
          <span key={line}>{parseBulletCard(line).title}</span>
        ))}
      </div>
    );
  }

  return (
    <ul className="lp-preview-list">
      {lines.map((line) => (
        <li key={line}>{parseBulletCard(line).title}</li>
      ))}
    </ul>
  );
}

function PreviewSectionCopy({ draft }: { draft: LandingSectionDraft }) {
  const eyebrow = landingSectionEyebrow(draft.sectionKey, draft.subtitle);

  if (draft.sectionKey === "hero") {
    return (
      <div className="lp-preview-hero">
        <p className="lp-preview-eyebrow">{eyebrow}</p>
        <h3>
          {draft.title || "Headline"}
          {draft.subtitle ? <span>{draft.subtitle}</span> : null}
        </h3>
        {draft.body ? <SectionRichText html={draft.body} className="lp-preview-body" /> : null}
        {draft.ctaLabel ? <span className="lp-preview-cta">{draft.ctaLabel}</span> : null}
        {draft.bulletPoints.length > 0 ? (
          <dl className="lp-preview-metrics">
            {draft.bulletPoints.slice(0, 3).map((line) => {
              const [value, metricLabel] = line.includes("|") ? line.split("|").map((p) => p.trim()) : [line, ""];
              return (
                <div key={line}>
                  <dt>{value}</dt>
                  {metricLabel ? <dd>{metricLabel}</dd> : null}
                </div>
              );
            })}
          </dl>
        ) : null}
      </div>
    );
  }

  if (draft.sectionKey === "platform") {
    const platformCopy = landingSectionPlatformCopy(draft.subtitle, draft.body);
    return (
      <div className="lp-preview-platform">
        {eyebrow ? <p className="lp-preview-eyebrow">{eyebrow}</p> : null}
        <h3 className="lp-preview-title lp-preview-title--center">{draft.title || "Section headline"}</h3>
        {platformCopy.mutedHtml ? <p className="lp-preview-body lp-preview-body--center">{platformCopy.mutedHtml}</p> : null}
        {platformCopy.useBody ? <SectionRichText html={draft.body} className="lp-preview-body lp-preview-body--center" /> : null}
        <PreviewBullets lines={draft.bulletPoints} variant="suite" />
      </div>
    );
  }

  if (draft.sectionKey === "features") {
    const featuresCopy = landingSectionFeaturesCopy(draft.subtitle, draft.body);
    return (
      <>
        {eyebrow ? <p className="lp-preview-eyebrow">{eyebrow}</p> : null}
        <h3 className="lp-preview-title">{draft.title || "Section headline"}</h3>
        {featuresCopy.leadHtml && !featuresCopy.useSubtitle ? (
          <SectionRichText html={featuresCopy.leadHtml} className="lp-preview-body" />
        ) : null}
        {featuresCopy.leadHtml && featuresCopy.useSubtitle ? (
          <p className="lp-preview-body">{featuresCopy.leadHtml}</p>
        ) : null}
        <PreviewBullets lines={draft.bulletPoints} variant="list" />
      </>
    );
  }

  if (draft.sectionKey === "contact") {
    return (
      <>
        {eyebrow ? <p className="lp-preview-eyebrow">{eyebrow}</p> : null}
        <h3 className="lp-preview-title lp-preview-title--center">{draft.title || "Section headline"}</h3>
        {draft.subtitle ? <p className="lp-preview-body lp-preview-body--center">{draft.subtitle}</p> : null}
        {draft.body ? <SectionRichText html={draft.body} className="lp-preview-body lp-preview-body--center" /> : null}
        <p className="muted lp-preview-form-placeholder">Registration form appears here on the live page.</p>
      </>
    );
  }

  if (draft.sectionKey === "testimonials") {
    return (
      <>
        {eyebrow ? <p className="lp-preview-eyebrow">{eyebrow}</p> : null}
        <h3 className="lp-preview-title">{draft.title || "Section headline"}</h3>
        {draft.body ? <SectionRichText html={draft.body} className="lp-preview-body" /> : null}
        <div className="lp-preview-testimonial-grid" aria-hidden>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="lp-preview-testimonial-card">
              <span className="lp-preview-testimonial-stars">★★★★★</span>
              <p>Customer review card {n}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  const bulletVariant = landingSectionBulletVariant(draft.sectionKey);

  return (
    <>
      {eyebrow ? <p className="lp-preview-eyebrow">{eyebrow}</p> : null}
      <h3 className="lp-preview-title">{draft.title || "Section headline"}</h3>
      {landingSectionUsesSubtitleAsLead(draft.sectionKey) && draft.subtitle ? (
        <p className="lp-preview-lead">{draft.subtitle}</p>
      ) : null}
      {!landingSectionUsesSubtitleAsLead(draft.sectionKey) &&
      draft.subtitle &&
      draft.sectionKey !== "hmail_addons" ? (
        <p className="lp-preview-body">{draft.subtitle}</p>
      ) : null}
      {draft.body ? <SectionRichText html={draft.body} className="lp-preview-body" /> : null}
      {bulletVariant ? <PreviewBullets lines={draft.bulletPoints} variant={bulletVariant} /> : null}
      {draft.sectionKey === "trust" && draft.bulletPoints.length > 0 ? (
        <div className="lp-preview-trust-strip-hint">
          <span className="muted">Trust strip (top of page):</span>
          <PreviewBullets lines={draft.bulletPoints} variant="chips" />
        </div>
      ) : null}
      {draft.ctaLabel ? (
        <span className={`lp-preview-cta${draft.sectionKey === "hmail_addons" ? " lp-preview-cta--secondary" : ""}`}>
          {draft.ctaLabel}
        </span>
      ) : null}
    </>
  );
}

export function LandingSectionPreview({ draft }: { draft: LandingSectionDraft }) {
  const meta = getLandingSectionMeta(draft.sectionKey);
  const label = meta?.label ?? draft.sectionKey;

  return (
    <div className={`lp-preview lp-preview--${draft.sectionKey}${draft.isPublished ? "" : " lp-preview--draft"}`}>
      <div className="lp-preview-chrome">
        <span className="lp-preview-label">{label}</span>
        {!draft.isPublished ? <span className="lp-preview-badge">Draft</span> : null}
        {meta?.anchor ? <span className="lp-preview-anchor">#{meta.anchor}</span> : null}
      </div>

      <div className="lp-preview-canvas">
        <PreviewSectionCopy draft={draft} />

        {draft.sectionKey === "contact" && draft.imageUrl ? (
          <div className="lp-preview-image-wrap lp-preview-image-wrap--hero">
            <img src={draft.imageUrl} alt="" className="lp-preview-image lp-preview-image--hero" />
          </div>
        ) : null}

        {draft.imageUrl && draft.sectionKey !== "contact" ? (
          <div className="lp-preview-image-wrap">
            <img src={draft.imageUrl} alt="" className="lp-preview-image" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
