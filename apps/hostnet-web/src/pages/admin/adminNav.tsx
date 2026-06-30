import type { ReactNode } from "react";

export type AdminTab =
  | "dashboard"
  | "sections"
  | "testimonials"
  | "hosting"
  | "addons"
  | "tenants"
  | "mail-users"
  | "accounts"
  | "sales-pipeline"
  | "email-templates"
  | "addon-education"
  | "marketing"
  | "vps"
  | "billing"
  | "system"
  | "admins";

type NavItem = {
  id: AdminTab;
  label: string;
  icon: ReactNode;
  superAdminOnly?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 4a1 1 0 011-1h3a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm8-1a1 1 0 00-1 1v9a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Content & Commerce",
    items: [
      {
        id: "sections",
        label: "Landing sections",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 3h12a1 1 0 011 1v3H3V4a1 1 0 011-1zm-1 6h14v8a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" />
          </svg>
        ),
      },
      {
        id: "testimonials",
        label: "Testimonials",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 4h12v3H4V4zm0 5h12v7H4V9zm2 2v3h8v-3H6z" />
          </svg>
        ),
      },
      {
        id: "hosting",
        label: "Hosting plans",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v2H3V5zm0 4h14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
        ),
      },
      {
        id: "addons",
        label: "PMail+ add-ons",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 2l2.2 4.5 4.9.7-3.5 3.4.8 4.9L10 13.8 5.6 15.5l.8-4.9L3 7.2l4.9-.7L10 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        id: "tenants",
        label: "Tenants",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 3a4 4 0 100 8 4 4 0 000-8zM4 15a6 6 0 0112 0v1H4v-1z" />
          </svg>
        ),
      },
      {
        id: "mail-users",
        label: "PMail+ users",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 5a2 2 0 012-2h3.5l1 1H15a2 2 0 012 2v1H3V5zm0 3h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm3 2v2h6v-2H6z" />
          </svg>
        ),
      },
      {
        id: "accounts",
        label: "Panel accounts",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 4h12v3H4V4zm0 5h8v7H4V9zm10 0h2v7h-2V9z" />
          </svg>
        ),
      },
      {
        id: "sales-pipeline",
        label: "Sales pipeline",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 4h14v2H3V4zm0 5h14v2H3V9zm0 5h10v2H3v-2z" />
          </svg>
        ),
      },
      {
        id: "vps",
        label: "VPS",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 3h12a2 2 0 012 2v3H2V5a2 2 0 012-2zm-2 7h16v5a2 2 0 01-2 2H4a2 2 0 01-2-2v-5z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        id: "email-templates",
        label: "Email templates",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 5h14v2H3V5zm0 4h14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm2 2v4h10v-4H5z" />
          </svg>
        ),
      },
      {
        id: "addon-education",
        label: "Education drip",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 4h12v3H4V4zm0 5h12v2H4V9zm0 4h8v2H4v-2z" />
          </svg>
        ),
      },
      {
        id: "marketing",
        label: "Marketing",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.5L10 14.5 5.1 17.2l.9-5.5-4-3.9 5.5-.8L10 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        id: "billing",
        label: "Billing & revenue",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 4h12v12H4V4zm2 2v2h8V6H6zm0 4v2h5v-2H6zm0 4v2h8v-2H6z" />
          </svg>
        ),
      },
      {
        id: "system",
        label: "System status",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 3v5l4 2-.8 1.4L8 10.5V5h2z" />
          </svg>
        ),
      },
      {
        id: "admins",
        label: "Administrators",
        icon: (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7 4a3 3 0 116 0 3 3 0 01-6 0zM4 15a6 6 0 0112 0v1H4v-1zm9-2.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
          </svg>
        ),
        superAdminOnly: true,
      },
    ],
  },
];

export const ADMIN_TAB_META: Record<AdminTab, { title: string; description: string }> = {
  dashboard: {
    title: "Platform overview",
    description: "Real-time metrics across tenants, mail, hosting, and infrastructure.",
  },
  sections: {
    title: "Landing page sections",
    description: "Edit the eight live marketing blocks (hero through register). Keys match the public landing page.",
  },
  testimonials: {
    title: "Testimonials",
    description: "Manage carousel reviews on the marketing site — publish, feature, and moderate visitor submissions.",
  },
  hosting: {
    title: "Hosting plans",
    description: "Configure plan pricing, features, and visibility on the public site.",
  },
  addons: {
    title: "PMail+ add-ons",
    description: "Full catalog of active PMail+ modules — toggle availability, marketing copy, and landing visibility.",
  },
  tenants: {
    title: "Tenants",
    description: "Create and manage customer organizations, mail users, and branding.",
  },
  "mail-users": {
    title: "PMail+ users",
    description: "Global mailbox directory with live online presence, last login, and active session tracking.",
  },
  accounts: {
    title: "Panel hosting accounts",
    description: "Provision and manage customer control-panel logins.",
  },
  "sales-pipeline": {
    title: "Sales pipeline",
    description: "Unified funnel — leads, membership applications, inquiries, and form definitions.",
  },
  "email-templates": {
    title: "Email templates",
    description: "Branded transactional and marketing templates with visual editor and test send.",
  },
  "addon-education": {
    title: "PMail+ education drip",
    description: "Panel workspace and vertical add-on education sequences, timing rules, and step order.",
  },
  marketing: {
    title: "Marketing engine",
    description: "SEO, Google Ads guidance, AI strategist, and conversion playbooks to drive revenue from day one.",
  },
  vps: {
    title: "VPS instances",
    description: "Monitor and manage virtual private server deployments.",
  },
  billing: {
    title: "Billing & revenue",
    description: "MRR, completed payments, subscription health, and revenue trends.",
  },
  system: {
    title: "System status",
    description: "Infrastructure readiness, billing lifecycle, payments config, and environment.",
  },
  admins: {
    title: "Platform administrators",
    description: "Manage operator accounts and access levels for the admin console.",
  },
};
