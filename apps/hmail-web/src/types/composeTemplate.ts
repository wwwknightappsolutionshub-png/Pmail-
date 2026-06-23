export type ComposeTemplateHandoff = {
  subject: string;
  html: string;
  label?: string;
};

export function composeTemplateNotice(template: ComposeTemplateHandoff): string {
  return template.label ? `"${template.label}" loaded into compose.` : "Template loaded into compose.";
}
