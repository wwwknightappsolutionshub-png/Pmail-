import { prisma } from "../lib/prisma.js";
import { EMAIL_TEMPLATE_SEEDS } from "../data/email-template-seeds.js";

export type EmailTemplateInput = {
  slug: string;
  name: string;
  category: string;
  subject: string;
  htmlBody: string;
  textBody?: string | null;
  variables?: string[];
  isActive?: boolean;
};

function serializeTemplate(row: {
  id: string;
  slug: string;
  name: string;
  category: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  variablesJson: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  let variables: string[] = [];
  if (row.variablesJson) {
    try {
      variables = JSON.parse(row.variablesJson) as string[];
    } catch {
      variables = [];
    }
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    subject: row.subject,
    htmlBody: row.htmlBody,
    textBody: row.textBody,
    variables,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? "");
}

export async function seedEmailTemplates(): Promise<void> {
  for (const seed of EMAIL_TEMPLATE_SEEDS) {
    await prisma.emailTemplate.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        name: seed.name,
        category: seed.category,
        subject: seed.subject,
        htmlBody: seed.htmlBody,
        textBody: seed.textBody,
        variablesJson: JSON.stringify(seed.variables),
        isActive: true,
      },
      // Preserve superAdmin edits — only insert missing seeded templates.
      update: {},
    });
  }
}

export async function listEmailTemplates() {
  const rows = await prisma.emailTemplate.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return rows.map(serializeTemplate);
}

export async function getEmailTemplateBySlug(slug: string) {
  const row = await prisma.emailTemplate.findUnique({ where: { slug } });
  return row ? serializeTemplate(row) : null;
}

export async function getEmailTemplate(id: string) {
  const row = await prisma.emailTemplate.findUnique({ where: { id } });
  return row ? serializeTemplate(row) : null;
}

export async function createEmailTemplate(input: EmailTemplateInput) {
  const row = await prisma.emailTemplate.create({
    data: {
      slug: input.slug,
      name: input.name,
      category: input.category,
      subject: input.subject,
      htmlBody: input.htmlBody,
      textBody: input.textBody ?? null,
      variablesJson: input.variables ? JSON.stringify(input.variables) : null,
      isActive: input.isActive ?? true,
    },
  });
  return serializeTemplate(row);
}

export async function updateEmailTemplate(id: string, input: Partial<EmailTemplateInput>) {
  const row = await prisma.emailTemplate.update({
    where: { id },
    data: {
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.htmlBody !== undefined ? { htmlBody: input.htmlBody } : {}),
      ...(input.textBody !== undefined ? { textBody: input.textBody } : {}),
      ...(input.variables !== undefined ? { variablesJson: JSON.stringify(input.variables) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  return serializeTemplate(row);
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await prisma.emailTemplate.delete({ where: { id } });
}

export async function renderEmailTemplate(slug: string, variables: Record<string, string>) {
  const template = await getEmailTemplateBySlug(slug);
  if (!template || !template.isActive) {
    throw new Error(`Email template not found: ${slug}`);
  }
  return {
    subject: interpolateTemplate(template.subject, variables),
    html: interpolateTemplate(template.htmlBody, variables),
    text: template.textBody ? interpolateTemplate(template.textBody, variables) : undefined,
  };
}

export async function previewEmailTemplate(id: string, variables: Record<string, string>) {
  const template = await getEmailTemplate(id);
  if (!template) throw new Error("Template not found");
  return {
    subject: interpolateTemplate(template.subject, variables),
    html: interpolateTemplate(template.htmlBody, variables),
    text: template.textBody ? interpolateTemplate(template.textBody, variables) : undefined,
  };
}

export async function sendTestEmailTemplate(id: string, to: string, variables: Record<string, string>) {
  const rendered = await previewEmailTemplate(id, variables);
  const { sendPlatformEmail } = await import("./platform-email.service.js");
  await sendPlatformEmail({
    to,
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    templateSlug: `test:${id}`,
  });
}
