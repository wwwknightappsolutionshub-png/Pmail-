import type { GrowthContentAssetType } from "./content-asset-types.js";
import { generateAgentOutput } from "./agent-output-generator.js";
import { GROWTH_AGENT_REGISTRY } from "./agent-registry.js";
import type { GrowthWizardProfile } from "./wizard-profile.js";
import {
  hasExistingWebsite,
  resolveContentBundleMode,
  wizardBusinessName,
  wizardCommunicationStyle,
  wizardWebsiteUrl,
  type GrowthContentBundleMode,
} from "./wizard-profile.js";
import type { WebsiteSnapshot } from "./website-snapshot.js";

const GREENFIELD_BLOG_TOPICS = [
  "How to choose the right provider",
  "5 signs you need service today",
  "What to expect on your first visit",
  "How to budget for ongoing maintenance",
  "Common mistakes customers make",
  "Questions to ask before you hire",
  "Seasonal checklist for your home or business",
  "How reviews reflect real service quality",
  "Why transparent pricing matters",
  "Local vs national providers — what fits you",
];

const GAP_FILLING_BLOG_TOPICS = [
  "FAQ: answers customers search before they call",
  "Local service guide for your area",
  "Case study template showcasing real results",
  "How to compare providers in your market",
  "Seasonal maintenance checklist",
  "Emergency vs planned service — when to call",
  "Pricing transparency — what affects your quote",
  "Trust signals that convert visitors into leads",
  "Service area pages that rank locally",
  "Content gaps your competitors already publish",
];

const SOCIAL_ANGLES = [
  "tip",
  "myth-buster",
  "customer-win",
  "behind-the-scenes",
  "offer-reminder",
  "faq",
  "seasonal",
  "trust-signal",
];

export type AssetDraft = {
  assetType: GrowthContentAssetType;
  title: string;
  slug?: string;
  body: Record<string, unknown>;
  sortOrder: number;
};

type AgentContext = {
  psychology: {
    buyerPersonas?: Array<Record<string, unknown>>;
    messagingFramework?: { headlines?: string[]; proofPoints?: string[]; tone?: string };
  };
  positioning: {
    uvp?: string;
    differentiators?: string[];
    brandNarrative?: string;
  };
  agentOutputs: Record<string, Record<string, unknown>>;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function splitLines(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildAgentContext(profile: GrowthWizardProfile, snapshot: WebsiteSnapshot | null): AgentContext {
  const agentOutputs = Object.fromEntries(
    GROWTH_AGENT_REGISTRY.map((agent) => [agent.key, generateAgentOutput(agent.key, profile, snapshot)]),
  );

  return {
    agentOutputs,
    psychology: agentOutputs.customer_psychology as AgentContext["psychology"],
    positioning: agentOutputs.positioning as AgentContext["positioning"],
  };
}

function buildStrategyDrafts(profile: GrowthWizardProfile, ctx: AgentContext, style: string): AssetDraft[] {
  const drafts: AssetDraft[] = [];

  for (const [index, persona] of (ctx.psychology.buyerPersonas ?? []).entries()) {
    drafts.push({
      assetType: "persona",
      title: String(persona.name ?? `Persona ${index + 1}`),
      slug: slugify(String(persona.name ?? `persona-${index + 1}`)),
      body: persona,
      sortOrder: index,
    });
  }

  drafts.push({
    assetType: "positioning",
    title: "Positioning strategy",
    slug: "positioning-strategy",
    body: {
      uvp: ctx.positioning.uvp,
      differentiators: ctx.positioning.differentiators ?? [],
      brandNarrative: ctx.positioning.brandNarrative,
      tone: style,
      headlines: ctx.psychology.messagingFramework?.headlines ?? [],
    },
    sortOrder: 0,
  });

  drafts.push({
    assetType: "competitor_analysis",
    title: "Competitor analysis",
    slug: "competitor-analysis",
    body: ctx.agentOutputs.competitor_intelligence,
    sortOrder: 0,
  });

  drafts.push({
    assetType: "offer_recommendations",
    title: "Offer recommendations",
    slug: "offer-recommendations",
    body: ctx.agentOutputs.offer_engineering,
    sortOrder: 0,
  });

  return drafts;
}

function buildWebsiteAuditDraft(
  profile: GrowthWizardProfile,
  snapshot: WebsiteSnapshot | null,
  mode: GrowthContentBundleMode,
): AssetDraft | null {
  if (mode !== "existing_site") return null;

  const business = wizardBusinessName(profile);
  const websiteUrl = wizardWebsiteUrl(profile);
  const industry = profile.step1?.industry?.trim() || "local services";
  const serviceArea = profile.step1?.serviceArea?.trim() || "your area";
  const mainOffer = profile.step4?.mainOffer?.trim() || "";

  const gaps: string[] = [];
  if (!snapshot?.fetched) {
    gaps.push("Could not fully analyze the live site — recommendations use your wizard answers plus best practices.");
  }
  if (snapshot?.fetched && !snapshot.metaDescription) {
    gaps.push("Missing or weak meta description — hurts click-through from search results.");
  }
  if (snapshot?.fetched && snapshot.h1Headings.length === 0) {
    gaps.push("No clear H1 headline detected — visitors may not understand your value immediately.");
  }
  if (snapshot?.fetched && snapshot.h1Headings.length > 1) {
    gaps.push("Multiple H1 headings — consolidate to one primary message above the fold.");
  }
  if (snapshot?.fetched && !snapshot.hasContactSignals) {
    gaps.push("Weak contact or booking signals — add prominent phone, form, or booking CTA.");
  }
  if (snapshot?.fetched && !snapshot.hasOfferSignals && mainOffer) {
    gaps.push("Main offer from onboarding is not reflected on the homepage — surface it above the fold.");
  }
  if (snapshot?.fetched && snapshot.detectedBlogLinks.length === 0) {
    gaps.push("No blog or resources section detected — content gaps vs competitors who publish regularly.");
  }
  if (snapshot?.fetched && snapshot.wordCountEstimate > 0 && snapshot.wordCountEstimate < 250) {
    gaps.push("Thin homepage content — expand service details and local proof for SEO and trust.");
  }

  const improvements = [
    {
      area: "Hero message",
      current: snapshot?.h1Headings[0] ?? snapshot?.title ?? "Not detected",
      recommendation:
        ctxHeadline(profile, snapshot) ??
        `${business} — trusted ${industry.toLowerCase()} in ${serviceArea}`,
      priority: "high",
    },
    {
      area: "Meta description",
      current: snapshot?.metaDescription ?? "Not detected",
      recommendation: `${business} provides ${industry.toLowerCase()} in ${serviceArea}. ${mainOffer.split("\n")[0] || "Get a free quote today."}`,
      priority: "high",
    },
    {
      area: "Primary CTA",
      current: snapshot?.hasContactSignals ? "Some contact signals present" : "Limited contact signals",
      recommendation: profile.step4?.freeConsultation ? "Book your free consultation" : "Get a free quote",
      priority: "high",
    },
    {
      area: "Proof and trust",
      current: snapshot?.hasOfferSignals ? "Offer language detected" : "Limited offer or guarantee language",
      recommendation: `Add reviews, guarantees, and "${profile.step3?.whyBetter?.split("\n")[0] ?? "why customers choose us"}" near the hero.`,
      priority: "medium",
    },
  ];

  return {
    assetType: "website_audit",
    title: "Website audit & improvements",
    slug: "website-audit",
    body: {
      contentMode: mode,
      targetUrl: websiteUrl,
      analyzed: snapshot?.fetched ?? false,
      fetchError: snapshot?.fetchError,
      snapshot: snapshot
        ? {
            title: snapshot.title,
            metaDescription: snapshot.metaDescription,
            h1Headings: snapshot.h1Headings,
            detectedBlogLinks: snapshot.detectedBlogLinks,
            wordCountEstimate: snapshot.wordCountEstimate,
          }
        : null,
      contentGaps: gaps,
      improvements,
      note: "These are recommendations to apply on your existing site — Prohost Growth does not replace or republish your website automatically.",
    },
    sortOrder: 0,
  };
}

function ctxHeadline(profile: GrowthWizardProfile, snapshot: WebsiteSnapshot | null): string | undefined {
  const headlines = generateAgentOutput("customer_psychology", profile, snapshot).messagingFramework as
    | { headlines?: string[] }
    | undefined;
  return headlines?.headlines?.[0];
}

function buildSeoRecommendationsDraft(
  profile: GrowthWizardProfile,
  snapshot: WebsiteSnapshot | null,
  mode: GrowthContentBundleMode,
): AssetDraft | null {
  if (mode !== "existing_site") return null;

  const business = wizardBusinessName(profile);
  const industry = profile.step1?.industry?.trim() || "local services";
  const serviceArea = profile.step1?.serviceArea?.trim() || "your area";
  const areaSlug = slugify(serviceArea.split(",")[0] ?? "local");
  const pains = splitLines(profile.step2?.customerProblems);

  const recommendations = [
    {
      type: "title_tag",
      suggestion: `${business} | ${industry} in ${serviceArea.split(",")[0]?.trim() ?? serviceArea}`,
      reason: "Include business name, service, and primary location for local search.",
    },
    {
      type: "meta_description",
      suggestion: `${business} — ${profile.step4?.mainOffer?.split("\n")[0] ?? `${industry} in ${serviceArea}`}. ${profile.step3?.whyBetter?.split("\n")[0] ?? ""}`.slice(0, 155),
      reason: "155-character summary with offer and differentiator for SERP clicks.",
    },
    {
      type: "local_landing_page",
      suggestion: `Create /${areaSlug}-${slugify(industry)} with FAQs, service list, and map embed.`,
      reason: "Dedicated local pages rank for “service + city” queries.",
    },
    {
      type: "faq_schema",
      suggestion: pains.slice(0, 3).map((p) => `How does ${business} help with ${p.toLowerCase()}?`),
      reason: "FAQ content targets long-tail searches and can earn rich results.",
    },
    {
      type: "internal_linking",
      suggestion: "Link homepage hero CTA to offer landing page; cross-link blog posts to service pages.",
      reason: "Passes authority to money pages and keeps visitors in your funnel.",
    },
  ];

  if (snapshot?.fetched && snapshot.detectedBlogLinks.length === 0) {
    recommendations.push({
      type: "content_hub",
      suggestion: "Launch /blog or /resources with 2 posts per month on customer questions.",
      reason: "No blog detected — competitors likely outrank you on informational queries.",
    });
  }

  return {
    assetType: "seo_recommendations",
    title: "SEO recommendations",
    slug: "seo-recommendations",
    body: {
      contentMode: mode,
      targetUrl: wizardWebsiteUrl(profile),
      basedOnLiveSnapshot: snapshot?.fetched ?? false,
      recommendations,
      targetKeywords: [
        `${industry.toLowerCase()} ${serviceArea.split(",")[0]?.trim() ?? "near me"}`,
        `${business.toLowerCase()} reviews`,
        ...pains.slice(0, 2).map((p) => `${industry.toLowerCase()} ${p.toLowerCase().slice(0, 40)}`),
      ],
    },
    sortOrder: 0,
  };
}

function buildHomepageDraft(
  profile: GrowthWizardProfile,
  ctx: AgentContext,
  mode: GrowthContentBundleMode,
  snapshot: WebsiteSnapshot | null,
): AssetDraft {
  const business = wizardBusinessName(profile);
  const industry = profile.step1?.industry?.trim() || "local services";
  const serviceArea = profile.step1?.serviceArea?.trim() || "your area";
  const style = wizardCommunicationStyle(profile);
  const mainOffer = profile.step4?.mainOffer?.trim() || `Get started with ${business}`;
  const headline =
    ctx.psychology.messagingFramework?.headlines?.[0] ?? `${business} — ${industry} in ${serviceArea}`;

  if (mode === "existing_site") {
    return {
      assetType: "homepage_copy",
      title: "Homepage improvement plan",
      slug: "homepage-improvements",
      body: {
        contentMode: "improvement",
        targetUrl: wizardWebsiteUrl(profile),
        currentState: {
          title: snapshot?.title,
          h1: snapshot?.h1Headings[0],
          metaDescription: snapshot?.metaDescription,
        },
        suggestedHeroHeadline: headline,
        suggestedHeroSubheadline: ctx.positioning.uvp ?? mainOffer,
        primaryCta: profile.step4?.freeConsultation ? "Book your free consultation" : "Get a free quote",
        secondaryCta: "View services",
        sectionsToAddOrRefresh: [
          {
            heading: "Why choose us",
            bullets: (ctx.positioning.differentiators ?? []).slice(0, 4),
            action: "Refresh existing section or add below the hero if missing.",
          },
          {
            heading: "What we offer",
            body: profile.step1?.productsServices ?? "",
            action: "Ensure services match onboarding list and include pricing cues where possible.",
          },
          {
            heading: "Trusted locally",
            body: `Serving ${serviceArea} with ${style} communication and clear pricing.`,
            action: "Add reviews, badges, or service-area map if not visible today.",
          },
        ],
        doNotReplaceSite: true,
      },
      sortOrder: 0,
    };
  }

  return {
    assetType: "homepage_copy",
    title: "Homepage copy",
    slug: "homepage",
    body: {
      contentMode: "greenfield",
      heroHeadline: headline,
      heroSubheadline: ctx.positioning.uvp ?? mainOffer,
      primaryCta: "Get a free quote",
      secondaryCta: "View services",
      sections: [
        {
          heading: "Why choose us",
          bullets: (ctx.positioning.differentiators ?? []).slice(0, 4),
        },
        {
          heading: "What we offer",
          body: profile.step1?.productsServices ?? "",
        },
        {
          heading: "Trusted locally",
          body: `Serving ${serviceArea} with ${style} communication and clear pricing.`,
        },
      ],
    },
    sortOrder: 0,
  };
}

function buildLandingDraft(
  profile: GrowthWizardProfile,
  mode: GrowthContentBundleMode,
  pain: string,
  outcome: string,
): AssetDraft {
  const business = wizardBusinessName(profile);
  const mainOffer = profile.step4?.mainOffer?.trim() || `Get started with ${business}`;

  return {
    assetType: "landing_copy",
    title: mode === "existing_site" ? "New offer landing page" : "Landing page copy",
    slug: mode === "existing_site" ? "landing-offer-add-on" : "landing-offer",
    body: {
      contentMode: mode === "existing_site" ? "new_offer_page" : "greenfield",
      targetUrl: mode === "existing_site" ? wizardWebsiteUrl(profile) : undefined,
      purpose:
        mode === "existing_site"
          ? "Add as a dedicated campaign page (e.g. /offer or /promo) — keep your main homepage intact."
          : "Full landing page copy for a new site or first launch.",
      headline: mainOffer.split("\n")[0],
      subheadline: `Stop struggling with ${pain.toLowerCase()}. ${business} helps you get ${outcome.toLowerCase()}.`,
      bullets: splitLines(profile.step2?.desiredOutcomes).slice(0, 5),
      cta: profile.step4?.freeConsultation ? "Book your free consultation" : "Request service now",
      guarantee: profile.step4?.guarantees ?? "",
      offerDetails: mainOffer,
    },
    sortOrder: 0,
  };
}

function buildBlogDrafts(
  profile: GrowthWizardProfile,
  ctx: AgentContext,
  mode: GrowthContentBundleMode,
  snapshot: WebsiteSnapshot | null,
): AssetDraft[] {
  const business = wizardBusinessName(profile);
  const industry = profile.step1?.industry?.trim() || "local services";
  const serviceArea = profile.step1?.serviceArea?.trim() || "your area";
  const style = wizardCommunicationStyle(profile);
  const mainOffer = profile.step4?.mainOffer?.trim() || `Get started with ${business}`;
  const topics = mode === "existing_site" ? GAP_FILLING_BLOG_TOPICS : GREENFIELD_BLOG_TOPICS;
  const contentStrategy = mode === "existing_site" ? "gap_filling" : "greenfield";

  const drafts: AssetDraft[] = [];

  for (let i = 0; i < 10; i += 1) {
    let topic = topics[i] ?? `Guide ${i + 1} for ${industry.toLowerCase()}`;
    if (mode === "existing_site" && topic.includes("your area")) {
      topic = topic.replace("your area", serviceArea.split(",")[0]?.trim() ?? serviceArea);
    }
    if (mode === "existing_site" && topic.includes("your market")) {
      topic = topic.replace("your market", serviceArea.split(",")[0]?.trim() ?? serviceArea);
    }

    const gapReason =
      mode === "existing_site" && snapshot?.fetched && snapshot.detectedBlogLinks.length === 0
        ? "Your site has no detected blog — this topic fills a content gap competitors may already cover."
        : mode === "existing_site"
          ? "Suggested addition to strengthen SEO and answer pre-sale questions on your existing site."
          : undefined;

    drafts.push({
      assetType: "blog_post",
      title: `${topic} — ${business}`,
      slug: slugify(`blog-${i + 1}-${topic}`),
      body: {
        contentStrategy,
        publishTo: mode === "existing_site" ? wizardWebsiteUrl(profile) : undefined,
        gapReason,
        metaDescription: `${topic} for customers in ${serviceArea}. Practical advice from ${business}.`,
        introduction:
          mode === "existing_site"
            ? `${business} already serves ${serviceArea}. This article is designed to publish on your existing site and capture search demand your homepage may not cover yet.`
            : `${business} works with customers across ${serviceArea} who need honest guidance about ${industry.toLowerCase()}.`,
        sections: [
          {
            heading: mode === "existing_site" ? "Why publish this now" : "What you should know",
            paragraphs: [
              mode === "existing_site"
                ? `${topic} addresses questions prospects ask before contacting ${business}.`
                : `${topic} starts with understanding your situation and asking the right questions.`,
            ],
          },
          {
            heading: "How we help",
            paragraphs: [mainOffer],
          },
          {
            heading: "Next step",
            paragraphs: [
              mode === "existing_site"
                ? `Add an internal link to your main offer page and contact form on ${wizardWebsiteUrl(profile) || "your site"}.`
                : `Contact ${business} to discuss your needs in a ${style}, no-pressure conversation.`,
            ],
          },
        ],
        suggestedKeywords: [
          industry.toLowerCase(),
          serviceArea.split(",")[0]?.trim() ?? "local",
          business.toLowerCase(),
        ],
      },
      sortOrder: i,
    });
  }

  return drafts;
}

function buildSocialDrafts(profile: GrowthWizardProfile, ctx: AgentContext): AssetDraft[] {
  const business = wizardBusinessName(profile);
  const industry = profile.step1?.industry?.trim() || "local services";
  const serviceArea = profile.step1?.serviceArea?.trim() || "your area";
  const mainOffer = profile.step4?.mainOffer?.trim() || `Get started with ${business}`;
  const mode = resolveContentBundleMode(profile);
  const websiteUrl = wizardWebsiteUrl(profile);

  const drafts: AssetDraft[] = [];
  for (let i = 0; i < 30; i += 1) {
    const angle = SOCIAL_ANGLES[i % SOCIAL_ANGLES.length];
    drafts.push({
      assetType: "social_post",
      title: `Social post ${i + 1}`,
      slug: slugify(`social-${i + 1}`),
      body: {
        platform: i % 3 === 0 ? "facebook" : i % 3 === 1 ? "instagram" : "linkedin",
        angle,
        caption: `${business}: ${ctx.psychology.messagingFramework?.headlines?.[i % 3] ?? mainOffer} — ${serviceArea}.`,
        hashtags: [`#${slugify(industry)}`, `#${slugify(serviceArea.split(",")[0] ?? "local")}`, "#SmallBusiness"],
        callToAction: mode === "existing_site" && websiteUrl ? `Learn more — ${websiteUrl}` : "Learn more — link in bio",
        linkTarget: mode === "existing_site" ? websiteUrl : undefined,
      },
      sortOrder: i,
    });
  }
  return drafts;
}

function buildEmailDraft(
  profile: GrowthWizardProfile,
  ctx: AgentContext,
  pain: string,
  outcome: string,
): AssetDraft {
  const business = wizardBusinessName(profile);
  const industry = profile.step1?.industry?.trim() || "local services";
  const serviceArea = profile.step1?.serviceArea?.trim() || "your area";
  const mainOffer = profile.step4?.mainOffer?.trim() || `Get started with ${business}`;
  const mode = resolveContentBundleMode(profile);
  const websiteUrl = wizardWebsiteUrl(profile);

  const emailSubjects = [
    `Welcome to ${business}`,
    `The #1 mistake ${industry.toLowerCase()} customers make`,
    `How ${business} solves ${pain.toLowerCase()}`,
    "Proof you can trust us",
    mainOffer.split("\n")[0].slice(0, 90),
    "Ready for the next step?",
  ];

  return {
    assetType: "email_sequence",
    title: "Nurture email sequence",
    slug: "nurture-sequence",
    body: {
      contentMode: mode,
      emails: emailSubjects.map((subject, index) => ({
        step: index + 1,
        subject,
        preheader: `${business} — ${outcome}`,
        body:
          index === 0
            ? `Hi there,\n\nThanks for your interest in ${business}. We help customers in ${serviceArea} with ${industry.toLowerCase()}.\n\n${mainOffer}${websiteUrl ? `\n\nVisit us: ${websiteUrl}` : ""}\n\nReply anytime — we're here to help.`
            : index === emailSubjects.length - 1
              ? `Hi again,\n\nIf you're still comparing options, remember: ${ctx.positioning.uvp ?? mainOffer}\n\nBook a time or reply to this email — we'd love to earn your business.`
              : `Hi,\n\n${subject}.\n\nAt ${business}, we focus on ${outcome.toLowerCase()}. ${profile.step3?.whyBetter ?? ""}\n\n${mainOffer}`,
      })),
    },
    sortOrder: 0,
  };
}

function buildAdCopyDraft(profile: GrowthWizardProfile, ctx: AgentContext, pain: string): AssetDraft {
  const business = wizardBusinessName(profile);
  const industry = profile.step1?.industry?.trim() || "local services";
  const serviceArea = profile.step1?.serviceArea?.trim() || "your area";
  const mainOffer = profile.step4?.mainOffer?.trim() || `Get started with ${business}`;
  const uvp = ctx.positioning.uvp ?? mainOffer.split("\n")[0];

  return {
    assetType: "ad_copy",
    title: "Paid ads copy pack",
    slug: "ad-copy-pack",
    body: {
      google: [
        { headline: `${business} — ${serviceArea.split(",")[0]?.trim() ?? serviceArea}`, description: uvp.slice(0, 90) },
        { headline: mainOffer.split("\n")[0].slice(0, 30), description: `Trusted ${industry.toLowerCase()}. ${profile.step3?.whyBetter?.split("\n")[0] ?? ""}`.slice(0, 90) },
        { headline: `Fix ${pain.split(" ")[0]?.toLowerCase() ?? "problems"} fast`, description: `${business} — book online or call today.` },
      ],
      meta: [
        {
          primaryText: `${uvp} Serving ${serviceArea}.`,
          headline: business,
          description: mainOffer.split("\n")[0],
        },
        {
          primaryText: `Stop struggling with ${pain.toLowerCase()}. See why ${serviceArea} customers choose ${business}.`,
          headline: "Limited-time offer",
          description: profile.step4?.guarantees ?? "Satisfaction guaranteed.",
        },
      ],
      budgetNote: `Suggested split from wizard budget: 60% search, 40% social.`,
    },
    sortOrder: 0,
  };
}

function buildBundleSummaryDraft(
  profile: GrowthWizardProfile,
  ctx: AgentContext,
  mode: GrowthContentBundleMode,
  snapshot: WebsiteSnapshot | null,
): AssetDraft {
  const business = wizardBusinessName(profile);
  const emailCount = 6;

  const greenfieldDeliverables = [
    "Customer personas",
    "Positioning strategy",
    "Competitor analysis",
    "Offer recommendations",
    "Homepage copy (greenfield)",
    "Landing page copy",
    "10 blog posts",
    "30 social posts",
    "Email nurture sequence",
    "Paid ads copy pack",
  ];

  const existingSiteDeliverables = [
    "Customer personas",
    "Positioning strategy",
    "Competitor analysis",
    "Offer recommendations",
    "Website audit & improvement plan",
    "SEO recommendations",
    "Homepage improvement plan (does not replace your site)",
    "New offer landing page copy",
    "10 gap-filling blog posts for your existing site",
    "30 social posts linking to your site",
    "Email nurture sequence",
    "Paid ads copy pack",
  ];

  return {
    assetType: "bundle_summary",
    title: "Day-one bundle summary",
    slug: "bundle-summary",
    body: {
      businessName: business,
      contentMode: mode,
      existingWebsite: hasExistingWebsite(profile) ? wizardWebsiteUrl(profile) : null,
      websiteAnalyzed: snapshot?.fetched ?? false,
      generatedAt: new Date().toISOString(),
      counts: {
        personas: ctx.psychology.buyerPersonas?.length ?? 0,
        blogPosts: 10,
        socialPosts: 30,
        emails: emailCount,
      },
      status: "content_ready",
      deliverables: mode === "existing_site" ? existingSiteDeliverables : greenfieldDeliverables,
    },
    sortOrder: 0,
  };
}

export function buildContentDrafts(profile: GrowthWizardProfile, snapshot: WebsiteSnapshot | null): AssetDraft[] {
  const mode = resolveContentBundleMode(profile);
  const pain = splitLines(profile.step2?.customerProblems)[0] ?? "the problems you face every day";
  const outcome = splitLines(profile.step2?.desiredOutcomes)[0] ?? "a reliable solution you can trust";
  const style = wizardCommunicationStyle(profile);

  const ctx = buildAgentContext(profile, snapshot);
  const drafts: AssetDraft[] = [...buildStrategyDrafts(profile, ctx, style)];

  const audit = buildWebsiteAuditDraft(profile, snapshot, mode);
  if (audit) drafts.push(audit);

  const seo = buildSeoRecommendationsDraft(profile, snapshot, mode);
  if (seo) drafts.push(seo);

  drafts.push(buildHomepageDraft(profile, ctx, mode, snapshot));
  drafts.push(buildLandingDraft(profile, mode, pain, outcome));
  drafts.push(buildAdCopyDraft(profile, ctx, pain));
  drafts.push(...buildBlogDrafts(profile, ctx, mode, snapshot));
  drafts.push(...buildSocialDrafts(profile, ctx));
  drafts.push(buildEmailDraft(profile, ctx, pain, outcome));
  drafts.push(buildBundleSummaryDraft(profile, ctx, mode, snapshot));

  return drafts;
}
