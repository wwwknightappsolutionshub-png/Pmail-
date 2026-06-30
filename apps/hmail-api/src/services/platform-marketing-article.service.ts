import { prisma } from "../lib/prisma.js";

export type PlatformArticleFaqItem = { question: string; answer: string };

function parseFaqJson(raw: string | null): PlatformArticleFaqItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is PlatformArticleFaqItem => {
        return (
          !!item &&
          typeof item === "object" &&
          typeof (item as PlatformArticleFaqItem).question === "string" &&
          typeof (item as PlatformArticleFaqItem).answer === "string"
        );
      })
      .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
      .filter((item) => item.question && item.answer);
  } catch {
    return [];
  }
}

function serializeArticle(row: {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
  locale: string;
  faqJson: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    bodyHtml: row.bodyHtml,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    ogImageUrl: row.ogImageUrl,
    locale: row.locale,
    faq: parseFaqJson(row.faqJson),
    isPublished: row.isPublished,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function listPublishedPlatformArticles() {
  const rows = await prisma.platformMarketingArticle.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
  });
  return rows.map(serializeArticle);
}

export async function listAllPlatformArticles() {
  const rows = await prisma.platformMarketingArticle.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map(serializeArticle);
}

export async function getPublishedPlatformArticleBySlug(slug: string) {
  const row = await prisma.platformMarketingArticle.findFirst({
    where: { slug, isPublished: true },
  });
  return row ? serializeArticle(row) : null;
}

export async function getPlatformArticleById(id: string) {
  const row = await prisma.platformMarketingArticle.findUnique({ where: { id } });
  return row ? serializeArticle(row) : null;
}

export async function createPlatformArticle(input: {
  slug?: string;
  title: string;
  excerpt?: string | null;
  bodyHtml?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  locale?: string;
  faq?: PlatformArticleFaqItem[];
  isPublished?: boolean;
  sortOrder?: number;
}) {
  const slug = slugify(input.slug?.trim() || input.title);
  const isPublished = input.isPublished ?? false;
  const row = await prisma.platformMarketingArticle.create({
    data: {
      slug,
      title: input.title.trim(),
      excerpt: input.excerpt?.trim() || null,
      bodyHtml: input.bodyHtml ?? "",
      metaTitle: input.metaTitle?.trim() || null,
      metaDescription: input.metaDescription?.trim() || null,
      ogImageUrl: input.ogImageUrl?.trim() || null,
      locale: input.locale?.trim() || "en-CA",
      faqJson: input.faq?.length ? JSON.stringify(input.faq) : null,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  return serializeArticle(row);
}

export async function updatePlatformArticle(
  id: string,
  input: {
    slug?: string;
    title?: string;
    excerpt?: string | null;
    bodyHtml?: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogImageUrl?: string | null;
    locale?: string;
    faq?: PlatformArticleFaqItem[];
    isPublished?: boolean;
    sortOrder?: number;
  },
) {
  const existing = await prisma.platformMarketingArticle.findUnique({ where: { id } });
  if (!existing) throw new Error("Article not found");

  const isPublished = input.isPublished ?? existing.isPublished;
  const publishedAt =
    isPublished && !existing.isPublished
      ? new Date()
      : isPublished
        ? existing.publishedAt
        : null;

  const row = await prisma.platformMarketingArticle.update({
    where: { id },
    data: {
      ...(input.slug !== undefined ? { slug: slugify(input.slug) } : {}),
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.excerpt !== undefined ? { excerpt: input.excerpt?.trim() || null } : {}),
      ...(input.bodyHtml !== undefined ? { bodyHtml: input.bodyHtml } : {}),
      ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle?.trim() || null } : {}),
      ...(input.metaDescription !== undefined
        ? { metaDescription: input.metaDescription?.trim() || null }
        : {}),
      ...(input.ogImageUrl !== undefined ? { ogImageUrl: input.ogImageUrl?.trim() || null } : {}),
      ...(input.locale !== undefined ? { locale: input.locale.trim() || "en-CA" } : {}),
      ...(input.faq !== undefined ? { faqJson: input.faq.length ? JSON.stringify(input.faq) : null } : {}),
      ...(input.isPublished !== undefined ? { isPublished, publishedAt } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
  return serializeArticle(row);
}

export async function deletePlatformArticle(id: string) {
  await prisma.platformMarketingArticle.delete({ where: { id } });
}

export async function countPublishedArticlesSince(since: Date) {
  return prisma.platformMarketingArticle.count({
    where: { isPublished: true, publishedAt: { gte: since } },
  });
}
