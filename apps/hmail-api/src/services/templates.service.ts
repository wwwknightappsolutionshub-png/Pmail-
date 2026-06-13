import { prisma } from "../lib/prisma.js";
import { SYSTEM_IMMIGRATION_TEMPLATES } from "../data/feature-seeds.js";

export async function seedImmigrationTemplates(): Promise<void> {
  for (const template of SYSTEM_IMMIGRATION_TEMPLATES) {
    const existing = await prisma.immigrationTemplate.findFirst({
      where: { tenantId: null, slug: template.slug },
    });
    if (existing) {
      await prisma.immigrationTemplate.update({
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
      await prisma.immigrationTemplate.create({
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

export async function listImmigrationTemplates(tenantId: string) {
  const templates = await prisma.immigrationTemplate.findMany({
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
