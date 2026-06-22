import { FormEvent } from "react";
import { Link } from "react-router-dom";
import type { DemoAutoReply } from "../../data/bespokeMailComposeSettings";

type AutoReplyModalProps = {
  open: boolean;
  entitled: boolean;
  daysLeft: number;
  autoReplyOn: boolean;
  autoReplies: DemoAutoReply[];
  activeAutoReplyId: string;
  editingAutoReplyId: string | "new" | null;
  autoReplyDraft: { name: string; subject: string; body: string };
  addonsHref: string;
  gatePlanLabel?: string;
  onClose: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onSelectActive: (replyId: string) => void;
  onStartEdit: (replyId: string) => void;
  onStartNew: () => void;
  onDraftChange: (draft: { name: string; subject: string; body: string }) => void;
  onCancelEdit: () => void;
  onSaveReply: (event: FormEvent) => void;
  onStartSubscription?: () => void;
};

export function AutoReplyModal({
  open,
  entitled,
  daysLeft,
  autoReplyOn,
  autoReplies,
  activeAutoReplyId,
  editingAutoReplyId,
  autoReplyDraft,
  addonsHref,
  gatePlanLabel = "Platform workspace bundle",
  onClose,
  onToggleEnabled,
  onSelectActive,
  onStartEdit,
  onStartNew,
  onDraftChange,
  onCancelEdit,
  onSaveReply,
  onStartSubscription,
}: AutoReplyModalProps) {
  if (!open) return null;

  return (
    <div className="bespoke-demo-auto-reply-overlay" role="dialog" aria-modal="true" aria-label="Auto Reply">
      <div className="bespoke-demo-auto-reply-modal">
        <header className="bespoke-demo-auto-reply-head">
          <div>
            <p className="bespoke-demo-auto-reply-kicker">Mail folders</p>
            <h2>Auto Reply</h2>
            <p className="muted">
              {entitled
                ? daysLeft > 0
                  ? `Complimentary access — ${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`
                  : "Active on your workspace"
                : "Complimentary access ended — subscribe to keep Auto Reply"}
            </p>
          </div>
          <button type="button" className="bespoke-demo-auto-reply-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        {!entitled ? (
          <div className="bespoke-demo-feature-gate">
            <p>
              Auto Reply was active for your first 14 days. Subscribe from the Addon Marketplace to edit templates and
              send automatic inbox acknowledgments again.
            </p>
            <div className="bespoke-demo-paid-addon-actions">
              {onStartSubscription ? (
                <button type="button" className="btn btn-primary" onClick={onStartSubscription}>
                  Start subscription
                </button>
              ) : null}
              <Link to={`${addonsHref}?highlight=auto-reply-functionality`} className="btn btn-primary">
                View Addons
              </Link>
            </div>
            <p className="bespoke-demo-sidebar-title">Included with {gatePlanLabel}</p>
            <ul className="bespoke-demo-template-list">
              {autoReplies.map((reply) => (
                <li key={reply.id} className="bespoke-demo-template-item bespoke-demo-template-item--locked">
                  <strong>{reply.name}</strong>
                  <span>{reply.subject}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <label className="bespoke-demo-check bespoke-demo-auto-toggle">
              <input
                type="checkbox"
                checked={autoReplyOn}
                onChange={(event) => onToggleEnabled(event.target.checked)}
              />
              Send auto-reply when new mail arrives
            </label>
            <p className="muted">
              When enabled, unread inbox messages trigger your active template automatically through your connected
              mailbox.
            </p>

            <ul className="bespoke-demo-template-list">
              {autoReplies.map((reply) => (
                <li
                  key={reply.id}
                  className={`bespoke-demo-template-item${
                    activeAutoReplyId === reply.id ? " bespoke-demo-template-item--active" : ""
                  }`}
                >
                  <label className="bespoke-demo-template-select">
                    <input
                      type="radio"
                      name="active-auto-reply-modal"
                      checked={activeAutoReplyId === reply.id}
                      onChange={() => onSelectActive(reply.id)}
                    />
                    <div>
                      <strong>
                        {reply.name}
                        {reply.isCustom ? " (custom)" : ""}
                      </strong>
                      <span>{reply.subject}</span>
                      <p>
                        {reply.body.slice(0, 120)}
                        {reply.body.length > 120 ? "…" : ""}
                      </p>
                    </div>
                  </label>
                  <button type="button" className="btn btn-ghost" onClick={() => onStartEdit(reply.id)}>
                    Edit
                  </button>
                </li>
              ))}
            </ul>

            <button type="button" className="btn btn-secondary" onClick={onStartNew}>
              Create custom auto-reply
            </button>

            {editingAutoReplyId ? (
              <form className="bespoke-demo-form bespoke-demo-inline-editor" onSubmit={onSaveReply}>
                <p className="bespoke-demo-sidebar-title">
                  {editingAutoReplyId === "new" ? "New auto-reply" : "Edit auto-reply"}
                </p>
                <label className="bespoke-demo-field">
                  <span>Template name</span>
                  <input
                    value={autoReplyDraft.name}
                    onChange={(event) => onDraftChange({ ...autoReplyDraft, name: event.target.value })}
                    required
                  />
                </label>
                <label className="bespoke-demo-field">
                  <span>Subject</span>
                  <input
                    value={autoReplyDraft.subject}
                    onChange={(event) => onDraftChange({ ...autoReplyDraft, subject: event.target.value })}
                    required
                  />
                </label>
                <label className="bespoke-demo-field">
                  <span>Message body</span>
                  <textarea
                    rows={5}
                    value={autoReplyDraft.body}
                    onChange={(event) => onDraftChange({ ...autoReplyDraft, body: event.target.value })}
                    required
                  />
                </label>
                <div className="bespoke-demo-editor-actions">
                  <button type="submit" className="btn btn-primary">
                    Save template
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={onCancelEdit}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
