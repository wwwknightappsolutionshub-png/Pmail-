export type MailProviderPresetKey =
  | "microsoft"
  | "google"
  | "yahoo"
  | "apple"
  | "zoho"
  | "proton"
  | "fastmail"
  | "aol"
  | "hostinger"
  | "godaddy"
  | "custom";

export type MailProviderPreset = {
  key: MailProviderPresetKey;
  label: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
};

export const MAIL_PROVIDER_PRESETS: Record<Exclude<MailProviderPresetKey, "custom">, MailProviderPreset> = {
  microsoft: {
    key: "microsoft",
    label: "Microsoft 365",
    imapHost: "outlook.office365.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    smtpSecure: false,
  },
  google: {
    key: "google",
    label: "Google",
    imapHost: "imap.gmail.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpSecure: false,
  },
  yahoo: {
    key: "yahoo",
    label: "Yahoo Mail",
    imapHost: "imap.mail.yahoo.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.mail.yahoo.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  apple: {
    key: "apple",
    label: "Apple iCloud",
    imapHost: "imap.mail.me.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.mail.me.com",
    smtpPort: 587,
    smtpSecure: false,
  },
  zoho: {
    key: "zoho",
    label: "Zoho Mail",
    imapHost: "imap.zoho.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.zoho.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  proton: {
    key: "proton",
    label: "Proton Mail",
    imapHost: "127.0.0.1",
    imapPort: 1143,
    imapSecure: false,
    smtpHost: "127.0.0.1",
    smtpPort: 1025,
    smtpSecure: false,
  },
  fastmail: {
    key: "fastmail",
    label: "Fastmail",
    imapHost: "imap.fastmail.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.fastmail.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  aol: {
    key: "aol",
    label: "AOL Mail",
    imapHost: "imap.aol.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.aol.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  hostinger: {
    key: "hostinger",
    label: "Hostinger",
    imapHost: "imap.hostinger.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.hostinger.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  godaddy: {
    key: "godaddy",
    label: "GoDaddy",
    imapHost: "imap.secureserver.net",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtpout.secureserver.net",
    smtpPort: 465,
    smtpSecure: true,
  },
};

export const MAIL_PROVIDER_PRESET_KEYS = Object.keys(MAIL_PROVIDER_PRESETS) as Array<
  Exclude<MailProviderPresetKey, "custom">
>;

export type MailConfigInput = {
  providerPreset: MailProviderPresetKey;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
};

export function isMailProviderPresetKey(value: string): value is MailProviderPresetKey {
  return value === "custom" || value in MAIL_PROVIDER_PRESETS;
}

export function resolveMailConfigFromPreset(
  providerPreset: MailProviderPresetKey,
  custom?: Partial<Omit<MailConfigInput, "providerPreset">>,
): MailConfigInput {
  if (providerPreset === "custom") {
    return {
      providerPreset: "custom",
      imapHost: custom?.imapHost?.trim() ?? "",
      imapPort: custom?.imapPort ?? 993,
      imapSecure: custom?.imapSecure ?? true,
      smtpHost: custom?.smtpHost?.trim() ?? "",
      smtpPort: custom?.smtpPort ?? 465,
      smtpSecure: custom?.smtpSecure ?? true,
    };
  }

  const preset = MAIL_PROVIDER_PRESETS[providerPreset];
  return {
    providerPreset,
    imapHost: preset.imapHost,
    imapPort: preset.imapPort,
    imapSecure: preset.imapSecure,
    smtpHost: preset.smtpHost,
    smtpPort: preset.smtpPort,
    smtpSecure: preset.smtpSecure,
  };
}

const EMAIL_DOMAIN_PROVIDER_MAP: Record<string, MailProviderPresetKey> = {
  "gmail.com": "google",
  "googlemail.com": "google",
  "outlook.com": "microsoft",
  "hotmail.com": "microsoft",
  "live.com": "microsoft",
  "msn.com": "microsoft",
  "office365.com": "microsoft",
  "yahoo.com": "yahoo",
  "ymail.com": "yahoo",
  "rocketmail.com": "yahoo",
  "icloud.com": "apple",
  "me.com": "apple",
  "mac.com": "apple",
  "zoho.com": "zoho",
  "aol.com": "aol",
  "proton.me": "proton",
  "protonmail.com": "proton",
  "fastmail.com": "fastmail",
};

export function inferProviderPresetFromEmail(email: string): MailProviderPresetKey | null {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return null;
  return EMAIL_DOMAIN_PROVIDER_MAP[domain] ?? null;
}

export function matchProviderPresetFromHosts(
  config: Pick<MailConfigInput, "imapHost" | "imapPort" | "imapSecure" | "smtpHost" | "smtpPort" | "smtpSecure">,
): MailProviderPresetKey {
  for (const key of MAIL_PROVIDER_PRESET_KEYS) {
    const preset = MAIL_PROVIDER_PRESETS[key];
    if (
      preset.imapHost === config.imapHost &&
      preset.imapPort === config.imapPort &&
      preset.imapSecure === config.imapSecure &&
      preset.smtpHost === config.smtpHost &&
      preset.smtpPort === config.smtpPort &&
      preset.smtpSecure === config.smtpSecure
    ) {
      return key;
    }
  }
  return "custom";
}

export function resolveSuggestedMailConfigForLogin(
  email: string,
  tenantMail?: {
    imapHost: string;
    imapPort: number;
    imapSecure: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    mailOnboardingComplete: boolean;
  } | null,
): MailConfigInput {
  const inferred = inferProviderPresetFromEmail(email);
  if (inferred) {
    return resolveMailConfigFromPreset(inferred);
  }

  if (tenantMail) {
    const preset = matchProviderPresetFromHosts(tenantMail);
    if (preset !== "custom") {
      return resolveMailConfigFromPreset(preset);
    }
    return {
      providerPreset: "custom",
      imapHost: tenantMail.imapHost,
      imapPort: tenantMail.imapPort,
      imapSecure: tenantMail.imapSecure,
      smtpHost: tenantMail.smtpHost,
      smtpPort: tenantMail.smtpPort,
      smtpSecure: tenantMail.smtpSecure,
    };
  }

  return resolveMailConfigFromPreset("hostinger");
}
