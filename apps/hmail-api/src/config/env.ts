import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SESSION_SECRET: z.string().min(32),
  CREDENTIAL_ENCRYPTION_KEY: z.string().min(16),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:5174"),
  ADMIN_DEFAULT_EMAIL: z.string().email().default("admin@hostnet.local"),
  ADMIN_DEFAULT_PASSWORD: z.string().min(8).default("changeme123"),
  ADMIN_MIN_PASSWORD_LENGTH: z.coerce.number().int().min(8).default(12),
  ADMIN_DISALLOW_DEFAULT_PASSWORD: z
    .string()
    .transform((v) => v !== "false")
    .default("true"),
  AUDIT_ADMIN_ACTIONS: z
    .string()
    .transform((v) => v !== "false")
    .default("true"),
  COOKIE_SECURE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  DEFAULT_IMAP_HOST: z.string().default("imap.hostinger.com"),
  DEFAULT_IMAP_PORT: z.coerce.number().default(993),
  DEFAULT_IMAP_SECURE: z
    .string()
    .transform((v) => v !== "false")
    .default("true"),
  DEFAULT_SMTP_HOST: z.string().default("smtp.hostinger.com"),
  DEFAULT_SMTP_PORT: z.coerce.number().default(465),
  DEFAULT_SMTP_SECURE: z
    .string()
    .transform((v) => v !== "false")
    .default("true"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYMENT_DEFAULT_CURRENCY: z.string().default("usd"),
  PAYMENT_MOCK_MODE: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  PAYMENT_SUCCESS_URL: z.string().default("http://localhost:5174/checkout/success"),
  PAYMENT_CANCEL_URL: z.string().default("http://localhost:5174/checkout/cancel"),
  HOSTNET_WEB_URL: z.string().default("http://localhost:5174"),
  PUBLIC_API_URL: z.string().optional(),
  WHATSAPP_PROVIDER: z.enum(["twilio", "meta"]).optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  WHATSAPP_CLOUD_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_CLOUD_PHONE_NUMBER_ID: z.string().optional(),
  PMAIL_TESTER_BYPASS_AUTH: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      return ["development", "test"].includes(process.env.NODE_ENV ?? "development");
    }),
  PMAIL_TESTER_EMAIL: z.string().email().default("pmailtester@gmail.com"),
  PMAIL_TESTER_PASSWORD: z.string().min(8).default("mailtester1234"),
  PMAIL_TESTER_TENANT_SLUG: z.string().default("pmail-tester"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

export type PaymentProviderId = "stripe" | "paystack" | "mock";

export function isPaymentMockMode(): boolean {
  const env = getEnv();
  if (env.PAYMENT_MOCK_MODE === true) return true;
  if (env.NODE_ENV === "test") return true;
  if (env.NODE_ENV === "development" && !env.STRIPE_SECRET_KEY && !env.PAYSTACK_SECRET_KEY) {
    return true;
  }
  return false;
}

export function getEnabledPaymentProviders(): PaymentProviderId[] {
  const env = getEnv();
  const providers: PaymentProviderId[] = [];
  if (env.STRIPE_SECRET_KEY) providers.push("stripe");
  if (env.PAYSTACK_SECRET_KEY) providers.push("paystack");
  if (isPaymentMockMode()) providers.push("mock");
  return providers;
}
