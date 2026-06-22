import type { FormFieldDefinition } from "./form-definition.service.js";
import { validateFormPayload } from "./form-definition.service.js";
import { prisma } from "../lib/prisma.js";
import { loadGrowthWizardProfile, wizardBusinessName } from "../growth/wizard-profile.js";

export const GROWTH_CAPTURE_FORM_KEY = "capture";

const DEFAULT_CAPTURE_FIELDS: FormFieldDefinition[] = [
  { key: "fullName", label: "Full name", type: "text", required: true, sortOrder: 10, placeholder: "Jane Doe" },
  { key: "email", label: "Email", type: "email", required: true, sortOrder: 20, placeholder: "jane@example.com" },
  { key: "phone", label: "Phone", type: "tel", required: false, sortOrder: 30, placeholder: "+1 555 0100" },
  { key: "company", label: "Company", type: "text", required: false, sortOrder: 40 },
  { key: "message", label: "How can we help?", type: "textarea", required: false, sortOrder: 50 },
];

function serializeForm(row: {
  id: string;
  tenantId: string;
  workspaceId: string;
  formKey: string;
  title: string;
  description: string | null;
  fieldsJson: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    formKey: row.formKey,
    title: row.title,
    description: row.description,
    fields: JSON.parse(row.fieldsJson) as FormFieldDefinition[],
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureGrowthCaptureForm(tenantId: string, workspaceId: string) {
  const existing = await prisma.growthFormDefinition.findFirst({
    where: { workspaceId, formKey: GROWTH_CAPTURE_FORM_KEY },
  });
  if (existing) return serializeForm(existing);

  const profile = await loadGrowthWizardProfile(workspaceId);
  const business = wizardBusinessName(profile);

  const row = await prisma.growthFormDefinition.create({
    data: {
      tenantId,
      workspaceId,
      formKey: GROWTH_CAPTURE_FORM_KEY,
      title: `Contact ${business}`,
      description: "Capture leads from your published Growth pages.",
      fieldsJson: JSON.stringify(DEFAULT_CAPTURE_FIELDS),
      isActive: true,
    },
  });
  return serializeForm(row);
}

export async function listGrowthForms(tenantId: string, workspaceId: string) {
  await ensureGrowthCaptureForm(tenantId, workspaceId);
  const rows = await prisma.growthFormDefinition.findMany({
    where: { tenantId, workspaceId },
    orderBy: { formKey: "asc" },
  });
  return rows.map(serializeForm);
}

export async function getGrowthCaptureFormForWorkspace(workspaceId: string) {
  const row = await prisma.growthFormDefinition.findFirst({
    where: { workspaceId, formKey: GROWTH_CAPTURE_FORM_KEY, isActive: true },
  });
  if (!row) return null;
  return serializeForm(row);
}

export async function getGrowthCaptureFormByTenantSlug(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return null;

  const workspace = await prisma.growthWorkspace.findUnique({ where: { tenantId: tenant.id } });
  if (!workspace) return null;

  const form = await ensureGrowthCaptureForm(tenant.id, workspace.id);
  if (!form.isActive) return null;

  return { tenant: { id: tenant.id, slug: tenant.slug }, workspaceId: workspace.id, form };
}

export function validateGrowthCapturePayload(
  fields: FormFieldDefinition[],
  payload: Record<string, unknown>,
) {
  return validateFormPayload(fields, payload);
}
