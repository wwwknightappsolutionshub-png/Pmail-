export type GmailConnectSlide = {
  id: string;
  step: number;
  title: string;
  body: string;
  tips?: string[];
  actionLabel?: string;
  actionHref?: string;
  screen:
    | "inbox-settings"
    | "imap-tab"
    | "two-step"
    | "app-password-search"
    | "app-password"
    | "pmail-signin";
};

export const GMAIL_IMAP_SETTINGS_URL = "https://mail.google.com/mail/u/0/#settings/fwdandpop";
export const GMAIL_SECURITY_URL = "https://myaccount.google.com/security";
export const GMAIL_APP_PASSWORDS_URL = "https://myaccount.google.com/apppasswords";
export const GOOGLE_ACCOUNT_URL = "https://myaccount.google.com/";

export const GMAIL_CONNECT_SLIDES: GmailConnectSlide[] = [
  {
    id: "open-settings",
    step: 1,
    title: "Open Gmail settings",
    body: "From your Gmail inbox, open the settings menu in the top-right corner, then go to the full Settings page before you change mail access.",
    tips: [
      "Click the gear icon (Settings) in the top right",
      "In Quick settings, choose See all settings",
      "You should land on the full Gmail Settings page",
    ],
    actionLabel: "Open Gmail",
    actionHref: "https://mail.google.com/",
    screen: "inbox-settings",
  },
  {
    id: "confirm-imap",
    step: 2,
    title: "Open Forwarding & POP/IMAP",
    body: "In Gmail Settings, open the Forwarding and POP/IMAP tab and confirm IMAP access is active. On personal Gmail accounts it is already on — you usually do not need to change anything.",
    tips: [
      "Select the Forwarding and POP/IMAP tab",
      "Confirm IMAP access shows as enabled",
      "Save Changes only if you edited a setting",
    ],
    actionLabel: "Open IMAP settings",
    actionHref: GMAIL_IMAP_SETTINGS_URL,
    screen: "imap-tab",
  },
  {
    id: "two-step",
    step: 3,
    title: "Turn on 2-Step Verification",
    body: "App Passwords require 2-Step Verification. In your Google Account, open Security and turn on 2-Step Verification if it is not already on.",
    actionLabel: "Open Google Security",
    actionHref: GMAIL_SECURITY_URL,
    screen: "two-step",
  },
  {
    id: "search-app-password",
    step: 4,
    title: "Search for App passwords",
    body: "Open your Google Account and use the search bar at the top. Search for “App passwords” and open the matching Security result — it is faster than browsing every menu.",
    tips: [
      "In Gmail, click your profile photo → Manage your Google Account",
      "In the search box, type App passwords",
      "Open the App passwords result under Security",
    ],
    actionLabel: "Open Google Account",
    actionHref: GOOGLE_ACCOUNT_URL,
    screen: "app-password-search",
  },
  {
    id: "app-password",
    step: 5,
    title: "Create an App Password",
    body: "Create a Google App Password for Mail. Copy the 16-character password — use it here, not your normal Gmail password.",
    actionLabel: "Create App Password",
    actionHref: GMAIL_APP_PASSWORDS_URL,
    screen: "app-password",
  },
  {
    id: "sign-in",
    step: 6,
    title: "Sign in on this page",
    body: "Paste your Gmail address and the App Password into the fields above, keep Google selected as provider, then click Sign in to mailbox.",
    screen: "pmail-signin",
  },
];

export const GMAIL_CONNECT_STEP_COUNT = GMAIL_CONNECT_SLIDES.length;
