import { Router } from "express";
import { z } from "zod";
import { auditAdminMutation } from "../lib/admin-audit-helper.js";
import {
  deleteMembershipApplication,
  getMembershipApplication,
  listMembershipApplications,
  pushMembershipToLeads,
  updateMembershipApplication,
} from "../services/membership.service.js";
import {
  deleteInquiry,
  getInquiry,
  listInquiries,
  pushInquiryToLeads,
  updateInquiry,
} from "../services/inquiry.service.js";
import {
  getSalesPipelineOverview,
  getSalesPipelineTrends,
} from "../services/sales-pipeline.service.js";
import {
  listFormDefinitions,
  updateFormDefinition,
  createFormDefinition,
  deleteFormDefinition,
} from "../services/form-definition.service.js";

const membershipUpdateSchema = z.object({
  status: z.enum(["new", "demo_sent", "provisioned", "pushed_to_leads", "closed"]).optional(),
  notes: z.string().nullable().optional(),
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  teamType: z.string().optional(),
  deployIntent: z.string().optional(),
  hostingScale: z.string().optional(),
  emailService: z.string().optional(),
});

const inquiryUpdateSchema = z.object({
  status: z.enum(["new", "in_progress", "resolved", "pushed_to_leads"]).optional(),
  notes: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  membershipInterest: z.string().optional(),
  inquiringAbout: z.string().optional(),
});

const formFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "email", "tel", "textarea", "select"]),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  sortOrder: z.number().int(),
  helpText: z.string().optional(),
});

const formUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  fields: z.array(formFieldSchema).optional(),
  isActive: z.boolean().optional(),
});

const formCreateSchema = z.object({
  formKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  fields: z.array(formFieldSchema).optional(),
  isActive: z.boolean().optional(),
});

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const adminSalesRouter = Router();

adminSalesRouter.get("/pipeline/overview", async (_req, res, next) => {
  try {
    const overview = await getSalesPipelineOverview();
    res.json({ overview });
  } catch (err) {
    next(err);
  }
});

adminSalesRouter.get("/pipeline/trends", async (req, res, next) => {
  try {
    const days = typeof req.query.days === "string" ? Math.min(90, Math.max(7, Number(req.query.days))) : 30;
    const trends = await getSalesPipelineTrends(days);
    res.json({ trends });
  } catch (err) {
    next(err);
  }
});

adminSalesRouter.get("/membership", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const applications = await listMembershipApplications({ status, q });
    res.json({ applications });
  } catch (err) {
    next(err);
  }
});

adminSalesRouter.get("/membership/:id", async (req, res, next) => {
  try {
    const application = await getMembershipApplication(paramId(req.params.id));
    if (!application) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ application });
  } catch (err) {
    next(err);
  }
});

adminSalesRouter.patch("/membership/:id", async (req, res, next) => {
  try {
    const body = membershipUpdateSchema.parse(req.body);
    const application = await updateMembershipApplication(paramId(req.params.id), body);
    await auditAdminMutation(req, "membership.update", "membership", paramId(req.params.id));
    res.json({ application });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminSalesRouter.delete("/membership/:id", async (req, res, next) => {
  try {
    await deleteMembershipApplication(paramId(req.params.id));
    await auditAdminMutation(req, "membership.delete", "membership", paramId(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminSalesRouter.post("/membership/:id/push-to-leads", async (req, res, next) => {
  try {
    const result = await pushMembershipToLeads(paramId(req.params.id));
    await auditAdminMutation(req, "membership.push_to_leads", "membership", paramId(req.params.id));
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminSalesRouter.get("/inquiries", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const inquiries = await listInquiries({ status, q });
    res.json({ inquiries });
  } catch (err) {
    next(err);
  }
});

adminSalesRouter.get("/inquiries/:id", async (req, res, next) => {
  try {
    const inquiry = await getInquiry(paramId(req.params.id));
    if (!inquiry) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ inquiry });
  } catch (err) {
    next(err);
  }
});

adminSalesRouter.patch("/inquiries/:id", async (req, res, next) => {
  try {
    const body = inquiryUpdateSchema.parse(req.body);
    const inquiry = await updateInquiry(paramId(req.params.id), body);
    await auditAdminMutation(req, "inquiry.update", "inquiry", paramId(req.params.id));
    res.json({ inquiry });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminSalesRouter.delete("/inquiries/:id", async (req, res, next) => {
  try {
    await deleteInquiry(paramId(req.params.id));
    await auditAdminMutation(req, "inquiry.delete", "inquiry", paramId(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminSalesRouter.post("/inquiries/:id/push-to-leads", async (req, res, next) => {
  try {
    const result = await pushInquiryToLeads(paramId(req.params.id));
    await auditAdminMutation(req, "inquiry.push_to_leads", "inquiry", paramId(req.params.id));
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminSalesRouter.get("/forms", async (_req, res, next) => {
  try {
    const forms = await listFormDefinitions();
    res.json({ forms });
  } catch (err) {
    next(err);
  }
});

adminSalesRouter.post("/forms", async (req, res, next) => {
  try {
    const body = formCreateSchema.parse(req.body);
    const form = await createFormDefinition(body);
    await auditAdminMutation(req, "form.create", "form", form.id);
    res.status(201).json({ form });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminSalesRouter.patch("/forms/:id", async (req, res, next) => {
  try {
    const body = formUpdateSchema.parse(req.body);
    const form = await updateFormDefinition(paramId(req.params.id), body);
    await auditAdminMutation(req, "form.update", "form", paramId(req.params.id));
    res.json({ form });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminSalesRouter.delete("/forms/:id", async (req, res, next) => {
  try {
    await deleteFormDefinition(paramId(req.params.id));
    await auditAdminMutation(req, "form.delete", "form", paramId(req.params.id));
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});
