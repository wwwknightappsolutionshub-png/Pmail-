import type { TenantMailConfig, UserMailAccount } from "@prisma/client";
import type { Request } from "express";
import { getEnv } from "../config/env.js";
import { decryptSecret, encryptSecret, hashToken } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";
import { resolveMailConfigFromPreset, type MailConfigInput } from "../data/mail-providers.js";
import { verifyImapLogin } from "./imap.service.js";
import { verifySmtpLogin } from "./smtp.service.js";
import {
  resolveEffectiveMailConfig,
  toTenantMailConfigShape,
  type UserWithMailRelations,
} from "./user-mail-config.service.js";

export const MULTI_INBOX_ADDON_SLUG = "multi-inbox-functionality";

export type MailCredentials = {
  email: string;
  password: string;
  mailConfig: TenantMailConfig;
  mailAccountId: string | null;
};

function maxAccounts(): number {
  return getEnv().MULTI_INBOX_MAX_ACCOUNTS;
}

function accountToMailConfig(account: UserMailAccount, tenantId: string): TenantMailConfig {
  return toTenantMailConfigShape(
    {
      providerPreset: account.providerPreset as MailConfigInput["providerPreset"],
      imapHost: account.imapHost,
      imapPort: account.imapPort,
      imapSecure: account.imapSecure,
      smtpHost: account.smtpHost,
      smtpPort: account.smtpPort,
      smtpSecure: account.smtpSecure,
    },
    tenantId,
    account.id,
  );
}

function serializeAccount(account: UserMailAccount, activeId: string | null) {
  return {
    id: account.id,
    email: account.email,
    label: account.label,
    providerPreset: account.providerPreset,
    isPrimary: account.isPrimary,
    sortOrder: account.sortOrder,
    isActive: account.id === activeId,
    createdAt: account.createdAt.toISOString(),
  };
}

function shouldSkipProviderVerify(mailConfig: TenantMailConfig): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return mailConfig.imapHost === "local.pmail.test";
}

export async function ensurePrimaryMailAccount(
  user: UserWithMailRelations,
  sessionPassword: string,
): Promise<UserMailAccount> {
  const existing = await prisma.userMailAccount.findFirst({
    where: { userId: user.id, isPrimary: true },
  });
  if (existing) {
    return existing;
  }

  const mailConfig = resolveEffectiveMailConfig(user);
  if (!mailConfig) {
    throw new Error("Mail provider configuration missing");
  }

  const preset =
    user.mailConfig?.providerPreset ??
    (user.tenant.mail?.mailOnboardingComplete ? "custom" : "custom");

  return prisma.userMailAccount.create({
    data: {
      userId: user.id,
      email: user.email,
      label: user.displayName?.trim() || "Primary",
      providerPreset: preset,
      imapHost: mailConfig.imapHost,
      imapPort: mailConfig.imapPort,
      imapSecure: mailConfig.imapSecure,
      smtpHost: mailConfig.smtpHost,
      smtpPort: mailConfig.smtpPort,
      smtpSecure: mailConfig.smtpSecure,
      encryptedMailPassword: encryptSecret(sessionPassword),
      isPrimary: true,
      sortOrder: 0,
    },
  });
}

export async function listUserMailAccounts(userId: string, activeMailAccountId: string | null) {
  const accounts = await prisma.userMailAccount.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const activeId =
    activeMailAccountId && accounts.some((account) => account.id === activeMailAccountId)
      ? activeMailAccountId
      : accounts.find((account) => account.isPrimary)?.id ?? accounts[0]?.id ?? null;

  return {
    accounts: accounts.map((account) => serializeAccount(account, activeId)),
    activeMailAccountId: activeId,
  };
}

export async function resolveActiveMailCredentials(input: {
  user: UserWithMailRelations;
  sessionPassword: string;
  activeMailAccountId: string | null;
}): Promise<MailCredentials> {
  const { user, sessionPassword, activeMailAccountId } = input;

  let account: UserMailAccount | null = null;
  if (activeMailAccountId) {
    account = await prisma.userMailAccount.findFirst({
      where: { id: activeMailAccountId, userId: user.id },
    });
  }
  if (!account) {
    account = await prisma.userMailAccount.findFirst({
      where: { userId: user.id, isPrimary: true },
    });
  }

  if (account) {
    return {
      email: account.email,
      password: decryptSecret(account.encryptedMailPassword),
      mailConfig: accountToMailConfig(account, user.tenantId),
      mailAccountId: account.id,
    };
  }

  const mailConfig = resolveEffectiveMailConfig(user);
  if (!mailConfig) {
    throw new Error("Mail provider configuration missing");
  }

  return {
    email: user.email,
    password: sessionPassword,
    mailConfig,
    mailAccountId: null,
  };
}

export async function resolveRequestMailCredentials(req: Request): Promise<MailCredentials> {
  const auth = req.auth!;
  return resolveActiveMailCredentials({
    user: auth.user,
    sessionPassword: auth.mailPassword,
    activeMailAccountId: auth.activeMailAccountId,
  });
}

export async function getMailCredentialsForAccount(
  userId: string,
  mailAccountId: string,
): Promise<MailCredentials | null> {
  const account = await prisma.userMailAccount.findFirst({
    where: { id: mailAccountId, userId },
    include: { user: { include: { tenant: true } } },
  });
  if (!account) return null;

  return {
    email: account.email,
    password: decryptSecret(account.encryptedMailPassword),
    mailConfig: accountToMailConfig(account, account.user.tenantId),
    mailAccountId: account.id,
  };
}

export async function createUserMailAccount(
  user: UserWithMailRelations,
  input: {
    email: string;
    password: string;
    label?: string;
    providerPreset: string;
    imapHost?: string;
    imapPort?: number;
    imapSecure?: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
  },
) {
  const count = await prisma.userMailAccount.count({ where: { userId: user.id } });
  if (count >= maxAccounts()) {
    throw new Error(`Maximum ${maxAccounts()} mail accounts allowed`);
  }

  const email = input.email.trim().toLowerCase();
  const existing = await prisma.userMailAccount.findFirst({
    where: { userId: user.id, email },
  });
  if (existing) {
    throw new Error("This mail account is already connected");
  }

  const mailConfigInput = resolveMailConfigFromPreset(input.providerPreset as MailConfigInput["providerPreset"], {
    imapHost: input.imapHost,
    imapPort: input.imapPort,
    imapSecure: input.imapSecure,
    smtpHost: input.smtpHost,
    smtpPort: input.smtpPort,
    smtpSecure: input.smtpSecure,
  });
  const mailConfig = toTenantMailConfigShape(mailConfigInput, user.tenantId);

  if (!shouldSkipProviderVerify(mailConfig)) {
    const credentials = { email, password: input.password, mailConfig };
    await verifyImapLogin(credentials);
    await verifySmtpLogin(email, input.password, mailConfig);
  }

  const account = await prisma.userMailAccount.create({
    data: {
      userId: user.id,
      email,
      label: input.label?.trim() || null,
      providerPreset: mailConfigInput.providerPreset,
      imapHost: mailConfigInput.imapHost,
      imapPort: mailConfigInput.imapPort,
      imapSecure: mailConfigInput.imapSecure,
      smtpHost: mailConfigInput.smtpHost,
      smtpPort: mailConfigInput.smtpPort,
      smtpSecure: mailConfigInput.smtpSecure,
      encryptedMailPassword: encryptSecret(input.password),
      isPrimary: false,
      sortOrder: count,
    },
  });

  return account;
}

export async function deleteUserMailAccount(userId: string, accountId: string): Promise<boolean> {
  const account = await prisma.userMailAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) return false;
  if (account.isPrimary) {
    throw new Error("Primary mail account cannot be removed");
  }

  await prisma.session.updateMany({
    where: { activeMailAccountId: account.id },
    data: { activeMailAccountId: null },
  });
  await prisma.userMailAccount.delete({ where: { id: account.id } });
  return true;
}

export async function activateMailAccount(
  sessionToken: string,
  userId: string,
  accountId: string,
): Promise<UserMailAccount | null> {
  const account = await prisma.userMailAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) return null;

  await prisma.session.updateMany({
    where: { tokenHash: hashToken(sessionToken), userId },
    data: { activeMailAccountId: account.id },
  });

  return account;
}

export async function getActiveMailAccountSummary(userId: string, activeMailAccountId: string | null) {
  const { accounts, activeMailAccountId: resolvedId } = await listUserMailAccounts(userId, activeMailAccountId);
  const active = accounts.find((account) => account.id === resolvedId) ?? null;
  return { activeMailAccount: active, mailAccountCount: accounts.length };
}
