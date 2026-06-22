import { prisma } from "../lib/prisma.js";

export type TestimonialRecord = {
  id: string;
  authorName: string;
  authorRole: string | null;
  company: string | null;
  body: string;
  rating: number;
  sortOrder: number;
  isPublished: boolean;
  isFeatured: boolean;
  source: string;
  createdAt: string;
  updatedAt: string;
};

function serialize(row: {
  id: string;
  authorName: string;
  authorRole: string | null;
  company: string | null;
  body: string;
  rating: number;
  sortOrder: number;
  isPublished: boolean;
  isFeatured: boolean;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}): TestimonialRecord {
  return {
    id: row.id,
    authorName: row.authorName,
    authorRole: row.authorRole,
    company: row.company,
    body: row.body,
    rating: row.rating,
    sortOrder: row.sortOrder,
    isPublished: row.isPublished,
    isFeatured: row.isFeatured,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const SEED_TESTIMONIALS = [
  {
    authorName: "Sarah Mitchell",
    authorRole: "Operations Director",
    company: "Northgate Legal",
    body: "Prohost Cloud gave us tenant isolation and branded mail without rebuilding our stack. Onboarding was measured in hours, not weeks.",
    rating: 5,
    sortOrder: 0,
    isFeatured: true,
  },
  {
    authorName: "James Okonkwo",
    authorRole: "Founder",
    company: "Stackline SaaS",
    body: "The panel preview sold our board on the platform before we signed. Disk metering and VPS expansion in one console is exactly what we needed.",
    rating: 5,
    sortOrder: 1,
    isFeatured: true,
  },
  {
    authorName: "Elena Vasquez",
    authorRole: "IT Manager",
    company: "Harbor Realty Group",
    body: "Bespoke Mail for our agents handles high-volume showing requests cleanly. The industry tools feel purpose-built, not bolted on.",
    rating: 5,
    sortOrder: 2,
    isFeatured: true,
  },
  {
    authorName: "Tom Marsden",
    authorRole: "Practice Manager",
    company: "Clearview Accounting",
    body: "Document intake and filing reminders over secure mail cut our chase emails during tax season. Support was responsive from day one.",
    rating: 5,
    sortOrder: 3,
    isFeatured: true,
  },
];

export async function seedTestimonials(): Promise<void> {
  for (const item of SEED_TESTIMONIALS) {
    const existing = await prisma.testimonial.findFirst({
      where: { authorName: item.authorName, company: item.company },
    });
    if (existing) continue;
    await prisma.testimonial.create({
      data: {
        ...item,
        isPublished: true,
        source: "admin",
      },
    });
  }
}

export async function listPublishedFeaturedTestimonials(): Promise<TestimonialRecord[]> {
  const rows = await prisma.testimonial.findMany({
    where: { isPublished: true },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    take: 24,
  });
  return rows.map(serialize);
}

export async function approveTestimonial(id: string): Promise<TestimonialRecord> {
  const row = await prisma.testimonial.update({
    where: { id },
    data: { isPublished: true, isFeatured: true },
  });
  return serialize(row);
}

export async function rejectTestimonial(id: string): Promise<TestimonialRecord> {
  const row = await prisma.testimonial.update({
    where: { id },
    data: { isPublished: false, isFeatured: false },
  });
  return serialize(row);
}

export async function listAllTestimonialsAdmin(): Promise<TestimonialRecord[]> {
  const rows = await prisma.testimonial.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(serialize);
}

export async function createTestimonial(input: {
  authorName: string;
  authorRole?: string | null;
  company?: string | null;
  body: string;
  rating?: number;
  sortOrder?: number;
  isPublished?: boolean;
  isFeatured?: boolean;
  source?: string;
}): Promise<TestimonialRecord> {
  const row = await prisma.testimonial.create({
    data: {
      authorName: input.authorName.trim(),
      authorRole: input.authorRole?.trim() || null,
      company: input.company?.trim() || null,
      body: input.body.trim(),
      rating: Math.min(5, Math.max(1, input.rating ?? 5)),
      sortOrder: input.sortOrder ?? 0,
      isPublished: input.isPublished ?? false,
      isFeatured: input.isFeatured ?? false,
      source: input.source ?? "admin",
    },
  });
  return serialize(row);
}

export async function updateTestimonial(
  id: string,
  input: Partial<{
    authorName: string;
    authorRole: string | null;
    company: string | null;
    body: string;
    rating: number;
    sortOrder: number;
    isPublished: boolean;
    isFeatured: boolean;
  }>,
): Promise<TestimonialRecord> {
  const row = await prisma.testimonial.update({
    where: { id },
    data: {
      ...(input.authorName !== undefined ? { authorName: input.authorName.trim() } : {}),
      ...(input.authorRole !== undefined ? { authorRole: input.authorRole?.trim() || null } : {}),
      ...(input.company !== undefined ? { company: input.company?.trim() || null } : {}),
      ...(input.body !== undefined ? { body: input.body.trim() } : {}),
      ...(input.rating !== undefined ? { rating: Math.min(5, Math.max(1, input.rating)) } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
    },
  });
  return serialize(row);
}

export async function deleteTestimonial(id: string): Promise<void> {
  await prisma.testimonial.delete({ where: { id } });
}

export async function submitVisitorTestimonial(input: {
  authorName: string;
  authorRole?: string;
  company?: string;
  body: string;
  rating: number;
}): Promise<TestimonialRecord> {
  const count = await prisma.testimonial.count();
  return createTestimonial({
    authorName: input.authorName,
    authorRole: input.authorRole ?? null,
    company: input.company ?? null,
    body: input.body,
    rating: input.rating,
    sortOrder: count,
    isPublished: false,
    isFeatured: false,
    source: "visitor",
  });
}
