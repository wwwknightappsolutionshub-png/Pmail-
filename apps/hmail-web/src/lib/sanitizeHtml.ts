import DOMPurify from "dompurify";

const MAIL_ALLOWED_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "caption",
  "col",
  "colgroup",
  "div",
  "em",
  "font",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
];

const MAIL_ALLOWED_ATTR = [
  "align",
  "alt",
  "bgcolor",
  "border",
  "cellpadding",
  "cellspacing",
  "class",
  "colspan",
  "contenteditable",
  "data-pmail-explore",
  "data-pmail-signature",
  "dir",
  "height",
  "href",
  "rel",
  "role",
  "rowspan",
  "src",
  "style",
  "target",
  "title",
  "valign",
  "width",
];

function hardenExternalLinks(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("a[href]").forEach((node) => {
    const anchor = node as HTMLAnchorElement;
    const href = anchor.getAttribute("href")?.trim() ?? "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }
    if (/^javascript:/i.test(href) || /^data:/i.test(href)) {
      anchor.removeAttribute("href");
      return;
    }
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  });
  return doc.body.innerHTML;
}

/** Strip XSS vectors from inbound mail HTML and compose editor output. */
export function sanitizeMailHtml(html: string): string {
  if (!html.trim()) return "";

  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: MAIL_ALLOWED_TAGS,
    ALLOWED_ATTR: MAIL_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button", "link", "meta", "base"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });

  return hardenExternalLinks(sanitized);
}

/** Accept only http(s) URLs for user-created links in the compose editor. */
export function sanitizeComposeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return null;
}
