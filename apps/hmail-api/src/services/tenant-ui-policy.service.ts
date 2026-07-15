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

const WORKSPACE_KEY_MAP: Record<string, "messaging" | "contacts" | "crm"> = {
  [TENANT_UI_POLICY_KEYS.HIDE_MESSAGING]: "messaging",
  [TENANT_UI_POLICY_KEYS.HIDE_CONTACTS]: "contacts",
  [TENANT_UI_POLICY_KEYS.HIDE_CRM]: "crm",
};

export async function getActiveTenantUiPolicies(tenantId: string): Promise<TenantUiPolicySnapshot> {
  const now = new Date();
  const policies = await prisma.tenantUiPolicy.findMany({
    where: {
      tenantId,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
  });

  const hiddenWorkspaces: Array<"messaging" | "contacts" | "crm"> = [];
  let platformToolsCollapsed = false;

  for (const policy of policies) {
    if (policy.policyKey === TENANT_UI_POLICY_KEYS.PLATFORM_TOOLS_COLLAPSED) {
      platformToolsCollapsed = true;
      continue;
    }
    const workspace = WORKSPACE_KEY_MAP[policy.policyKey];
    if (workspace && !hiddenWorkspaces.includes(workspace)) {
      hiddenWorkspaces.push(workspace);
    }
  }

  return { hiddenWorkspaces, platformToolsCollapsed };
}

export async function isTenantUiFeatureHidden(tenantId: string, policyKey: TenantUiPolicyKey): Promise<boolean> {
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
