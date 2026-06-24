export type ProductOnboardingSlide = {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  bullets: string[];
  icon: string;
};

export function buildProductOnboardingSlides(input: {
  productName: string;
  referrerLabel?: string | null;
}): ProductOnboardingSlide[] {
  const { productName, referrerLabel } = input;
  const invitedLead = referrerLabel
    ? `${referrerLabel} thought you'd benefit from a smarter mail workspace.`
    : "A focused workspace where mail, tools, and workflows stay in one place.";

  return [
    {
      id: "welcome",
      eyebrow: "Welcome",
      title: `More than mail — meet ${productName}`,
      lead: invitedLead,
      bullets: [
        "Connect your existing mailbox — no migration required",
        "Work from desktop or install as a mobile app",
        "Built for operators who need tools, not another inbox clone",
      ],
      icon: "✦",
    },
    {
      id: "inbox",
      eyebrow: "Mail workspace",
      title: "Your inbox, upgraded",
      lead: "Fast compose, organized folders, signatures, and a layout designed for real daily work.",
      bullets: [
        "Unified inbox with search, filters, and bulk actions",
        "Rich compose with templates and tracked correspondence",
        "Mobile-friendly PWA with pull-to-refresh and offline cues",
      ],
      icon: "✉",
    },
    {
      id: "platform",
      eyebrow: "Platform tools",
      title: "Tools ready when you need them",
      lead: "Calendar, scheduling, and handoffs without leaving your mail flow.",
      bullets: [
        "Calendar and scheduled send",
        "Open tracking and read receipts",
        "WhatsApp handoff and Mail2PDF exports",
      ],
      icon: "⚡",
    },
    {
      id: "verticals",
      eyebrow: "Industry workspaces",
      title: "Vertical tools for your sector",
      lead: "Unlock CRM-style panels for legal, accounting, healthcare, recruitment, and more.",
      bullets: [
        "Industry-specific workflows beside your mail",
        "Client-ready document and case tracking",
        "Activate only the vertical bundle you need",
      ],
      icon: "◈",
    },
    {
      id: "upgrade",
      eyebrow: "Your pace",
      title: "Grow on your terms",
      lead: "Start with regular mail, explore the environment, and subscribe only to what helps your work.",
      bullets: [
        "Free trials on selected add-on bundles",
        "Refer friends to unlock complimentary platform tools",
        "Upgrade path managed inside your workspace",
      ],
      icon: "↑",
    },
  ];
}

export function formatReferrerDisplayName(email: string): string {
  const local = email.split("@")[0]?.trim();
  if (!local) return "A colleague";
  const words = local.replace(/[._-]+/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "A colleague";
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}
