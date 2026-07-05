import { useCallback, useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { sanitizeComposeLinkUrl, sanitizeMailHtml } from "../lib/sanitizeHtml";
import "./RichTextEditor.css";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  toolbarExtra?: ReactNode;
}

type Command =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "createLink"
  | "removeFormat";

const TOOLBAR: Array<{ command: Command; label: string; title: string }> = [
  { command: "bold", label: "B", title: "Bold" },
  { command: "italic", label: "I", title: "Italic" },
  { command: "underline", label: "U", title: "Underline" },
  { command: "strikeThrough", label: "S", title: "Strikethrough" },
  { command: "insertUnorderedList", label: "•", title: "Bullet list" },
  { command: "insertOrderedList", label: "1.", title: "Numbered list" },
  { command: "createLink", label: "🔗", title: "Insert link" },
  { command: "removeFormat", label: "Tx", title: "Clear formatting" },
];

export function RichTextEditor({ value, onChange, placeholder, toolbarExtra }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    const sanitized = sanitizeMailHtml(value);
    if (editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized;
    }
  }, [value]);

  const sync = useCallback(() => {
    if (editorRef.current) onChange(sanitizeMailHtml(editorRef.current.innerHTML));
  }, [onChange]);

  const handleEditorClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const link = target.closest("a[data-pmail-explore], [data-pmail-signature='branded'] a");
    if (!(link instanceof HTMLAnchorElement) || !link.href) return;
    event.preventDefault();
    window.open(link.href, "_blank", "noopener,noreferrer");
  }, []);

  const runCommand = (command: Command) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    if (command === "createLink") {
      const url = window.prompt("Enter link URL");
      const safeUrl = url ? sanitizeComposeLinkUrl(url) : null;
      if (safeUrl) document.execCommand("createLink", false, safeUrl);
    } else {
      document.execCommand(command, false);
    }
    sync();
  };

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        <div className="rte-toolbar-format">
          {TOOLBAR.map((tool) => (
            <button
              key={tool.command}
              type="button"
              className="rte-tool"
              title={tool.title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runCommand(tool.command)}
            >
              {tool.label}
            </button>
          ))}
        </div>
        {toolbarExtra ? (
          <>
            <span className="rte-toolbar-divider" aria-hidden="true" />
            <div className="rte-toolbar-extra">{toolbarExtra}</div>
          </>
        ) : null}
      </div>
      <div
        ref={editorRef}
        className="rte-editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={sync}
        onBlur={sync}
        onClick={handleEditorClick}
        suppressContentEditableWarning
      />
    </div>
  );
}

export function htmlToPlainText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? div.innerText ?? "").trim();
}
