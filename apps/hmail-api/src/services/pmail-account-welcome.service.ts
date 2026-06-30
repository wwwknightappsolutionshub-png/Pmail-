import {
  ADDON_CATALOG,
  PANEL_WORKSPACE_WELCOME_TRIAL_SLUGS,
  getCatalogEntry,
} from "../data/addon-catalog.js";
import { ADDON_VERTICAL_LABELS, ADDON_VERTICAL_ORDER, type AddonVertical } from "../data/addon-verticals.js";
import { prisma } from "../lib/prisma.js";
import { sendPmailAccountWelcomeEmail } from "./addon-email.service.js";

const VERTICAL_ADDON_VERTICALS = ADDON_VERTICAL_ORDER.filter((vertical) => vertical !== "platform");

function buildWorkspaceAddonsList(): { text: string; html: string } {
  const names = PANEL_WORKSPACE_WELCOME_TRIAL_SLUGS.map((slug) => getCatalogEntry(slug)?.name ?? slug);
  const unique = [...new Set(names)];
  return {
    text: unique.map((name) => `• ${name}`).join("\n"),
    html: `<ul>${unique.map((name) => `<li>${name}</li>`).join("")}</ul>`,
  };
}

function buildVerticalAddonsList(): { text: string; html: string } {
  const textLines: string[] = [];
  const htmlSections: string[] = [];

  for (const vertical of VERTICAL_ADDON_VERTICALS) {
    const label = ADDON_VERTICAL_LABELS[vertical as AddonVertical];
    const products = ADDON_CATALOG.filter((entry) => entry.vertical === vertical && !entry.comingSoon)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((entry) => entry.name);
    if (products.length === 0) continue;
    textLines.push(`${label}:`);
    textLines.push(...products.map((name) => `  • ${name}`));
    htmlSections.push(
      `<p><strong>${label}</strong></p><ul>${products.map((name) => `<li>${name}</li>`).join("")}</ul>`,
    );
  }

  return {
    text: textLines.join("\n"),
    html: htmlSections.join(""),
  };
}

export function getPmailWelcomeAddonLists(): {
  workspaceAddonsList: string;
  verticalAddonsList: string;
  workspaceAddonsHtml: string;
  verticalAddonsHtml: string;
} {
  const workspace = buildWorkspaceAddonsList();
  const vertical = buildVerticalAddonsList();
  return {
    workspaceAddonsList: workspace.text,
    verticalAddonsList: vertical.text,
    workspaceAddonsHtml: workspace.html,
    verticalAddonsHtml: vertical.html,
  };
}

/** Send the branded PMail+ welcome email once per user on first sign-in. */
export async function ensurePmailAccountWelcomeEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      tenantId: true,
      displayName: true,
      pmailAccountWelcomeEmailSent: true,
      prospectDemoExpiresAt: true,
    },
  });
  if (!user || user.pmailAccountWelcomeEmailSent) return;
  if (user.prospectDemoExpiresAt) return;

  const priorSend = await prisma.addonEmailLog.findFirst({
    where: {
      tenantId: user.tenantId,
      userEmail: user.email,
      emailType: "pmail_account_welcome",
    },
  });
  if (priorSend) {
    await prisma.user.update({
      where: { id: userId },
      data: { pmailAccountWelcomeEmailSent: true },
    });
    return;
  }

  const sent = await sendPmailAccountWelcomeEmail({
    tenantId: user.tenantId,
    userEmail: user.email,
    fullName: user.displayName?.trim() || user.email.split("@")[0] || "there",
    ...getPmailWelcomeAddonLists(),
  });
  if (!sent) return;

  await prisma.user.update({
    where: { id: userId },
    data: { pmailAccountWelcomeEmailSent: true },
  });
}
