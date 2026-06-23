export type UnsubscribeMethod = "get" | "post";

export interface UnsubscribeOption {
  url: string;
  method: UnsubscribeMethod;
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  return false;
}

export function isSafeUnsubscribeUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    return false;
  }
  if (isPrivateIpv4(host)) {
    return false;
  }

  return true;
}

export function parseListUnsubscribeHeader(value: string | undefined | null): string[] {
  if (!value?.trim()) return [];
  const urls: string[] = [];
  for (const match of value.matchAll(/<([^>]+)>/g)) {
    const candidate = match[1]?.trim();
    if (candidate) urls.push(candidate);
  }
  return urls;
}

export function supportsOneClickPost(value: string | undefined | null): boolean {
  return /List-Unsubscribe=One-Click/i.test(value ?? "");
}

export function buildUnsubscribeOptions(input: {
  listUnsubscribe?: string | null;
  listUnsubscribePost?: string | null;
}): UnsubscribeOption[] {
  const urls = parseListUnsubscribeHeader(input.listUnsubscribe);
  const oneClick = supportsOneClickPost(input.listUnsubscribePost);
  const options: UnsubscribeOption[] = [];

  for (const url of urls) {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      continue;
    }
    if (!isSafeUnsubscribeUrl(url)) {
      continue;
    }
    options.push({
      url,
      method: oneClick ? "post" : "get",
    });
  }

  return options;
}

export async function executeUnsubscribeRequest(
  option: UnsubscribeOption,
): Promise<{ ok: boolean; status: number; error?: string }> {
  if (!isSafeUnsubscribeUrl(option.url)) {
    throw new Error("Unsafe unsubscribe URL");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const init: RequestInit = {
      method: option.method === "post" ? "POST" : "GET",
      signal: controller.signal,
      redirect: "follow",
      headers:
        option.method === "post"
          ? {
              "List-Unsubscribe": "One-Click",
              "Content-Type": "application/x-www-form-urlencoded",
            }
          : undefined,
    };

    const response = await fetch(option.url, init);
    const ok = response.status >= 200 && response.status < 400;
    return { ok, status: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unsubscribe request failed";
    return { ok: false, status: 0, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export function extractEmailAddress(from: string): string {
  const bracketMatch = from.match(/<([^>]+)>/);
  if (bracketMatch?.[1]) {
    return bracketMatch[1].trim().toLowerCase();
  }
  return from.trim().toLowerCase();
}

export function encodeSenderKey(email: string): string {
  return Buffer.from(email.toLowerCase(), "utf8").toString("base64url");
}

export function decodeSenderKey(key: string): string {
  return Buffer.from(key, "base64url").toString("utf8").toLowerCase();
}
