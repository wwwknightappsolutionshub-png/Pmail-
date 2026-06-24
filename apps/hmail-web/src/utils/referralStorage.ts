export const REFERRAL_REF_STORAGE_KEY = "pmail_referral_ref";

export function persistReferralRef(ref: string | null | undefined): void {
  const trimmed = ref?.trim();
  if (trimmed?.includes("@")) {
    sessionStorage.setItem(REFERRAL_REF_STORAGE_KEY, trimmed);
  }
}

export function readReferralRef(searchParamRef: string | null): string | undefined {
  const stored = sessionStorage.getItem(REFERRAL_REF_STORAGE_KEY);
  const fromQuery = searchParamRef?.trim();
  const candidate = stored ?? fromQuery;
  return candidate?.includes("@") ? candidate : undefined;
}

export function clearReferralRef(): void {
  sessionStorage.removeItem(REFERRAL_REF_STORAGE_KEY);
}
