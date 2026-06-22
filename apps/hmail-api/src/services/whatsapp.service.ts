import { getEnv } from "../config/env.js";

export class WhatsAppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppError";
  }
}

export type WhatsAppSendInput = {
  toPhone: string;
  body: string;
  subject?: string;
};

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

function isWhatsAppConfigured(): boolean {
  const env = getEnv();
  if (env.WHATSAPP_PROVIDER === "meta") {
    return Boolean(env.WHATSAPP_CLOUD_ACCESS_TOKEN && env.WHATSAPP_CLOUD_PHONE_NUMBER_ID);
  }
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM);
}

export function getWhatsAppStatus() {
  const env = getEnv();
  return {
    configured: isWhatsAppConfigured(),
    provider: env.WHATSAPP_PROVIDER ?? (env.WHATSAPP_CLOUD_ACCESS_TOKEN ? "meta" : "twilio"),
  };
}

async function sendViaTwilio(input: WhatsAppSendInput): Promise<{ messageId: string; provider: "twilio" }> {
  const env = getEnv();
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_WHATSAPP_FROM) {
    throw new WhatsAppError("Twilio WhatsApp is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.");
  }

  const to = `whatsapp:${normalizePhone(input.toPhone)}`;
  const from = env.TWILIO_WHATSAPP_FROM.startsWith("whatsapp:")
    ? env.TWILIO_WHATSAPP_FROM
    : `whatsapp:${env.TWILIO_WHATSAPP_FROM}`;

  const text = input.subject?.trim()
    ? `*${input.subject.trim()}*\n\n${input.body.trim()}`
    : input.body.trim();

  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const body = new URLSearchParams({ To: to, From: from, Body: text });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const payload = (await response.json()) as { sid?: string; message?: string; error_message?: string };
  if (!response.ok) {
    throw new WhatsAppError(payload.message ?? payload.error_message ?? "Twilio WhatsApp send failed");
  }

  return { messageId: payload.sid ?? "twilio-sent", provider: "twilio" };
}

async function sendViaMetaCloud(input: WhatsAppSendInput): Promise<{ messageId: string; provider: "meta" }> {
  const env = getEnv();
  if (!env.WHATSAPP_CLOUD_ACCESS_TOKEN || !env.WHATSAPP_CLOUD_PHONE_NUMBER_ID) {
    throw new WhatsAppError(
      "Meta WhatsApp Cloud API is not configured. Set WHATSAPP_CLOUD_ACCESS_TOKEN and WHATSAPP_CLOUD_PHONE_NUMBER_ID.",
    );
  }

  const text = input.subject?.trim()
    ? `*${input.subject.trim()}*\n\n${input.body.trim()}`
    : input.body.trim();

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_CLOUD_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhone(input.toPhone).replace(/^\+/, ""),
        type: "text",
        text: { body: text },
      }),
    },
  );

  const payload = (await response.json()) as {
    messages?: Array<{ id: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new WhatsAppError(payload.error?.message ?? "Meta WhatsApp send failed");
  }

  return {
    messageId: payload.messages?.[0]?.id ?? "meta-sent",
    provider: "meta",
  };
}

export async function sendWhatsAppMessage(input: WhatsAppSendInput) {
  if (!isWhatsAppConfigured()) {
    throw new WhatsAppError(
      "WhatsApp is not configured. Add Twilio (TWILIO_*) or Meta Cloud (WHATSAPP_CLOUD_*) credentials to .env.",
    );
  }

  const env = getEnv();
  const provider = env.WHATSAPP_PROVIDER ?? (env.WHATSAPP_CLOUD_ACCESS_TOKEN ? "meta" : "twilio");
  if (provider === "meta") return sendViaMetaCloud(input);
  return sendViaTwilio(input);
}
