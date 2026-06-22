export const AUTO_REPLY_FUNCTIONALITY_SLUG = "auto-reply-functionality";

export const AUTO_REPLY_COMPLIMENTARY_DAYS = 14;

/** Send upsell email this many days before complimentary access ends. */
export const AUTO_REPLY_UPSELL_DAYS_BEFORE_END = 3;

export type AutoReplyTemplateSeed = {
  name: string;
  subject: string;
  body: string;
};

const DEFAULT_TEMPLATES: AutoReplyTemplateSeed[] = [
  {
    name: "Inbox acknowledgment",
    subject: "Re: {{subject}} — We received your message",
    body:
      "Thank you for your email. We have received your message and will respond as soon as possible during business hours.",
  },
  {
    name: "After-hours notice",
    subject: "Out of office — non-urgent messages",
    body:
      "You have reached us outside business hours. Non-urgent messages will be reviewed on the next business day.",
  },
];

export const AUTO_REPLY_TEMPLATES_BY_VERTICAL: Record<string, AutoReplyTemplateSeed[]> = {
  legal: [
    {
      name: "Matter intake acknowledgment",
      subject: "Re: {{subject}} — Hartwell & Partners",
      body:
        "Thank you for your message. We have received your correspondence and linked it to the appropriate matter file. A member of our litigation team will respond within one business day.",
    },
    {
      name: "After-hours court deadline",
      subject: "Out of office — urgent filings",
      body:
        "You have reached us outside business hours. For time-sensitive court filings, please call our emergency line. Non-urgent messages will be reviewed on the next business day.",
    },
  ],
  "real-estate": [
    {
      name: "Showing request received",
      subject: "Re: {{subject}} — Northline Realty",
      body:
        "Thanks for reaching out about a property showing. We received your request and will confirm availability within two hours during business hours.",
    },
    {
      name: "Offer submitted notice",
      subject: "Offer received — we are reviewing",
      body: "Your offer documents have been received and routed to the listing agent. We will follow up with next steps as soon as the seller responds.",
    },
  ],
  accounting: [
    {
      name: "Document intake received",
      subject: "Re: {{subject}} — LedgerPoint CPA",
      body:
        "Thank you. Your documents have been received and queued for review by our tax team. We will confirm completeness within two business days.",
    },
    {
      name: "Filing season hold",
      subject: "High volume — extended response window",
      body:
        "We are operating at peak filing season volume. Your message is logged to your client entity file. Expect a response within 48 hours for non-urgent requests.",
    },
  ],
  recruitment: [
    {
      name: "Candidate application received",
      subject: "Re: {{subject}} — TalentBridge",
      body:
        "Thank you for your application. Our recruiting team has received your materials and will review fit for the role within three business days.",
    },
    {
      name: "Client role brief acknowledgment",
      subject: "Role brief received — TalentBridge",
      body:
        "We received your hiring brief and have opened a search workspace for your role. A consultant will confirm slate timing within one business day.",
    },
  ],
  "b2b-services": [
    {
      name: "Support ticket acknowledgment",
      subject: "Re: {{subject}} — NexusOps",
      body:
        "Your request has been logged to our support queue. A project manager will confirm priority and ETA according to your account SLA within four business hours.",
    },
    {
      name: "Proposal intake",
      subject: "Proposal request received — NexusOps",
      body:
        "Thank you for the proposal brief. Our solutions team is reviewing scope and will respond with timeline and next steps within two business days.",
    },
  ],
  healthcare: [
    {
      name: "Patient message received",
      subject: "Re: {{subject}} — Summit Care Partners",
      body:
        "Thank you for contacting Summit Care Partners. Your message has been received by our care coordination team. For urgent medical concerns, please call 911 or our nurse line.",
    },
    {
      name: "After-hours clinic notice",
      subject: "Clinic closed — non-urgent messages",
      body:
        "Our clinic is currently closed. Non-urgent messages will be reviewed on the next business day. For urgent symptoms, contact your physician on call.",
    },
  ],
};

export function resolveAutoReplyTemplates(businessVertical: string | null | undefined): AutoReplyTemplateSeed[] {
  if (!businessVertical) return DEFAULT_TEMPLATES;
  return AUTO_REPLY_TEMPLATES_BY_VERTICAL[businessVertical] ?? DEFAULT_TEMPLATES;
}
