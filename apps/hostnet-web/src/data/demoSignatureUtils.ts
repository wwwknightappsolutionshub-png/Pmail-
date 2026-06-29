import type { DemoSignature } from "./bespokeMailComposeSettings";
import { contactInitials } from "./demoMailUtils";
import { PMail_LOGO_DATA_URL, buildPmailLogoDataUrl } from "./pmailLogo";

/** User profile / topbar fallback — initials on teal circle. */
export function buildDefaultAvatarDataUrl(label: string): string {
  const initials = contactInitials(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${label}">
  <rect width="96" height="96" rx="48" fill="#0d9488"/>
  <text x="48" y="54" text-anchor="middle" font-family="system-ui,sans-serif" font-size="32" font-weight="600" fill="#ecfdf5">${initials}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Default signature avatar — PMail+ branded app icon. */
export function buildDefaultSignatureAvatarDataUrl(): string {
  return PMail_LOGO_DATA_URL;
}

function isLegacyInitialsSignatureAvatar(url: string): boolean {
  return url.includes('fill="#0d9488"') && url.includes("<text");
}

export function resolveSignatureAvatarUrl(signature: Pick<DemoSignature, "name" | "body" | "avatarUrl">): string {
  if (signature.avatarUrl) {
    if (isLegacyInitialsSignatureAvatar(signature.avatarUrl)) {
      return buildDefaultSignatureAvatarDataUrl();
    }
    return signature.avatarUrl;
  }
  return buildDefaultSignatureAvatarDataUrl();
}

export { buildPmailLogoDataUrl, PMail_LOGO_DATA_URL };

export const SIGNATURE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    if (file.size > SIGNATURE_AVATAR_MAX_BYTES) {
      reject(new Error("Image must be 2 MB or smaller."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image file."));
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}
