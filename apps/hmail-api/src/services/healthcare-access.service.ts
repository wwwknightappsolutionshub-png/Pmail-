export type HealthcareAccessRole = "admin" | "clinician" | "billing" | "readonly";

const ROLE_RANK: Record<HealthcareAccessRole, number> = {
  readonly: 1,
  billing: 2,
  clinician: 3,
  admin: 4,
};

const ROUTE_MIN_ROLE: Record<string, HealthcareAccessRole> = {
  "hc-patient-registry": "clinician",
  "hc-appointment-desk": "clinician",
  "hc-referral-tracker": "clinician",
  "hc-hipaa-audit": "admin",
};

export function resolveHealthcareRole(userRole: string | null | undefined): HealthcareAccessRole {
  if (userRole === "admin" || userRole === "clinician" || userRole === "billing" || userRole === "readonly") {
    return userRole;
  }
  return "clinician";
}

export function healthcareRoleAllows(userRole: string | null | undefined, addonSlug: string): boolean {
  const required = ROUTE_MIN_ROLE[addonSlug] ?? "readonly";
  const actual = resolveHealthcareRole(userRole);
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export function assertHealthcareAccess(userRole: string | null | undefined, addonSlug: string): void {
  if (!healthcareRoleAllows(userRole, addonSlug)) {
    throw new Error("Insufficient healthcare access role for this action");
  }
}
