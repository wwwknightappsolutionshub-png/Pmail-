export type MailSearchFilter = "all" | "unread" | "read" | "starred";

export type ParsedMailSearch = {
  terms: Array<{
    field?: "sender" | "subject" | "recipient" | "body" | "date";
    value: string;
  }>;
  filter: MailSearchFilter;
  hasAttachment?: boolean;
  folderHint?: string;
  freeText: string;
};

const OPERATOR_MAP: Record<string, ParsedMailSearch["terms"][number]["field"]> = {
  from: "sender",
  to: "recipient",
  subject: "subject",
  body: "body",
  has: "body",
};

function tokenize(query: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < query.length; i += 1) {
    const ch = query[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && /\s/.test(ch)) {
      if (current.trim()) tokens.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

export function parseMailSearchQuery(raw: string): ParsedMailSearch {
  const result: ParsedMailSearch = {
    terms: [],
    filter: "all",
    freeText: "",
  };

  const freeTextParts: string[] = [];

  for (const token of tokenize(raw.trim())) {
    const lower = token.toLowerCase();

    if (lower === "is:unread") {
      result.filter = "unread";
      continue;
    }
    if (lower === "is:read") {
      result.filter = "read";
      continue;
    }
    if (lower === "is:starred") {
      result.filter = "starred";
      continue;
    }
    if (lower === "has:attachment" || lower === "has:attachments") {
      result.hasAttachment = true;
      continue;
    }
    if (lower.startsWith("in:")) {
      result.folderHint = token.slice(3).toLowerCase();
      continue;
    }

    const opMatch = /^([a-z]+):(.+)$/i.exec(token);
    if (opMatch) {
      const op = opMatch[1].toLowerCase();
      const value = opMatch[2].trim();
      if (op === "has" && value.toLowerCase() === "attachment") {
        result.hasAttachment = true;
        continue;
      }
      const field = OPERATOR_MAP[op];
      if (field) {
        result.terms.push({ field, value });
        continue;
      }
    }

    freeTextParts.push(token);
  }

  result.freeText = freeTextParts.join(" ").trim();
  if (result.freeText && result.terms.length === 0) {
    result.terms.push({ value: result.freeText });
  }

  return result;
}

export function buildImapCriteriaFromParsed(parsed: ParsedMailSearch): Record<string, unknown> {
  const criteria: Record<string, unknown> = { all: true };

  if (parsed.filter === "unread") {
    delete criteria.all;
    criteria.seen = false;
  } else if (parsed.filter === "read") {
    delete criteria.all;
    criteria.seen = true;
  } else if (parsed.filter === "starred") {
    delete criteria.all;
    criteria.flagged = true;
  }

  if (parsed.hasAttachment) {
    delete criteria.all;
    criteria.hasAttachment = true;
  }

  const clauses: Record<string, unknown>[] = [];

  for (const term of parsed.terms) {
    const base = stripAll(criteria);
    if (!term.field) {
      clauses.push({
        or: [
          { ...base, subject: term.value },
          { ...base, from: term.value },
          { ...base, to: term.value },
          { ...base, body: term.value },
        ],
      });
      continue;
    }

    switch (term.field) {
      case "sender":
        clauses.push({ ...base, from: term.value });
        break;
      case "subject":
        clauses.push({ ...base, subject: term.value });
        break;
      case "recipient":
        clauses.push({ ...base, to: term.value });
        break;
      case "body":
        clauses.push({ ...base, body: term.value });
        break;
      case "date": {
        const parsedDate = new Date(term.value);
        if (!Number.isNaN(parsedDate.getTime())) {
          clauses.push({ ...base, on: parsedDate });
        } else {
          clauses.push({ ...base, subject: term.value });
        }
        break;
      }
      default:
        break;
    }
  }

  if (clauses.length === 0) {
    return criteria;
  }
  if (clauses.length === 1) {
    return clauses[0];
  }
  return { and: clauses };
}

function stripAll(criteria: Record<string, unknown>): Record<string, unknown> {
  const next = { ...criteria };
  delete next.all;
  return next;
}
