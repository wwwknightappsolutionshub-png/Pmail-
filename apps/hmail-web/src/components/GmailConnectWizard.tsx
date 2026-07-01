import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import {
  GMAIL_CONNECT_SLIDES,
  GMAIL_CONNECT_STEP_COUNT,
  GMAIL_WIZARD_HEADING,
} from "../data/gmailConnectSlides";
import { GmailConnectScreenArt } from "./GmailConnectScreenArt";
import "./GmailConnectWizard.css";

export function GmailConnectWizard() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const slide = GMAIL_CONNECT_SLIDES[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex >= GMAIL_CONNECT_SLIDES.length - 1;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateWidth = () => {
      setStageWidth(stage.getBoundingClientRect().width);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const goPrev = useCallback(() => {
    setActiveIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((current) => Math.min(GMAIL_CONNECT_SLIDES.length - 1, current + 1));
  }, []);

  if (!slide) return null;

  return (
    <aside className="gmail-connect-wizard" aria-label="How to connect Gmail with an App Password">
      <div className="gmail-connect-wizard__header">
        <p className="gmail-connect-wizard__title">{GMAIL_WIZARD_HEADING}</p>
        <span className="gmail-connect-wizard__counter">
          Step {slide.step} of {GMAIL_CONNECT_STEP_COUNT}
        </span>
      </div>

      <div ref={stageRef} className="gmail-connect-wizard__stage" aria-live="polite">
        <div
          className="gmail-connect-wizard__track"
          style={{
            transform: `translateX(-${activeIndex * stageWidth}px)`,
            width: stageWidth > 0 ? stageWidth * GMAIL_CONNECT_SLIDES.length : undefined,
          }}
        >
          {GMAIL_CONNECT_SLIDES.map((entry) => (
            <article
              key={entry.id}
              className="gmail-connect-wizard__slide"
              aria-hidden={entry.id !== slide.id}
              style={stageWidth > 0 ? { width: stageWidth, flexBasis: stageWidth } : undefined}
            >
              <div className="gmail-connect-wizard__art-wrap">
                <GmailConnectScreenArt screen={entry.screen} />
              </div>
              <div className="gmail-connect-wizard__copy">
                {entry.requiredBeforeNext ? (
                  <span className="gmail-connect-wizard__required">Required before next step</span>
                ) : null}
                <h3 className="gmail-connect-wizard__slide-title">{entry.title}</h3>
                <p className="gmail-connect-wizard__slide-body">{entry.body}</p>
                {entry.tips?.length ? (
                  <ul className="gmail-connect-wizard__tips">
                    {entry.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {entry.actionHref && entry.actionLabel ? (
                <a
                  href={entry.actionHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gmail-connect-wizard__action"
                >
                  {entry.actionLabel}
                  <ExternalLink size={14} aria-hidden="true" />
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
          <button
            type="button"
            className="gmail-connect-wizard__nav-btn gmail-connect-wizard__nav-btn--primary"
            onClick={goNext}
            disabled={isLast}
          >
            Next
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  );
}
