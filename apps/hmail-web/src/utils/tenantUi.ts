import type { AuthUser } from "../types/mail";

export const SOFTWIRE_ACCOUNTANT_EMAIL_DOMAIN = "softwire-accountant.ae";

export type HiddenWorkspace = "messaging" | "contacts" | "crm";

export type TenantUiSnapshot = {
  hiddenWorkspaces: HiddenWorkspace[];
  platformToolsCollapsed: boolean;
};

export function isSoftwireAccountantEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized.endsWith(`@${SOFTWIRE_ACCOUNTANT_EMAIL_DOMAIN}`);
}

export function resolveTenantUi(user: AuthUser | null | undefined): TenantUiSnapshot {
  const mailbox = user?.activeMailAccount?.email ?? user?.email ?? "";
  const fromApi = user?.tenantUi?.hiddenWorkspaces ?? [];
  const hidden = new Set<HiddenWorkspace>(fromApi);

  if (isSoftwireAccountantEmail(mailbox)) {
    hidden.add("messaging");
    hidden.add("contacts");
    hidden.add("crm");
  }

  return {
    hiddenWorkspaces: Array.from(hidden),
    // Global default: Platform tools auto-collapses on load for every user.
    platformToolsCollapsed: true,
  };
}
