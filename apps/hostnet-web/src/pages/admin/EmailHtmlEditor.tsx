import { WysiwygHtmlEditor } from "../../components/admin/WysiwygHtmlEditor";

export function EmailHtmlEditor({
  htmlBody,
  onChange,
  previewVariables,
}: {
  htmlBody: string;
  onChange: (html: string) => void;
  previewVariables: Record<string, string>;
}) {
  return (
    <WysiwygHtmlEditor
      value={htmlBody}
      onChange={onChange}
      previewVariables={previewVariables}
      variant="email"
      layout="split"
    />
  );
}

export function parsePreviewVariables(_json: string): Record<string, string> {
  return {};
}
