import { useEffect, useMemo, useRef, useState } from "react";
import {
  extractProhostEmailBody,
  isProhostWrappedEmail,
  isUnsupportedFullEmailDocument,
  mergeProhostEmailBody,
} from "../../lib/emailHtmlDocument";

export type WysiwygVariant = "email" | "landing";

export type WysiwygLayout = "split" | "compact";

type EditorMode = "visual" | "code";

const VISUAL_STYLES = `
  body { font-family: system-ui, sans-serif; padding: 1rem; color: #0f172a; line-height: 1.55; margin: 0; }
  h1, h2, h3 { margin: 0 0 0.75rem; }
  p { margin: 0 0 0.75rem; }
  a { color: #0d9488; }
  a.btn { display: inline-block; padding: 0.6rem 1rem; background: #0d9488; color: #fff !important; text-decoration: none; border-radius: 8px; }
  ul, ol { margin: 0 0 0.75rem 1.25rem; }
`;

function substituteVariables(html: string, variables: Record<string, string>): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => variables[key] ?? `[${key}]`);
}

function wrapPreviewDocument(body: string): string {
  if (/^\s*<!DOCTYPE/i.test(body) || /^\s*<html/i.test(body)) return body;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${VISUAL_STYLES}</style></head><body>${body}</body></html>`;
}

export function isFullHtmlDocument(html: string): boolean {
  return /<!DOCTYPE|<html[\s>]/i.test(html);
}

function extractBodyHtml(html: string): string {
  if (!isFullHtmlDocument(html)) return html;
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match?.[1]?.trim() ?? html;
}

function mergeBodyIntoDocument(fullHtml: string, bodyInner: string): string {
  if (!isFullHtmlDocument(fullHtml)) return bodyInner;
  if (/<body[^>]*>[\s\S]*?<\/body>/i.test(fullHtml)) {
    return fullHtml.replace(/(<body[^>]*>)([\s\S]*?)(<\/body>)/i, `$1${bodyInner}$3`);
  }
  return bodyInner;
}

function extractEditableHtml(html: string): string {
  if (isProhostWrappedEmail(html)) return extractProhostEmailBody(html);
  return extractBodyHtml(html);
}

function mergeEditableHtml(html: string, inner: string): string {
  if (isProhostWrappedEmail(html)) return mergeProhostEmailBody(html, inner);
  return mergeBodyIntoDocument(html, inner);
}

/** Convert legacy plain-text CMS body to a single paragraph for the WYSIWYG surface. */
export function plainTextToEditorHtml(text: string | null | undefined): string {
  if (!text?.trim()) return "<p></p>";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
}

/** Normalize empty WYSIWYG output back to empty string for storage. */
export function editorHtmlToStorage(html: string): string {
  const trimmed = html.trim();
  if (!trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>" || trimmed === "<br>") return "";
  return trimmed;
}

export function WysiwygHtmlEditor({
  value,
  onChange,
  previewVariables = {},
  variant = "landing",
  layout = "split",
  label,
}: {
  value: string;
  onChange: (html: string) => void;
  previewVariables?: Record<string, string>;
  variant?: WysiwygVariant;
  layout?: WysiwygLayout;
  label?: string;
}) {
  const unsupportedFullDoc = isUnsupportedFullEmailDocument(value);
  const [mode, setMode] = useState<EditorMode>(unsupportedFullDoc ? "code" : "visual");
  const visualRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const valueRef = useRef(value);

  valueRef.current = value;

  const editableHtml = useMemo(() => extractEditableHtml(value), [value]);

  const previewHtml = useMemo(() => {
    const substituted = substituteVariables(value, previewVariables);
    return wrapPreviewDocument(substituted);
  }, [value, previewVariables]);

  useEffect(() => {
    if (unsupportedFullDoc && mode === "visual") setMode("code");
  }, [unsupportedFullDoc, mode]);

  useEffect(() => {
    if (mode !== "visual" || !visualRef.current) return;
    if (visualRef.current.innerHTML === editableHtml) return;
    syncingRef.current = true;
    visualRef.current.innerHTML = editableHtml;
    window.requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, [editableHtml, mode]);

  function syncVisualToHtml() {
    if (syncingRef.current || !visualRef.current) return;
    const inner = visualRef.current.innerHTML;
    onChange(mergeEditableHtml(valueRef.current, inner));
  }

  function runCommand(command: string, cmdValue?: string) {
    visualRef.current?.focus();
    document.execCommand(command, false, cmdValue);
    syncVisualToHtml();
  }

  function insertHtml(html: string) {
    visualRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    syncVisualToHtml();
  }

  function insertVariable() {
    const key = window.prompt("Variable name (without braces)", "name");
    if (!key?.trim()) return;
    insertHtml(`{{${key.trim()}}}`);
  }

  function insertLink() {
    const url = window.prompt("Link URL", variant === "landing" ? "#register" : "https://");
    if (!url?.trim()) return;
    runCommand("createLink", url.trim());
  }

  function insertButton() {
    if (variant === "landing") {
      insertHtml('<p><a class="btn btn-primary" href="#register">Get custom pricing</a></p>');
      return;
    }
    insertHtml('<p><a class="btn" href="{{panelLoginUrl}}">Open panel</a></p>');
  }

  const showEmailExtras = variant === "email";
  const showSplitPreview = layout === "split";

  return (
    <div className={`admin-wysiwyg-editor admin-wysiwyg-editor--${layout}`}>
      {label ? <span className="admin-email-html-preview-label">{label}</span> : null}

      <div className="admin-email-editor-toolbar-row">
        <div className="admin-email-editor-tabs" role="tablist" aria-label="Editor mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "visual"}
            className={mode === "visual" ? "active" : ""}
            onClick={() => setMode("visual")}
            disabled={unsupportedFullDoc}
          >
            Visual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "code"}
            className={mode === "code" ? "active" : ""}
            onClick={() => setMode("code")}
          >
            HTML
          </button>
        </div>

        {mode === "visual" ? (
          <div className="admin-email-html-toolbar admin-email-visual-toolbar">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => runCommand("bold")} title="Bold">
              <strong>B</strong>
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => runCommand("italic")} title="Italic">
              <em>I</em>
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => runCommand("underline")} title="Underline">
              <u>U</u>
            </button>
            <span className="admin-email-toolbar-divider" />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => runCommand("formatBlock", "h2")}>
              Heading
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => runCommand("insertUnorderedList")}>
              List
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={insertLink}>
              Link
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={insertButton}>
              Button
            </button>
            {showEmailExtras ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={insertVariable}>
                Variable
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {unsupportedFullDoc ? (
        <p className="muted admin-email-full-doc-hint">
          Custom full HTML document — use HTML mode to edit. Prohost-branded templates support Visual mode.
        </p>
      ) : isProhostWrappedEmail(value) && mode === "visual" ? (
        <p className="muted admin-email-full-doc-hint">
          Visual mode edits the message body inside the Prohost email wrapper. Header and footer stay intact.
        </p>
      ) : null}

      <div className={showSplitPreview ? "admin-email-workspace" : "admin-wysiwyg-compact-pane"}>
        <div className="admin-email-workspace-edit">
          {showSplitPreview ? <span className="admin-email-html-preview-label">Edit</span> : null}
          {mode === "visual" ? (
            <div
              ref={visualRef}
              className={`admin-email-visual-surface${layout === "compact" ? " admin-email-visual-surface--compact" : ""}`}
              contentEditable
              suppressContentEditableWarning
              onInput={syncVisualToHtml}
              onBlur={syncVisualToHtml}
              aria-label="Visual HTML editor"
            />
          ) : (
            <textarea
              rows={layout === "compact" ? 8 : 16}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="admin-status-mono admin-email-code-textarea"
              spellCheck={false}
              aria-label="HTML source"
            />
          )}
        </div>

        {showSplitPreview ? (
          <div className="admin-email-workspace-preview">
            <span className="admin-email-html-preview-label">Live preview</span>
            <iframe
              key={previewHtml.slice(0, 120)}
              title="HTML preview"
              className="admin-email-preview-frame"
              srcDoc={previewHtml}
              sandbox="allow-same-origin"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
