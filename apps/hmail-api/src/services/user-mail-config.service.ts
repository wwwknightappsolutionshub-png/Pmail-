import type { TenantMailConfig, User, UserMailConfig } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  isMailProviderPresetKey,
  resolveMailConfigFromPreset,
  resolveSuggestedMailConfigForLogin,
  type MailConfigInput,
  type MailProviderPresetKey,
} from "../data/mail-providers.js";
import { testMailProviderConnection } from "./mail-onboarding.service.js";
import { getEnv } from "../config/env.js";
import { isPmailTesterBypassEnabled } from "./pmail-tester.service.js";

export type UserWithMailRelations = User & {
  mailConfig: UserMailConfig | null;
  tenant: {
    mail: TenantMailConfig | null;
  };
};

export function toTenantMailConfigShape(
  config: MailConfigInput,
  tenantId: string,
  id = "user-mail",
): TenantMailConfig {
  return {
    id,
    tenantId,
    imapHost: config.imapHost,
    imapPort: config.imapPort,
    imapSecure: config.imapSecure,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpSecure: config.smtpSecure,
    mailOnboardingComplete: true,
  };
}

export function resolveEffectiveMailConfig(user: UserWithMailRelations): TenantMailConfig | null {
  if (user.mailConfig) {
    return toTenantMailConfigShape(
      {
        providerPreset: user.mailConfig.providerPreset as MailProviderPresetKey,
        imapHost: user.mailConfig.imapHost,
        imapPort: user.mailConfig.imapPort,
        imapSecure: user.mailConfig.imapSecure,
        smtpHost: user.mailConfig.smtpHost,
        smtpPort: user.mailConfig.smtpPort,
        smtpSecure: user.mailConfig.smtpSecure,
      },
      user.tenantId,
      user.mailConfig.id,
    );
  }

  if (user.tenant.mail?.mailOnboardingComplete) {
    return user.tenant.mail;
  }

  return null;
}

export async function getLoginPreflight(tenantSlug: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug.trim().toLowerCase(), isActive: true },
    select: { id: true, mail: true },
  });
  if (!tenant) throw new Error("Organization not found");

  const user = await prisma.user.findUnique({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: normalizedEmail,
      },
    },
    include: { mailConfig: true },
  });

  const displayName = user?.displayName?.trim() || user?.email.split("@")[0] || null;
  const env = getEnv();
  const isTesterEmail = normalizedEmail === env.PMAIL_TESTER_EMAIL.toLowerCase();
  const isTesterTenant = tenantSlug.trim().toLowerCase() === env.PMAIL_TESTER_TENANT_SLUG;
  const testerBypass = isPmailTesterBypassEnabled() && isTesterEmail && isTesterTenant;

  const suggestedMailConfig = resolveSuggestedMailConfigForLogin(normalizedEmail, tenant.mail);

  return {
    needsProviderSetup: testerBypass ? false : !user?.mailConfig,
    displayName: displayName ?? (isTesterEmail ? "PMail Tester" : null),
    testerBypass,
    suggestedTenantSlug:
      isPmailTesterBypassEnabled() && isTesterEmail && !isTesterTenant
        ? env.PMAIL_TESTER_TENANT_SLUG
        : null,
    suggestedMailConfig,
  };
}

export async function saveUserMailConfig(userId: string, input: MailConfigInput): Promise<UserMailConfig> {
  validateUserMailConfig(input);

  return prisma.userMailConfig.upsert({
    where: { userId },
    create: {
      userId,
      providerPreset: input.providerPreset,
      imapHost: input.imapHost,
      imapPort: input.imapPort,
      imapSecure: input.imapSecure,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
    },
    update: {
      providerPreset: input.providerPreset,
      imapHost: input.imapHost,
      imapPort: input.imapPort,
      imapSecure: input.imapSecure,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
    },
  });
}

export async function copyTenantMailConfigToUser(
  userId: string,
  tenantMail: TenantMailConfig,
): Promise<UserMailConfig> {
  return saveUserMailConfig(userId, {
    providerPreset: "custom",
    imapHost: tenantMail.imapHost,
    imapPort: tenantMail.imapPort,
    imapSecure: tenantMail.imapSecure,
    smtpHost: tenantMail.smtpHost,
    smtpPort: tenantMail.smtpPort,
    smtpSecure: tenantMail.smtpSecure,
  });
}

export async function updateUserMailConfigAuthenticated(
  userId: string,
  input: MailConfigInput,
  testCredentials?: { email: string; password: string },
): Promise<UserMailConfig> {
  validateUserMailConfig(input);

  if (testCredentials?.email && testCredentials.password) {
    await testMailProviderConnection(input, testCredentials.email, testCredentials.password);
  }

  return saveUserMailConfig(userId, input);
}

export function parseLoginMailConfig(body: {
  providerPreset?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
}): MailConfigInput | null {
  if (!body.providerPreset || !isMailProviderPresetKey(body.providerPreset)) {
    return null;
  }

  return resolveMailConfigFromPreset(body.providerPreset, {
    imapHost: body.imapHost,
    imapPort: body.imapPort,
    imapSecure: body.imapSecure,
    smtpHost: body.smtpHost,
    smtpPort: body.smtpPort,
    smtpSecure: body.smtpSecure,
  });
}

function validateUserMailConfig(input: MailConfigInput) {
  if (!input.imapHost.trim()) throw new Error("IMAP host is required");
  if (!input.smtpHost.trim()) throw new Error("SMTP host is required");
  if (input.imapPort < 1 || input.imapPort > 65535) throw new Error("IMAP port must be between 1 and 65535");
  if (input.smtpPort < 1 || input.smtpPort > 65535) throw new Error("SMTP port must be between 1 and 65535");
}

export function serializeUserMailConfig(mail: UserMailConfig) {
  return {
    providerPreset: mail.providerPreset,
    imapHost: mail.imapHost,
    imapPort: mail.imapPort,
    imapSecure: mail.imapSecure,
    smtpHost: mail.smtpHost,
    smtpPort: mail.smtpPort,
    smtpSecure: mail.smtpSecure,
    configuredAt: mail.configuredAt.toISOString(),
  };
}
