export type ProductOnboardingSlideSection = {
  title: string;
  items: string[];
};

export type ProductOnboardingSlide = {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  bullets: string[];
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
    ? `${referrerLabel} invited you to try ${productName} — branded mail and workspace tools on Prohost Cloud.`
    : `${productName} is branded mail plus a focused workspace on Prohost Cloud — connect your existing mailbox and work from one place.`;

  return [
    {
      id: "welcome",
      eyebrow: "Welcome",
      title: `Welcome to ${productName}`,
      lead: invitedLead,
      bullets: [
        "Connect your existing mailbox — no migration required",
        "Install as a mobile app or work from desktop",
        "Built for operators who need tools, not another inbox clone",
      ],
      icon: "✦",
    },
    {
      id: "workspace",
      eyebrow: "The workspace",
      title: "Your mail, CRM, and tools — together",
      lead: "Go beyond a basic inbox. PMail+ keeps correspondence, contacts, reminders, calendar, and documents in one branded environment.",
      bullets: [
        "Categorized inbox with sender grouping and fast search",
        "Workspace tabs: Contacts, CRM, Reminders, Calendar, and Messaging",
        "Compose with signatures, templates, scheduled send, and auto-reply",
        "Add-ons and trials — subscribe only to what your work needs",
        "Refer colleagues to unlock complimentary platform tools",
      ],
      icon: "◉",
    },
    {
      id: "platform",
      eyebrow: "Platform tools",
      title: "What makes PMail+ distinctive",
      lead: "Power features that stay inside your mail flow — no juggling separate apps.",
      bullets: [
        "Open & link tracking with read receipts",
        "File vault and Mail2PDF exports",
        "Multi-inbox switching and inbox cleanup",
        "Attachment auto-categorize and e-sign from email",
        "WhatsApp handoff, full calendar, and Job Hunter career workspace",
        "PWA with pull-to-refresh, push notifications, and offline cues",
      ],
      icon: "⚡",
    },
    {
      id: "verticals",
      eyebrow: "Industry workspaces",
      title: "Business vertical tools",
      lead: "Activate industry bundles beside your mail — tailored panels for how your sector actually works.",
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
    {
      id: "cta",
      eyebrow: "Get started",
      title: "Ready to open your workspace?",
      lead: "Connect your mailbox to sign in, or request access if you are not ready to link mail yet.",
      bullets: [
        "Sign in with Microsoft 365, Google, Hostinger, and more",
        "Request workspace access without connecting mail",
        "Explore add-ons and upgrades inside your workspace",
      ],
      icon: "→",
      variant: "cta",
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
