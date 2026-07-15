import { prisma } from "../lib/prisma.js";

export const TENANT_UI_POLICY_KEYS = {
  HIDE_MESSAGING: "workspace.messaging",
  HIDE_CONTACTS: "workspace.contacts",
  HIDE_CRM: "workspace.crm",
  PLATFORM_TOOLS_COLLAPSED: "sidebar.platformToolsCollapsed",
} as const;

export type TenantUiPolicyKey = (typeof TENANT_UI_POLICY_KEYS)[keyof typeof TENANT_UI_POLICY_KEYS];

export type TenantUiPolicySnapshot = {
  hiddenWorkspaces: Array<"messaging" | "contacts" | "crm">;
  platformToolsCollapsed: boolean;
};

export const SOFTWIRE_ACCOUNTANT_EMAIL_DOMAIN = "softwire-accountant.ae";

const WORKSPACE_KEY_MAP: Record<string, "messaging" | "contacts" | "crm"> = {
  [TENANT_UI_POLICY_KEYS.HIDE_MESSAGING]: "messaging",
  [TENANT_UI_POLICY_KEYS.HIDE_CONTACTS]: "contacts",
  [TENANT_UI_POLICY_KEYS.HIDE_CRM]: "crm",
};

const SOFTWIRE_HIDDEN_WORKSPACES: Array<"messaging" | "contacts" | "crm"> = [
  "messaging",
  "contacts",
  "crm",
];

export function isSoftwireAccountantEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized.endsWith(`@${SOFTWIRE_ACCOUNTANT_EMAIL_DOMAIN}`);
}

function mergeHiddenWorkspaces(
  base: Array<"messaging" | "contacts" | "crm">,
  extra: Array<"messaging" | "contacts" | "crm">,
): Array<"messaging" | "contacts" | "crm"> {
  const merged = [...base];
  for (const workspace of extra) {
    if (!merged.includes(workspace)) merged.push(workspace);
  }
  return merged;
}

export async function getActiveTenantUiPolicies(
  tenantId: string,
  userEmail?: string | null,
): Promise<TenantUiPolicySnapshot> {
  const now = new Date();
  const policies = await prisma.tenantUiPolicy.findMany({
    where: {
      tenantId,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
  });

  const hiddenWorkspaces: Array<"messaging" | "contacts" | "crm"> = [];

  for (const policy of policies) {
    if (policy.policyKey === TENANT_UI_POLICY_KEYS.PLATFORM_TOOLS_COLLAPSED) {
      continue;
    }
    const workspace = WORKSPACE_KEY_MAP[policy.policyKey];
    if (workspace && !hiddenWorkspaces.includes(workspace)) {
      hiddenWorkspaces.push(workspace);
    }
  }

  // Durable Softwire rule: any mailbox on this domain hides Contacts / Messaging / CRM.
  if (isSoftwireAccountantEmail(userEmail)) {
    return {
      hiddenWorkspaces: mergeHiddenWorkspaces(hiddenWorkspaces, SOFTWIRE_HIDDEN_WORKSPACES),
      // Platform tools collapse globally for every tenant.
      platformToolsCollapsed: true,
    };
  }

  return {
    hiddenWorkspaces,
    // Global product default: Platform tools starts collapsed for all users.
    platformToolsCollapsed: true,
  };
}

export async function isTenantUiFeatureHidden(
  tenantId: string,
  policyKey: TenantUiPolicyKey,
  userEmail?: string | null,
): Promise<boolean> {
  if (
    isSoftwireAccountantEmail(userEmail) &&
    (policyKey === TENANT_UI_POLICY_KEYS.HIDE_MESSAGING ||
      policyKey === TENANT_UI_POLICY_KEYS.HIDE_CONTACTS ||
      policyKey === TENANT_UI_POLICY_KEYS.HIDE_CRM)
  ) {
    return true;
  }

  const now = new Date();
  const policy = await prisma.tenantUiPolicy.findFirst({
    where: {
      tenantId,
      policyKey,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    select: { id: true },
  });
  return Boolean(policy);
}
