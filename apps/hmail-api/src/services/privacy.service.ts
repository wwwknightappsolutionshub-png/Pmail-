import { getEnv } from "../config/env.js";

export function getPublicPrivacyNotices() {
  const env = getEnv();
  return {
    version: "2025-06-17",
    leads: {
      summary:
        "We collect name, email, company, and optional message to respond to pricing inquiries. Data is stored in our platform database and visible to authorized admins.",
      retention: "Retained until converted to a tenant or manually closed by an administrator.",
      consentRequired: ["privacy"],
    },
    openTracking: {
      summary:
        "When a sender enables open tracking on outbound mail, recipients may load a 1×1 transparent image hosted by our API. This records open time and count — not location beyond standard HTTP metadata.",
      disclosure:
        "Senders should disclose tracking in their jurisdiction. Recipients can disable remote images in their mail client.",
      pixelPath: "/api/public/track/:token.gif",
      apiBase: env.PUBLIC_API_URL ?? null,
    },
    cookies: {
      summary:
        "Session cookies are used for PMail+, panel, and admin authentication. Marketing site forms do not set tracking cookies.",
    },
    contact: {
      email: env.ADMIN_DEFAULT_EMAIL,
      web: env.HOSTNET_WEB_URL,
    },
  };
}
