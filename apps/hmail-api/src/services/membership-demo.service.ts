import { randomBytes } from "node:crypto";
import { hashPassword } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";
import { getEnv } from "../config/env.js";
import { ensurePanelDefaults } from "./panel-resources.service.js";
import { slugifyOrgName, ensureUniqueTenantSlug } from "./provisioning.service.js";
import { TRIAL_DAYS } from "../data/addon-catalog.js";

function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "user";
  return local.replace(/[^a-z0-9._-]/gi, "").toLowerCase().slice(0, 32) || "user";
}

function generatePassword(): string {
  return randomBytes(9).toString("base64url");
}

function demoDomainFromName(fullName: string): string {
  const slug = slugifyOrgName(fullName).slice(0, 40) || "member";
  return `${slug}.prohost.demo`;
}

export type DemoProvisionResult = {
  tenantId: string;
  hostingAccountId: string;
  demoUsername: string;
  demoDomain: string;
  demoPassword: string;
  panelLoginUrl: string;
};

export async function provisionIsolatedMembershipDemo(input: {
  fullName: string;
  workEmail: string;
  hostingScale: string;
}): Promise<DemoProvisionResult> {
  const orgName = `${input.fullName.trim()} (Sample)`;
  const baseSlug = slugifyOrgName(input.fullName);
  const slug = await ensureUniqueTenantSlug(`demo-${baseSlug}`);

  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name: orgName,
      branding: {
        create: {
          productName: "Prohost Cloud",
          primaryColor: "#0d9488",
          accentColor: "#14b8a6",
          loginTagline: "Sample panel — full provisioning in 4–8 hours",
        },
      },
      mail: { create: { mailOnboardingComplete: false } },
    },
  });

  const demoUsername = usernameFromEmail(input.workEmail);
  const demoDomain = demoDomainFromName(input.fullName);
  const demoPassword = generatePassword();

  const account = await prisma.hostingAccount.create({
    data: {
      tenantId: tenant.id,
      username: demoUsername,
      domain: demoDomain,
      homePath: `/home/${demoUsername}`,
      passwordHash: hashPassword(demoPassword),
      diskQuotaMb: input.hostingScale === "Enterprise" ? 20480 : input.hostingScale === "Scaler" ? 10240 : 5120,
      diskUsedMb: Math.floor(Math.random() * 400) + 120,
      bandwidthMb: 51200,
      bandwidthUsedMb: Math.floor(Math.random() * 2000),
      emailAccounts: 10,
      databases: 3,
      isSampleDemo: true,
    },
  });

  await ensurePanelDefaults(account);

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: input.workEmail,
      displayName: input.fullName,
    },
  });

  const workspaceAddon = await prisma.addon.findFirst({ where: { slug: "bespoke-workspace", isActive: true } });
  if (workspaceAddon) {
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + TRIAL_DAYS);
    await prisma.tenantAddonTrial.create({
      data: { tenantId: tenant.id, addonId: workspaceAddon.id, endsAt, status: "active" },
    });
  }

  const env = getEnv();
  const panelLoginUrl = `${env.HOSTNET_WEB_URL}/panel/login`;

  return {
    tenantId: tenant.id,
    hostingAccountId: account.id,
    demoUsername,
    demoDomain,
    demoPassword,
    panelLoginUrl,
  };
}
