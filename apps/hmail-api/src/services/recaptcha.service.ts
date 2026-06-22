import { getEnv } from "../config/env.js";

type VerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
  score?: number;
  action?: string;
};

export class RecaptchaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecaptchaError";
  }
}

export async function verifyRecaptchaToken(token: string, remoteIp?: string): Promise<void> {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  const env = getEnv();

  if (!secret) {
    if (env.NODE_ENV === "production") {
      throw new RecaptchaError("reCAPTCHA is not configured");
    }
    return;
  }

  if (!token?.trim()) {
    throw new RecaptchaError("Captcha verification required");
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new RecaptchaError("Captcha verification failed");
  }

  const data = (await res.json()) as VerifyResponse;
  if (!data.success) {
    throw new RecaptchaError("Invalid captcha");
  }
}
