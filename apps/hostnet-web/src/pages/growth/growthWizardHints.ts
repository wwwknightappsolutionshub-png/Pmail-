export type WizardStepIntro = {
  title: string;
  summary: string;
  tips: string[];
};

export const WIZARD_STEP_INTROS: Record<number, WizardStepIntro> = {
  1: {
    title: "Business information",
    summary: "Help our agents understand what you sell, where you operate, and what success looks like financially.",
    tips: [
      "Use your real business name — it appears in generated copy and reports.",
      "Revenue and budget figures can be rough estimates; refine them later.",
    ],
  },
  2: {
    title: "Customer information",
    summary: "Describe the people you want to reach. The clearer the picture, the sharper your personas and messaging.",
    tips: [
      "Think of one real customer you loved working with and describe them.",
      "List objections you hear on sales calls — agents use these in counter-messaging.",
    ],
  },
  3: {
    title: "Competitors",
    summary: "Name who your prospects compare you against. We analyze positioning gaps you can own.",
    tips: [
      "Add 2–4 competitors — local rivals, national brands, or DIY alternatives.",
      "“Better” is about outcomes; “different” is about your unique angle.",
    ],
  },
  4: {
    title: "Offer configuration",
    summary: "Define what you want prospects to buy first and what you can add on later.",
    tips: [
      "Lead with one clear main offer — avoid listing every service here.",
      "Guarantees and discounts reduce friction; leave blank if none apply.",
    ],
  },
  5: {
    title: "Communication style",
    summary: "Set the voice for all generated content — emails, ads, landing copy, and chat.",
    tips: [
      "Pick the tone your best customers already respond to.",
      "Use notes for words to avoid, industry jargon, or brand phrases to keep.",
    ],
  },
  6: {
    title: "Brand assets",
    summary: "Upload files our agents reference for visual identity. Everything here is optional for Phase A.",
    tips: [
      "A logo alone is enough to get started — add more assets anytime.",
      "PDF brand guides help keep colors, fonts, and tone consistent.",
    ],
  },
};

export const STEP1_HINTS = {
  businessName: {
    hint: "Your legal or trading name as customers know it.",
    example: "Summit Home Services",
  },
  industry: {
    hint: "Broad category — be specific enough to narrow research.",
    example: "Residential HVAC & plumbing",
  },
  website: {
    hint: "Optional. If you already have a site, we audit it and suggest improvements instead of greenfield copy.",
    example: "https://summithome.example.com",
  },
  serviceArea: {
    hint: "Cities, regions, or countries you serve.",
    example: "Greater Toronto Area — Mississauga, Brampton, Toronto",
  },
  productsServices: {
    hint: "List main services or products, one per line if helpful.",
    example: "Emergency AC repair\nSeasonal tune-ups\nDuct cleaning\nMaintenance plans",
  },
  averageCustomerValue: {
    hint: "Typical revenue from one customer or job.",
    example: "$850 per service call",
  },
  monthlyRevenueGoal: {
    hint: "Target monthly revenue you are working toward.",
    example: "$45,000 / month",
  },
  monthlyMarketingBudget: {
    hint: "What you can spend on ads, content, and tools each month.",
    example: "$2,500 / month",
  },
} as const;

export const STEP2_HINTS = {
  idealCustomer: {
    hint: "Age, role, location, budget, and situation — paint a vivid picture.",
    example: "Homeowners aged 35–55 in suburban neighborhoods with household income $90k+. Own a single-family home built before 2000.",
  },
  customerProblems: {
    hint: "Pain points that make them search for a solution now.",
    example: "AC fails during heat waves\nUnpredictable repair bills\nHard to reach a trustworthy technician",
  },
  desiredOutcomes: {
    hint: "What “success” looks like after they hire you.",
    example: "Same-day repair with upfront pricing\nPeace of mind through a maintenance plan\nLower energy bills",
  },
  customerObjections: {
    hint: "Reasons they hesitate — price, trust, timing, etc.",
    example: "“Too expensive compared to the big chains”\n“Can I wait until next month?”\n“Are you licensed and insured?”",
  },
  existingCustomerExamples: {
    hint: "Optional. Real stories help agents write believable social proof.",
    example: "Maria in Oakville — furnace replaced in one visit, signed up for annual plan",
  },
} as const;

export const STEP3_HINTS = {
  competitorUrls: {
    hint: "One URL per line. Protocol optional — we normalize links automatically.",
    example: "https://rival-hvac.example.com\nhttps://national-chain.example.com/locations",
  },
  competitorNames: {
    hint: "One name per line. Match the order of URLs when possible.",
    example: "Rival HVAC Co.\nCoolAir National",
  },
  whyBetter: {
    hint: "Outcomes, speed, quality, or service level vs. alternatives.",
    example: "Same-day emergency slots, licensed techs on every job, and transparent pricing before work starts.",
  },
  whyDifferent: {
    hint: "Your unique positioning — not just “better,” but distinctly you.",
    example: "We only serve our local county, publish live arrival ETAs, and include a 90-day workmanship warranty.",
  },
} as const;

export const STEP4_HINTS = {
  mainOffer: {
    hint: "The primary thing you want new leads to buy or book.",
    example: "$79 diagnostic visit credited toward repair + free seasonal checklist",
  },
  upsells: {
    hint: "Optional add-ons offered after the main purchase.",
    example: "Annual maintenance plan\nSmart thermostat install\nDuct sanitization",
  },
  freeConsultation: {
    hint: "Check if you offer a free call, audit, or site visit to start the relationship.",
  },
  discounts: {
    hint: "Optional. Seasonal promos, first-time offers, or member pricing.",
    example: "10% off first service for seniors and veterans",
  },
  guarantees: {
    hint: "Optional. Warranties, refunds, or risk-reversal statements.",
    example: "30-day workmanship guarantee — we return at no charge if the issue persists",
  },
} as const;

export const STEP5_HINTS = {
  style: {
    hint: "Sets the default tone for AI-generated copy across channels.",
    examples: {
      professional: "Clear, confident, and respectful — good for B2B and regulated industries.",
      friendly: "Warm and conversational — good for local services and community brands.",
      luxury: "Refined and aspirational — good for premium products and high-touch services.",
      corporate: "Structured and authoritative — good for enterprise and finance.",
      playful: "Light and energetic — good for consumer apps and creative brands.",
      technical: "Precise and detail-oriented — good for SaaS, IT, and engineering.",
    },
  },
  notes: {
    hint: "Optional. Brand voice rules, banned words, or phrases to always include.",
    example: "Always say “technician” not “guy.” Never use slang. Mention our 24/7 hotline in CTAs.",
  },
} as const;

export const STEP6_HINTS = {
  logo: {
    hint: "PNG or SVG with transparent background works best.",
  },
  brandGuide: {
    hint: "PDF with colors, fonts, and logo usage rules.",
  },
  image: {
    hint: "Team photos, product shots, or hero images for campaigns.",
  },
} as const;
