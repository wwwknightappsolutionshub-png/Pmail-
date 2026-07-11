/** Shared launch-page CTA / WhatsApp helpers for /pmail-launch */

export const PMAIL_WHATSAPP_E164 = "447756183484";

const EXIT_MESSAGE = "I will like to know more about Pmail+";

export const PMAIL_WHATSAPP_HELP_URL = `https://wa.me/${PMAIL_WHATSAPP_E164}`;

export const PMAIL_WHATSAPP_EXIT_URL = `https://wa.me/${PMAIL_WHATSAPP_E164}?text=${encodeURIComponent(EXIT_MESSAGE)}`;

const PRIMARY_CTA_KEY = "pmail-launch-primary-cta";
const EXIT_WA_KEY = "pmail-launch-exit-wa-fired";

export function markPrimaryCtaEngaged() {
  try {
    sessionStorage.setItem(PRIMARY_CTA_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasPrimaryCtaEngaged() {
  try {
    return sessionStorage.getItem(PRIMARY_CTA_KEY) === "1";
  } catch {
    return false;
  }
}

/** Open WhatsApp once per session when the visitor leaves without Start / Demo. */
export function triggerExitWhatsApp() {
  try {
    if (hasPrimaryCtaEngaged()) return false;
    if (sessionStorage.getItem(EXIT_WA_KEY) === "1") return false;
    sessionStorage.setItem(EXIT_WA_KEY, "1");
  } catch {
    /* still attempt open */
  }
  window.open(PMAIL_WHATSAPP_EXIT_URL, "_blank", "noopener,noreferrer");
  return true;
}
