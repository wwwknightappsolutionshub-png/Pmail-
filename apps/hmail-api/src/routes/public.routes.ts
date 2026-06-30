import { Router } from "express";
import { existsSync } from "node:fs";
import { listPublishedAddonMarketing } from "../services/addon-marketing.service.js";
import { listPublishedSections } from "../services/cms.service.js";
import { listPublicHostingPlans } from "../services/hosting-plans.service.js";
import { getPublicPanelPreview } from "../services/public-panel.service.js";
import {
  getBespokeDemoWorkspace,
  saveBespokeDemoWorkspace,
} from "../services/bespoke-demo.service.js";
import { createMarketingLead, listMarketingLeads } from "../services/marketing-leads.service.js";
import {
  completeTenantMailOnboarding,
  getTenantMailOnboardingStatus,
  testMailProviderConnection,
} from "../services/mail-onboarding.service.js";
import { recordTrackingOpen, recordLinkClick } from "../services/tracking.service.js";
import {
  recordAddonEducationClick,
  recordAddonEducationOpen,
} from "../services/addon-education-drip.service.js";
import { recordVaultDownload } from "../services/file-vault.service.js";
import { recordEsignDownload } from "../services/esign.service.js";
import { recordSlaReportDownload } from "../services/email-sla.service.js";
import { markReferralLeadBounced } from "../services/referral-lead.service.js";
import { registerPmailProspect } from "../services/pmail-prospect.service.js";
import { getEnv } from "../config/env.js";
import { getPublicPrivacyNotices } from "../services/privacy.service.js";
import { getActivePublicForms } from "../services/form-definition.service.js";
import { submitMembershipApplication } from "../services/membership.service.js";
import { submitInquiry } from "../services/inquiry.service.js";
import { verifyRecaptchaToken, RecaptchaError } from "../services/recaptcha.service.js";
import {
  listPublishedFeaturedTestimonials,
  submitVisitorTestimonial,
} from "../services/testimonial.service.js";
import {
  renderPackageThankYouPage,
  selectHostingPackage,
} from "../services/membership-package.service.js";
import {
  getPublicGrowthCaptureForm,
  submitPublicGrowthLead,
} from "../services/growth-public-capture.service.js";
import {
  getPublicGrowthChatbot,
  startPublicGrowthChat,
  submitPublicGrowthChatReply,
} from "../services/growth-public-chat.service.js";
import { recordPublicGrowthAnalyticsEvent } from "../services/growth-public-analytics.service.js";
import { resolveMarketingAssetFile } from "../services/marketing-asset.service.js";
import { getPmailClientRefreshAt } from "../services/pmail-platform-config.service.js";
import {
  buildPublicSitemapXml,
  getPublicHomeSeo,
  listPublicSitemapPaths,
  resolvePublicSiteOrigin,
} from "../services/public-sitemap.service.js";
import {
  getPublishedPlatformArticleBySlug,
  listPublishedPlatformArticles,
} from "../services/platform-marketing-article.service.js";
import { getPlatformSeoPublicConfig } from "../services/platform-seo.service.js";

export const publicRouter = Router();

publicRouter.get("/pmail-client-refresh", async (_req, res, next) => {
  try {
    const refreshAt = await getPmailClientRefreshAt();
    res.setHeader("Cache-Control", "no-store");
    res.json({ refreshAt });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/sitemap.xml", async (_req, res, next) => {
  try {
    const xml = await buildPublicSitemapXml();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/sitemap-paths", async (_req, res, next) => {
  try {
    const origin = resolvePublicSiteOrigin();
    const paths = await listPublicSitemapPaths();
    res.json({ origin, paths });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/site-seo", async (_req, res, next) => {
  try {
    const [seo, platformSeo] = await Promise.all([getPublicHomeSeo(), getPlatformSeoPublicConfig()]);
    res.json({ seo, platformSeo });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/articles", async (_req, res, next) => {
  try {
    const articles = await listPublishedPlatformArticles();
    res.json({ articles });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/articles/:slug", async (req, res, next) => {
  try {
    const article = await getPublishedPlatformArticleBySlug(String(req.params.slug));
    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }
    res.json({ article });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/marketing/assets/:fileName", (req, res) => {
  const filePath = resolveMarketingAssetFile(String(req.params.fileName ?? ""));
  if (!filePath || !existsSync(filePath)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendFile(filePath);
});

publicRouter.get("/site", async (_req, res, next) => {
  try {
    const [sections, hostingPlans, addonMarketing, panelPreview] = await Promise.all([
      listPublishedSections(),
      listPublicHostingPlans(),
      listPublishedAddonMarketing(),
      getPublicPanelPreview(),
    ]);
    res.json({ sections, hostingPlans, addonMarketing, panelPreview });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/panel-preview", async (_req, res, next) => {
  try {
    const panelPreview = await getPublicPanelPreview();
    res.json({ panelPreview });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/sections", async (_req, res, next) => {
  try {
    const sections = await listPublishedSections();
    res.json({ sections });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/hosting-plans", async (_req, res, next) => {
  try {
    const hostingPlans = await listPublicHostingPlans();
    res.json({ hostingPlans });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/addon-marketing", async (_req, res, next) => {
  try {
    const addonMarketing = await listPublishedAddonMarketing();
    res.json({ addonMarketing });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/testimonials", async (_req, res, next) => {
  try {
    const testimonials = await listPublishedFeaturedTestimonials();
    res.json({ testimonials });
  } catch (err) {
    next(err);
  }
});

publicRouter.post("/testimonials", async (req, res, next) => {
  try {
    await verifyRecaptchaToken(String(req.body?.captchaToken ?? ""), req.ip);
    const testimonial = await submitVisitorTestimonial({
      authorName: String(req.body?.authorName ?? ""),
      authorRole: req.body?.authorRole ? String(req.body.authorRole) : undefined,
      company: req.body?.company ? String(req.body.company) : undefined,
      body: String(req.body?.body ?? ""),
      rating: Number(req.body?.rating ?? 5),
    });
    res.status(201).json({
      testimonial: { id: testimonial.id },
      message: "Thank you — your review will appear after moderation.",
    });
  } catch (err) {
    if (err instanceof RecaptchaError || err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

publicRouter.get("/membership/package-select/:token/:plan", async (req, res, next) => {
  try {
    const result = await selectHostingPackage(req.params.token, req.params.plan);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderPackageThankYouPage(result.fullName, result.plan, result.alreadySelected));
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(
        `<!DOCTYPE html><html><body style="font-family:system-ui;padding:2rem;text-align:center"><h1>Link unavailable</h1><p>${err.message}</p></body></html>`,
      );
      return;
    }
    next(err);
  }
});

publicRouter.get("/bespoke-demo/:useCaseId/workspace", async (req, res, next) => {
  try {
    const sessionKey = String(req.header("x-demo-session") ?? "");
    const state = await getBespokeDemoWorkspace(req.params.useCaseId, sessionKey);
    res.json({ state });
  } catch (err) {
    next(err);
  }
});

publicRouter.put("/bespoke-demo/:useCaseId/workspace", async (req, res, next) => {
  try {
    const sessionKey = String(req.header("x-demo-session") ?? "");
    const state = req.body?.state;
    if (!state || typeof state !== "object") {
      res.status(400).json({ error: "Missing state object" });
      return;
    }
    await saveBespokeDemoWorkspace(req.params.useCaseId, sessionKey, state);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/privacy", (_req, res) => {
  res.json(getPublicPrivacyNotices());
});

publicRouter.get("/forms", async (_req, res, next) => {
  try {
    const forms = await getActivePublicForms();
    res.json({ forms });
  } catch (err) {
    next(err);
  }
});

function parseAttribution(body: Record<string, unknown>) {
  return {
    utmSource: body.utmSource ? String(body.utmSource) : undefined,
    utmMedium: body.utmMedium ? String(body.utmMedium) : undefined,
    utmCampaign: body.utmCampaign ? String(body.utmCampaign) : undefined,
    referrer: body.referrer ? String(body.referrer) : undefined,
    referralRef: body.referralRef ? String(body.referralRef) : body.ref ? String(body.ref) : undefined,
  };
}

publicRouter.post("/membership/register", async (req, res, next) => {
  try {
    await verifyRecaptchaToken(String(req.body?.captchaToken ?? ""), req.ip);
    const application = await submitMembershipApplication({
      payload: (req.body?.payload ?? req.body) as Record<string, unknown>,
      consentPrivacy: Boolean(req.body?.consentPrivacy),
      attribution: parseAttribution((req.body ?? {}) as Record<string, unknown>),
    });
    res.status(201).json({ application: { id: application.id, status: application.status } });
  } catch (err) {
    if (err instanceof RecaptchaError || err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

publicRouter.post("/inquiries", async (req, res, next) => {
  try {
    await verifyRecaptchaToken(String(req.body?.captchaToken ?? ""), req.ip);
    const inquiry = await submitInquiry({
      payload: (req.body?.payload ?? req.body) as Record<string, unknown>,
      attribution: parseAttribution((req.body ?? {}) as Record<string, unknown>),
    });
    res.status(201).json({ inquiry: { id: inquiry.id, status: inquiry.status } });
  } catch (err) {
    if (err instanceof RecaptchaError || err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

publicRouter.post("/leads", async (req, res, next) => {
  try {
    const lead = await createMarketingLead({
      fullName: String(req.body?.fullName ?? ""),
      email: String(req.body?.email ?? ""),
      company: String(req.body?.company ?? ""),
      teamSize: req.body?.teamSize ? String(req.body.teamSize) : undefined,
      message: req.body?.message ? String(req.body.message) : undefined,
      consentPrivacy: Boolean(req.body?.consentPrivacy),
      consentContact: Boolean(req.body?.consentContact),
    });
    res.status(201).json({ lead: { id: lead.id } });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

publicRouter.post("/prospects/register", async (req, res, next) => {
  try {
    const attribution = parseAttribution((req.body ?? {}) as Record<string, unknown>);
    const referrerEmail =
      attribution.referralRef?.includes("@") ? attribution.referralRef : undefined;
    const prospect = await registerPmailProspect({
      tenantSlug: req.body?.tenantSlug ? String(req.body.tenantSlug) : undefined,
      fullName: String(req.body?.fullName ?? ""),
      email: String(req.body?.email ?? ""),
      company: req.body?.company ? String(req.body.company) : undefined,
      referrerEmail,
      consentPrivacy: Boolean(req.body?.consentPrivacy),
    });
    res.status(201).json({ prospect });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

publicRouter.get("/onboarding/:tenantSlug/mail", async (req, res, next) => {
  try {
    const status = await getTenantMailOnboardingStatus(req.params.tenantSlug);
    res.json(status);
  } catch (err) {
    if (err instanceof Error) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

publicRouter.put("/onboarding/:tenantSlug/mail", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const mail = await completeTenantMailOnboarding(
      req.params.tenantSlug,
      {
        imapHost: String(body.imapHost ?? ""),
        imapPort: Number(body.imapPort ?? 993),
        imapSecure: Boolean(body.imapSecure ?? true),
        smtpHost: String(body.smtpHost ?? ""),
        smtpPort: Number(body.smtpPort ?? 465),
        smtpSecure: Boolean(body.smtpSecure ?? true),
      },
      body.testEmail && body.testPassword
        ? { email: String(body.testEmail), password: String(body.testPassword) }
        : undefined,
    );
    res.json({
      ok: true,
      mailOnboardingComplete: mail.mailOnboardingComplete,
      mail: {
        imapHost: mail.imapHost,
        imapPort: mail.imapPort,
        imapSecure: mail.imapSecure,
        smtpHost: mail.smtpHost,
        smtpPort: mail.smtpPort,
        smtpSecure: mail.smtpSecure,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

publicRouter.post("/onboarding/:tenantSlug/mail/test", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    await testMailProviderConnection(
      {
        imapHost: String(body.imapHost ?? ""),
        imapPort: Number(body.imapPort ?? 993),
        imapSecure: Boolean(body.imapSecure ?? true),
        smtpHost: String(body.smtpHost ?? ""),
        smtpPort: Number(body.smtpPort ?? 465),
        smtpSecure: Boolean(body.smtpSecure ?? true),
      },
      String(body.testEmail ?? ""),
      String(body.testPassword ?? ""),
    );
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// 1x1 transparent GIF for open tracking
const TRACKING_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  "base64",
);

publicRouter.get("/education/track/:token.gif", async (req, res, next) => {
  try {
    const token = String(req.params.token).replace(/\.gif$/, "");
    await recordAddonEducationOpen(token);
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("X-Tracking-Notice", "Education open-tracking pixel; see /api/public/privacy");
    res.send(TRACKING_GIF);
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/education/click/:token", async (req, res, next) => {
  try {
    const destination = await recordAddonEducationClick(String(req.params.token));
    if (!destination) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("X-Tracking-Notice", "Education link-click redirect; see /api/public/privacy");
    res.redirect(302, destination);
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/track/:token.gif", async (req, res, next) => {
  try {
    const token = String(req.params.token).replace(/\.gif$/, "");
    await recordTrackingOpen(token);
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("X-Tracking-Notice", "Open-tracking pixel; see /api/public/privacy");
    res.send(TRACKING_GIF);
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/track/link/:token", async (req, res, next) => {
  try {
    const destination = await recordLinkClick(String(req.params.token));
    if (!destination) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("X-Tracking-Notice", "Link-click redirect; see /api/public/privacy");
    res.redirect(302, destination);
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/vault/:token", async (req, res, next) => {
  try {
    const file = await recordVaultDownload(String(req.params.token));
    if (!file) {
      res.status(404).json({ error: "Download link not found or expired" });
      return;
    }
    const safeName = file.originalName.replace(/[^\w.\-()+\s]/g, "_");
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("X-Tracking-Notice", "File vault download; see /api/public/privacy");
    res.send(file.buffer);
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/esign/:token", async (req, res, next) => {
  try {
    const file = await recordEsignDownload(String(req.params.token));
    if (!file) {
      res.status(404).json({ error: "Download link not found or expired" });
      return;
    }
    const safeName = file.documentName.replace(/[^\w.\-()+\s]/g, "_");
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("X-Tracking-Notice", "E-sign document download; see /api/public/privacy");
    res.send(file.buffer);
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/sla-report/:token", async (req, res, next) => {
  try {
    const file = await recordSlaReportDownload(String(req.params.token));
    if (!file) {
      res.status(404).json({ error: "Download link not found or expired" });
      return;
    }
    const safeName = file.fileName.replace(/[^\w.\-()+\s]/g, "_");
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("X-Tracking-Notice", "Email SLA report download; see /api/public/privacy");
    res.send(file.buffer);
  } catch (err) {
    next(err);
  }
});

publicRouter.post("/webhooks/mail-bounce", async (req, res, next) => {
  try {
    const env = getEnv();
    const secret = process.env.BOUNCE_WEBHOOK_SECRET?.trim();
    if (secret && req.get("x-bounce-webhook-secret") !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body as {
      email?: string;
      recipientEmail?: string;
      messageId?: string;
      smtpMessageId?: string;
      event?: string;
      bounceType?: string;
    };
    const event = String(body.event ?? body.bounceType ?? "bounce").toLowerCase();
    if (!event.includes("bounce")) {
      res.status(400).json({ error: "Unsupported webhook event" });
      return;
    }

    const recipientEmail = String(body.recipientEmail ?? body.email ?? "").trim();
    if (!recipientEmail.includes("@")) {
      res.status(400).json({ error: "recipientEmail is required" });
      return;
    }

    const result = await markReferralLeadBounced({
      recipientEmail,
      smtpMessageId: body.smtpMessageId ?? body.messageId ?? null,
    });

    if (env.NODE_ENV === "development") {
      console.info(`[bounce-webhook] ${recipientEmail} → updated=${result.updated}`);
    }

    res.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

publicRouter.get("/growth/:tenantSlug/capture-form", async (req, res, next) => {
  try {
    const form = await getPublicGrowthCaptureForm(String(req.params.tenantSlug));
    if (!form) {
      res.status(404).json({ error: "Capture form not available" });
      return;
    }
    res.json(form);
  } catch (err) {
    next(err);
  }
});

publicRouter.post("/growth/:tenantSlug/leads", async (req, res, next) => {
  try {
    const body = req.body as {
      payload?: Record<string, unknown>;
      source?: string;
      sourcePage?: string;
      attribution?: Record<string, unknown>;
    };
    if (!body.payload || typeof body.payload !== "object") {
      res.status(400).json({ error: "payload is required" });
      return;
    }
    const result = await submitPublicGrowthLead(String(req.params.tenantSlug), {
      payload: body.payload,
      source: body.source,
      sourcePage: body.sourcePage,
      attribution: body.attribution,
    });
    res.status(201).json({ ok: true, leadId: result.lead.id, score: result.lead.score });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

publicRouter.get("/growth/:tenantSlug/chatbot", async (req, res, next) => {
  try {
    const bot = await getPublicGrowthChatbot(String(req.params.tenantSlug));
    if (!bot) {
      res.status(404).json({ error: "Chatbot not available" });
      return;
    }
    res.json(bot);
  } catch (err) {
    next(err);
  }
});

publicRouter.post("/growth/:tenantSlug/chat/sessions", async (req, res, next) => {
  try {
    const body = req.body as { sourcePage?: string; attribution?: Record<string, unknown> };
    const result = await startPublicGrowthChat(String(req.params.tenantSlug), {
      sourcePage: body.sourcePage,
      attribution: body.attribution,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

publicRouter.post("/growth/:tenantSlug/chat/sessions/:sessionId/messages", async (req, res, next) => {
  try {
    const body = req.body as { message?: string };
    if (!body.message?.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }
    const result = await submitPublicGrowthChatReply(
      String(req.params.tenantSlug),
      String(req.params.sessionId),
      body.message,
    );
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

publicRouter.post("/growth/:tenantSlug/analytics/events", async (req, res, next) => {
  try {
    const body = req.body as {
      eventType?: string;
      sourcePage?: string;
      path?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      referrer?: string;
      metadata?: Record<string, unknown>;
    };
    if (!body.eventType?.trim()) {
      res.status(400).json({ error: "eventType is required" });
      return;
    }
    const result = await recordPublicGrowthAnalyticsEvent(String(req.params.tenantSlug), {
      eventType: body.eventType,
      sourcePage: body.sourcePage,
      path: body.path,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
      referrer: body.referrer,
      metadata: body.metadata,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});
