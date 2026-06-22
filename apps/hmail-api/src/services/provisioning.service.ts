import { randomBytes } from "node:crypto";
import { TRIAL_DAYS } from "../data/addon-catalog.js";
import { hashPassword } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";
import { ensurePanelDefaults } from "./panel-resources.service.js";
import { markLeadConverted } from "./marketing-leads.service.js";

export class ProvisioningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProvisioningError";
  }
}

export type CheckoutProvisionMeta = {
  orgName: string;
  tenantSlug: string;
  domain?: string;
};

export type CheckoutMetadata = {
  billingPeriod?: string;
  provision?: CheckoutProvisionMeta;
  provisioning?: {
    status: "completed" | "skipped";
    tenantSlug: string;
    panelLoginId?: string;
    pmailUserEmail?: string;
    completedAt?: string;
  };
  addonSubscription?: {
    scope: "user" | "tenant";
    userId: string;
    addonSlug: string;
    seats: number;
    unitPriceCents: number;
    vertical?: string;
    addonKind?: string;
  };
  marketplaceCheckout?: {
    scope: "user" | "tenant";
    userId: string;
    vertical: string;
    includePlatformBundle: boolean;
    includeVerticalBundle: boolean;
    seats: number;
    lines: Array<{
      bundle: "platform" | "vertical";
      anchorSlug: string;
      unitPriceCents: number;
      amountCents: number;
    }>;
  };
};

export type ProvisionCredentials = {
  tenantSlug: string;
  panelLoginId: string;
  panelPassword: string;
  pmailUserEmail: string;
};

export function slugifyOrgName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "org";
}

export async function ensureUniqueTenantSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let suffix = 0;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
  return slug;
}

function generatePanelPassword(): string {
  return randomBytes(9).toString("base64url");
}

function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "user";
  return local.replace(/[^a-z0-9._-]/gi, "").toLowerCase().slice(0, 32) || "user";
}

export async function resolveOrCreateTenant(input: {
  tenantSlug?: string;
  orgName?: string;
}): Promise<{ id: string; slug: string; name: string; created: boolean }> {
  if (input.tenantSlug) {
    const existing = await prisma.tenant.findFirst({
      where: { slug: input.tenantSlug.trim().toLowerCase(), isActive: true },
    });
    if (existing) {
      return { id: existing.id, slug: existing.slug, name: existing.name, created: false };
    }
  }

  const orgName = input.orgName?.trim();
  if (!orgName) {
    throw new ProvisioningError("Tenant not found");
  }

  const baseSlug = input.tenantSlug?.trim().toLowerCase() || slugifyOrgName(orgName);
  const slug = await ensureUniqueTenantSlug(baseSlug);
  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name: orgName,
      branding: { create: { productName: "PMail+" } },
      mail: { create: { mailOnboardingComplete: false } },
    },
  });
  return { id: tenant.id, slug: tenant.slug, name: tenant.name, created: true };
}

export async function provisionHostingFromCheckout(checkoutId: string): Promise<ProvisionCredentials | null> {
  const checkout = await prisma.paymentCheckout.findUnique({
    where: { id: checkoutId },
    include: { tenant: true },
  });
  if (!checkout || checkout.productType !== "hosting_plan") return null;

  const metadata = checkout.metadata ? (JSON.parse(checkout.metadata) as CheckoutMetadata) : {};
  if (metadata.provisioning?.status === "completed") return null;

  const existingAccount = await prisma.hostingAccount.findFirst({ where: { tenantId: checkout.tenantId } });
  if (existingAccount) {
    await prisma.paymentCheckout.update({
      where: { id: checkoutId },
      data: {
        metadata: JSON.stringify({
          ...metadata,
          provisioning: {
            status: "skipped",
            tenantSlug: checkout.tenant.slug,
            panelLoginId: `${existingAccount.username}@${existingAccount.domain}`,
            pmailUserEmail: checkout.customerEmail,
            completedAt: new Date().toISOString(),
          },
        } satisfies CheckoutMetadata),
      },
    });
    return null;
  }

  const provision = metadata.provision;
  const domain = provision?.domain?.trim().toLowerCase() || `${checkout.tenant.slug}.hostnet.local`;
  const username = usernameFromEmail(checkout.customerEmail);
  const panelPassword = generatePanelPassword();

  const plan = await prisma.hostingPlan.findUnique({ where: { id: checkout.productId } });

  const account = await prisma.hostingAccount.create({
    data: {
      tenantId: checkout.tenantId,
      planId: checkout.productId,
      username,
      domain,
      homePath: `/home/${username}`,
      passwordHash: hashPassword(panelPassword),
      diskQuotaMb: plan?.diskGb ? plan.diskGb * 1024 : 5120,
      diskUsedMb: 0,
      bandwidthMb: plan?.bandwidthGb ? plan.bandwidthGb * 1024 : 51200,
      bandwidthUsedMb: 0,
      emailAccounts: plan?.emailAccounts ?? 10,
      databases: plan?.databases ?? 2,
    },
  });

  await ensurePanelDefaults(account);

  const existingUser = await prisma.user.findFirst({
    where: { tenantId: checkout.tenantId, email: checkout.customerEmail },
  });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        tenantId: checkout.tenantId,
        email: checkout.customerEmail,
        displayName: provision?.orgName ?? checkout.tenant.name,
      },
    });
  }

  const workspaceAddon = await prisma.addon.findFirst({ where: { slug: "bespoke-workspace", isActive: true } });
  if (workspaceAddon) {
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + TRIAL_DAYS);
    await prisma.tenantAddonTrial.upsert({
      where: { tenantId_addonId: { tenantId: checkout.tenantId, addonId: workspaceAddon.id } },
      create: { tenantId: checkout.tenantId, addonId: workspaceAddon.id, endsAt, status: "active" },
      update: { endsAt, status: "active" },
    });
  }

  await markLeadConverted(checkout.customerEmail, checkout.tenantId);

  const panelLoginId = `${account.username}@${account.domain}`;
  await prisma.paymentCheckout.update({
    where: { id: checkoutId },
    data: {
      metadata: JSON.stringify({
        ...metadata,
        provisioning: {
          status: "completed",
          tenantSlug: checkout.tenant.slug,
          panelLoginId,
          pmailUserEmail: checkout.customerEmail,
          completedAt: new Date().toISOString(),
        },
      } satisfies CheckoutMetadata),
    },
  });

  return {
    tenantSlug: checkout.tenant.slug,
    panelLoginId,
    panelPassword,
    pmailUserEmail: checkout.customerEmail,
  };
}

export async function provisionTenantFromLead(leadId: string): Promise<{
  tenant: { id: string; slug: string; name: string };
  panelLoginId: string;
  panelPassword: string;
  pmailUserEmail: string;
}> {
  const lead = await prisma.marketingLead.findUnique({ where: { id: leadId } });
  if (!lead) throw new ProvisioningError("Lead not found");
  if (lead.tenantId) throw new ProvisioningError("Lead already converted");

  const tenant = await resolveOrCreateTenant({
    orgName: lead.company,
    tenantSlug: slugifyOrgName(lead.company),
  });

  const domain = `${tenant.slug}.hostnet.local`;
  const username = usernameFromEmail(lead.email);
  const panelPassword = generatePanelPassword();

  const account = await prisma.hostingAccount.create({
    data: {
      tenantId: tenant.id,
      username,
      domain,
      homePath: `/home/${username}`,
      passwordHash: hashPassword(panelPassword),
      diskQuotaMb: 5120,
      diskUsedMb: 0,
      bandwidthMb: 51200,
      bandwidthUsedMb: 0,
      emailAccounts: 10,
      databases: 2,
    },
  });

  await ensurePanelDefaults(account);

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: lead.email,
      displayName: lead.fullName,
    },
  });

  const workspaceAddon = await prisma.addon.findFirst({ where: { slug: "bespoke-workspace", isActive: true } });
  if (workspaceAddon) {
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + TRIAL_DAYS);
    await prisma.tenantAddonTrial.upsert({
      where: { tenantId_addonId: { tenantId: tenant.id, addonId: workspaceAddon.id } },
      create: { tenantId: tenant.id, addonId: workspaceAddon.id, endsAt, status: "active" },
      update: { endsAt, status: "active" },
    });
  }

  await prisma.marketingLead.update({
    where: { id: leadId },
    data: {
      status: "converted",
      tenantId: tenant.id,
      convertedAt: new Date(),
    },
  });

  return {
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    panelLoginId: `${account.username}@${account.domain}`,
    panelPassword,
    pmailUserEmail: lead.email,
  };
}
