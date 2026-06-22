import { prisma } from "../lib/prisma.js";
import { SYSTEM_ACCOUNTING_TEMPLATES } from "../data/feature-seeds.js";

export async function seedAccountingTemplates(): Promise<void> {
  for (const template of SYSTEM_ACCOUNTING_TEMPLATES) {
    const existing = await prisma.acSecureTemplate.findFirst({
      where: { tenantId: null, slug: template.slug },
    });
    if (existing) {
      await prisma.acSecureTemplate.update({
        where: { id: existing.id },
        data: {
          name: template.name,
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          description: template.description,
          category: template.category,
          isSystem: true,
        },
      });
    } else {
      await prisma.acSecureTemplate.create({
        data: {
          tenantId: null,
          slug: template.slug,
          name: template.name,
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          description: template.description,
          category: template.category,
          isSystem: true,
        },
      });
    }
  }
}

export async function listAccountingTemplates(tenantId: string) {
  const templates = await prisma.acSecureTemplate.findMany({
    where: { OR: [{ tenantId: null }, { tenantId }] },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return templates.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    subject: t.subject,
    bodyHtml: t.bodyHtml,
    description: t.description,
    category: t.category,
    isSystem: t.isSystem,
  }));
}
