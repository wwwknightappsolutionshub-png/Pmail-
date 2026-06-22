import {
  getGrowthCaptureFormByTenantSlug,
  validateGrowthCapturePayload,
} from "./growth-form.service.js";
import { createGrowthLead } from "./growth-leads.service.js";

export async function submitPublicGrowthLead(
  tenantSlug: string,
  input: {
    payload: Record<string, unknown>;
    source?: string;
    sourcePage?: string;
    attribution?: Record<string, unknown>;
  },
) {
  const resolved = await getGrowthCaptureFormByTenantSlug(tenantSlug);
  if (!resolved) throw new Error("Growth capture is not available for this tenant");

  const validated = validateGrowthCapturePayload(resolved.form.fields, input.payload);

  const lead = await createGrowthLead({
    tenantId: resolved.tenant.id,
    workspaceId: resolved.workspaceId,
    fullName: validated.fullName ?? "",
    email: validated.email ?? "",
    phone: validated.phone,
    company: validated.company,
    message: validated.message,
    source: input.source ?? "form",
    sourcePage: input.sourcePage,
    formData: validated,
    attribution: input.attribution,
  });

  return { lead, tenantSlug: resolved.tenant.slug };
}

export async function getPublicGrowthCaptureForm(tenantSlug: string) {
  const resolved = await getGrowthCaptureFormByTenantSlug(tenantSlug);
  if (!resolved) return null;

  return {
    tenantSlug: resolved.tenant.slug,
    form: {
      formKey: resolved.form.formKey,
      title: resolved.form.title,
      description: resolved.form.description,
      fields: resolved.form.fields,
    },
    submitUrl: `/api/public/growth/${resolved.tenant.slug}/leads`,
  };
}
