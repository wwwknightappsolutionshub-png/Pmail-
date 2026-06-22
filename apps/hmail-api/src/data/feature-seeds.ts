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

export const SYSTEM_REAL_ESTATE_TEMPLATES = [
  {
    slug: "showing-confirmation",
    name: "Showing confirmation",
    subject: "Showing confirmed — {{property_address}} on {{showing_date}}",
    description: "Confirm a property showing with date, time, and access instructions.",
    category: "showing",
    bodyHtml:
      "<p>Hi {{buyer_name}},</p><p>Your showing at <strong>{{property_address}}</strong> is confirmed for <strong>{{showing_date}}</strong> at <strong>{{showing_time}}</strong>.</p><p>Please arrive 5 minutes early. Reply if you need to reschedule.</p><p>Regards,<br>{{agent_name}}</p>",
  },
  {
    slug: "offer-submitted",
    name: "Offer submitted notice",
    subject: "Offer submitted — {{property_address}}",
    description: "Notify seller or buyer that an offer has been submitted.",
    category: "offer",
    bodyHtml:
      "<p>Hi {{client_name}},</p><p>We have submitted your offer on <strong>{{property_address}}</strong> at <strong>{{offer_amount}}</strong>.</p><p>I will update you as soon as the seller responds.</p><p>Regards,<br>{{agent_name}}</p>",
  },
  {
    slug: "listing-price-update",
    name: "MLS price refresh",
    subject: "Price update — {{property_address}} now {{list_price}}",
    description: "Inform interested buyers of a listing price change.",
    category: "listing",
    bodyHtml:
      "<p>Hi {{buyer_name}},</p><p>The listing at <strong>{{property_address}}</strong> has been updated to <strong>{{list_price}}</strong>.</p><p>Let me know if you would like to schedule a showing.</p><p>Regards,<br>{{agent_name}}</p>",
  },
  {
    slug: "showing-follow-up",
    name: "Post-showing follow-up",
    subject: "Thoughts on {{property_address}}?",
    description: "Follow up after a property showing.",
    category: "showing",
    bodyHtml:
      "<p>Hi {{buyer_name}},</p><p>Thank you for viewing <strong>{{property_address}}</strong> today.</p><p>Do you have any questions, or would you like to see comparable listings?</p><p>Regards,<br>{{agent_name}}</p>",
  },
  {
    slug: "deal-closing-reminder",
    name: "Closing date reminder",
    subject: "Closing reminder — {{property_address}} on {{closing_date}}",
    description: "Remind all parties of upcoming closing date and final walkthrough.",
    category: "closing",
    bodyHtml:
      "<p>Hi {{client_name}},</p><p>This is a reminder that closing for <strong>{{property_address}}</strong> is scheduled for <strong>{{closing_date}}</strong>.</p><p>Please confirm your final walkthrough time and bring required ID to the lawyer's office.</p><p>Regards,<br>{{agent_name}}</p>",
  },
];

export const SYSTEM_ACCOUNTING_TEMPLATES = [
  {
    slug: "secure-doc-request",
    name: "Secure document request",
    subject: "Documents needed — {{entity_name}} (ref {{reference_code}})",
    description: "Request client documents via secure exchange portal.",
    category: "document_request",
    bodyHtml:
      "<p>Dear {{client_name}},</p><p>Please upload the following documents for <strong>{{entity_name}}</strong> by <strong>{{due_date}}</strong> using our secure portal:</p><ul><li>T4 slips and notices of assessment</li><li>Bank statements</li><li>Receipts for deductible expenses</li></ul><p>Use the secure link we provided — do not email attachments directly.</p><p>Regards,<br>{{firm_name}}</p>",
  },
  {
    slug: "tax-filing-reminder",
    name: "Tax filing deadline reminder",
    subject: "Filing deadline approaching — {{entity_name}}",
    description: "Remind client of upcoming tax filing deadline.",
    category: "filing",
    bodyHtml:
      "<p>Dear {{client_name}},</p><p>This is a reminder that the filing deadline for <strong>{{entity_name}}</strong> is <strong>{{due_date}}</strong>.</p><p>Please confirm all requested documents have been uploaded or reply if you need an extension.</p><p>Regards,<br>{{firm_name}}</p>",
  },
  {
    slug: "secure-upload-confirmation",
    name: "Secure upload confirmation",
    subject: "Documents received — {{entity_name}}",
    description: "Confirm receipt of documents via secure exchange.",
    category: "confirmation",
    bodyHtml:
      "<p>Dear {{client_name}},</p><p>We have received your uploaded documents for <strong>{{entity_name}}</strong> via our secure portal.</p><p>Our team will review them and contact you if anything else is required.</p><p>Regards,<br>{{firm_name}}</p>",
  },
  {
    slug: "missing-doc-chase",
    name: "Missing document follow-up",
    subject: "Action required: outstanding documents for {{entity_name}}",
    description: "Chase overdue document requests before filing deadline.",
    category: "document_request",
    bodyHtml:
      "<p>Dear {{client_name}},</p><p>We are still missing documents for <strong>{{entity_name}}</strong>. The filing deadline is <strong>{{due_date}}</strong>.</p><p>Please upload the outstanding items via our secure portal at your earliest convenience.</p><p>Regards,<br>{{firm_name}}</p>",
  },
  {
    slug: "entity-onboarding",
    name: "New entity onboarding",
    subject: "Welcome — {{entity_name}} client portal access",
    description: "Onboard a new client entity to secure document exchange.",
    category: "onboarding",
    bodyHtml:
      "<p>Dear {{client_name}},</p><p>Welcome to <strong>{{firm_name}}</strong>. We have set up a secure document exchange portal for <strong>{{entity_name}}</strong>.</p><p>Use the link below to upload tax records and sign engagement documents. All access is logged for compliance.</p><p>Regards,<br>{{firm_name}}</p>",
  },
];

export const SYSTEM_RECRUITMENT_TEMPLATES = [
  {
    slug: "candidate-outreach",
    name: "Candidate outreach",
    subject: "Opportunity: {{role_title}} at {{client_company}}",
    description: "Initial outreach to a prospective candidate for an open role.",
    category: "outreach",
    bodyHtml:
      "<p>Hi {{candidate_name}},</p><p>I am reaching out about a <strong>{{role_title}}</strong> opportunity with <strong>{{client_company}}</strong>.</p><p>Would you be open to a brief call this week to discuss the role?</p><p>Regards,<br>{{recruiter_name}}</p>",
  },
  {
    slug: "interview-confirmation",
    name: "Interview confirmation",
    subject: "Interview confirmed — {{role_title}} on {{interview_date}}",
    description: "Confirm a scheduled candidate interview.",
    category: "interview",
    bodyHtml:
      "<p>Hi {{candidate_name}},</p><p>Your interview for <strong>{{role_title}}</strong> at <strong>{{client_company}}</strong> is confirmed for <strong>{{interview_date}}</strong> at <strong>{{interview_time}}</strong>.</p><p>Please reply if you need to reschedule.</p><p>Regards,<br>{{recruiter_name}}</p>",
  },
  {
    slug: "bulk-campaign-intro",
    name: "Bulk campaign introduction",
    subject: "We're hiring: {{role_title}} roles available",
    description: "Bulk outreach campaign intro for multiple open requisitions.",
    category: "campaign",
    bodyHtml:
      "<p>Hi {{candidate_name}},</p><p>We are actively recruiting for several <strong>{{role_title}}</strong> positions with our clients.</p><p>If you are exploring new opportunities, reply with your resume and preferred location.</p><p>Regards,<br>{{recruiter_name}}</p>",
  },
  {
    slug: "post-interview-follow-up",
    name: "Post-interview follow-up",
    subject: "Thank you — {{role_title}} interview",
    description: "Follow up after a candidate interview.",
    category: "interview",
    bodyHtml:
      "<p>Hi {{candidate_name}},</p><p>Thank you for interviewing for <strong>{{role_title}}</strong> at <strong>{{client_company}}</strong>.</p><p>We will update you on next steps within the next few business days.</p><p>Regards,<br>{{recruiter_name}}</p>",
  },
  {
    slug: "offer-notification",
    name: "Offer stage notification",
    subject: "Update on {{role_title}} — offer stage",
    description: "Notify candidate that an offer is being prepared.",
    category: "placement",
    bodyHtml:
      "<p>Hi {{candidate_name}},</p><p>Good news — <strong>{{client_company}}</strong> would like to move forward with an offer for <strong>{{role_title}}</strong>.</p><p>I will send the formal details shortly. Please confirm your availability for a quick call.</p><p>Regards,<br>{{recruiter_name}}</p>",
  },
];

export const SYSTEM_B2B_TEMPLATES = [
  {
    slug: "proposal-submitted",
    name: "Proposal submitted",
    subject: "Proposal delivered — {{project_name}}",
    description: "Notify client that a proposal or SOW has been sent.",
    category: "proposal",
    bodyHtml:
      "<p>Hi {{client_name}},</p><p>Please find attached our proposal for <strong>{{project_name}}</strong>.</p><p>We are available to walk through scope, timeline, and pricing at your convenience.</p><p>Regards,<br>{{account_manager}}</p>",
  },
  {
    slug: "sow-revision",
    name: "SOW revision notice",
    subject: "Revised SOW — {{project_name}} v{{version}}",
    description: "Send a revised statement of work with version tracking.",
    category: "proposal",
    bodyHtml:
      "<p>Hi {{client_name}},</p><p>Attached is version <strong>{{version}}</strong> of the SOW for <strong>{{project_name}}</strong>, reflecting your feedback from our last call.</p><p>Please review and confirm approval so we can begin the next phase.</p><p>Regards,<br>{{account_manager}}</p>",
  },
  {
    slug: "milestone-check-in",
    name: "Milestone check-in",
    subject: "Milestone update — {{project_name}}",
    description: "Status check-in ahead of a project milestone.",
    category: "project",
    bodyHtml:
      "<p>Hi {{client_name}},</p><p>Our team is preparing the next milestone for <strong>{{project_name}}</strong>, scheduled for <strong>{{milestone_date}}</strong>.</p><p>Please confirm any outstanding dependencies on your side.</p><p>Regards,<br>{{account_manager}}</p>",
  },
  {
    slug: "sla-escalation-notice",
    name: "SLA escalation notice",
    subject: "SLA update — {{project_name}}",
    description: "Notify client of SLA status or escalation.",
    category: "sla",
    bodyHtml:
      "<p>Hi {{client_name}},</p><p>This is an update on the response SLA for <strong>{{project_name}}</strong>. Our team is actively working on your request and will respond by <strong>{{response_due}}</strong>.</p><p>Reply if you need immediate assistance.</p><p>Regards,<br>{{account_manager}}</p>",
  },
  {
    slug: "project-kickoff",
    name: "Project kickoff invite",
    subject: "Kickoff call — {{project_name}}",
    description: "Invite client to project kickoff after proposal acceptance.",
    category: "project",
    bodyHtml:
      "<p>Hi {{client_name}},</p><p>Thank you for approving the proposal for <strong>{{project_name}}</strong>.</p><p>Let's schedule a kickoff call to align on milestones, contacts, and communication channels.</p><p>Regards,<br>{{account_manager}}</p>",
  },
];

export const SYSTEM_HEALTHCARE_TEMPLATES = [
  {
    slug: "referral-received",
    name: "Referral received acknowledgement",
    subject: "Referral received — {{patient_name}}",
    description: "Acknowledge receipt of an inbound patient referral.",
    category: "referral",
    bodyHtml:
      "<p>Dear {{provider_name}},</p><p>We have received your referral for <strong>{{patient_name}}</strong> and added it to our intake queue.</p><p>We will contact the patient within <strong>{{response_window}}</strong> business days.</p><p>Regards,<br>{{clinic_name}}</p>",
  },
  {
    slug: "referral-status-update",
    name: "Referral status update",
    subject: "Referral update — {{patient_name}}",
    description: "Update referring provider on referral pipeline status.",
    category: "referral",
    bodyHtml:
      "<p>Dear {{provider_name}},</p><p>Update on your referral for <strong>{{patient_name}}</strong>: status is now <strong>{{referral_status}}</strong>.</p><p>We will notify you when the patient has been scheduled or if additional information is needed.</p><p>Regards,<br>{{clinic_name}}</p>",
  },
  {
    slug: "appointment-confirmation",
    name: "Appointment confirmation",
    subject: "Appointment confirmed — {{patient_name}} on {{appointment_date}}",
    description: "Confirm a patient appointment linked to a referral.",
    category: "appointment",
    bodyHtml:
      "<p>Dear {{patient_name}},</p><p>Your appointment at <strong>{{clinic_name}}</strong> is confirmed for <strong>{{appointment_date}}</strong> at <strong>{{appointment_time}}</strong>.</p><p>Please arrive 15 minutes early with your health card and referral letter.</p><p>Regards,<br>{{clinic_name}}</p>",
  },
  {
    slug: "referral-additional-info",
    name: "Referral additional information request",
    subject: "Additional information needed — referral for {{patient_name}}",
    description: "Request missing clinical information for a referral.",
    category: "referral",
    bodyHtml:
      "<p>Dear {{provider_name}},</p><p>To process the referral for <strong>{{patient_name}}</strong>, we require additional clinical notes or recent imaging results.</p><p>Please reply securely or fax to our intake line.</p><p>Regards,<br>{{clinic_name}}</p>",
  },
  {
    slug: "referral-closed-loop",
    name: "Referral closed-loop report",
    subject: "Referral outcome — {{patient_name}}",
    description: "Close the loop with referring provider after patient visit.",
    category: "referral",
    bodyHtml:
      "<p>Dear {{provider_name}},</p><p>We have completed the initial visit for <strong>{{patient_name}}</strong> following your referral.</p><p>A summary report will be sent via secure channels. Contact us if you need immediate consultation notes.</p><p>Regards,<br>{{clinic_name}}</p>",
  },
];
