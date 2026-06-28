import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GMAIL_CONNECT_SLIDES, GMAIL_CONNECT_STEP_COUNT } from "../data/gmailConnectSlides";
import { GmailConnectScreenArt } from "./GmailConnectScreenArt";
import "./GmailConnectWizard.css";

export function GmailConnectWizard() {
  const [activeIndex, setActiveIndex] = useState(0);
  const slide = GMAIL_CONNECT_SLIDES[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex >= GMAIL_CONNECT_SLIDES.length - 1;

  const goPrev = useCallback(() => {
    setActiveIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((current) => Math.min(GMAIL_CONNECT_SLIDES.length - 1, current + 1));
  }, []);

  if (!slide) return null;

  return (
    <aside className="gmail-connect-wizard" aria-label="How to connect Gmail">
      <div className="gmail-connect-wizard__header">
        <p className="gmail-connect-wizard__title">Connect Gmail in {GMAIL_CONNECT_STEP_COUNT} steps</p>
        <span className="gmail-connect-wizard__counter">
          Step {slide.step} of {GMAIL_CONNECT_SLIDES.length}
        </span>
      </div>

      <div className="gmail-connect-wizard__stage" aria-live="polite">
        <div
          className="gmail-connect-wizard__track"
          style={{ transform: `translateX(${-activeIndex * 100}%)` }}
        >
          {GMAIL_CONNECT_SLIDES.map((entry) => (
            <article
              key={entry.id}
              className="gmail-connect-wizard__slide"
              aria-hidden={entry.id !== slide.id}
            >
              <GmailConnectScreenArt screen={entry.screen} />
              <h3 className="gmail-connect-wizard__slide-title">{entry.title}</h3>
              <p className="gmail-connect-wizard__slide-body">{entry.body}</p>
              {entry.tips?.length ? (
                <ul className="gmail-connect-wizard__tips">
                  {entry.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              ) : null}
              {entry.actionHref && entry.actionLabel ? (
                <a href={entry.actionHref} target="_blank" rel="noopener noreferrer">
                  {entry.actionLabel}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      <div className="gmail-connect-wizard__footer">
        <div className="gmail-connect-wizard__dots" role="tablist" aria-label="Gmail setup steps">
          {GMAIL_CONNECT_SLIDES.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Step ${entry.step}: ${entry.title}`}
              className={`gmail-connect-wizard__dot${index === activeIndex ? " is-active" : ""}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>

        <div className="gmail-connect-wizard__nav">
          <button type="button" className="gmail-connect-wizard__nav-btn" onClick={goPrev} disabled={isFirst}>
            <ChevronLeft size={16} aria-hidden />
            Back
          </button>
          <button type="button" className="gmail-connect-wizard__nav-btn gmail-connect-wizard__nav-btn--primary" onClick={goNext} disabled={isLast}>
            Next
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  );
}
