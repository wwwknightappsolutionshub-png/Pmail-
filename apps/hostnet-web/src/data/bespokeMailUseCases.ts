import { buildUseCaseFeatureGroups, type BespokeMailFeatureGroup } from "./bespokeMailFeatureCatalog";

export type { BespokeMailFeatureGroup };

export type BespokeMailUseCase = {
  id: string;
  industry: string;
  summary: string;
  featureGroups: BespokeMailFeatureGroup[];
};

export const BESPOKE_MAIL_USE_CASES: BespokeMailUseCase[] = [
  {
    id: "legal",
    industry: "Law firms & legal practices",
    summary:
      "Client matters, court deadlines, and confidential documents flow through email every day. Bespoke Mail keeps cases organized and auditable.",
    featureGroups: buildUseCaseFeatureGroups("legal", "Practice Pro", "legal", [
      "Client & matter CRM with pipeline stages",
      "Filing, hearing, and partner review reminders",
    ]),
  },
  {
    id: "real-estate",
    industry: "Real estate agencies",
    summary:
      "Listings, offers, and buyer follow-ups depend on fast, mobile-friendly email. Bespoke Mail is built for high-volume agent workflows.",
    featureGroups: buildUseCaseFeatureGroups("real-estate", "Agent Plus", "agent", [
      "Buyer & seller CRM with deal pipeline stages",
      "Showing, offer, and MLS refresh reminders",
    ]),
  },
  {
    id: "accounting",
    industry: "Accounting & bookkeeping firms",
    summary:
      "Tax season drives document requests, reminders, and approvals over email. Bespoke Mail streamlines client document exchange.",
    featureGroups: buildUseCaseFeatureGroups("accounting", "Firm Essentials", "firm", [
      "Client entity CRM with tax pipeline stages",
      "Filing deadline and document chase reminders",
    ]),
  },
  {
    id: "recruitment",
    industry: "Recruitment & staffing agencies",
    summary:
      "Recruiters coordinate candidates, employers, and interviews primarily through email. Bespoke Mail speeds placement workflows.",
    featureGroups: buildUseCaseFeatureGroups("recruitment", "Talent Pro", "recruiter", [
      "Candidate & client CRM with placement stages",
      "Interview, scorecard, and follow-up reminders",
    ]),
  },
  {
    id: "b2b-services",
    industry: "B2B professional services",
    summary:
      "Consultancies, agencies, and MSPs run client projects through email. Bespoke Mail supports multi-client operations at scale.",
    featureGroups: buildUseCaseFeatureGroups("b2b-services", "Enterprise Workspace", "consulting", [
      "Account CRM with project and proposal stages",
      "SLA sign-off and milestone kickoff reminders",
    ]),
  },
  {
    id: "healthcare",
    industry: "Healthcare & medical practices",
    summary:
      "Patient inquiries, referrals, prior authorizations, and care coordination run through email. Bespoke Mail keeps clinical workflows organized and HIPAA-aware.",
    featureGroups: buildUseCaseFeatureGroups("healthcare", "Care Connect", "clinical", [
      "Patient & referral CRM with care pipeline stages",
      "Appointment, prior auth, and callback reminders",
    ]),
  },
];
