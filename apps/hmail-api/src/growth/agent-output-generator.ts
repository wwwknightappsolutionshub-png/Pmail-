import type { GrowthAgentKey } from "./agent-registry.js";
import type { GrowthWizardProfile } from "./wizard-profile.js";
import { hasExistingWebsite, wizardBusinessName, wizardCommunicationStyle, wizardWebsiteUrl } from "./wizard-profile.js";
import type { WebsiteSnapshot } from "./website-snapshot.js";

function splitLines(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function toneLabel(style: string): string {
  return style.charAt(0).toUpperCase() + style.slice(1);
}

/** Phase B — structured agent outputs derived from wizard data (no empty skeletons). */
export function generateAgentOutput(
  agentKey: GrowthAgentKey,
  profile: GrowthWizardProfile,
  snapshot: WebsiteSnapshot | null = null,
): Record<string, unknown> {
  const business = wizardBusinessName(profile);
  const industry = profile.step1?.industry?.trim() || "local services";
  const serviceArea = profile.step1?.serviceArea?.trim() || "your service area";
  const style = wizardCommunicationStyle(profile);
  const websiteUrl = wizardWebsiteUrl(profile);
  const hasSite = hasExistingWebsite(profile);

  switch (agentKey) {
    case "market_research":
      return {
        orchestrationPhase: "B",
        agentKey,
        contentMode: hasSite ? "existing_site" : "greenfield",
        existingWebsite: hasSite
          ? {
              url: websiteUrl,
              analyzed: snapshot?.fetched ?? false,
              title: snapshot?.title,
              hasBlog: (snapshot?.detectedBlogLinks.length ?? 0) > 0,
              observations: hasSite
                ? [
                    snapshot?.fetched
                      ? `Live site title: "${snapshot.title ?? "not detected"}"`
                      : "Could not fetch live site — using onboarding answers for recommendations.",
                    snapshot?.fetched && !snapshot.metaDescription
                      ? "Missing meta description — SEO improvement opportunity."
                      : null,
                    snapshot?.fetched && snapshot.detectedBlogLinks.length === 0
                      ? "No blog/resources detected — content gap vs competitors."
                      : snapshot?.fetched
                        ? `Detected ${snapshot.detectedBlogLinks.length} blog-related link(s).`
                        : null,
                  ].filter(Boolean)
                : [],
            }
          : null,
        marketOpportunities: [
          `Growing demand for ${industry.toLowerCase()} in ${serviceArea}`,
          `Customers prefer transparent pricing and same-day response in ${industry.toLowerCase()}`,
          hasSite
            ? `Improve ${websiteUrl} conversion with clearer offers and local proof`
            : `Digital-first discovery — most leads compare 3+ providers before contacting ${business}`,
        ],
        threats: [
          "Price-only competitors undercutting on emergency calls",
          "National chains with large ad budgets dominating search results",
          "Seasonal slowdowns if demand is weather or event driven",
        ],
        growthAreas: splitLines(profile.step1?.productsServices).slice(0, 4).length
          ? splitLines(profile.step1?.productsServices).slice(0, 4)
          : [`Core ${industry.toLowerCase()} services`, "Maintenance plans", "Referral partnerships"],
        summary: `${business} operates in ${industry} across ${serviceArea}. Primary growth levers: local SEO, reviews, and a clear main offer.`,
      };

    case "competitor_intelligence": {
      const names = profile.step3?.competitorNames ?? [];
      const urls = profile.step3?.competitorUrls ?? [];
      const competitorReport = names.map((name, index) => ({
        name,
        url: urls[index] ?? null,
        observedStrength: "Established brand presence and broad service listings",
        observedWeakness: "Generic messaging and slow response promises",
      }));
      return {
        orchestrationPhase: "B",
        agentKey,
        competitorReport,
        positioningGaps: splitLines(profile.step3?.whyDifferent).length
          ? splitLines(profile.step3?.whyDifferent)
          : [`${business} can own faster response and clearer pricing`],
        opportunityScore: competitorReport.length >= 2 ? 78 : 65,
        whyBetter: profile.step3?.whyBetter ?? "",
        whyDifferent: profile.step3?.whyDifferent ?? "",
      };
    }

    case "customer_psychology": {
      const personaName = profile.step2?.idealCustomer?.split(/[,.]/)[0]?.trim() || "Primary buyer";
      return {
        orchestrationPhase: "B",
        agentKey,
        buyerPersonas: [
          {
            name: personaName.slice(0, 80) || "Primary customer",
            demographics: profile.step2?.idealCustomer ?? "",
            painPoints: splitLines(profile.step2?.customerProblems),
            desiredOutcomes: splitLines(profile.step2?.desiredOutcomes),
            objections: splitLines(profile.step2?.customerObjections),
            proofExamples: profile.step2?.existingCustomerExamples ?? "",
          },
        ],
        messagingFramework: {
          tone: toneLabel(style),
          headlines: [
            `${business} — trusted ${industry.toLowerCase()} in ${serviceArea}`,
            profile.step4?.mainOffer?.split("\n")[0]?.slice(0, 120) || `Get help from ${business} today`,
            `Why customers choose ${business} over the competition`,
          ],
          proofPoints: splitLines(profile.step2?.desiredOutcomes).slice(0, 3),
        },
      };
    }

    case "offer_engineering":
      return {
        orchestrationPhase: "B",
        agentKey,
        offerStack: {
          mainOffer: profile.step4?.mainOffer ?? "",
          upsells: splitLines(profile.step4?.upsells),
          freeConsultation: profile.step4?.freeConsultation ?? false,
          discounts: profile.step4?.discounts ?? "",
          guarantees: profile.step4?.guarantees ?? "",
          bonuses: profile.step4?.freeConsultation
            ? ["Free consultation or discovery call"]
            : [],
          perceivedValueNotes: [
            "Lead with one clear entry offer before listing add-ons",
            "Use guarantees to reduce perceived risk for first-time buyers",
          ],
        },
      };

    case "positioning":
      return {
        orchestrationPhase: "B",
        agentKey,
        uvp: profile.step3?.whyDifferent || `${business} delivers reliable ${industry.toLowerCase()} with clear pricing in ${serviceArea}.`,
        differentiators: splitLines(profile.step3?.whyDifferent).length
          ? splitLines(profile.step3?.whyDifferent)
          : splitLines(profile.step3?.whyBetter),
        brandNarrative: `${business} helps customers in ${serviceArea} solve ${splitLines(profile.step2?.customerProblems)[0] ?? "everyday problems"} with a ${toneLabel(style).toLowerCase()}, trustworthy approach. ${profile.step3?.whyBetter ?? ""}`.trim(),
        communicationStyle: style,
      };

    default:
      return { orchestrationPhase: "B", agentKey };
  }
}
