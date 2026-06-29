function readErrorField(err: unknown, key: string): unknown {
  if (err && typeof err === "object" && key in err) {
    return (err as Record<string, unknown>)[key];
  }
  return undefined;
}

function summarizeMailAuthError(err: unknown): string {
  if (!err) return "reason=unknown";

  const parts: string[] = [];
  const serverCode = readErrorField(err, "serverResponseCode");
  const authenticationFailed = readErrorField(err, "authenticationFailed");
  const response = readErrorField(err, "response");
  const code = readErrorField(err, "code");
  const message = err instanceof Error ? err.message : String(err);

  if (typeof serverCode === "string" && serverCode.trim()) {
    parts.push(`reason=${serverCode.trim()}`);
  } else if (authenticationFailed === true) {
    parts.push("reason=AUTHENTICATIONFAILED");
  } else if (typeof code === "string" && code.trim()) {
    parts.push(`reason=${code.trim()}`);
  } else if (message.trim()) {
    parts.push(`reason=${message.trim().replace(/\s+/g, " ")}`);
  }

  if (typeof response === "string" && response.trim()) {
    const compact = response.trim().replace(/\s+/g, " ");
    parts.push(`response=${compact.slice(0, 180)}`);
  }

  return parts.length ? parts.join(" ") : "reason=unknown";
}

export function logMailAuthVerifyFailure(input: {
  phase: "imap" | "smtp";
  email: string;
  host: string;
  port: number;
  err: unknown;
}): void {
  const email = input.email.trim().toLowerCase();
  const hostPort = `${input.host}:${input.port}`;
  const detail = summarizeMailAuthError(input.err);
  console.warn(
    `[auth] ${input.phase.toUpperCase()} verify failed email=${email} host=${hostPort} ${detail}`,
  );
}

export function logLoginRejected(input: { email: string; phase: "imap" | "smtp"; message: string }): void {
  const email = input.email.trim().toLowerCase();
  const message = input.message.trim().replace(/\s+/g, " ");
  console.warn(
    `[auth] login rejected email=${email} phase=${input.phase} message=${message.slice(0, 220)}`,
  );
}
