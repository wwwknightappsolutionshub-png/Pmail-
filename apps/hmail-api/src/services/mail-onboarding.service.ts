import { prisma } from "../lib/prisma.js";
import { verifyImapLogin } from "./imap.service.js";
import { verifySmtpLogin } from "./smtp.service.js";

export type MailConfigInput = {
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
};

export async function getTenantMailOnboardingStatus(tenantSlug: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug.trim().toLowerCase(), isActive: true },
    include: { mail: true },
  });
  if (!tenant) throw new Error("Organization not found");

  const mail = tenant.mail;
  return {
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    mailOnboardingComplete: mail?.mailOnboardingComplete ?? false,
    mail: mail
      ? {
          imapHost: mail.imapHost,
          imapPort: mail.imapPort,
          imapSecure: mail.imapSecure,
          smtpHost: mail.smtpHost,
          smtpPort: mail.smtpPort,
          smtpSecure: mail.smtpSecure,
        }
      : null,
  };
}

export async function completeTenantMailOnboarding(
  tenantSlug: string,
  input: MailConfigInput,
  testCredentials?: { email: string; password: string },
) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug.trim().toLowerCase(), isActive: true },
    include: { mail: true },
  });
  if (!tenant) throw new Error("Organization not found");
  if (tenant.mail?.mailOnboardingComplete) {
    throw new Error("Mail provider is already configured for this organization");
  }

  validateMailConfig(input);

  if (testCredentials?.email && testCredentials.password) {
    await testMailProviderConnection(input, testCredentials.email, testCredentials.password);
  }

  const mail = await prisma.tenantMailConfig.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      ...input,
      mailOnboardingComplete: Boolean(testCredentials?.email && testCredentials.password),
    },
    update: {
      ...input,
      ...(testCredentials?.email && testCredentials.password
        ? { mailOnboardingComplete: true }
        : {}),
    },
  });

  return mail;
}

export async function updateTenantMailConfigAuthenticated(
  tenantId: string,
  input: Partial<MailConfigInput>,
  testCredentials?: { email: string; password: string },
) {
  validateMailConfig(input);

  if (testCredentials?.email && testCredentials.password) {
    const merged = await prisma.tenantMailConfig.findUnique({ where: { tenantId } });
    const config = {
      imapHost: input.imapHost ?? merged?.imapHost ?? "imap.hostinger.com",
      imapPort: input.imapPort ?? merged?.imapPort ?? 993,
      imapSecure: input.imapSecure ?? merged?.imapSecure ?? true,
      smtpHost: input.smtpHost ?? merged?.smtpHost ?? "smtp.hostinger.com",
      smtpPort: input.smtpPort ?? merged?.smtpPort ?? 465,
      smtpSecure: input.smtpSecure ?? merged?.smtpSecure ?? true,
    };
    await testMailProviderConnection(config, testCredentials.email, testCredentials.password);
  }

  return prisma.tenantMailConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      imapHost: input.imapHost ?? "imap.hostinger.com",
      imapPort: input.imapPort ?? 993,
      imapSecure: input.imapSecure ?? true,
      smtpHost: input.smtpHost ?? "smtp.hostinger.com",
      smtpPort: input.smtpPort ?? 465,
      smtpSecure: input.smtpSecure ?? true,
      mailOnboardingComplete: Boolean(testCredentials?.email && testCredentials.password),
    },
    update: {
      ...(input.imapHost !== undefined ? { imapHost: input.imapHost } : {}),
      ...(input.imapPort !== undefined ? { imapPort: input.imapPort } : {}),
      ...(input.imapSecure !== undefined ? { imapSecure: input.imapSecure } : {}),
      ...(input.smtpHost !== undefined ? { smtpHost: input.smtpHost } : {}),
      ...(input.smtpPort !== undefined ? { smtpPort: input.smtpPort } : {}),
      ...(input.smtpSecure !== undefined ? { smtpSecure: input.smtpSecure } : {}),
      ...(testCredentials?.email && testCredentials.password ? { mailOnboardingComplete: true } : {}),
    },
  });
}

export async function testMailProviderConnection(
  config: MailConfigInput,
  email: string,
  password: string,
): Promise<void> {
  validateMailConfig(config);
  const credentials = {
    email: email.trim().toLowerCase(),
    password,
    mailConfig: {
      id: "test",
      tenantId: "test",
      ...config,
      mailOnboardingComplete: false,
    },
  };

  await verifyImapLogin(credentials);
  await verifySmtpLogin(credentials.email, credentials.password, credentials.mailConfig);
}

function validateMailConfig(input: Partial<MailConfigInput>) {
  if (input.imapHost !== undefined && !input.imapHost.trim()) throw new Error("IMAP host is required");
  if (input.smtpHost !== undefined && !input.smtpHost.trim()) throw new Error("SMTP host is required");
  if (input.imapPort !== undefined && (input.imapPort < 1 || input.imapPort > 65535)) {
    throw new Error("IMAP port must be between 1 and 65535");
  }
  if (input.smtpPort !== undefined && (input.smtpPort < 1 || input.smtpPort > 65535)) {
    throw new Error("SMTP port must be between 1 and 65535");
  }
}
