import { htmlToDisplayHtml } from "../lib/marketingHtml";

export function SectionRichText({
  html,
  className,
}: {
  html: string | null | undefined;
  className?: string;
}) {
  if (!html?.trim()) return null;
  const safe = htmlToDisplayHtml(html);
  if (!safe) return null;
  return <div className={`section-rich-text${className ? ` ${className}` : ""}`} dangerouslySetInnerHTML={{ __html: safe }} />;
}
