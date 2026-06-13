import type { HostingPlan } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type HostingPlanInput = {
  slug: string;
  name: string;
  tagline?: string | null;
  priceCents: number;
  billingPeriod?: string;
  diskGb?: number;
  bandwidthGb?: number;
  websites?: number;
  emailAccounts?: number;
  databases?: number;
  features?: string[];
  isFeatured?: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

function serializePlan(plan: HostingPlan) {
  let features: string[] = [];
  try {
    features = JSON.parse(plan.features) as string[];
  } catch {
    features = [];
  }
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    tagline: plan.tagline,
    priceCents: plan.priceCents,
    billingPeriod: plan.billingPeriod,
    diskGb: plan.diskGb,
    bandwidthGb: plan.bandwidthGb,
    websites: plan.websites,
    emailAccounts: plan.emailAccounts,
    databases: plan.databases,
    features,
    isFeatured: plan.isFeatured,
    sortOrder: plan.sortOrder,
    isActive: plan.isActive,
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function listPublicHostingPlans() {
  const plans = await prisma.hostingPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return plans.map(serializePlan);
}

export async function listAllHostingPlans() {
  const plans = await prisma.hostingPlan.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return plans.map(serializePlan);
}

export async function createHostingPlan(input: HostingPlanInput) {
  const plan = await prisma.hostingPlan.create({
    data: {
      slug: input.slug,
      name: input.name,
      tagline: input.tagline ?? null,
      priceCents: input.priceCents,
      billingPeriod: input.billingPeriod ?? "monthly",
      diskGb: input.diskGb ?? 10,
      bandwidthGb: input.bandwidthGb ?? 100,
      websites: input.websites ?? 1,
      emailAccounts: input.emailAccounts ?? 5,
      databases: input.databases ?? 1,
      features: JSON.stringify(input.features ?? []),
      isFeatured: input.isFeatured ?? false,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
  return serializePlan(plan);
}

export async function updateHostingPlan(id: string, input: Partial<HostingPlanInput>) {
  const plan = await prisma.hostingPlan.update({
    where: { id },
    data: {
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
      ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
      ...(input.billingPeriod !== undefined ? { billingPeriod: input.billingPeriod } : {}),
      ...(input.diskGb !== undefined ? { diskGb: input.diskGb } : {}),
      ...(input.bandwidthGb !== undefined ? { bandwidthGb: input.bandwidthGb } : {}),
      ...(input.websites !== undefined ? { websites: input.websites } : {}),
      ...(input.emailAccounts !== undefined ? { emailAccounts: input.emailAccounts } : {}),
      ...(input.databases !== undefined ? { databases: input.databases } : {}),
      ...(input.features !== undefined ? { features: JSON.stringify(input.features) } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  return serializePlan(plan);
}

export async function deleteHostingPlan(id: string): Promise<void> {
  await prisma.hostingPlan.delete({ where: { id } });
}

export const DEFAULT_HOSTING_PLANS: HostingPlanInput[] = [
  {
    slug: "starter",
    name: "Starter",
    tagline: "Solo practitioner",
    priceCents: 499,
    diskGb: 10,
    bandwidthGb: 100,
    websites: 1,
    emailAccounts: 5,
    databases: 1,
    features: ["10 GB SSD", "Free SSL", "5 mailboxes", "Weekly backups"],
    sortOrder: 10,
  },
  {
    slug: "business",
    name: "Business",
    tagline: "Growing immigration firm",
    priceCents: 999,
    diskGb: 50,
    bandwidthGb: 500,
    websites: 3,
    emailAccounts: 25,
    databases: 5,
    features: ["50 GB SSD", "Priority support", "25 mailboxes", "Daily backups", "hmail included"],
    isFeatured: true,
    sortOrder: 20,
  },
  {
    slug: "pro",
    name: "Pro",
    tagline: "Multi-consultant practice",
    priceCents: 1999,
    diskGb: 100,
    bandwidthGb: 1000,
    websites: 10,
    emailAccounts: 100,
    databases: 10,
    features: ["100 GB SSD", "Dedicated IP option", "100 mailboxes", "Staging sites", "All hmail add-ons eligible"],
    sortOrder: 30,
  },
];

export async function seedHostingPlans(): Promise<void> {
  for (const plan of DEFAULT_HOSTING_PLANS) {
    await prisma.hostingPlan.upsert({
      where: { slug: plan.slug },
      create: {
        slug: plan.slug,
        name: plan.name,
        tagline: plan.tagline ?? null,
        priceCents: plan.priceCents,
        billingPeriod: plan.billingPeriod ?? "monthly",
        diskGb: plan.diskGb ?? 10,
        bandwidthGb: plan.bandwidthGb ?? 100,
        websites: plan.websites ?? 1,
        emailAccounts: plan.emailAccounts ?? 5,
        databases: plan.databases ?? 1,
        features: JSON.stringify(plan.features ?? []),
        isFeatured: plan.isFeatured ?? false,
        sortOrder: plan.sortOrder ?? 0,
        isActive: true,
      },
      update: {
        name: plan.name,
        tagline: plan.tagline ?? null,
        priceCents: plan.priceCents,
        diskGb: plan.diskGb ?? 10,
        bandwidthGb: plan.bandwidthGb ?? 100,
        websites: plan.websites ?? 1,
        emailAccounts: plan.emailAccounts ?? 5,
        databases: plan.databases ?? 1,
        features: JSON.stringify(plan.features ?? []),
        isFeatured: plan.isFeatured ?? false,
        sortOrder: plan.sortOrder ?? 0,
      },
    });
  }
}
