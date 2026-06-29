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
  shortLabel: string;
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
    shortLabel: "MS",
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
    shortLabel: "G",
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
    shortLabel: "Y!",
    imapHost: "imap.mail.yahoo.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.mail.yahoo.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  apple: {
    key: "apple",
    label: "Apple",
    shortLabel: "",
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
    shortLabel: "Z",
    imapHost: "imap.zoho.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.zoho.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  proton: {
    key: "proton",
    label: "Protonmail",
    shortLabel: "P",
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
    shortLabel: "FM",
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
    shortLabel: "AOL",
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
    shortLabel: "H",
    imapHost: "imap.hostinger.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.hostinger.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  godaddy: {
    key: "godaddy",
    label: "GO Daddy",
    shortLabel: "GD",
    imapHost: "imap.secureserver.net",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtpout.secureserver.net",
    smtpPort: 465,
    smtpSecure: true,
  },
};

export const CUSTOM_PROVIDER_PRESET: MailProviderPreset = {
  key: "custom",
  label: "Custom",
  shortLabel: "+",
  imapHost: "",
  imapPort: 993,
  imapSecure: true,
  smtpHost: "",
  smtpPort: 465,
  smtpSecure: true,
};

export const MAIL_PROVIDER_LIST: MailProviderPreset[] = [
  ...Object.values(MAIL_PROVIDER_PRESETS),
  CUSTOM_PROVIDER_PRESET,
];

export type MailConfigValues = {
  providerPreset: MailProviderPresetKey;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
};

/** Login form allows no provider until the user picks one. */
export type LoginMailConfigValues = Omit<MailConfigValues, "providerPreset"> & {
  providerPreset: MailProviderPresetKey | null;
};

export function resolveMailConfigFromPreset(
  providerPreset: MailProviderPresetKey,
  custom?: Partial<Omit<MailConfigValues, "providerPreset">>,
): MailConfigValues {
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

export function defaultMailConfig(): MailConfigValues {
  return resolveMailConfigFromPreset("hostinger");
}

/** Login form starts with no provider selected — user must pick one. */
export function emptyMailConfig(): LoginMailConfigValues {
  return {
    providerPreset: null,
    imapHost: "",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
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

/** Business domains that must always use Hostinger mail settings at sign-in. */
export const HOSTINGER_FORCED_EMAIL_DOMAINS = new Set(["onoseimmigration.com"]);

export function isHostingerForcedEmailDomain(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  return domain ? HOSTINGER_FORCED_EMAIL_DOMAINS.has(domain) : false;
}

export function resolveHostingerForcedDomainMailConfig(): MailConfigValues {
  return resolveMailConfigFromPreset("hostinger");
}

export function applySuggestedMailConfig(
  suggested: Partial<MailConfigValues> & { providerPreset: MailProviderPresetKey },
): MailConfigValues {
  const presetConfig = resolveMailConfigFromPreset(suggested.providerPreset, suggested);
  return {
    providerPreset: suggested.providerPreset,
    imapHost: suggested.imapHost?.trim() || presetConfig.imapHost,
    imapPort: suggested.imapPort ?? presetConfig.imapPort,
    imapSecure: suggested.imapSecure ?? presetConfig.imapSecure,
    smtpHost: suggested.smtpHost?.trim() || presetConfig.smtpHost,
    smtpPort: suggested.smtpPort ?? presetConfig.smtpPort,
    smtpSecure: suggested.smtpSecure ?? presetConfig.smtpSecure,
  };
}

export function inferProviderPresetFromEmail(email: string): MailProviderPresetKey | null {
  if (isHostingerForcedEmailDomain(email)) {
    return "hostinger";
  }
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return null;
  return EMAIL_DOMAIN_PROVIDER_MAP[domain] ?? null;
}

export function formatMailConfigSummary(config: Pick<LoginMailConfigValues, "providerPreset" | "imapHost" | "imapPort" | "smtpHost" | "smtpPort">): string {
  if (!config.providerPreset) {
    return "Select your mail provider above";
  }
  const preset = MAIL_PROVIDER_LIST.find((entry) => entry.key === config.providerPreset);
  const label = preset?.label ?? "Custom";
  return `${label} · IMAP ${config.imapHost}:${config.imapPort} · SMTP ${config.smtpHost}:${config.smtpPort}`;
}
