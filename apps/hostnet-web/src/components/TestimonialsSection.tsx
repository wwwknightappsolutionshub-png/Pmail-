import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { landingSectionEyebrow } from "../lib/landingSectionUi";
import type { Testimonial } from "../types/site";
import { GoogleRecaptcha } from "./GoogleRecaptcha";
import { SectionRichText } from "./SectionRichText";
import "./TestimonialsSection.css";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="testimonial-stars" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="testimonial-stars-dim">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function TestimonialsSection({
  title,
  subtitle,
  description,
}: {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
} = {}) {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [index, setIndex] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [company, setCompany] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [captchaToken, setCaptchaToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sectionTitle = title ?? "What our customers say";
  const sectionEyebrow = landingSectionEyebrow("testimonials", subtitle);
  const sectionLead =
    description ?? "Rated highly by teams running hosting, mail, and bespoke workflows on Prohost Cloud.";

  useEffect(() => {
    api.publicTestimonials().then((res) => setItems(res.testimonials)).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (!showForm) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowForm(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [showForm]);

  const visible = items.slice(index, index + 4);
  const padCount = Math.max(0, 4 - visible.length);
  const padded = [...visible, ...Array.from({ length: padCount }, () => null)];

  function prev() {
    if (items.length <= 4) return;
    setIndex((i) => (i - 1 + items.length) % items.length);
  }

  function next() {
    if (items.length <= 4) return;
    setIndex((i) => (i + 1) % items.length);
  }

  async function submitReview(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await api.submitTestimonial({
        authorName,
        authorRole: authorRole || undefined,
        company: company || undefined,
        body,
        rating,
        captchaToken,
      });
      setMessage(res.message);
      setShowForm(false);
      setAuthorName("");
      setAuthorRole("");
      setCompany("");
      setBody("");
      setRating(5);
      setCaptchaToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const reviewModal = showForm ? (
    <ReviewModal
      authorName={authorName}
      setAuthorName={setAuthorName}
      authorRole={authorRole}
      setAuthorRole={setAuthorRole}
      company={company}
      setCompany={setCompany}
      body={body}
      setBody={setBody}
      rating={rating}
      setRating={setRating}
      setCaptchaToken={setCaptchaToken}
      submitting={submitting}
      error={error}
      onSubmit={submitReview}
      onClose={() => setShowForm(false)}
    />
  ) : null;

  if (items.length === 0) {
    return (
      <section id="testimonials" className="section-pad testimonials-section">
        <div className="container">
          <div className="section-head section-head--center">
            <p className="section-eyebrow">{sectionEyebrow}</p>
            <h2 className="landing-section-title">{sectionTitle}</h2>
          </div>
          <p className="muted testimonials-empty">Be the first to share your experience.</p>
          <div className="testimonials-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(true)}>
              Leave a review
            </button>
          </div>
          {message ? <p className="testimonial-form-success testimonials-toast">{message}</p> : null}
          {reviewModal}
        </div>
      </section>
    );
  }

  return (
    <section id="testimonials" className="section-pad testimonials-section">
      <div className="container">
        <div className="testimonials-head">
          <div>
            <p className="section-eyebrow">{sectionEyebrow}</p>
            <h2 className="landing-section-title">{sectionTitle}</h2>
            <SectionRichText html={sectionLead} className="muted" />
          </div>
          <div className="testimonials-controls" aria-label="Carousel controls">
            <button type="button" className="btn btn-secondary btn-sm testimonials-nav-btn" onClick={prev} disabled={items.length <= 4} aria-label="Previous">
              ←
            </button>
            <button type="button" className="btn btn-secondary btn-sm testimonials-nav-btn" onClick={next} disabled={items.length <= 4} aria-label="Next">
              →
            </button>
          </div>
        </div>

        <div className="testimonials-carousel">
          {padded.map((item, i) =>
            item ? (
              <article key={item.id} className="testimonial-card">
                <Stars rating={item.rating} />
                <p className="testimonial-quote">"{item.body}"</p>
                <footer>
                  <strong>{item.authorName}</strong>
                  {item.company ? <span className="muted"> — {item.company}</span> : null}
                  {item.authorRole ? <div className="muted testimonial-role">{item.authorRole}</div> : null}
                </footer>
              </article>
            ) : (
              <div key={`pad-${i}`} className="testimonial-card testimonial-card--placeholder" aria-hidden />
            ),
          )}
        </div>

        <div className="testimonials-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setShowForm(true)}>
            Leave a review
          </button>
        </div>

        {message ? <p className="testimonial-form-success testimonials-toast">{message}</p> : null}
        {reviewModal}
      </div>
    </section>
  );
}

function ReviewModal({
  authorName,
  setAuthorName,
  authorRole,
  setAuthorRole,
  company,
  setCompany,
  body,
  setBody,
  rating,
  setRating,
  setCaptchaToken,
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  authorName: string;
  setAuthorName: (v: string) => void;
  authorRole: string;
  setAuthorRole: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  rating: number;
  setRating: (v: number) => void;
  setCaptchaToken: (v: string) => void;
  submitting: boolean;
  error: string;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="testimonial-modal-root" role="presentation">
      <button type="button" className="testimonial-modal-backdrop" aria-label="Close review form" onClick={onClose} />
      <div
        className="testimonial-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="testimonial-modal-title"
      >
        <div className="testimonial-modal-head">
          <h3 id="testimonial-modal-title">Share your experience</h3>
          <button type="button" className="testimonial-modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="testimonial-modal-form" onSubmit={onSubmit}>
          <div className="testimonial-form-grid">
            <label>
              Your name
              <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} required autoFocus />
            </label>
            <label>
              Role
              <input value={authorRole} onChange={(e) => setAuthorRole(e.target.value)} />
            </label>
            <label>
              Company
              <input value={company} onChange={(e) => setCompany(e.target.value)} />
            </label>
            <label>
              Rating
              <select className="register-branded-select" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </select>
            </label>
            <label className="testimonial-form-full">
              Your review
              <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} />
            </label>
          </div>
          <GoogleRecaptcha onToken={setCaptchaToken} onExpire={() => setCaptchaToken("")} />
          {error ? <p className="register-pricing-error">{error}</p> : null}
          <div className="editor-actions testimonial-modal-actions">
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit review"}
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
              Cancel
            </button>
          </div>
          <p className="muted testimonial-moderation-note">Reviews are moderated before appearing on the site.</p>
        </form>
      </div>
    </div>
  );
}
