export const GMAIL_TWO_STEP_URL = "https://myaccount.google.com/signinoptions/two-step-verification";

export type GmailConnectSlide = {
  id: string;
  step: number;
  title: string;
  body: string;
  tips?: string[];
  actionLabel?: string;
  actionHref?: string;
  requiredBeforeNext?: boolean;
  screen:
    | "inbox-settings"
    | "imap-tab"
    | "two-step"
    | "activate-two-step"
    | "app-password-search"
    | "app-password"
    | "pmail-signin";
};

export const GMAIL_IMAP_SETTINGS_URL = "https://mail.google.com/mail/u/0/#settings/fwdandpop";
export const GMAIL_SECURITY_URL = "https://myaccount.google.com/security";
export const GMAIL_APP_PASSWORDS_URL = "https://myaccount.google.com/apppasswords";
export const GOOGLE_ACCOUNT_URL = "https://myaccount.google.com/";

export const GMAIL_WIZARD_HEADING = "How to Generate the APP Password In Your Gmail";

export const GMAIL_CONNECT_SLIDES: GmailConnectSlide[] = [
  {
    id: "open-settings",
    step: 1,
    title: "Open Gmail settings",
    body: "In Gmail, open the gear icon in the top-right corner, then choose See all settings.",
    tips: ["Gear icon → See all settings", "You need the full Settings page, not Quick settings only"],
    actionLabel: "Open Gmail inbox",
    actionHref: "https://mail.google.com/",
    screen: "inbox-settings",
  },
  {
    id: "confirm-imap",
    step: 2,
    title: "Confirm IMAP is enabled",
    body: "In Settings, open Forwarding and POP/IMAP and confirm IMAP access is on. Personal Gmail accounts usually have this enabled already.",
    tips: ["Forwarding and POP/IMAP tab", "Look for IMAP access enabled"],
    actionLabel: "Open IMAP settings",
    actionHref: GMAIL_IMAP_SETTINGS_URL,
    screen: "imap-tab",
  },
  {
    id: "open-security",
    step: 3,
    title: "Open Google Account Security",
    body: "App Passwords require 2-Step Verification. Open your Google Account Security page first.",
    actionLabel: "Open Google Security",
    actionHref: GMAIL_SECURITY_URL,
    screen: "two-step",
  },
  {
    id: "activate-two-step",
    step: 4,
    title: "Activate 2-Step Verification",
    body: "This step is required before App passwords appear. If 2-Step Verification is Off, turn it on and complete phone or authenticator verification until the status shows On.",
    tips: [
      "Click 2-Step Verification → Get started",
      "Verify your phone number or authenticator app",
      "Do not continue until status shows On",
    ],
    actionLabel: "Turn on 2-Step Verification",
    actionHref: GMAIL_TWO_STEP_URL,
    requiredBeforeNext: true,
    screen: "activate-two-step",
  },
  {
    id: "search-app-password",
    step: 5,
    title: "Search for App passwords",
    body: "After 2-Step Verification is On, use the Google Account search bar and type App passwords.",
    tips: [
      "Profile photo → Manage your Google Account",
      "Search App passwords at the top",
      "Open the Security result",
    ],
    actionLabel: "Open Google Account search",
    actionHref: GOOGLE_ACCOUNT_URL,
    screen: "app-password-search",
  },
  {
    id: "app-password",
    step: 6,
    title: "Create your App Password",
    body: "Generate a Google App Password for Mail. Copy the 16-character password — use it below, not your normal Gmail password.",
    actionLabel: "Create App Password",
    actionHref: GMAIL_APP_PASSWORDS_URL,
    screen: "app-password",
  },
  {
    id: "sign-in",
    step: 7,
    title: "Paste it here and sign in",
    body: "Enter your Gmail address and the App Password in the fields below, then tap Sign in to mailbox.",
    screen: "pmail-signin",
  },
];

export const GMAIL_CONNECT_STEP_COUNT = GMAIL_CONNECT_SLIDES.length;
