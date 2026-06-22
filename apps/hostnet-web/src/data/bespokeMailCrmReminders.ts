import type { DemoCrmContact, DemoReminder } from "./bespokeMailDemoData";

export const LEGAL_CRM: DemoCrmContact[] = [
  {
    id: "legal-c1",
    name: "R. Chen",
    email: "r.chen@clientmail.com",
    phone: "+1 (415) 555-0142",
    organization: "Chen v. Metro",
    stage: "Active matter",
    notes: "Retainer signed. Awaiting passport copy for filing package.",
    lastActivity: "Yesterday",
  },
  {
    id: "legal-c2",
    name: "Apex Corp Legal",
    email: "legal@apexcorp.com",
    phone: "+1 (628) 555-0198",
    organization: "Apex NDA",
    stage: "Contract review",
    notes: "MSA redlines sent to partner for approval.",
    lastActivity: "Mon",
  },
  {
    id: "legal-c3",
    name: "Clerk of Court",
    email: "filings@courts.gov",
    phone: "+1 (800) 555-0100",
    organization: "Metro County Court",
    stage: "Court liaison",
    notes: "Hearing confirmed Mar 18. Disclosure deadline Mar 12.",
    lastActivity: "Today",
  },
];

export const LEGAL_REMINDERS: DemoReminder[] = [
  {
    id: "legal-r1",
    title: "File updated disclosures",
    dueAt: "Mar 12, 5:00 PM",
    contactId: "legal-c1",
    status: "pending",
    channel: "email",
  },
  {
    id: "legal-r2",
    title: "Preliminary hearing prep call",
    dueAt: "Mar 17, 10:00 AM",
    contactId: "legal-c1",
    status: "pending",
    channel: "in-app",
  },
  {
    id: "legal-r3",
    title: "Partner review — Apex MSA",
    dueAt: "Mar 11, 3:00 PM",
    contactId: "legal-c2",
    status: "pending",
    channel: "email",
  },
];

export const REAL_ESTATE_CRM: DemoCrmContact[] = [
  {
    id: "re-c1",
    name: "Jordan Lee",
    email: "j.lee@buyermail.com",
    phone: "+1 (503) 555-0177",
    organization: "Buyer — 42 Oak Lane",
    stage: "Offer review",
    notes: "Confirmed showing 4pm. Interested at $518k offer level.",
    lastActivity: "Today",
  },
  {
    id: "re-c2",
    name: "Sandra Ortiz",
    email: "s.ortiz@sellerbox.com",
    phone: "+1 (503) 555-0133",
    organization: "Seller — 18 River Court",
    stage: "Active listing",
    notes: "Price reduced to $425k. Follow-up sequence running.",
    lastActivity: "Sun",
  },
  {
    id: "re-c3",
    name: "Agent Kim",
    email: "kim@northline.realty",
    phone: "+1 (503) 555-0110",
    organization: "Northline Realty",
    stage: "Team collaborator",
    notes: "Co-listing lead on 42 Oak Lane deal room.",
    lastActivity: "Yesterday",
  },
];

export const REAL_ESTATE_REMINDERS: DemoReminder[] = [
  {
    id: "re-r1",
    title: "Send lockbox code — Jordan Lee",
    dueAt: "Today, 2:00 PM",
    contactId: "re-c1",
    status: "pending",
    channel: "email",
  },
  {
    id: "re-r2",
    title: "Offer response deadline",
    dueAt: "Mar 14, 6:00 PM",
    contactId: "re-c1",
    status: "pending",
    channel: "in-app",
  },
  {
    id: "re-r3",
    title: "MLS refresh — 18 River Court",
    dueAt: "Mar 13, 9:00 AM",
    contactId: "re-c2",
    status: "pending",
    channel: "email",
  },
];

export const ACCOUNTING_CRM: DemoCrmContact[] = [
  {
    id: "acct-c1",
    name: "M. Ortiz",
    email: "m.ortiz@riversidehold.com",
    phone: "+1 (312) 555-0164",
    organization: "Riverside Holdings LLC",
    stage: "Tax prep",
    notes: "8879 signed. Awaiting final payment authorization confirmation.",
    lastActivity: "Mon",
  },
  {
    id: "acct-c2",
    name: "Parkview Partners LP",
    email: "tax@parkviewpartners.com",
    phone: "+1 (312) 555-0188",
    organization: "Parkview Partners",
    stage: "Partnership return",
    notes: "Missing K-1 from one partner. Reminder sent.",
    lastActivity: "Yesterday",
  },
  {
    id: "acct-c3",
    name: "L. Nguyen",
    email: "l.nguyen@freelance.dev",
    phone: "+1 (773) 555-0120",
    organization: "Individual — Schedule C",
    stage: "Document intake",
    notes: "W-2 received. 1099-NEC still outstanding.",
    lastActivity: "Today",
  },
];

export const ACCOUNTING_REMINDERS: DemoReminder[] = [
  {
    id: "acct-r1",
    title: "W-2 follow-up — Riverside Holdings",
    dueAt: "Mar 20, 11:00 AM",
    contactId: "acct-c1",
    status: "pending",
    channel: "email",
  },
  {
    id: "acct-r2",
    title: "Partnership return filing",
    dueAt: "Mar 15, 5:00 PM",
    contactId: "acct-c2",
    status: "pending",
    channel: "in-app",
  },
  {
    id: "acct-r3",
    title: "Send 1099 reminder — L. Nguyen",
    dueAt: "Mar 12, 9:00 AM",
    contactId: "acct-c3",
    status: "pending",
    channel: "email",
  },
];

export const RECRUITMENT_CRM: DemoCrmContact[] = [
  {
    id: "rec-c1",
    name: "A. Mensah",
    email: "a.mensah@email.com",
    phone: "+1 (647) 555-0149",
    organization: "Senior Platform Engineer",
    stage: "Final interview",
    notes: "Available Thu after 3pm or Fri AM. Panel format requested.",
    lastActivity: "Yesterday",
  },
  {
    id: "rec-c2",
    name: "Acme HR",
    email: "hr@acmesaas.com",
    phone: "+1 (415) 555-0191",
    organization: "Acme SaaS",
    stage: "Client",
    notes: "Offer template approved. Awaiting interview feedback.",
    lastActivity: "Mon",
  },
  {
    id: "rec-c3",
    name: "T. Brooks",
    email: "t.brooks@email.com",
    phone: "+1 (604) 555-0172",
    organization: "DevOps Lead",
    stage: "Phone screen",
    notes: "Sourced via outreach batch #12. Strong Kubernetes background.",
    lastActivity: "Today",
  },
];

export const RECRUITMENT_REMINDERS: DemoReminder[] = [
  {
    id: "rec-r1",
    title: "Panel interview — A. Mensah",
    dueAt: "Fri, 2:00 PM",
    contactId: "rec-c1",
    status: "pending",
    channel: "in-app",
  },
  {
    id: "rec-r2",
    title: "Send scorecard to Acme HR",
    dueAt: "Fri, 4:30 PM",
    contactId: "rec-c2",
    status: "pending",
    channel: "email",
  },
  {
    id: "rec-r3",
    title: "Phone screen — T. Brooks",
    dueAt: "Thu, 4:30 PM",
    contactId: "rec-c3",
    status: "pending",
    channel: "in-app",
  },
];

export const B2B_CRM: DemoCrmContact[] = [
  {
    id: "b2b-c1",
    name: "Helios PM",
    email: "pm@heliosretail.com",
    phone: "+1 (212) 555-0156",
    organization: "Helios Retail",
    stage: "Project Alpha",
    notes: "Cutover plan review due today. SLA clock active.",
    lastActivity: "Today",
  },
  {
    id: "b2b-c2",
    name: "Nova Procurement",
    email: "procurement@novamsp.com",
    phone: "+1 (512) 555-0180",
    organization: "Nova MSP",
    stage: "Proposal",
    notes: "Revision requested on support tiers. V2 in progress.",
    lastActivity: "Mon",
  },
  {
    id: "b2b-c3",
    name: "Delivery Desk",
    email: "delivery@northstar.consult",
    phone: "+1 (646) 555-0114",
    organization: "Northstar Consult Group",
    stage: "Internal",
    notes: "Phase 2 milestone accepted. Phase 3 kickoff opened.",
    lastActivity: "Yesterday",
  },
];

export const B2B_REMINDERS: DemoReminder[] = [
  {
    id: "b2b-r1",
    title: "SLA sign-off — Helios cutover plan",
    dueAt: "Today, 5:00 PM",
    contactId: "b2b-c1",
    status: "pending",
    channel: "email",
  },
  {
    id: "b2b-r2",
    title: "Proposal revision — Nova MSP",
    dueAt: "Mar 14, 12:00 PM",
    contactId: "b2b-c2",
    status: "pending",
    channel: "in-app",
  },
  {
    id: "b2b-r3",
    title: "Phase 3 kickoff agenda",
    dueAt: "Mar 16, 10:00 AM",
    contactId: "b2b-c3",
    status: "pending",
    channel: "email",
  },
];

export const HEALTHCARE_CRM: DemoCrmContact[] = [
  {
    id: "hc-c1",
    name: "M. Patterson",
    email: "m.patterson@patientmail.com",
    phone: "+1 (617) 555-0128",
    organization: "Patient — Cardiology follow-up",
    stage: "Active care",
    notes: "Post-discharge check-in scheduled. Awaiting lab results upload.",
    lastActivity: "Today",
  },
  {
    id: "hc-c2",
    name: "Dr. S. Okoro",
    email: "s.okoro@riverside.med",
    phone: "+1 (617) 555-0164",
    organization: "Riverside Medical — Referring physician",
    stage: "Referral partner",
    notes: "Referral for cardiac rehab consult. Prior auth submitted.",
    lastActivity: "Yesterday",
  },
  {
    id: "hc-c3",
    name: "CareFirst Prior Auth",
    email: "priorauth@carefirst.ins",
    phone: "+1 (800) 555-0199",
    organization: "CareFirst Insurance",
    stage: "Payer liaison",
    notes: "MRI prior auth pending. Reference #PA-88421.",
    lastActivity: "Mon",
  },
];

export const HEALTHCARE_REMINDERS: DemoReminder[] = [
  {
    id: "hc-r1",
    title: "Follow up — M. Patterson lab results",
    dueAt: "Today, 3:00 PM",
    contactId: "hc-c1",
    status: "pending",
    channel: "email",
  },
  {
    id: "hc-r2",
    title: "Prior auth status check — CareFirst",
    dueAt: "Mar 14, 11:00 AM",
    contactId: "hc-c3",
    status: "pending",
    channel: "in-app",
  },
  {
    id: "hc-r3",
    title: "Referral callback — Dr. Okoro",
    dueAt: "Mar 13, 9:30 AM",
    contactId: "hc-c2",
    status: "pending",
    channel: "email",
  },
];

export const CRM_STAGE_OPTIONS: Record<string, string[]> = {
  legal: ["Active matter", "Contract review", "Court liaison", "Intake", "Closed"],
  "real-estate": ["Hot lead", "Showing", "Offer review", "Active listing", "Closed"],
  accounting: ["Tax prep", "Document intake", "Partnership return", "Filed", "On hold"],
  recruitment: ["Sourced", "Phone screen", "Interview", "Final interview", "Offer", "Placed"],
  "b2b-services": ["Discovery", "Proposal", "Active project", "SLA watch", "Delivered"],
  healthcare: ["New intake", "Active care", "Referral partner", "Payer liaison", "Discharged"],
};

export const CRM_LABELS: Record<string, string> = {
  legal: "Client & matter CRM",
  "real-estate": "Buyer & seller CRM",
  accounting: "Client entity CRM",
  recruitment: "Candidate & client CRM",
  "b2b-services": "Account CRM",
  healthcare: "Patient & referral CRM",
};
