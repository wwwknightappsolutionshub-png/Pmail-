import { prisma } from "../lib/prisma.js";

export type BusinessVertical =
  | "standard"
  | "free-basic"
  | "legal"
  | "real-estate"
  | "accounting"
  | "recruitment"
  | "b2b-services"
  | "healthcare";

export const BUSINESS_VERTICAL_LABELS: Record<BusinessVertical, string> = {
  standard: "Standard",
  "free-basic": "Free / Basic",
  legal: "Legal & Immigration",
  "real-estate": "Real Estate",
  accounting: "Accounting",
  recruitment: "Recruitment",
  "b2b-services": "B2B Services",
  healthcare: "Healthcare",
};

const WORKSPACE_CHANGE_UPGRADE_SLUGS = ["prohost-growth-pro", "prohost-growth-agency"] as const;

const UNLOCKED_WORKSPACE_VERTICALS = new Set<BusinessVertical>(["standard", "free-basic"]);

export function isUnlockedWorkspaceVertical(vertical: BusinessVertical): boolean {
  return UNLOCKED_WORKSPACE_VERTICALS.has(vertical);
}

export function isBusinessVertical(value: string): value is BusinessVertical {
  return Object.hasOwn(BUSINESS_VERTICAL_LABELS, value);
}

export async function selectBusinessVertical(userId: string, tenantId: string, vertical: BusinessVertical) {
  const existingUser = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { businessVertical: true },
  });

  if (!existingUser) throw new Error("User not found");

  if (
    existingUser.businessVertical &&
    !UNLOCKED_WORKSPACE_VERTICALS.has(existingUser.businessVertical as BusinessVertical)
  ) {
    if (existingUser.businessVertical === vertical) {
      return prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          mailConfig: true,
          tenant: { include: { branding: true, mail: true } },
        },
      });
    }

    const upgrade = await prisma.tenantAddonSubscription.findFirst({
      where: {
        tenantId,
        status: "active",
        addon: { slug: { in: [...WORKSPACE_CHANGE_UPGRADE_SLUGS] } },
      },
    });

    if (!upgrade) {
      throw new Error(
        `Workspace is locked to ${BUSINESS_VERTICAL_LABELS[existingUser.businessVertical as BusinessVertical]}. Upgrade is required to change workspace.`,
      );
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { businessVertical: vertical },
  });

  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      mailConfig: true,
      tenant: { include: { branding: true, mail: true } },
    },
  });
}
