export interface TenantBranding {
  productName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  loginTagline: string;
}

export interface TenantInfo {
  slug: string;
  name: string;
  branding: TenantBranding | null;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  businessVertical: BusinessVertical | null;
  uiThemeVersion: "dark" | "light";
  tenant: {
    id: string;
    slug: string;
    name: string;
    branding: TenantBranding | null;
    mail: { imapHost: string; smtpHost: string; mailOnboardingComplete?: boolean } | null;
  };
  mailConfig?: UserMailConfig | null;
  activeMailAccount?: {
    id: string;
    email: string;
    label: string | null;
    isPrimary: boolean;
    isActive: boolean;
  } | null;
  mailAccountCount?: number;
}

export type BusinessVertical =
  | "standard"
  | "free-basic"
  | "legal"
  | "real-estate"
  | "accounting"
  | "recruitment"
  | "b2b-services"
  | "healthcare";

export interface UserMailConfig {
  providerPreset: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  configuredAt?: string;
}

export interface MailFolder {
  path: string;
  name: string;
  delimiter: string;
  flags: string[];
  listed: boolean;
  specialUse?: string;
  unseen?: number;
}

export interface MailMessageSummary {
  uid: number;
  folder: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  seen: boolean;
  flagged: boolean;
  hasAttachments: boolean;
  snippet: string;
}

export type MailSortField = "date" | "subject" | "sender";
export type MailSortOrder = "asc" | "desc";

export interface MailListResult {
  messages: MailMessageSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MailMessageDetail extends MailMessageSummary {
  cc: string;
  bcc: string;
  html: string | null;
  text: string | null;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    partId: string;
  }>;
}
