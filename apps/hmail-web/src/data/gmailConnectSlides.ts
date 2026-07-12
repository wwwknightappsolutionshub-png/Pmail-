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

export const GMAIL_WIZARD_HEADING = "Get a special password for PMail+";

export const GMAIL_CONNECT_SLIDES: GmailConnectSlide[] = [
  {
    id: "enable-imap",
    step: 1,
    title: "Turn on IMAP in Gmail",
    body: "Open Gmail Settings → Forwarding and POP/IMAP, enable IMAP access, then save changes. PMail+ needs IMAP to read your mailbox.",
    tips: [
      "Open Settings (gear) → See all settings",
      "Open the Forwarding and POP/IMAP tab",
      "Select Enable IMAP → Save Changes",
    ],
    actionLabel: "Open IMAP settings",
    actionHref: GMAIL_IMAP_SETTINGS_URL,
    requiredBeforeNext: true,
    screen: "imap-tab",
  },
  {
    id: "activate-two-step",
    step: 2,
    title: "Turn on extra sign-in security",
    body: "Google requires extra sign-in security (2-Step Verification) before you can create a special password for PMail+. If it is off, turn it on and complete phone or authenticator verification until the status shows On.",
    tips: [
      "Open 2-Step Verification → Get started",
      "Verify your phone number or authenticator app",
      "Do not continue until status shows On",
    ],
    actionLabel: "Open Google Security",
    actionHref: GMAIL_TWO_STEP_URL,
    requiredBeforeNext: true,
    screen: "activate-two-step",
  },
  {
    id: "app-password",
    step: 3,
    title: "Create a special password for PMail+",
    body: "Google calls this an App Password. Generate one for Mail, then copy the 16-character code — paste it in the password field above, not your normal Gmail password.",
    actionLabel: "Create App Password",
    actionHref: GMAIL_APP_PASSWORDS_URL,
    screen: "app-password",
  },
  {
    id: "sign-in",
    step: 4,
    title: "Paste it above and sign in",
    body: "Enter your Gmail address and the 16-character code in the fields above, then tap Sign in to mailbox.",
    screen: "pmail-signin",
  },
];

export const GMAIL_CONNECT_STEP_COUNT = GMAIL_CONNECT_SLIDES.length;
