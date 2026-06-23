import type { Router } from "express";
import { requireAddon } from "../middleware/requireAddon.js";
import type { requireAuth } from "../middleware/auth.js";
import {
  createAcContact,
  createAcClientEntity,
  createAcDocumentRequest,
  createAcDocumentExchangeRecord,
  createAcEntityNote,
  createAcFilingDeadline,
  listAcContacts,
  listAcClientEntities,
  listAcDocumentRequests,
  listAcDocumentExchangeRecords,
  listAcEntityNotes,
  listAcFilingDeadlines,
  updateAcDocumentRequestStatus,
  updateAcFilingDeadlineStatus,
  uploadAcExchangeDocument,
  readAcExchangeDocument,
} from "../services/accounting.service.js";
import { listAccountingTemplates } from "../services/accounting-templates.service.js";
import {
  createRcCandidateSubmission,
  createRcContact,
  createRcInterview,
  createRcOutreachCampaign,
  createRcPlacement,
  createRcPlacementNote,
  createRcReferenceCheck,
  createRcRole,
  listRcCandidateSubmissions,
  listRcContacts,
  listRcInterviews,
  listRcOutreachCampaigns,
  listRcPlacementNotes,
  listRcPlacements,
  listRcReferenceChecks,
  listRcRoles,
  updateRcCandidateSubmissionStage,
  updateRcInterviewStatus,
  updateRcOutreachCampaignStatus,
  updateRcPlacementStatus,
  updateRcReferenceCheckStatus,
  updateRcRoleStatus,
} from "../services/recruitment.service.js";
import { listRecruitmentTemplates } from "../services/recruitment-templates.service.js";
import {
  createB2bContact,
  createB2bDeliverable,
  createB2bMilestone,
  createB2bProposal,
  createB2bSlaCase,
  createB2bSlaEvent,
  createB2bSlaNote,
  createB2bWorkspace,
  listB2bContacts,
  listB2bDeliverables,
  listB2bMilestones,
  listB2bProposals,
  listB2bSlaCases,
  listB2bSlaEvents,
  listB2bSlaNotes,
  listB2bWorkspaces,
  updateB2bDeliverableStatus,
  updateB2bMilestoneStatus,
  updateB2bProposalStatus,
  updateB2bSlaCaseStatus,
  updateB2bWorkspaceStatus,
} from "../services/b2b.service.js";
import { listB2bTemplates } from "../services/b2b-templates.service.js";
import {
  createHcAccessLog,
  createHcAppointment,
  createHcAuditCase,
  createHcAuditNote,
  createHcContact,
  createHcPatientChart,
  createHcReferral,
  listHcAccessLogs,
  listHcAppointments,
  listHcAuditCases,
  listHcAuditNotes,
  listHcContacts,
  listHcPatientCharts,
  listHcReferrals,
  updateHcReferralStatus,
  updateHcAppointmentStatus,
  updateHcAuditCaseStatus,
  updateHcPatientChartStatus,
} from "../services/healthcare.service.js";
import { listHealthcareTemplates } from "../services/healthcare-templates.service.js";
import { requireHealthcareAddon } from "../middleware/requireHealthcareAccess.js";
import { sendOutreachCampaign, searchRcTalentViaMail } from "../services/recruitment-outreach.service.js";
import { provisionB2bRouting } from "../services/b2b-routing.service.js";

type RouteCtx = (req: Parameters<typeof requireAuth>[0]) => {
  tenantId: string;
  userId: string;
  userEmail: string;
};

export function registerIndustryVerticalRoutes(router: Router, ctx: RouteCtx): void {
  // ── Accounting: Document Intake (ac-document-intake) ────────────
  router.get("/accounting/contacts", requireAddon("ac-document-intake"), async (req, res, next) => {
    try {
      const contacts = await listAcContacts(
        ctx(req).tenantId,
        req.query.role ? String(req.query.role) : undefined,
      );
      res.json({ contacts });
    } catch (err) {
      next(err);
    }
  });

  router.post("/accounting/contacts", requireAddon("ac-document-intake"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const contact = await createAcContact(tenantId, userId, userEmail, {
        firstName: String(req.body?.firstName ?? ""),
        lastName: String(req.body?.lastName ?? ""),
        email: req.body?.email ? String(req.body.email) : undefined,
        phone: req.body?.phone ? String(req.body.phone) : undefined,
        role: req.body?.role ? String(req.body.role) : undefined,
      });
      res.status(201).json({ contact });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get("/accounting/document-requests", requireAddon("ac-document-intake"), async (req, res, next) => {
    try {
      const requests = await listAcDocumentRequests(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ documentRequests: requests, requests });
    } catch (err) {
      next(err);
    }
  });

  router.post("/accounting/document-requests", requireAddon("ac-document-intake"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const documentRequest = await createAcDocumentRequest(tenantId, userId, userEmail, {
        title: String(req.body?.title ?? ""),
        description: req.body?.description ? String(req.body.description) : undefined,
        referenceCode: req.body?.referenceCode ? String(req.body.referenceCode) : undefined,
        status: req.body?.status ? String(req.body.status) : undefined,
        category: req.body?.category ? String(req.body.category) : undefined,
        vaultStatus: req.body?.vaultStatus ? String(req.body.vaultStatus) : undefined,
        fiscalYear: req.body?.fiscalYear ? String(req.body.fiscalYear) : undefined,
        periodStart: req.body?.periodStart ? String(req.body.periodStart) : undefined,
        periodEnd: req.body?.periodEnd ? String(req.body.periodEnd) : undefined,
        dueAt: req.body?.dueAt ? String(req.body.dueAt) : undefined,
        reminderAt: req.body?.reminderAt ? String(req.body.reminderAt) : undefined,
        assignedUserId: req.body?.assignedUserId ? String(req.body.assignedUserId) : undefined,
        clientContactId: req.body?.clientContactId ? String(req.body.clientContactId) : undefined,
      });
      res.status(201).json({ documentRequest });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch(
    "/accounting/document-requests/:id",
    requireAddon("ac-document-intake"),
    async (req, res, next) => {
      try {
        const { tenantId, userId, userEmail } = ctx(req);
        const documentRequest = await updateAcDocumentRequestStatus(
          tenantId,
          userId,
          userEmail,
          String(req.params.id),
          String(req.body?.status ?? ""),
        );
        res.json({ documentRequest });
      } catch (err) {
        if (err instanceof Error) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  // ── Accounting: Filing Calendar (ac-filing-calendar) ──────────
  router.get("/accounting/filing-deadlines", requireAddon("ac-filing-calendar"), async (req, res, next) => {
    try {
      const filingDeadlines = await listAcFilingDeadlines(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ filingDeadlines, deadlines: filingDeadlines });
    } catch (err) {
      next(err);
    }
  });

  router.post("/accounting/filing-deadlines", requireAddon("ac-filing-calendar"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const filingDeadline = await createAcFilingDeadline(tenantId, userId, userEmail, {
        clientEntityId: String(req.body?.clientEntityId ?? ""),
        contactId: req.body?.contactId ? String(req.body.contactId) : undefined,
        contact: req.body?.contact as
          | { firstName: string; lastName: string; email?: string; phone?: string }
          | undefined,
        dueAt: String(req.body?.dueAt ?? ""),
        filingType: req.body?.filingType ? String(req.body.filingType) : undefined,
        taxPeriod: req.body?.taxPeriod ? String(req.body.taxPeriod) : undefined,
        periodStart: req.body?.periodStart ? String(req.body.periodStart) : undefined,
        periodEnd: req.body?.periodEnd ? String(req.body.periodEnd) : undefined,
        reminderAt: req.body?.reminderAt ? String(req.body.reminderAt) : undefined,
        status: req.body?.status ? String(req.body.status) : undefined,
        notes: req.body?.notes ? String(req.body.notes) : undefined,
      });
      res.status(201).json({ filingDeadline });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch(
    "/accounting/filing-deadlines/:id",
    requireAddon("ac-filing-calendar"),
    async (req, res, next) => {
      try {
        const { tenantId, userId, userEmail } = ctx(req);
        const filingDeadline = await updateAcFilingDeadlineStatus(
          tenantId,
          userId,
          userEmail,
          String(req.params.id),
          String(req.body?.status ?? ""),
        );
        res.json({ filingDeadline });
      } catch (err) {
        if (err instanceof Error) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  // ── Accounting: Secure Exchange (ac-secure-exchange) ──────────
  router.get("/accounting/templates", requireAddon("ac-secure-exchange"), async (req, res, next) => {
    try {
      const templates = await listAccountingTemplates(ctx(req).tenantId);
      res.json({ templates });
    } catch (err) {
      next(err);
    }
  });

  router.get("/accounting/exchange-records", requireAddon("ac-secure-exchange"), async (req, res, next) => {
    try {
      const exchangeRecords = await listAcDocumentExchangeRecords(ctx(req).tenantId, {
        status: req.query.status ? String(req.query.status) : undefined,
        documentRequestId: req.query.documentRequestId ? String(req.query.documentRequestId) : undefined,
        clientEntityId: req.query.clientEntityId ? String(req.query.clientEntityId) : undefined,
      });
      res.json({ exchangeRecords });
    } catch (err) {
      next(err);
    }
  });

  router.post("/accounting/exchange-records", requireAddon("ac-secure-exchange"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const exchangeRecord = await createAcDocumentExchangeRecord(tenantId, userId, userEmail, {
        documentRequestId: req.body?.documentRequestId ? String(req.body.documentRequestId) : undefined,
        clientEntityId: req.body?.clientEntityId ? String(req.body.clientEntityId) : undefined,
        contactId: req.body?.contactId ? String(req.body.contactId) : undefined,
        direction: req.body?.direction ? String(req.body.direction) : undefined,
        action: req.body?.action ? String(req.body.action) : undefined,
        channel: req.body?.channel ? String(req.body.channel) : undefined,
        documentName: String(req.body?.documentName ?? ""),
        category: req.body?.category ? String(req.body.category) : undefined,
        status: req.body?.status ? String(req.body.status) : undefined,
        notes: req.body?.notes ? String(req.body.notes) : undefined,
        ipAddress: req.ip,
      });
      res.status(201).json({ exchangeRecord });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.post("/accounting/exchange-records/:id/upload", requireAddon("ac-secure-exchange"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const exchangeRecord = await uploadAcExchangeDocument(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        {
          fileName: String(req.body?.fileName ?? "document"),
          mimeType: String(req.body?.mimeType ?? "application/pdf"),
          dataBase64: String(req.body?.dataBase64 ?? ""),
        },
      );
      res.json({ exchangeRecord });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get("/accounting/exchange-records/:id/download", requireAddon("ac-secure-exchange"), async (req, res, next) => {
    try {
      const { tenantId } = ctx(req);
      const file = await readAcExchangeDocument(tenantId, String(req.params.id));
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
      res.send(file.buffer);
    } catch (err) {
      if (err instanceof Error) {
        res.status(404).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  // ── Accounting: Client Entities (ac-client-entities) ────────────
  router.get("/accounting/client-entities", requireAddon("ac-client-entities"), async (req, res, next) => {
    try {
      const clientEntities = await listAcClientEntities(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ clientEntities, entities: clientEntities });
    } catch (err) {
      next(err);
    }
  });

  router.post("/accounting/client-entities", requireAddon("ac-client-entities"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const clientEntity = await createAcClientEntity(tenantId, userId, userEmail, {
        name: String(req.body?.name ?? ""),
        entityType: String(req.body?.entityType ?? ""),
        taxId: req.body?.taxId ? String(req.body.taxId) : undefined,
        taxIdentifierType: req.body?.taxIdentifierType ? String(req.body.taxIdentifierType) : undefined,
        taxIdentifier: req.body?.taxIdentifier ? String(req.body.taxIdentifier) : undefined,
        jurisdiction: req.body?.jurisdiction ? String(req.body.jurisdiction) : undefined,
        fiscalYearEnd: req.body?.fiscalYearEnd ? String(req.body.fiscalYearEnd) : undefined,
        engagementType: req.body?.engagementType ? String(req.body.engagementType) : undefined,
        status: req.body?.status ? String(req.body.status) : undefined,
        primaryContactId: req.body?.primaryContactId ? String(req.body.primaryContactId) : undefined,
        parentEntityId: req.body?.parentEntityId ? String(req.body.parentEntityId) : undefined,
      });
      res.status(201).json({ clientEntity });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get(
    "/accounting/client-entities/:id/notes",
    requireAddon("ac-client-entities"),
    async (req, res, next) => {
      try {
        const notes = await listAcEntityNotes(ctx(req).tenantId, String(req.params.id));
        res.json({ notes });
      } catch (err) {
        if (err instanceof Error) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  router.post(
    "/accounting/client-entities/:id/notes",
    requireAddon("ac-client-entities"),
    async (req, res, next) => {
      try {
        const { tenantId, userId, userEmail } = ctx(req);
        const note = await createAcEntityNote(
          tenantId,
          userId,
          userEmail,
          String(req.params.id),
          String(req.body?.body ?? ""),
        );
        res.status(201).json({ note });
      } catch (err) {
        if (err instanceof Error) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  // ── Recruitment: Role Pipeline (rc-role-pipeline) ───────────────
  router.get("/recruitment/contacts", requireAddon("rc-role-pipeline"), async (req, res, next) => {
    try {
      const contacts = await listRcContacts(
        ctx(req).tenantId,
        req.query.role ? String(req.query.role) : undefined,
      );
      res.json({ contacts });
    } catch (err) {
      next(err);
    }
  });

  router.post("/recruitment/contacts", requireAddon("rc-role-pipeline"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const contact = await createRcContact(tenantId, userId, userEmail, {
        firstName: String(req.body?.firstName ?? ""),
        lastName: String(req.body?.lastName ?? ""),
        email: req.body?.email ? String(req.body.email) : undefined,
        phone: req.body?.phone ? String(req.body.phone) : undefined,
        role: req.body?.role ? String(req.body.role) : undefined,
        source: req.body?.source ? String(req.body.source) : undefined,
        currentCompany: req.body?.currentCompany ? String(req.body.currentCompany) : undefined,
        desiredRole: req.body?.desiredRole ? String(req.body.desiredRole) : undefined,
        salaryExpectationCents: req.body?.salaryExpectationCents != null ? Number(req.body.salaryExpectationCents) : undefined,
        availabilityDate: req.body?.availabilityDate ? String(req.body.availabilityDate) : undefined,
        candidateStage: req.body?.candidateStage ? String(req.body.candidateStage) : undefined,
      });
      res.status(201).json({ contact });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get("/recruitment/roles", requireAddon("rc-role-pipeline"), async (req, res, next) => {
    try {
      const roles = await listRcRoles(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ roles });
    } catch (err) {
      next(err);
    }
  });

  router.post("/recruitment/roles", requireAddon("rc-role-pipeline"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const role = await createRcRole(tenantId, userId, userEmail, {
        title: String(req.body?.title ?? ""),
        clientCompany: req.body?.clientCompany ? String(req.body.clientCompany) : undefined,
        requisitionCode: req.body?.requisitionCode ? String(req.body.requisitionCode) : undefined,
        status: req.body?.status ? String(req.body.status) : undefined,
        priority: req.body?.priority ? String(req.body.priority) : undefined,
        employmentType: req.body?.employmentType ? String(req.body.employmentType) : undefined,
        location: req.body?.location ? String(req.body.location) : undefined,
        remotePolicy: req.body?.remotePolicy ? String(req.body.remotePolicy) : undefined,
        salaryMinCents: req.body?.salaryMinCents != null ? Number(req.body.salaryMinCents) : undefined,
        salaryMaxCents: req.body?.salaryMaxCents != null ? Number(req.body.salaryMaxCents) : undefined,
        targetStartDate: req.body?.targetStartDate ? String(req.body.targetStartDate) : undefined,
        pipelineStage: req.body?.pipelineStage ? String(req.body.pipelineStage) : undefined,
        assignedUserId: req.body?.assignedUserId ? String(req.body.assignedUserId) : undefined,
        clientContactId: req.body?.clientContactId ? String(req.body.clientContactId) : undefined,
      });
      res.status(201).json({ role });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch("/recruitment/roles/:id", requireAddon("rc-role-pipeline"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const role = await updateRcRoleStatus(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        {
          status: req.body?.status ? String(req.body.status) : undefined,
          priority: req.body?.priority ? String(req.body.priority) : undefined,
          pipelineStage: req.body?.pipelineStage ? String(req.body.pipelineStage) : undefined,
          targetStartDate: req.body?.targetStartDate ? String(req.body.targetStartDate) : undefined,
        },
      );
      res.json({ role });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  // ── Recruitment: Interview Desk (rc-interview-desk) ─────────────
  router.get("/recruitment/interviews", requireAddon("rc-interview-desk"), async (req, res, next) => {
    try {
      const interviews = await listRcInterviews(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ interviews });
    } catch (err) {
      next(err);
    }
  });

  router.post("/recruitment/interviews", requireAddon("rc-interview-desk"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const interview = await createRcInterview(tenantId, userId, userEmail, {
        roleId: String(req.body?.roleId ?? ""),
        contactId: req.body?.contactId ? String(req.body.contactId) : undefined,
        contact: req.body?.contact as
          | { firstName: string; lastName: string; email?: string; phone?: string }
          | undefined,
        scheduledAt: String(req.body?.scheduledAt ?? ""),
        interviewType: req.body?.interviewType ? String(req.body.interviewType) : undefined,
        roundNumber: req.body?.roundNumber != null ? Number(req.body.roundNumber) : undefined,
        interviewerName: req.body?.interviewerName ? String(req.body.interviewerName) : undefined,
        feedbackStatus: req.body?.feedbackStatus ? String(req.body.feedbackStatus) : undefined,
        score: req.body?.score != null ? Number(req.body.score) : undefined,
        outcomeReason: req.body?.outcomeReason ? String(req.body.outcomeReason) : undefined,
        notes: req.body?.notes ? String(req.body.notes) : undefined,
      });
      res.status(201).json({ interview });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch("/recruitment/interviews/:id", requireAddon("rc-interview-desk"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const interview = await updateRcInterviewStatus(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        {
          status: req.body?.status ? String(req.body.status) : undefined,
          feedbackStatus: req.body?.feedbackStatus ? String(req.body.feedbackStatus) : undefined,
          score: req.body?.score != null ? Number(req.body.score) : undefined,
          outcomeReason: req.body?.outcomeReason ? String(req.body.outcomeReason) : undefined,
        },
      );
      res.json({ interview });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get("/recruitment/submissions", requireAddon("rc-interview-desk"), async (req, res, next) => {
    try {
      const submissions = await listRcCandidateSubmissions(
        ctx(req).tenantId,
        req.query.stage ? String(req.query.stage) : undefined,
      );
      res.json({ submissions });
    } catch (err) {
      next(err);
    }
  });

  router.post("/recruitment/submissions", requireAddon("rc-interview-desk"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const submission = await createRcCandidateSubmission(tenantId, userId, userEmail, {
        roleId: String(req.body?.roleId ?? ""),
        contactId: String(req.body?.contactId ?? ""),
        stage: req.body?.stage ? String(req.body.stage) : undefined,
        source: req.body?.source ? String(req.body.source) : undefined,
        score: req.body?.score != null ? Number(req.body.score) : undefined,
        notes: req.body?.notes ? String(req.body.notes) : undefined,
      });
      res.status(201).json({ submission });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch("/recruitment/submissions/:id", requireAddon("rc-interview-desk"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const submission = await updateRcCandidateSubmissionStage(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        String(req.body?.stage ?? ""),
      );
      res.json({ submission });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  // ── Recruitment: Bulk Outreach (rc-bulk-outreach) ─────────────────
  router.get("/recruitment/templates", requireAddon("rc-bulk-outreach"), async (req, res, next) => {
    try {
      const templates = await listRecruitmentTemplates(ctx(req).tenantId);
      res.json({ templates });
    } catch (err) {
      next(err);
    }
  });

  router.get("/recruitment/campaigns", requireAddon("rc-bulk-outreach"), async (req, res, next) => {
    try {
      const campaigns = await listRcOutreachCampaigns(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ campaigns });
    } catch (err) {
      next(err);
    }
  });

  router.post("/recruitment/campaigns", requireAddon("rc-bulk-outreach"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const campaign = await createRcOutreachCampaign(tenantId, userId, userEmail, {
        name: String(req.body?.name ?? ""),
        roleId: req.body?.roleId ? String(req.body.roleId) : undefined,
        channel: req.body?.channel ? String(req.body.channel) : undefined,
        status: req.body?.status ? String(req.body.status) : undefined,
        audience: req.body?.audience ? String(req.body.audience) : undefined,
        subject: req.body?.subject ? String(req.body.subject) : undefined,
        bodyHtml: req.body?.bodyHtml ? String(req.body.bodyHtml) : undefined,
        scheduledFor: req.body?.scheduledFor ? String(req.body.scheduledFor) : undefined,
      });
      res.status(201).json({ campaign });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch("/recruitment/campaigns/:id", requireAddon("rc-bulk-outreach"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const campaign = await updateRcOutreachCampaignStatus(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        String(req.body?.status ?? ""),
        {
          subject: req.body?.subject ? String(req.body.subject) : undefined,
          bodyHtml: req.body?.bodyHtml ? String(req.body.bodyHtml) : undefined,
          scheduledFor: req.body?.scheduledFor ? String(req.body.scheduledFor) : undefined,
        },
      );
      res.json({ campaign });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.post("/recruitment/campaigns/:id/launch", requireAddon("rc-bulk-outreach"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const sent = await sendOutreachCampaign(String(req.params.id), tenantId, userId, userEmail);
      res.json({ sent });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get("/recruitment/talent-search/mail", requireAddon("rc-talent-search"), async (req, res, next) => {
    try {
      const { tenantId, userId } = ctx(req);
      const results = await searchRcTalentViaMail(
        tenantId,
        userId,
        req.query.q ? String(req.query.q) : "",
      );
      res.json({ results });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  // ── Recruitment: Talent Search (rc-talent-search) ─────────────────
  router.get("/recruitment/placements", requireAddon("rc-talent-search"), async (req, res, next) => {
    try {
      const placements = await listRcPlacements(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ placements });
    } catch (err) {
      next(err);
    }
  });

  router.post("/recruitment/placements", requireAddon("rc-talent-search"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const placement = await createRcPlacement(tenantId, userId, userEmail, {
        roleId: String(req.body?.roleId ?? ""),
        title: String(req.body?.title ?? ""),
        status: req.body?.status ? String(req.body.status) : undefined,
        compensationCents: req.body?.compensationCents != null ? Number(req.body.compensationCents) : undefined,
        candidateContactId: req.body?.candidateContactId ? String(req.body.candidateContactId) : undefined,
        startDate: req.body?.startDate ? String(req.body.startDate) : undefined,
        recruiterFeeCents: req.body?.recruiterFeeCents != null ? Number(req.body.recruiterFeeCents) : undefined,
        guaranteeEndDate: req.body?.guaranteeEndDate ? String(req.body.guaranteeEndDate) : undefined,
        onboardingStatus: req.body?.onboardingStatus ? String(req.body.onboardingStatus) : undefined,
      });
      res.status(201).json({ placement });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch("/recruitment/placements/:id", requireAddon("rc-talent-search"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const placement = await updateRcPlacementStatus(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        {
          status: req.body?.status ? String(req.body.status) : undefined,
          onboardingStatus: req.body?.onboardingStatus ? String(req.body.onboardingStatus) : undefined,
          startDate: req.body?.startDate ? String(req.body.startDate) : undefined,
        },
      );
      res.json({ placement });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get(
    "/recruitment/placements/:id/notes",
    requireAddon("rc-talent-search"),
    async (req, res, next) => {
      try {
        const notes = await listRcPlacementNotes(ctx(req).tenantId, String(req.params.id));
        res.json({ notes });
      } catch (err) {
        if (err instanceof Error) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  router.post(
    "/recruitment/placements/:id/notes",
    requireAddon("rc-talent-search"),
    async (req, res, next) => {
      try {
        const { tenantId, userId, userEmail } = ctx(req);
        const note = await createRcPlacementNote(
          tenantId,
          userId,
          userEmail,
          String(req.params.id),
          String(req.body?.body ?? ""),
        );
        res.status(201).json({ note });
      } catch (err) {
        if (err instanceof Error) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  router.get("/recruitment/reference-checks", requireAddon("rc-talent-search"), async (req, res, next) => {
    try {
      const referenceChecks = await listRcReferenceChecks(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ referenceChecks });
    } catch (err) {
      next(err);
    }
  });

  router.post("/recruitment/reference-checks", requireAddon("rc-talent-search"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const referenceCheck = await createRcReferenceCheck(tenantId, userId, userEmail, {
        contactId: String(req.body?.contactId ?? ""),
        placementId: req.body?.placementId ? String(req.body.placementId) : undefined,
        refereeName: String(req.body?.refereeName ?? ""),
        refereeEmail: req.body?.refereeEmail ? String(req.body.refereeEmail) : undefined,
        relationship: req.body?.relationship ? String(req.body.relationship) : undefined,
        status: req.body?.status ? String(req.body.status) : undefined,
        notes: req.body?.notes ? String(req.body.notes) : undefined,
      });
      res.status(201).json({ referenceCheck });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch("/recruitment/reference-checks/:id", requireAddon("rc-talent-search"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const referenceCheck = await updateRcReferenceCheckStatus(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        String(req.body?.status ?? ""),
      );
      res.json({ referenceCheck });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  // ── B2B: Client Workspaces (b2b-client-workspaces) ──────────────
  router.get("/b2b/contacts", requireAddon("b2b-client-workspaces"), async (req, res, next) => {
    try {
      const contacts = await listB2bContacts(
        ctx(req).tenantId,
        req.query.role ? String(req.query.role) : undefined,
      );
      res.json({ contacts });
    } catch (err) {
      next(err);
    }
  });

  router.post("/b2b/contacts", requireAddon("b2b-client-workspaces"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const contact = await createB2bContact(tenantId, userId, userEmail, {
        firstName: String(req.body?.firstName ?? ""),
        lastName: String(req.body?.lastName ?? ""),
        email: req.body?.email ? String(req.body.email) : undefined,
        phone: req.body?.phone ? String(req.body.phone) : undefined,
        role: req.body?.role ? String(req.body.role) : undefined,
        company: req.body?.company ? String(req.body.company) : undefined,
        title: req.body?.title ? String(req.body.title) : undefined,
        decisionRole: req.body?.decisionRole ? String(req.body.decisionRole) : undefined,
      });
      res.status(201).json({ contact });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get("/b2b/workspaces", requireAddon("b2b-client-workspaces"), async (req, res, next) => {
    try {
      const workspaces = await listB2bWorkspaces(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ workspaces });
    } catch (err) {
      next(err);
    }
  });

  router.post("/b2b/workspaces", requireAddon("b2b-client-workspaces"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const workspace = await createB2bWorkspace(tenantId, userId, userEmail, {
        name: String(req.body?.name ?? ""),
        clientDomain: req.body?.clientDomain ? String(req.body.clientDomain) : undefined,
        status: req.body?.status ? String(req.body.status) : undefined,
        accountTier: req.body?.accountTier ? String(req.body.accountTier) : undefined,
        arrCents: req.body?.arrCents != null ? Number(req.body.arrCents) : undefined,
        healthScore: req.body?.healthScore != null ? Number(req.body.healthScore) : undefined,
        brandColor: req.body?.brandColor ? String(req.body.brandColor) : undefined,
        routingDomain: req.body?.routingDomain ? String(req.body.routingDomain) : undefined,
        onboardingStage: req.body?.onboardingStage ? String(req.body.onboardingStage) : undefined,
        renewalDate: req.body?.renewalDate ? String(req.body.renewalDate) : undefined,
        assignedUserId: req.body?.assignedUserId ? String(req.body.assignedUserId) : undefined,
        clientContactId: req.body?.clientContactId ? String(req.body.clientContactId) : undefined,
      });
      res.status(201).json({ workspace });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch("/b2b/workspaces/:id", requireAddon("b2b-client-workspaces"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const workspace = await updateB2bWorkspaceStatus(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        {
          status: req.body?.status ? String(req.body.status) : undefined,
          accountTier: req.body?.accountTier ? String(req.body.accountTier) : undefined,
          healthScore: req.body?.healthScore != null ? Number(req.body.healthScore) : undefined,
          onboardingStage: req.body?.onboardingStage ? String(req.body.onboardingStage) : undefined,
          renewalDate: req.body?.renewalDate ? String(req.body.renewalDate) : undefined,
        },
      );
      res.json({ workspace });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.post("/b2b/workspaces/:id/provision-routing", requireAddon("b2b-client-workspaces"), async (req, res, next) => {
    try {
      const { tenantId } = ctx(req);
      await provisionB2bRouting(String(req.params.id), tenantId);
      const workspaces = await listB2bWorkspaces(tenantId);
      const workspace = workspaces.find((w) => w.id === String(req.params.id));
      res.json({ workspace });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  // ── B2B: Project Tracker (b2b-project-tracker) ──────────────────
  router.get("/b2b/milestones", requireAddon("b2b-project-tracker"), async (req, res, next) => {
    try {
      const milestones = await listB2bMilestones(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ milestones });
    } catch (err) {
      next(err);
    }
  });

  router.post("/b2b/milestones", requireAddon("b2b-project-tracker"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const milestone = await createB2bMilestone(tenantId, userId, userEmail, {
        workspaceId: String(req.body?.workspaceId ?? ""),
        title: String(req.body?.title ?? ""),
        contactId: req.body?.contactId ? String(req.body.contactId) : undefined,
        contact: req.body?.contact as
          | { firstName: string; lastName: string; email?: string; phone?: string }
          | undefined,
        scheduledAt: String(req.body?.scheduledAt ?? ""),
        milestoneType: req.body?.milestoneType ? String(req.body.milestoneType) : undefined,
        phase: req.body?.phase ? String(req.body.phase) : undefined,
        ownerRole: req.body?.ownerRole ? String(req.body.ownerRole) : undefined,
        deliverableUrl: req.body?.deliverableUrl ? String(req.body.deliverableUrl) : undefined,
        notes: req.body?.notes ? String(req.body.notes) : undefined,
      });
      res.status(201).json({ milestone });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch("/b2b/milestones/:id", requireAddon("b2b-project-tracker"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const milestone = await updateB2bMilestoneStatus(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        String(req.body?.status ?? ""),
      );
      res.json({ milestone });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get("/b2b/deliverables", requireAddon("b2b-project-tracker"), async (req, res, next) => {
    try {
      const deliverables = await listB2bDeliverables(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ deliverables });
    } catch (err) {
      next(err);
    }
  });

  router.post("/b2b/deliverables", requireAddon("b2b-project-tracker"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const deliverable = await createB2bDeliverable(tenantId, userId, userEmail, {
        workspaceId: String(req.body?.workspaceId ?? ""),
        title: String(req.body?.title ?? ""),
        kind: req.body?.kind ? String(req.body.kind) : undefined,
        status: req.body?.status ? String(req.body.status) : undefined,
        dueAt: req.body?.dueAt ? String(req.body.dueAt) : undefined,
        url: req.body?.url ? String(req.body.url) : undefined,
      });
      res.status(201).json({ deliverable });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch("/b2b/deliverables/:id", requireAddon("b2b-project-tracker"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const deliverable = await updateB2bDeliverableStatus(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        String(req.body?.status ?? ""),
      );
      res.json({ deliverable });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  // ── B2B: Proposal Desk (b2b-proposal-desk) ──────────────────────
  router.get("/b2b/templates", requireAddon("b2b-proposal-desk"), async (req, res, next) => {
    try {
      const templates = await listB2bTemplates(ctx(req).tenantId);
      res.json({ templates });
    } catch (err) {
      next(err);
    }
  });

  router.get("/b2b/proposals", requireAddon("b2b-proposal-desk"), async (req, res, next) => {
    try {
      const proposals = await listB2bProposals(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ proposals });
    } catch (err) {
      next(err);
    }
  });

  router.post("/b2b/proposals", requireAddon("b2b-proposal-desk"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const proposal = await createB2bProposal(tenantId, userId, userEmail, {
        workspaceId: String(req.body?.workspaceId ?? ""),
        title: String(req.body?.title ?? ""),
        version: req.body?.version != null ? Number(req.body.version) : undefined,
        status: req.body?.status ? String(req.body.status) : undefined,
        sowUrl: req.body?.sowUrl ? String(req.body.sowUrl) : undefined,
        amountCents: req.body?.amountCents != null ? Number(req.body.amountCents) : undefined,
        validUntil: req.body?.validUntil ? String(req.body.validUntil) : undefined,
      });
      res.status(201).json({ proposal });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch("/b2b/proposals/:id", requireAddon("b2b-proposal-desk"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const proposal = await updateB2bProposalStatus(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        String(req.body?.status ?? ""),
      );
      res.json({ proposal });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  // ── B2B: SLA Monitor (b2b-sla-monitor) ──────────────────────────
  router.get("/b2b/sla-cases", requireAddon("b2b-sla-monitor"), async (req, res, next) => {
    try {
      const slaCases = await listB2bSlaCases(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ slaCases });
    } catch (err) {
      next(err);
    }
  });

  router.post("/b2b/sla-cases", requireAddon("b2b-sla-monitor"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const slaCase = await createB2bSlaCase(tenantId, userId, userEmail, {
        workspaceId: String(req.body?.workspaceId ?? ""),
        title: String(req.body?.title ?? ""),
        status: req.body?.status ? String(req.body.status) : undefined,
        severity: req.body?.severity ? String(req.body.severity) : undefined,
        category: req.body?.category ? String(req.body.category) : undefined,
        responseTargetMinutes: req.body?.responseTargetMinutes != null ? Number(req.body.responseTargetMinutes) : undefined,
        resolutionTargetMinutes: req.body?.resolutionTargetMinutes != null ? Number(req.body.resolutionTargetMinutes) : undefined,
        responseDueAt: req.body?.responseDueAt ? String(req.body.responseDueAt) : undefined,
        breachAt: req.body?.breachAt ? String(req.body.breachAt) : undefined,
      });
      res.status(201).json({ slaCase });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch("/b2b/sla-cases/:id", requireAddon("b2b-sla-monitor"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const slaCase = await updateB2bSlaCaseStatus(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        {
          status: req.body?.status ? String(req.body.status) : undefined,
          escalated: req.body?.escalated === true,
          resolved: req.body?.resolved === true,
        },
      );
      res.json({ slaCase });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get("/b2b/sla-cases/:id/notes", requireAddon("b2b-sla-monitor"), async (req, res, next) => {
    try {
      const notes = await listB2bSlaNotes(ctx(req).tenantId, String(req.params.id));
      res.json({ notes });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.post("/b2b/sla-cases/:id/notes", requireAddon("b2b-sla-monitor"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const note = await createB2bSlaNote(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        String(req.body?.body ?? ""),
      );
      res.status(201).json({ note });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get("/b2b/sla-cases/:id/events", requireAddon("b2b-sla-monitor"), async (req, res, next) => {
    try {
      const events = await listB2bSlaEvents(ctx(req).tenantId, String(req.params.id));
      res.json({ events });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.post("/b2b/sla-cases/:id/events", requireAddon("b2b-sla-monitor"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const event = await createB2bSlaEvent(tenantId, userId, userEmail, String(req.params.id), {
        eventType: String(req.body?.eventType ?? ""),
        message: String(req.body?.message ?? ""),
      });
      res.status(201).json({ event });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  // ── Healthcare: Patient Registry (hc-patient-registry) ──────────
  router.get("/healthcare/contacts", requireAddon("hc-patient-registry"), requireHealthcareAddon("hc-patient-registry"), async (req, res, next) => {
    try {
      const contacts = await listHcContacts(
        ctx(req).tenantId,
        req.query.role ? String(req.query.role) : undefined,
      );
      res.json({ contacts });
    } catch (err) {
      next(err);
    }
  });

  router.post("/healthcare/contacts", requireAddon("hc-patient-registry"), requireHealthcareAddon("hc-patient-registry"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const contact = await createHcContact(tenantId, userId, userEmail, {
        firstName: String(req.body?.firstName ?? ""),
        lastName: String(req.body?.lastName ?? ""),
        email: req.body?.email ? String(req.body.email) : undefined,
        phone: req.body?.phone ? String(req.body.phone) : undefined,
        role: req.body?.role ? String(req.body.role) : undefined,
        dateOfBirth: req.body?.dateOfBirth ? String(req.body.dateOfBirth) : undefined,
        medicalRecordNumber: req.body?.medicalRecordNumber ? String(req.body.medicalRecordNumber) : undefined,
        preferredProvider: req.body?.preferredProvider ? String(req.body.preferredProvider) : undefined,
      });
      res.status(201).json({ contact });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get(["/healthcare/charts", "/healthcare/patient-charts"], requireAddon("hc-patient-registry"), requireHealthcareAddon("hc-patient-registry"), async (req, res, next) => {
    try {
      const charts = await listHcPatientCharts(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ charts });
    } catch (err) {
      next(err);
    }
  });

  router.post(["/healthcare/charts", "/healthcare/patient-charts"], requireAddon("hc-patient-registry"), requireHealthcareAddon("hc-patient-registry"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const chart = await createHcPatientChart(tenantId, userId, userEmail, {
        chartNumber: String(req.body?.chartNumber ?? ""),
        status: req.body?.status ? String(req.body.status) : undefined,
        careStage: req.body?.careStage ? String(req.body.careStage) : undefined,
        referralStatus: req.body?.referralStatus ? String(req.body.referralStatus) : undefined,
        authorizationStatus: req.body?.authorizationStatus ? String(req.body.authorizationStatus) : undefined,
        callbackRequired: typeof req.body?.callbackRequired === "boolean" ? req.body.callbackRequired : undefined,
        lastContactAt: req.body?.lastContactAt ? String(req.body.lastContactAt) : undefined,
        assignedUserId: req.body?.assignedUserId ? String(req.body.assignedUserId) : undefined,
        patientContactId: req.body?.patientContactId ? String(req.body.patientContactId) : undefined,
      });
      res.status(201).json({ chart });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch(["/healthcare/charts/:id", "/healthcare/patient-charts/:id"], requireAddon("hc-patient-registry"), requireHealthcareAddon("hc-patient-registry"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const chart = await updateHcPatientChartStatus(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        {
          status: req.body?.status ? String(req.body.status) : undefined,
          careStage: req.body?.careStage ? String(req.body.careStage) : undefined,
          referralStatus: req.body?.referralStatus ? String(req.body.referralStatus) : undefined,
          authorizationStatus: req.body?.authorizationStatus ? String(req.body.authorizationStatus) : undefined,
          callbackRequired: typeof req.body?.callbackRequired === "boolean" ? req.body.callbackRequired : undefined,
          lastContactAt: req.body?.lastContactAt ? String(req.body.lastContactAt) : undefined,
        },
      );
      res.json({ chart });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  // ── Healthcare: Appointment Desk (hc-appointment-desk) ────────────
  router.get("/healthcare/appointments", requireAddon("hc-appointment-desk"), requireHealthcareAddon("hc-appointment-desk"), async (req, res, next) => {
    try {
      const appointments = await listHcAppointments(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ appointments });
    } catch (err) {
      next(err);
    }
  });

  router.post("/healthcare/appointments", requireAddon("hc-appointment-desk"), requireHealthcareAddon("hc-appointment-desk"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const appointment = await createHcAppointment(tenantId, userId, userEmail, {
        chartId: String(req.body?.chartId ?? ""),
        contactId: req.body?.contactId ? String(req.body.contactId) : undefined,
        contact: req.body?.contact as
          | { firstName: string; lastName: string; email?: string; phone?: string }
          | undefined,
        scheduledAt: String(req.body?.scheduledAt ?? ""),
        appointmentType: req.body?.appointmentType ? String(req.body.appointmentType) : undefined,
        callbackStatus: req.body?.callbackStatus ? String(req.body.callbackStatus) : undefined,
        noShowReason: req.body?.noShowReason ? String(req.body.noShowReason) : undefined,
        notes: req.body?.notes ? String(req.body.notes) : undefined,
      });
      res.status(201).json({ appointment });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch(
    "/healthcare/appointments/:id",
    requireAddon("hc-appointment-desk"), requireHealthcareAddon("hc-appointment-desk"),
    async (req, res, next) => {
      try {
        const { tenantId, userId, userEmail } = ctx(req);
        const appointment = await updateHcAppointmentStatus(
          tenantId,
          userId,
          userEmail,
          String(req.params.id),
          {
            status: req.body?.status ? String(req.body.status) : undefined,
            callbackStatus: req.body?.callbackStatus ? String(req.body.callbackStatus) : undefined,
            noShowReason: req.body?.noShowReason ? String(req.body.noShowReason) : undefined,
          },
        );
        res.json({ appointment });
      } catch (err) {
        if (err instanceof Error) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  // ── Healthcare: Referral Tracker (hc-referral-tracker) ──────────
  router.get("/healthcare/templates", requireAddon("hc-referral-tracker"), requireHealthcareAddon("hc-referral-tracker"), async (req, res, next) => {
    try {
      const templates = await listHealthcareTemplates(ctx(req).tenantId);
      res.json({ templates });
    } catch (err) {
      next(err);
    }
  });

  router.get("/healthcare/referrals", requireAddon("hc-referral-tracker"), requireHealthcareAddon("hc-referral-tracker"), async (req, res, next) => {
    try {
      const referrals = await listHcReferrals(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ referrals });
    } catch (err) {
      next(err);
    }
  });

  router.post("/healthcare/referrals", requireAddon("hc-referral-tracker"), requireHealthcareAddon("hc-referral-tracker"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const referral = await createHcReferral(tenantId, userId, userEmail, {
        chartId: String(req.body?.chartId ?? ""),
        patientContactId: req.body?.patientContactId ? String(req.body.patientContactId) : undefined,
        providerContactId: req.body?.providerContactId ? String(req.body.providerContactId) : undefined,
        direction: req.body?.direction ? String(req.body.direction) : undefined,
        referralType: req.body?.referralType ? String(req.body.referralType) : undefined,
        specialty: req.body?.specialty ? String(req.body.specialty) : undefined,
        status: req.body?.status ? String(req.body.status) : undefined,
        priority: req.body?.priority ? String(req.body.priority) : undefined,
        receivedAt: req.body?.receivedAt ? String(req.body.receivedAt) : undefined,
        dueAt: req.body?.dueAt ? String(req.body.dueAt) : undefined,
        notes: req.body?.notes ? String(req.body.notes) : undefined,
      });
      res.status(201).json({ referral });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch("/healthcare/referrals/:id", requireAddon("hc-referral-tracker"), requireHealthcareAddon("hc-referral-tracker"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const referral = await updateHcReferralStatus(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        String(req.body?.status ?? ""),
      );
      res.json({ referral });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  // ── Healthcare: HIPAA Audit (hc-hipaa-audit) ──────────────────────
  router.get("/healthcare/audit-cases", requireAddon("hc-hipaa-audit"), requireHealthcareAddon("hc-hipaa-audit"), async (req, res, next) => {
    try {
      const auditCases = await listHcAuditCases(
        ctx(req).tenantId,
        req.query.status ? String(req.query.status) : undefined,
      );
      res.json({ auditCases });
    } catch (err) {
      next(err);
    }
  });

  router.post("/healthcare/audit-cases", requireAddon("hc-hipaa-audit"), requireHealthcareAddon("hc-hipaa-audit"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const auditCase = await createHcAuditCase(tenantId, userId, userEmail, {
        chartId: String(req.body?.chartId ?? ""),
        title: String(req.body?.title ?? ""),
        status: req.body?.status ? String(req.body.status) : undefined,
        severity: req.body?.severity ? String(req.body.severity) : undefined,
        accessReason: req.body?.accessReason ? String(req.body.accessReason) : undefined,
        roleScope: req.body?.roleScope ? String(req.body.roleScope) : undefined,
      });
      res.status(201).json({ auditCase });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.patch("/healthcare/audit-cases/:id", requireAddon("hc-hipaa-audit"), requireHealthcareAddon("hc-hipaa-audit"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const auditCase = await updateHcAuditCaseStatus(
        tenantId,
        userId,
        userEmail,
        String(req.params.id),
        {
          status: req.body?.status ? String(req.body.status) : undefined,
          exportRequested: req.body?.exportRequested === true,
          resolved: req.body?.resolved === true,
        },
      );
      res.json({ auditCase });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.get(
    "/healthcare/audit-cases/:id/notes",
    requireAddon("hc-hipaa-audit"), requireHealthcareAddon("hc-hipaa-audit"),
    async (req, res, next) => {
      try {
        const notes = await listHcAuditNotes(ctx(req).tenantId, String(req.params.id));
        res.json({ notes });
      } catch (err) {
        if (err instanceof Error) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  router.post(
    "/healthcare/audit-cases/:id/notes",
    requireAddon("hc-hipaa-audit"), requireHealthcareAddon("hc-hipaa-audit"),
    async (req, res, next) => {
      try {
        const { tenantId, userId, userEmail } = ctx(req);
        const note = await createHcAuditNote(
          tenantId,
          userId,
          userEmail,
          String(req.params.id),
          String(req.body?.body ?? ""),
        );
        res.status(201).json({ note });
      } catch (err) {
        if (err instanceof Error) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  router.get("/healthcare/access-logs", requireAddon("hc-hipaa-audit"), requireHealthcareAddon("hc-hipaa-audit"), async (req, res, next) => {
    try {
      const logs = await listHcAccessLogs(
        ctx(req).tenantId,
        req.query.chartId ? String(req.query.chartId) : undefined,
      );
      res.json({ logs });
    } catch (err) {
      next(err);
    }
  });

  router.post("/healthcare/access-logs", requireAddon("hc-hipaa-audit"), requireHealthcareAddon("hc-hipaa-audit"), async (req, res, next) => {
    try {
      const { tenantId, userId, userEmail } = ctx(req);
      const log = await createHcAccessLog(tenantId, userId, userEmail, {
        chartId: String(req.body?.chartId ?? ""),
        action: String(req.body?.action ?? ""),
        reason: String(req.body?.reason ?? ""),
        roleScope: String(req.body?.roleScope ?? ""),
        ipAddress: req.ip,
      });
      res.status(201).json({ log });
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });
}
