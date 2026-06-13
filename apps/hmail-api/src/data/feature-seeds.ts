export const SYSTEM_IMMIGRATION_TEMPLATES = [
  {
    slug: "client-aor-update",
    name: "AOR acknowledgement to client",
    subject: "Update: Application received (AOR) — {{client_name}}",
    description: "Notify client that IRCC issued an Acknowledgement of Receipt.",
    category: "client_update",
    bodyHtml:
      "<p>Dear {{client_name}},</p><p>We received confirmation that Immigration, Refugees and Citizenship Canada (IRCC) has issued an <strong>Acknowledgement of Receipt (AOR)</strong> for your {{program}} application.</p><p><strong>UCI:</strong> {{uci}}</p><p>We will monitor your file and contact you when the next IRCC update arrives.</p><p>Regards,<br>{{firm_name}}</p>",
  },
  {
    slug: "document-request-pr",
    name: "Document request — PR stream",
    subject: "Documents needed for your {{program}} application",
    description: "Request supporting documents for permanent residence applications.",
    category: "document_request",
    bodyHtml:
      "<p>Dear {{client_name}},</p><p>To progress your {{program}} application, please provide the following documents by <strong>{{due_date}}</strong>:</p><ul><li>Passport biographical pages</li><li>Police certificates</li><li>Updated employment letters</li><li>Digital photos (IRCC specs)</li></ul><p>Upload securely using the link we provided or reply to this email.</p><p>Regards,<br>{{firm_name}}</p>",
  },
  {
    slug: "biometrics-reminder",
    name: "Biometrics instruction reminder",
    subject: "Action required: Biometrics for {{client_name}}",
    description: "Remind client to complete biometrics within IRCC deadline.",
    category: "action_required",
    bodyHtml:
      "<p>Dear {{client_name}},</p><p>IRCC has requested biometrics for your application. Please book an appointment and complete biometrics before <strong>{{due_date}}</strong>.</p><p>Bring your biometrics instruction letter and passport.</p><p>Regards,<br>{{firm_name}}</p>",
  },
  {
    slug: "pfl-response",
    name: "Procedural fairness letter — client briefing",
    subject: "Important: IRCC procedural fairness letter",
    description: "Explain PFL to client and request input before response deadline.",
    category: "action_required",
    bodyHtml:
      "<p>Dear {{client_name}},</p><p>IRCC issued a <strong>procedural fairness letter (PFL)</strong>. We must respond by <strong>{{due_date}}</strong>.</p><p>Please review the concerns listed and send any clarifying documents or statements within 48 hours so we can draft a response.</p><p>Regards,<br>{{firm_name}}</p>",
  },
  {
    slug: "imm5476-consent",
    name: "IMM5476 representative consent follow-up",
    subject: "Consent form required — IMM5476",
    description: "Follow up on representative consent form for regulated practice.",
    category: "compliance",
    bodyHtml:
      "<p>Dear {{client_name}},</p><p>To continue representing you before IRCC, we require a signed <strong>IMM5476 Use of a Representative</strong> form.</p><p>Please sign and return the attached form at your earliest convenience.</p><p>Regards,<br>{{firm_name}}</p>",
  },
];

export const PROGRAM_CHECKLIST_TEMPLATES: Record<string, Array<{ label: string; category: string }>> = {
  express_entry: [
    { label: "IMM0008 — Generic Application Form", category: "imm_form" },
    { label: "IMM5669 — Schedule A Background", category: "imm_form" },
    { label: "Passport biographical pages", category: "identity" },
    { label: "Language test results (IELTS/CELPIP/TEF)", category: "language" },
    { label: "Educational Credential Assessment", category: "education" },
    { label: "Police certificates", category: "background" },
    { label: "Proof of funds", category: "financial" },
    { label: "Digital photos — IRCC specifications", category: "identity" },
  ],
  spousal_sponsorship: [
    { label: "IMM1344 — Application to Sponsor", category: "imm_form" },
    { label: "IMM0008 — Generic Application Form", category: "imm_form" },
    { label: "IMM5406 — Additional Family Information", category: "imm_form" },
    { label: "Marriage certificate", category: "relationship" },
    { label: "Cohabitation evidence", category: "relationship" },
    { label: "Sponsor Notice of Assessment", category: "financial" },
    { label: "Police certificates", category: "background" },
  ],
  study_permit: [
    { label: "Letter of acceptance", category: "education" },
    { label: "Proof of financial support", category: "financial" },
    { label: "IMM1294 — Study Permit Application", category: "imm_form" },
    { label: "Passport", category: "identity" },
    { label: "Digital photos", category: "identity" },
  ],
};
