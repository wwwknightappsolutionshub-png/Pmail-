import { randomBytes } from "node:crypto";
import { getEnv } from "../config/env.js";
import { hashPassword, verifyPassword } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";
import { slugifyOrgName, ensureUniqueTenantSlug } from "./provisioning.service.js";
import { sendTemplatedPlatformEmail } from "./platform-email.service.js";
import {
  ensurePmailTesterAccountingWorkspace,
  grantPmailTesterAccountingAddonTrials,
} from "./pmail-tester-seed.service.js";

export const PMAIL_PROSPECT_DEMO_MAIL_HOST = "demo.pmail.prohost";
export const PMAIL_PROSPECT_DEMO_TRIAL_HOURS = 72;
export const PMAIL_PROSPECT_DEMO_UPSELL_HOURS_LEFT = 24;

const DEMO_MAIL_HOSTS = {
  imapHost: PMAIL_PROSPECT_DEMO_MAIL_HOST,
  imapPort: 993,
  imapSecure: true,
  smtpHost: PMAIL_PROSPECT_DEMO_MAIL_HOST,
  smtpPort: 465,
  smtpSecure: true,
} as const;

function generateDemoPassword(): string {
  return randomBytes(9).toString("base64url");
}

function getPmailWebBaseUrl(): string {
  const env = getEnv();
  return env.CORS_ORIGIN.split(",")[0]?.trim() || "http://localhost:5173";
}

function prospectDemoExpiresAt(from = new Date()): Date {
  const endsAt = new Date(from);
  endsAt.setHours(endsAt.getHours() + PMAIL_PROSPECT_DEMO_TRIAL_HOURS);
  return endsAt;
}

function formatExpiryLabel(expiresAt: Date): string {
  return expiresAt.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function hoursLeft(expiresAt: Date, now = new Date()): number {
  return Math.max(0, (expiresAt.getTime() - now.getTime()) / (60 * 60 * 1000));
}

export function isPmailProspectDemoMailHost(imapHost: string | null | undefined): boolean {
  return imapHost === PMAIL_PROSPECT_DEMO_MAIL_HOST || imapHost === "local.pmail.test";
}

export function isProspectDemoUserActive(expiresAt: Date | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() > now.getTime();
}

export async function findProspectDemoUser(email: string, tenantId: string) {
  return prisma.user.findFirst({
    where: {
      tenantId,
      email: email.trim().toLowerCase(),
      prospectDemoExpiresAt: { not: null },
      prospectDemoPasswordHash: { not: null },
    },
    select: {
      id: true,
      email: true,
      tenantId: true,
      prospectDemoExpiresAt: true,
      prospectDemoPasswordHash: true,
      isActive: true,
    },
  });
}

export async function verifyPmailProspectDemoLogin(input: {
  email: string;
  tenantId: string;
  password: string;
}): Promise<{ valid: boolean; expired?: boolean }> {
  const user = await findProspectDemoUser(input.email, input.tenantId);
  if (!user?.prospectDemoPasswordHash) return { valid: false };

  if (!isProspectDemoUserActive(user.prospectDemoExpiresAt)) {
    return { valid: false, expired: true };
  }

  const valid = verifyPassword(input.password, user.prospectDemoPasswordHash);
  return { valid, expired: false };
}

async function grantProspectDemoAddonTrials(tenantId: string, endsAt: Date): Promise<void> {
  await grantPmailTesterAccountingAddonTrials(tenantId);

  await prisma.tenantAddonTrial.updateMany({
    where: { tenantId, status: "active" },
    data: { endsAt, trialSource: "pmail_prospect_demo" },
  });
}

async function resolveBrandingSourceTenant(slug?: string | null) {
  const normalized = slug?.trim().toLowerCase() || "prohost";
  return prisma.tenant.findFirst({
    where: { slug: normalized, isActive: true },
    include: { branding: true },
  });
}

export type ProspectDemoProvisionResult = {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  loginUrl: string;
  demoPassword: string;
  expiresAt: Date;
  productName: string;
};

async function createProspectDemoTenant(input: {
  fullName: string;
  email: string;
  sourceTenantSlug?: string | null;
}) {
  const source = await resolveBrandingSourceTenant(input.sourceTenantSlug);
  const branding = source?.branding;
  const baseSlug = slugifyOrgName(input.fullName || input.email.split("@")[0] || "prospect");
  const slug = await ensureUniqueTenantSlug(`pmail-demo-${baseSlug}`);

  return prisma.tenant.create({
    data: {
      slug,
      name: `${input.fullName.trim()} — PMail+ Demo`,
      branding: {
        create: {
          productName: branding?.productName ?? "PMail+",
          primaryColor: branding?.primaryColor ?? "#0d4f6c",
          accentColor: branding?.accentColor ?? "#0d9488",
          backgroundColor: branding?.backgroundColor ?? "#0f2744",
          loginTagline: "Your 72-hour PMail+ demo workspace",
          industryProfile: "accounting",
        },
      },
      mail: {
        create: {
          ...DEMO_MAIL_HOSTS,
          mailOnboardingComplete: true,
        },
      },
    },
    include: { branding: true, mail: true },
  });
}

async function sendProspectDemoWelcomeEmail(input: {
  to: string;
  fullName: string;
  productName: string;
  loginUrl: string;
  email: string;
  demoPassword: string;
  expiresAt: Date;
}) {
  await sendTemplatedPlatformEmail({
    to: input.to,
    templateSlug: "pmail-prospect-welcome",
    variables: {
      fullName: input.fullName,
      productName: input.productName,
      loginUrl: input.loginUrl,
      workEmail: input.email,
      demoPassword: input.demoPassword,
      expiresAtLabel: formatExpiryLabel(input.expiresAt),
      trialHours: String(PMAIL_PROSPECT_DEMO_TRIAL_HOURS),
      addonsUrl: `${getPmailWebBaseUrl()}/addons`,
    },
  });
}

async function sendProspectDemoUpsellEmail(input: {
  to: string;
  fullName: string;
  productName: string;
  loginUrl: string;
  hoursLeft: number;
}) {
  await sendTemplatedPlatformEmail({
    to: input.to,
    templateSlug: "pmail-prospect-upsell",
    variables: {
      fullName: input.fullName,
      productName: input.productName,
      loginUrl: input.loginUrl,
      hoursLeft: String(Math.ceil(input.hoursLeft)),
      addonsUrl: `${getPmailWebBaseUrl()}/addons`,
      registerUrl: `${getPmailWebBaseUrl()}/welcome/prohost`,
    },
  });
}

export async function provisionPmailProspectDemo(prospectId: string): Promise<ProspectDemoProvisionResult> {
  const prospect = await prisma.pmailProspect.findUnique({ where: { id: prospectId } });
  if (!prospect) throw new Error("Prospect not found");

  const now = new Date();
  if (
    prospect.demoProvisionedAt &&
    prospect.demoExpiresAt &&
    prospect.demoExpiresAt.getTime() > now.getTime() &&
    prospect.tenantId &&
    prospect.userId
  ) {
    const tenant = await prisma.tenant.findUnique({ where: { id: prospect.tenantId }, include: { branding: true } });
    if (tenant) {
      return {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        userId: prospect.userId,
        loginUrl: `${getPmailWebBaseUrl()}/login/${tenant.slug}`,
        demoPassword: "",
        expiresAt: prospect.demoExpiresAt,
        productName: tenant.branding?.productName ?? "PMail+",
      };
    }
  }

  const email = prospect.email.trim().toLowerCase();
  const demoPassword = generateDemoPassword();
  const expiresAt = prospectDemoExpiresAt(now);
  const passwordHash = hashPassword(demoPassword);

  const tenant = await createProspectDemoTenant({
    fullName: prospect.fullName,
    email,
    sourceTenantSlug: prospect.tenantSlug,
  });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      displayName: prospect.fullName,
      businessVertical: "accounting",
      uiThemeVersion: "dark",
      prospectDemoExpiresAt: expiresAt,
      prospectDemoPasswordHash: passwordHash,
      prospectDemoUpsellEmailSent: false,
      panelWorkspaceTrialStartedAt: now,
      panelWorkspaceDay5EmailSent: true,
      panelWorkspaceDay7ReminderSent: true,
      mailConfig: {
        create: {
          providerPreset: "custom",
          ...DEMO_MAIL_HOSTS,
        },
      },
    },
  });

  await grantProspectDemoAddonTrials(tenant.id, expiresAt);
  await ensurePmailTesterAccountingWorkspace(tenant.id, user.id);

  const loginUrl = `${getPmailWebBaseUrl()}/login/${tenant.slug}`;
  const productName = tenant.branding?.productName ?? "PMail+";

  await sendProspectDemoWelcomeEmail({
    to: email,
    fullName: prospect.fullName,
    productName,
    loginUrl,
    email,
    demoPassword,
    expiresAt,
  });

  await prisma.pmailProspect.update({
    where: { id: prospect.id },
    data: {
      tenantId: tenant.id,
      userId: user.id,
      demoTenantSlug: tenant.slug,
      demoProvisionedAt: now,
      demoExpiresAt: expiresAt,
      demoWelcomeEmailSent: true,
      demoUpsellEmailSent: false,
      status: "invited",
    },
  });

  const { activateAddonEducationAfterWelcome } = await import("./addon-education-drip.service.js");
  void activateAddonEducationAfterWelcome(user.id).catch((err) => {
    console.error("[pmail-prospect-demo] addon education enroll failed:", err);
  });

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    userId: user.id,
    loginUrl,
    demoPassword,
    expiresAt,
    productName,
  };
}

export async function ensureProspectDemoProvisioned(prospectId: string) {
  return provisionPmailProspectDemo(prospectId);
}

export async function expireProspectDemoAccess(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
}

export async function processPmailProspectDemoEmails(): Promise<void> {
  const now = new Date();

  const prospects = await prisma.pmailProspect.findMany({
    where: {
      demoProvisionedAt: { not: null },
      demoExpiresAt: { not: null },
      userId: { not: null },
    },
    include: {
      user: { select: { id: true, isActive: true } },
      tenant: { include: { branding: true } },
    },
  });

  for (const prospect of prospects) {
    if (!prospect.demoExpiresAt || !prospect.userId || !prospect.tenant) continue;

    const remainingHours = hoursLeft(prospect.demoExpiresAt, now);
    const loginUrl = `${getPmailWebBaseUrl()}/login/${prospect.tenant.slug}`;
    const productName = prospect.tenant.branding?.productName ?? "PMail+";

    if (remainingHours <= 0) {
      if (prospect.user?.isActive) {
        await expireProspectDemoAccess(prospect.userId);
      }
      if (prospect.status !== "closed") {
        await prisma.pmailProspect.update({
          where: { id: prospect.id },
          data: { status: "closed" },
        });
      }
      continue;
    }

    if (
      !prospect.demoUpsellEmailSent &&
      remainingHours <= PMAIL_PROSPECT_DEMO_UPSELL_HOURS_LEFT
    ) {
      await sendProspectDemoUpsellEmail({
        to: prospect.email,
        fullName: prospect.fullName,
        productName,
        loginUrl,
        hoursLeft: remainingHours,
      });

      await prisma.pmailProspect.update({
        where: { id: prospect.id },
        data: { demoUpsellEmailSent: true },
      });

      await prisma.user.update({
        where: { id: prospect.userId },
        data: { prospectDemoUpsellEmailSent: true },
      });
    }
  }
}
