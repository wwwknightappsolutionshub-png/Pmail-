export type FeatureAccess = "enabled" | "gated";

export type DemoAutoReply = {
  id: string;
  name: string;
  subject: string;
  body: string;
  isCustom?: boolean;
};

export type DemoSignature = {
  id: string;
  name: string;
  body: string;
  avatarUrl?: string;
  isCustom?: boolean;
};

export type DemoComposeSettings = {
  useCaseId: string;
  autoReplyAccess: FeatureAccess;
  autoReplyGatePlan: string;
  autoReplyGateHint: string;
  defaultSenderName: string;
  defaultSenderEmail: string;
  autoReplies: DemoAutoReply[];
  signatures: DemoSignature[];
};

export const BESPOKE_MAIL_COMPOSE_SETTINGS: Record<string, DemoComposeSettings> = {
  legal: {
    useCaseId: "legal",
    autoReplyAccess: "gated",
    autoReplyGatePlan: "Practice Pro",
    autoReplyGateHint: "Upgrade to Practice Pro to enable automated client acknowledgments.",
    defaultSenderName: "Alex Hartwell",
    defaultSenderEmail: "alex.hartwell@hartwell.law",
    autoReplies: [
      {
        id: "legal-ar-1",
        name: "Matter intake acknowledgment",
        subject: "Re: {{subject}} — Hartwell & Partners",
        body:
          "Thank you for your message. We have received your correspondence and linked it to the appropriate matter file. A member of our litigation team will respond within one business day.\n\nConfidentiality notice: This communication may contain privileged material.",
      },
      {
        id: "legal-ar-2",
        name: "After-hours court deadline",
        subject: "Out of office — urgent filings",
        body:
          "You have reached Hartwell & Partners outside business hours. For time-sensitive court filings, please call our emergency line at +1 (555) 014-2841. Non-urgent messages will be reviewed on the next business day.",
      },
    ],
    signatures: [
      {
        id: "legal-sig-1",
        name: "Partner — formal",
        body:
          "Alex Hartwell\nManaging Partner | Hartwell & Partners\nDirect: +1 (555) 014-2200\nalex.hartwell@hartwell.law\n\nPrivileged & confidential attorney-client communication.",
      },
      {
        id: "legal-sig-2",
        name: "Associate — matter thread",
        body:
          "Jordan Ellis\nSenior Associate — Litigation\nHartwell & Partners\nMatter ref: {{matter}}\nj.ellis@hartwell.law | +1 (555) 014-2214",
      },
    ],
  },

  "real-estate": {
    useCaseId: "real-estate",
    autoReplyAccess: "gated",
    autoReplyGatePlan: "Agent Plus",
    autoReplyGateHint: "Upgrade to Agent Plus to send automatic showing and offer acknowledgments.",
    defaultSenderName: "Morgan Blake",
    defaultSenderEmail: "morgan.blake@northline.realty",
    autoReplies: [
      {
        id: "re-ar-1",
        name: "Showing request received",
        subject: "Re: {{subject}} — Northline Realty",
        body:
          "Thanks for reaching out about a property showing. We received your request and will confirm availability within two hours during business hours.\n\nFor same-day tours, reply with your preferred time window.",
      },
      {
        id: "re-ar-2",
        name: "Offer submitted notice",
        subject: "Offer received — we are reviewing",
        body:
          "Your offer documents have been received and routed to the listing agent. We will follow up with next steps, counter terms, or acceptance status as soon as the seller responds.",
      },
    ],
    signatures: [
      {
        id: "re-sig-1",
        name: "Listing agent",
        body:
          "Morgan Blake\nListing Agent | Northline Realty\n+1 (555) 018-4402\nmorgan.blake@northline.realty\nwww.northline.realty",
      },
      {
        id: "re-sig-2",
        name: "Buyer agent — mobile",
        body:
          "Morgan Blake · Northline Realty\nHelping buyers close with confidence\nText or call: +1 (555) 018-4402",
      },
    ],
  },

  accounting: {
    useCaseId: "accounting",
    autoReplyAccess: "gated",
    autoReplyGatePlan: "Firm Essentials",
    autoReplyGateHint:
      "Auto-reply is available on Firm Essentials and above. Automate document intake confirmations and deadline notices.",
    defaultSenderName: "Samira Okonkwo",
    defaultSenderEmail: "samira@ledgerpoint.cpa",
    autoReplies: [
      {
        id: "acct-ar-1",
        name: "Document intake received",
        subject: "Re: {{subject}} — LedgerPoint CPA",
        body:
          "Thank you. Your documents have been received and queued for review by our tax team. We will confirm completeness or request any missing items within two business days.",
      },
      {
        id: "acct-ar-2",
        name: "Filing season hold",
        subject: "High volume — extended response window",
        body:
          "LedgerPoint CPA is operating at peak filing season volume. Your message is logged to your client entity file. Expect a response within 48 hours for non-urgent requests.",
      },
    ],
    signatures: [
      {
        id: "acct-sig-1",
        name: "Tax partner",
        body:
          "Samira Okonkwo, CPA\nPartner | LedgerPoint CPA\n+1 (555) 022-8801\nsamira@ledgerpoint.cpa\nSecure portal: portal.ledgerpoint.cpa",
      },
      {
        id: "acct-sig-2",
        name: "Client services",
        body:
          "LedgerPoint CPA — Client Services\nSamira Okonkwo\nWe simplify tax, payroll, and entity compliance.\n+1 (555) 022-8800",
      },
    ],
  },

  recruitment: {
    useCaseId: "recruitment",
    autoReplyAccess: "gated",
    autoReplyGatePlan: "Talent Pro",
    autoReplyGateHint: "Upgrade to Talent Pro to automate candidate and client acknowledgments.",
    defaultSenderName: "Priya Nair",
    defaultSenderEmail: "priya@talentbridge.hr",
    autoReplies: [
      {
        id: "rec-ar-1",
        name: "Candidate application received",
        subject: "Re: {{subject}} — TalentBridge",
        body:
          "Thank you for your application. Our recruiting team has received your materials and will review fit for the role within three business days. You may receive a scheduling link for a screening call.",
      },
      {
        id: "rec-ar-2",
        name: "Client role brief acknowledgment",
        subject: "Role brief received — TalentBridge",
        body:
          "We received your hiring brief and have opened a search workspace for your role. A consultant will confirm slate timing and interview milestones within one business day.",
      },
    ],
    signatures: [
      {
        id: "rec-sig-1",
        name: "Lead consultant",
        body:
          "Priya Nair\nLead Consultant | TalentBridge HR\n+1 (555) 026-3309\npriya@talentbridge.hr",
      },
      {
        id: "rec-sig-2",
        name: "Candidate outreach",
        body:
          "Priya Nair · TalentBridge\nBuilding teams that scale\nBook a call: talentbridge.hr/schedule",
      },
    ],
  },

  "b2b-services": {
    useCaseId: "b2b-services",
    autoReplyAccess: "gated",
    autoReplyGatePlan: "Enterprise Workspace",
    autoReplyGateHint:
      "Auto-reply is included with Enterprise Workspace. Automate SLA acknowledgments and project intake responses.",
    defaultSenderName: "Chris Delaney",
    defaultSenderEmail: "chris@nexusops.io",
    autoReplies: [
      {
        id: "b2b-ar-1",
        name: "Support ticket acknowledgment",
        subject: "Re: {{subject}} — NexusOps",
        body:
          "Your request has been logged to our support queue. A project manager will confirm priority, owner, and ETA according to your account SLA within four business hours.",
      },
      {
        id: "b2b-ar-2",
        name: "Proposal intake",
        subject: "Proposal request received — NexusOps",
        body:
          "Thank you for the proposal brief. Our solutions team is reviewing scope and will respond with timeline, assumptions, and next steps within two business days.",
      },
    ],
    signatures: [
      {
        id: "b2b-sig-1",
        name: "Account executive",
        body:
          "Chris Delaney\nAccount Executive | NexusOps\n+1 (555) 030-7710\nchris@nexusops.io\nSLA-backed delivery for B2B teams",
      },
      {
        id: "b2b-sig-2",
        name: "Project delivery",
        body:
          "Chris Delaney · NexusOps Delivery\nShip milestones on time, every time.\nStatus portal: clients.nexusops.io",
      },
    ],
  },

  healthcare: {
    useCaseId: "healthcare",
    autoReplyAccess: "gated",
    autoReplyGatePlan: "Care Connect",
    autoReplyGateHint: "Upgrade to Care Connect to enable automated patient intake and after-hours responses.",
    defaultSenderName: "Maya Chen",
    defaultSenderEmail: "maya.chen@summitcare.health",
    autoReplies: [
      {
        id: "hc-ar-1",
        name: "Patient message received",
        subject: "Re: {{subject}} — Summit Care Partners",
        body:
          "Thank you for contacting Summit Care Partners. Your message has been received by our care coordination team. For urgent medical concerns, please call 911 or our nurse line at +1 (617) 555-0140.\n\nA coordinator will respond within one business day.",
      },
      {
        id: "hc-ar-2",
        name: "After-hours clinic notice",
        subject: "Clinic closed — non-urgent messages",
        body:
          "Our clinic is currently closed. Non-urgent messages will be reviewed on the next business day. For urgent symptoms, contact your physician on call or visit the nearest emergency department.",
      },
    ],
    signatures: [
      {
        id: "hc-sig-1",
        name: "Care coordinator — formal",
        body:
          "Maya Chen\nCare Coordinator | Summit Care Partners\n+1 (617) 555-0140\nmaya.chen@summitcare.health\n\nThis message may contain protected health information (PHI).",
      },
      {
        id: "hc-sig-2",
        name: "Clinical outreach — concise",
        body:
          "Maya Chen · Summit Care Partners\nCoordinating your care, one message at a time\nSecure portal: portal.summitcare.health",
      },
    ],
  },
};

export function getComposeSettings(useCaseId: string): DemoComposeSettings {
  return BESPOKE_MAIL_COMPOSE_SETTINGS[useCaseId] ?? BESPOKE_MAIL_COMPOSE_SETTINGS.legal;
}
