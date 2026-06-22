import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { getEnv } from "../config/env.js";
import { getPublicApiBaseUrl } from "../lib/public-url.js";
import type { Request } from "express";
import { renderEmailTemplate } from "./email-template.service.js";
import { sendTemplatedPlatformEmail, notifyInternalAddress } from "./platform-email.service.js";

const PACKAGE_PLANS = ["launch", "business", "pro"] as const;
export type HostingPackagePlan = (typeof PACKAGE_PLANS)[number];

const PLAN_LABELS: Record<HostingPackagePlan, string> = {
  launch: "Launch",
  business: "Business",
  pro: "Pro",
};

function isValidPlan(plan: string): plan is HostingPackagePlan {
  return PACKAGE_PLANS.includes(plan as HostingPackagePlan);
}

function packageSelectUrl(baseUrl: string, token: string, plan: HostingPackagePlan): string {
  return `${baseUrl}/api/public/membership/package-select/${encodeURIComponent(token)}/${plan}`;
}

export function buildHostingPackageEmailVariables(
  fullName: string,
  token: string,
  req?: Request,
): Record<string, string> {
  const baseUrl = getPublicApiBaseUrl(req);
  const env = getEnv();
  const whatsappText = encodeURIComponent(
    `Hi Prohost Cloud — I just signed up as ${fullName} and have a question about hosting packages.`,
  );
  return {
    fullName,
    launchUrl: packageSelectUrl(baseUrl, token, "launch"),
    businessUrl: packageSelectUrl(baseUrl, token, "business"),
    proUrl: packageSelectUrl(baseUrl, token, "pro"),
    panelLoginUrl: `${env.HOSTNET_WEB_URL}/panel/login`,
    whatsappUrl: `https://wa.me/447756183484?text=${whatsappText}`,
  };
}

export async function sendHostingPackageSelectionEmail(applicationId: string, req?: Request): Promise<void> {
  const app = await prisma.membershipApplication.findUnique({ where: { id: applicationId } });
  if (!app || app.hostingPackageEmailSentAt) return;

  const token = app.packageSelectionToken || randomUUID();
  if (!app.packageSelectionToken) {
    await prisma.membershipApplication.update({
      where: { id: app.id },
      data: { packageSelectionToken: token },
    });
  }

  await sendTemplatedPlatformEmail({
    to: app.workEmail,
    templateSlug: "hosting-package-selection",
    variables: buildHostingPackageEmailVariables(app.fullName, token, req),
  });

  await prisma.membershipApplication.update({
    where: { id: app.id },
    data: { hostingPackageEmailSentAt: new Date() },
  });
}

export async function processPendingHostingPackageEmails(): Promise<number> {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000);
  const pending = await prisma.membershipApplication.findMany({
    where: {
      hostingPackageEmailSentAt: null,
      createdAt: { lte: cutoff },
      status: { in: ["demo_sent", "new"] },
    },
    take: 25,
  });

  for (const app of pending) {
    try {
      await sendHostingPackageSelectionEmail(app.id);
    } catch (err) {
      console.error("[membership-package] failed to send for", app.id, err);
    }
  }

  return pending.length;
}

export async function selectHostingPackage(token: string, plan: string) {
  if (!isValidPlan(plan)) {
    throw new Error("Invalid hosting package");
  }

  const app = await prisma.membershipApplication.findUnique({
    where: { packageSelectionToken: token },
  });
  if (!app) throw new Error("Application not found or link expired");

  if (app.selectedHostingPackage) {
    return { alreadySelected: true, plan: app.selectedHostingPackage as HostingPackagePlan, fullName: app.fullName };
  }

  const updated = await prisma.membershipApplication.update({
    where: { id: app.id },
    data: {
      selectedHostingPackage: plan,
      packageSelectedAt: new Date(),
    },
  });

  const planLabel = PLAN_LABELS[plan];

  await sendTemplatedPlatformEmail({
    to: app.workEmail,
    templateSlug: "hosting-package-thank-you",
    variables: {
      fullName: app.fullName,
      planName: planLabel,
      panelLoginUrl: `${getEnv().HOSTNET_WEB_URL}/panel/login`,
    },
  }).catch(async () => {
    const rendered = await renderEmailTemplate("membership-welcome", {
      fullName: app.fullName,
      workEmail: app.workEmail,
      demoUsername: app.demoUsername ?? "",
      demoDomain: app.demoDomain ?? "",
      demoPassword: "",
      panelLoginUrl: `${getEnv().HOSTNET_WEB_URL}/panel/login`,
    });
    await notifyInternalAddress(app.workEmail, `Thank you — ${planLabel} selected`, rendered.html);
  });

  const adminHtml = `
    <p><strong>Hosting package selected</strong></p>
    <p>${app.fullName} &lt;${app.workEmail}&gt; chose <strong>${planLabel}</strong>.</p>
    <p>Application ID: ${app.id}</p>
    <p>Scale: ${app.hostingScale} · Team: ${app.teamType}</p>
  `;
  await notifyInternalAddress("help@prohost.cloud", `Package selected: ${planLabel} — ${app.fullName}`, adminHtml);

  return { alreadySelected: false, plan, fullName: updated.fullName };
}

export function renderPackageThankYouPage(fullName: string, plan: string, alreadySelected: boolean): string {
  const planLabel = isValidPlan(plan) ? PLAN_LABELS[plan] : plan;
  const env = getEnv();
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Thank you — Prohost Cloud</title>
<style>
body{margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:#f0fdfa;color:#0f172a;display:grid;place-items:center;min-height:100vh;padding:24px}
.card{max-width:480px;background:#fff;border-radius:16px;border:1px solid #99f6e4;padding:32px 28px;text-align:center;box-shadow:0 12px 40px rgba(13,148,136,.15)}
.brand{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#0d9488;margin:0 0 8px}
h1{margin:0 0 12px;font-size:1.5rem}
p{margin:0 0 20px;color:#64748b;line-height:1.55}
.btn{display:inline-block;padding:12px 24px;background:#0d9488;color:#fff!important;text-decoration:none;border-radius:10px;font-weight:700}
.note{font-size:13px;margin-top:16px}
</style></head><body>
<div class="card">
<p class="brand">Prohost Cloud</p>
<h1>Thank you, ${fullName}!</h1>
<p>${alreadySelected ? `Your <strong>${planLabel}</strong> package was already recorded.` : `We received your <strong>${planLabel}</strong> package selection.`} Our team will follow up shortly to complete provisioning.</p>
<a class="btn" href="${env.HOSTNET_WEB_URL}/panel/login">Open your panel</a>
<p class="note muted">Questions? WhatsApp us at +44 7756 183484</p>
</div></body></html>`;
}
