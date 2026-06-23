import type { ReactNode } from "react";
import type { FolderKind } from "./FolderNav";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function stroke(path: string, props?: { strokeWidth?: number }) {
  return (
    <path
      d={path}
      stroke="currentColor"
      strokeWidth={props?.strokeWidth ?? 1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function fill(path: string) {
  return <path fill="currentColor" d={path} />;
}

export function FolderNavIcon({ kind }: { kind: FolderKind }) {
  switch (kind) {
    case "compose":
      return (
        <Svg>
          {stroke("M4 6.5 10 11l6-4.5V14.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1h8.5")}
        </Svg>
      );
    case "inbox":
      return (
        <Svg>
          {stroke("M4 5.5h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z")}
          {stroke("M4 7.5 10 11l6-3.5")}
        </Svg>
      );
    case "drafts":
      return (
        <Svg>
          {stroke("M6 4.5h8l2 2v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z")}
          {stroke("M8 4.5V6h4V4.5M7 10h6M7 12.5h4")}
        </Svg>
      );
    case "sent":
      return (
        <Svg>
          {stroke("M4 6.5 10 11l6-4.5")}
          {stroke("M10 11v6.5")}
          {stroke("M7.5 15.5h5")}
        </Svg>
      );
    case "trash":
      return (
        <Svg>
          {stroke("M7 4.5h6M5.5 6.5h9l-.8 9a1 1 0 0 1-1 .9H7.3a1 1 0 0 1-1-.9l-.8-9Z")}
          {stroke("M8 8.5v5M10 8.5v5M12 8.5v5")}
        </Svg>
      );
    case "junk":
      return (
        <Svg>
          {stroke("M10 4.2v1.3M6.8 6.1l.9.9M13.2 6.1l-.9.9M10 14.8a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Z")}
          {stroke("M10 9.2v2.2M10 12.8h.01")}
        </Svg>
      );
    case "contacts":
      return (
        <Svg>
          {stroke("M10 10.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z")}
          {stroke("M5.5 15.2c.8-2 2.2-3 4.5-3s3.7 1 4.5 3")}
        </Svg>
      );
    case "documents":
      return (
        <Svg>
          {stroke("M6.5 4.5h4l2.5 2.5V15a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z")}
          {stroke("M10.5 4.5V7H13M8 10.5h4M8 12.5h3")}
        </Svg>
      );
    case "scheduled":
    case "ac_filing_calendar":
    case "re_showing_scheduler":
    case "hc_appointment_desk":
      return (
        <Svg>
          {stroke("M6 5V3.8M14 5V3.8M5 7.5h10")}
          {stroke("M5.5 6.5h9a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z")}
          {stroke("M10 10.5v2.8M8.8 11.9H11.2")}
        </Svg>
      );
    case "workspace_calendar":
      return (
        <Svg>
          {stroke("M5.5 6.5h9a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z")}
          {stroke("M6 5V3.8M14 5V3.8M5 7.5h10")}
          {fill("M8 11h1.4v1.4H8V11Zm2.3 0h1.4v1.4h-1.4V11Zm2.3 0H14v1.4h-1.4V11Z")}
        </Svg>
      );
    case "workspace_crm":
    case "desk":
    case "rc_role_pipeline":
    case "b2b_project_tracker":
      return (
        <Svg>
          {stroke("M4.5 6.5h3v8h-3v-8Zm4.25 3h3v5h-3v-5Zm4.25-2h3v7h-3v-7Z")}
        </Svg>
      );
    case "workspace_reminders":
    case "deadlines":
      return (
        <Svg>
          {stroke("M10 5.2a4.3 4.3 0 0 1 4.3 4.3c0 2.9-4.3 6.5-4.3 6.5S5.7 12.4 5.7 9.5A4.3 4.3 0 0 1 10 5.2Z")}
          {stroke("M10 8.8v2.2")}
        </Svg>
      );
    case "open_tracking":
      return (
        <Svg>
          {stroke("M3.5 10s2.8-5 6.5-5 6.5 5 6.5 5-2.8 5-6.5 5-6.5-5-6.5-5Z")}
          {stroke("M10 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z")}
        </Svg>
      );
    case "file_vault":
    case "ac_document_intake":
    case "ac_secure_exchange":
      return (
        <Svg>
          {stroke("M7 4.5h6l1.5 1.5V15a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.5")}
          {stroke("M9.5 10.5h1v3h-1v-3Z")}
          {stroke("M8.5 12h3")}
        </Svg>
      );
    case "inbox_cleanup":
      return (
        <Svg>
          {stroke("M5 6.5h10M7.5 6.5V5.5h5v1")}
          {stroke("M6.5 6.5l.6 8h6l.6-8")}
          {stroke("M8.5 9.5v3M11.5 9.5v3")}
        </Svg>
      );
    case "attachment_categorize":
    case "checklists":
      return (
        <Svg>
          {stroke("M6.5 10.2l2 2 5-5")}
          {stroke("M5.5 5.5h9a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z")}
        </Svg>
      );
    case "esign":
      return (
        <Svg>
          {stroke("M5.5 14.5h9")}
          {stroke("M12.5 6.8l1.7 1.7-4.2 4.2H8.3v-2.7l4.2-4.2Z")}
        </Svg>
      );
    case "email_sla":
    case "b2b_sla_monitor":
      return (
        <Svg>
          {stroke("M10 5.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z")}
          {stroke("M10 8v2.6l1.8 1.1")}
        </Svg>
      );
    case "mail2pdf":
      return (
        <Svg>
          {stroke("M7 4.5h6l1.5 1.5V15a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.5")}
          {stroke("M8.5 10.5h3M8.5 12.5h2")}
        </Svg>
      );
    case "auto_reply_functionality":
    case "auto_response":
      return (
        <Svg>
          {stroke("M4.5 6.5 10 11l5.5-4.5")}
          {stroke("M4.5 6.5h11v7.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V6.5Z")}
          {stroke("M7.5 12h5")}
        </Svg>
      );
    case "job_hunter_settings":
    case "career_workspace":
      return (
        <Svg>
          {stroke("M6.5 8.5h7v6.5H6.5V8.5Z")}
          {stroke("M8 8.5V7a2 2 0 0 1 4 0v1.5")}
          {stroke("M8.5 12h3")}
        </Svg>
      );
    case "career_scanner":
      return (
        <Svg>
          {stroke("M6 5.5h8v9H6v-9Z")}
          {stroke("M8 9h4M8 11h3M8 13h2")}
        </Svg>
      );
    case "provider_settings":
    case "compose_settings":
      return (
        <Svg>
          {stroke("M10 4.8a2 2 0 0 1 1.9 2.6l1.4.8a1.6 1.6 0 0 1 .4 2.2l-1 1.7a1.6 1.6 0 0 1-2.2.4l-1.4-.8a2 2 0 0 1-2 0l-1.4.8a1.6 1.6 0 0 1-2.2-.4l-1-1.7a1.6 1.6 0 0 1 .4-2.2l1.4-.8A2 2 0 0 1 10 4.8Z")}
          {stroke("M10 12.2a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Z")}
        </Svg>
      );
    case "compliance":
    case "hc_hipaa_audit":
      return (
        <Svg>
          {stroke("M10 4.5 5.5 6.8V10c0 2.8 2 4.8 4.5 5.5 2.5-.7 4.5-2.7 4.5-5.5V6.8L10 4.5Z")}
          {stroke("M8.2 10.2 9.5 11.5 12 9")}
        </Svg>
      );
    case "ircc_intel":
    case "case_linked":
      return (
        <Svg>
          {stroke("M5.5 6.5h9v7h-9v-7Z")}
          {stroke("M8 9.5h4M8 11.5h2.5")}
          {stroke("M12.5 4.5 10 6.5")}
        </Svg>
      );
    case "portal":
    case "b2b_client_workspaces":
      return (
        <Svg>
          {stroke("M4.5 7.5h11v7h-11v-7Z")}
          {stroke("M7.5 7.5V6a2.5 2.5 0 0 1 5 0v1.5")}
        </Svg>
      );
    case "industry_tools":
    case "re_listing_board":
    case "ac_client_entities":
    case "hc_patient_registry":
      return (
        <Svg>
          {stroke("M5 5.5h10v9H5v-9Z")}
          {stroke("M8 9h4M8 11.5h3")}
          {fill("M7 5.5V4h6v1.5H7Z")}
        </Svg>
      );
    case "re_quick_replies":
    case "rc_bulk_outreach":
    case "hc_referral_tracker":
      return (
        <Svg>
          {stroke("M4.5 6.5h11v6.5H4.5V6.5Z")}
          {stroke("M7 10h6M7 12h4")}
        </Svg>
      );
    case "re_deal_room":
    case "b2b_proposal_desk":
      return (
        <Svg>
          {stroke("M6 5.5h8l1.5 1.5V15H6V5.5Z")}
          {stroke("M9.5 5.5V7H12")}
          {stroke("M8 10.5h4")}
        </Svg>
      );
    case "rc_interview_desk":
      return (
        <Svg>
          {stroke("M6.5 5.5h7v9h-7v-9Z")}
          {stroke("M8.5 9h3M8.5 11h2")}
          {stroke("M10 13.5h0")}
        </Svg>
      );
    case "rc_talent_search":
      return (
        <Svg>
          {stroke("M9 9.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z")}
          {stroke("M11.2 11.7 14 14.5")}
        </Svg>
      );
    case "new_folder":
      return (
        <Svg>
          {stroke("M5 6.5h4l1.2 1.2H15a1 1 0 0 1 1 1v5.3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1Z")}
          {stroke("M10 9.5v4M8 11.5h4")}
        </Svg>
      );
    case "addons":
      return (
        <Svg>
          {stroke("M6.5 6.5h7v7h-7v-7Z")}
          {stroke("M10 4.5v11M4.5 10h11")}
        </Svg>
      );
    case "other":
    default:
      return (
        <Svg>
          {stroke("M5 5.5h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z")}
        </Svg>
      );
  }
}
