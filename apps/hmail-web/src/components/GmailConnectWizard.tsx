import { useCallback, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import {
  GMAIL_CONNECT_SLIDES,
  GMAIL_CONNECT_STEP_COUNT,
  GMAIL_WIZARD_HEADING,
} from "../data/gmailConnectSlides";
import { GmailConnectScreenArt } from "./GmailConnectScreenArt";
import "./GmailConnectWizard.css";

type GmailHelpGate = "yes" | "no" | "unsure";

export function GmailConnectWizard() {
  const [gateChoice, setGateChoice] = useState<GmailHelpGate | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stepDone, setStepDone] = useState<Record<string, boolean>>({});
  const slide = GMAIL_CONNECT_SLIDES[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex >= GMAIL_CONNECT_SLIDES.length - 1;

  const handleGateChoice = useCallback((choice: GmailHelpGate) => {
    setGateChoice(choice);
    setExpanded(choice !== "yes");
    setActiveIndex(0);
    setStepDone({});
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

  const toggleStepDone = useCallback((slideId: string, checked: boolean) => {
    setStepDone((current) => ({ ...current, [slideId]: checked }));
  }, []);

  const goPrev = useCallback(() => {
    setActiveIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((current) => Math.min(GMAIL_CONNECT_SLIDES.length - 1, current + 1));
  }, []);

  if (!gateChoice) {
    return (
      <div className="gmail-connect-help">
        <fieldset className="gmail-connect-help__gate">
          <legend className="gmail-connect-help__gate-question">
            Have you created a Google App Password before?
          </legend>
          <div className="gmail-connect-help__gate-actions">
            <button type="button" className="gmail-connect-help__gate-btn" onClick={() => handleGateChoice("yes")}>
              Yes
            </button>
            <button type="button" className="gmail-connect-help__gate-btn" onClick={() => handleGateChoice("no")}>
              No, I need help
            </button>
            <button
              type="button"
              className="gmail-connect-help__gate-btn"
              onClick={() => handleGateChoice("unsure")}
            >
              Not sure
            </button>
          </div>
        </fieldset>
      </div>
    );
  }

  return (
    <div className="gmail-connect-help">
      <button
        type="button"
        className={`gmail-connect-help__toggle${expanded ? " is-expanded" : ""}`}
        onClick={toggleExpanded}
        aria-expanded={expanded}
      >
        {expanded ? "Hide Gmail help" : "Need help with Gmail?"}
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {expanded && slide ? (
        <aside
          className="gmail-connect-wizard"
          aria-label="How to get a Google App Password for PMail+"
          style={{ ["--slide-count" as string]: GMAIL_CONNECT_SLIDES.length }}
        >
          <div className="gmail-connect-wizard__header">
            <span className="gmail-connect-wizard__badge">Gmail setup guide</span>
            <p className="gmail-connect-wizard__title">{GMAIL_WIZARD_HEADING}</p>
            <span className="gmail-connect-wizard__counter">
              Step {slide.step} of {GMAIL_CONNECT_STEP_COUNT}
            </span>
          </div>

          <div
            className="gmail-connect-wizard__stage"
            aria-live="polite"
            style={{ ["--active-index" as string]: activeIndex }}
          >
            <div className="gmail-connect-wizard__track">
              {GMAIL_CONNECT_SLIDES.map((entry, index) => (
                <article
                  key={entry.id}
                  className="gmail-connect-wizard__slide"
                  aria-hidden={index !== activeIndex}
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
                  {entry.id !== "sign-in" ? (
                    <label className="gmail-connect-wizard__done">
                      <input
                        type="checkbox"
                        checked={Boolean(stepDone[entry.id])}
                        onChange={(event) => toggleStepDone(entry.id, event.target.checked)}
                      />
                      {entry.id === "app-password" ? "I copied the 16-character code" : "Done"}
                    </label>
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
      ) : null}
    </div>
  );
}
