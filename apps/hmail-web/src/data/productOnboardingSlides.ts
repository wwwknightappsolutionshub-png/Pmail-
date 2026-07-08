export type ProductOnboardingSlideSection = {
  title: string;
  items: string[];
};

export type ProductOnboardingSlideActionIntent = "request-workspace-access";

export type ProductOnboardingSlideAction = {
  label: string;
  to?: string;
  intent?: ProductOnboardingSlideActionIntent;
};

export type ProductOnboardingSlide = {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  highlight?: string;
  bullets: string[];
  actions?: ProductOnboardingSlideAction[];
  sections?: ProductOnboardingSlideSection[];
  icon: string;
  variant?: "default" | "cta";
};

export function buildProductOnboardingSlides(input: {
  productName: string;
  referrerLabel?: string | null;
}): ProductOnboardingSlide[] {
  const { productName, referrerLabel } = input;
  const invitedLead = referrerLabel
    ? `${referrerLabel} invited you to try ${productName} — connect your Gmail, Microsoft 365, or any other custom mailbox in one branded workspace.`
    : "Connect your Gmail, Microsoft 365, or any other custom mailbox in one branded workspace.";

  return [
    {
      id: "welcome",
      eyebrow: "Welcome",
      title: `${productName} — Your Mailbox, Upgraded`,
      lead: invitedLead,
      highlight: "No Migration Needed",
      bullets: [
        "Keep the email address you already use",
        "Works on your phone as an app, or on desktop",
        "One workspace — not just another inbox",
      ],
      icon: "✦",
    },
    {
      id: "platform",
      eyebrow: "Platform tools",
      title: "Why PMail+ Now?",
      lead: "PMail+ helps you go beyond the regular basic mail experience to an upgraded workspace with extra tools added to the regular mailing tools.",
      bullets: [
        "Multi-inbox — access multiple accounts in one workspace",
        "Auto-categorize inbox mails — save time",
        "Auto Contacts",
        "Open tracking — be notified when a recipient opens your mail",
        "File vault",
        "Mail2PDF — convert mail trail to PDF",
        "E-sign",
        "Attachment vault",
        "Calendar",
        "Reminder",
        "Job Hunter",
      ],
      icon: "⚡",
    },
    {
      id: "workspace",
      eyebrow: "The workspace",
      title: "All-in-One Mailing",
      lead: "Go beyond just a basic inbox. PMail+ helps organize your correspondence, contacts, and received documents locked in one branded workspace.",
      bullets: [
        "Multiple email accounts in one workspace with a one-click switch",
        "Categorized inbox with sender grouping that enhances fast search",
        "Workspace tabs for a better mailing experience",
        "Schedule send, compose with your branded email signature, reply templates, auto-reply",
      ],
      icon: "◉",
    },
    {
      id: "verticals",
      eyebrow: "Industry workspaces",
      title: "Wired For Your Business Needs",
      lead: "PMail+ is designed to support your daily business needs and save you time switching between separate business apps and your mail.",
      bullets: [],
      sections: [
        {
          title: "Legal & Immigration",
          items: ["IRCC mail intel", "Case-linked mail", "Compliance pack", "Client portal"],
        },
        {
          title: "Accounting",
          items: ["Document intake", "Filing calendar", "Secure exchange", "Client entities"],
        },
        {
          title: "Real Estate",
          items: ["Listing board", "Showing scheduler", "Quick replies", "Deal room"],
        },
        {
          title: "Recruitment",
          items: ["Role pipeline", "Interview desk", "Bulk outreach", "Talent search"],
        },
        {
          title: "B2B Services",
          items: ["Client workspaces", "Project tracker", "Proposal desk", "SLA monitor"],
        },
        {
          title: "Healthcare",
          items: ["Patient registry", "Appointment desk", "Referral tracker", "HIPAA audit log"],
        },
      ],
      icon: "◈",
    },
    buildProductOnboardingCtaSlide(productName),
  ];
}

export function buildProductOnboardingCtaSlide(_productName: string): ProductOnboardingSlide {
  return {
    id: "cta",
    eyebrow: "Get started",
    title: "Ready to Explore?",
    lead: "Curious how it feels inside? Simply connect your current Gmail, Microsoft 365, Yahoo, or any other custom mailbox. No migration needed — simply link up.",
    bullets: [
      "Sign in with Microsoft 365, Google, Hostinger, and more",
    ],
    actions: [
      { label: "Request workspace access without connecting mail", intent: "request-workspace-access" },
      { label: "Explore add-ons and upgrades inside your workspace", to: "/addons" },
    ],
    icon: "→",
    variant: "cta",
  };
}

export function formatReferrerDisplayName(email: string): string {
  const local = email.split("@")[0]?.trim();
  if (!local) return "A colleague";
  const words = local.replace(/[._-]+/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "A colleague";
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}
