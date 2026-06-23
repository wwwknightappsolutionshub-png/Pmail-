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
        "When a sender enables open tracking on outbound mail, recipients may load a 1×1 transparent image hosted by our API. This records open time and count — not location beyond standard HTTP metadata. HTTP links in tracked HTML mail are rewritten to pass through our redirect endpoint, which records click counts before forwarding to the original destination.",
      disclosure:
        "Senders should disclose tracking in their jurisdiction. Recipients can disable remote images in their mail client.",
      pixelPath: "/api/public/track/:token.gif",
      linkClickPath: "/api/public/track/link/:token",
      apiBase: env.PUBLIC_API_URL ?? null,
    },
    fileVault: {
      summary:
        "When a sender uses the File Vault add-on, large files are stored on our servers and shared via tokenized download links embedded in outbound mail. Downloads are counted and links expire after a configured retention period.",
      disclosure: "Recipients should verify sender identity before downloading vault links.",
      downloadPath: "/api/public/vault/:token",
      apiBase: env.PUBLIC_API_URL ?? null,
    },
    esign: {
      summary:
        "When a sender uses the E-Sign from Email add-on, documents are stored on our servers for signature workflows via Dropbox Sign. Tokenized download links may be shared for document copies; downloads are counted and links expire after a configured retention period.",
      disclosure: "Recipients should verify sender identity before opening signing or download links.",
      downloadPath: "/api/public/esign/:token",
      apiBase: env.PUBLIC_API_URL ?? null,
    },
    emailSla: {
      summary:
        "When a sender uses the Email SLA Tracker add-on, inbound thread metadata and exported CSV reports may be stored on our servers. Report downloads use tokenized links with expiry and download counts.",
      disclosure: "Report links should be treated as sensitive operational data.",
      downloadPath: "/api/public/sla-report/:token",
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
