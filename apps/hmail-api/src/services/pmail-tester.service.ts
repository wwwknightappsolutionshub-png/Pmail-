import { getEnv } from "../config/env.js";

export function isPmailTesterBypassEnabled(): boolean {
  return getEnv().PMAIL_TESTER_BYPASS_AUTH === true;
}

export function isPmailTesterLogin(input: {
  tenantSlug: string;
  email: string;
  password?: string;
}): boolean {
  if (!isPmailTesterBypassEnabled()) return false;
  const env = getEnv();
  if (input.tenantSlug !== env.PMAIL_TESTER_TENANT_SLUG) return false;
  if (input.email.trim().toLowerCase() !== env.PMAIL_TESTER_EMAIL.toLowerCase()) return false;
  if (input.password !== undefined && input.password !== env.PMAIL_TESTER_PASSWORD) return false;
  return true;
}

export function isPmailTesterEmail(email: string): boolean {
  return email.trim().toLowerCase() === getEnv().PMAIL_TESTER_EMAIL.toLowerCase();
}
