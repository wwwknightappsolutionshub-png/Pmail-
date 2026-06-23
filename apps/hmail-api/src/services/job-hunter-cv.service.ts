import PDFDocument from "pdfkit";
import {
  emptyCvContent,
  parseCvContentJson,
  type JobHunterCvContent,
  type JobHunterCvSource,
} from "../lib/job-hunter-cv-content.js";
import { normalizeJobHunterRegion, type JobHunterRegion } from "../lib/job-hunter.js";
import { prisma } from "../lib/prisma.js";
import { getCvTemplateById, listCvTemplates } from "../data/job-hunter-cv-templates.js";
import { ensureStorageDir, saveStoredFile } from "./file-storage.service.js";

const CV_PDF_NAMESPACE = "job-hunter-cv";

function serializeDocument(row: {
  id: string;
  title: string;
  region: string;
  role: string | null;
  industry: string | null;
  contentJson: string;
  pdfStoragePath: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    title: row.title,
    region: row.region,
    role: row.role,
    industry: row.industry,
    content: parseCvContentJson(row.contentJson),
    pdfStoragePath: row.pdfStoragePath,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderCvHtml(content: JobHunterCvContent, region: JobHunterRegion): string {
  const contactParts = [
    content.contact.email,
    content.contact.phone,
    content.contact.location,
    content.contact.linkedIn,
  ].filter((part): part is string => Boolean(part));

  const experienceHtml = content.experience
    .map(
      (job) => `
      <section class="cv-block">
        <h3>${escapeHtml(job.title)} — ${escapeHtml(job.company)}</h3>
        <p class="cv-meta">${escapeHtml(job.location)} | ${escapeHtml(job.startDate)} – ${escapeHtml(job.endDate)}</p>
        <ul>${job.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
      </section>`,
    )
    .join("");

  const educationHtml = content.education
    .map(
      (edu) => `
      <section class="cv-block">
        <h3>${escapeHtml(edu.degree)}</h3>
        <p class="cv-meta">${escapeHtml(edu.school)}${edu.year ? ` — ${escapeHtml(edu.year)}` : ""}</p>
        ${edu.details ? `<p>${escapeHtml(edu.details)}</p>` : ""}
      </section>`,
    )
    .join("");

  const certificationsHtml =
    content.certifications.length > 0
      ? `<section class="cv-block"><h2>Certifications</h2><ul>${content.certifications
          .map(
            (cert) =>
              `<li>${escapeHtml(cert.name)} — ${escapeHtml(cert.issuer)}${cert.year ? ` (${escapeHtml(cert.year)})` : ""}</li>`,
          )
          .join("")}</ul></section>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(content.fullName || "CV")}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; max-width: 780px; margin: 0 auto; padding: 24px; line-height: 1.45; }
    h1 { font-size: 1.75rem; margin: 0 0 0.25rem; }
    h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.25rem; margin: 1.25rem 0 0.5rem; }
    h3 { font-size: 1rem; margin: 0 0 0.25rem; }
    .cv-contact, .cv-meta { color: #475569; margin: 0 0 0.75rem; }
    .cv-block { margin-bottom: 0.75rem; }
    ul { margin: 0.25rem 0 0; padding-left: 1.25rem; }
    .cv-region-note { font-size: 0.85rem; color: #64748b; margin-top: 1rem; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(content.fullName || "Your name")}</h1>
    <p class="cv-contact">${contactParts.map((part) => escapeHtml(part)).join(" | ")}</p>
  </header>
  <section class="cv-block">
    <h2>Professional Summary</h2>
    <p>${escapeHtml(content.summary)}</p>
  </section>
  <section class="cv-block">
    <h2>Experience</h2>
    ${experienceHtml || "<p>—</p>"}
  </section>
  <section class="cv-block">
    <h2>Education</h2>
    ${educationHtml || "<p>—</p>"}
  </section>
  <section class="cv-block">
    <h2>Skills</h2>
    <p>${content.skills.map(escapeHtml).join(", ") || "—"}</p>
  </section>
  ${certificationsHtml}
  <p class="cv-region-note">Region guidance: ${escapeHtml(region)}</p>
</body>
</html>`;
}

function sanitizePdfFilename(title: string): string {
  const base = title.trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
  return `${base || "cv"}.pdf`;
}

export async function generateCvPdf(content: JobHunterCvContent, title: string): Promise<{ buffer: Buffer; filename: string }> {
  const filename = sanitizePdfFilename(title);

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "LETTER" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).fillColor("#0f172a").text(content.fullName || "CV");
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor("#475569");
    const contactLine = [content.contact.email, content.contact.phone, content.contact.location, content.contact.linkedIn]
      .filter(Boolean)
      .join(" | ");
    if (contactLine) doc.text(contactLine);
    doc.moveDown(0.75);

    const section = (heading: string) => {
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor("#0f172a").text(heading.toUpperCase(), { underline: true });
      doc.moveDown(0.35);
    };

    section("Professional Summary");
    doc.fontSize(10).fillColor("#0f172a").text(content.summary || "—", { lineGap: 3 });

    section("Experience");
    for (const job of content.experience) {
      doc.fontSize(10).fillColor("#0f172a").text(`${job.title} — ${job.company}`);
      doc.fontSize(9).fillColor("#64748b").text(`${job.location} | ${job.startDate} – ${job.endDate}`);
      for (const bullet of job.bullets) {
        doc.fontSize(10).fillColor("#0f172a").text(`• ${bullet}`, { indent: 12, lineGap: 2 });
      }
      doc.moveDown(0.25);
    }
    if (content.experience.length === 0) doc.fontSize(10).text("—");

    section("Education");
    for (const edu of content.education) {
      doc.fontSize(10).fillColor("#0f172a").text(`${edu.degree} — ${edu.school}${edu.year ? ` (${edu.year})` : ""}`);
      if (edu.details) doc.fontSize(9).fillColor("#64748b").text(edu.details);
    }
    if (content.education.length === 0) doc.fontSize(10).text("—");

    section("Skills");
    doc.fontSize(10).fillColor("#0f172a").text(content.skills.join(", ") || "—", { lineGap: 2 });

    if (content.certifications.length > 0) {
      section("Certifications");
      for (const cert of content.certifications) {
        doc.fontSize(10).text(`${cert.name} — ${cert.issuer}${cert.year ? ` (${cert.year})` : ""}`);
      }
    }

    doc.end();
  });

  return { buffer, filename };
}

export function getTemplates(filters?: {
  region?: string;
  role?: string;
  industry?: string;
  experienceLevel?: string;
  sortBy?: "country" | "experience" | "profession";
}) {
  return listCvTemplates(filters);
}

export async function listCvDocuments(userId: string) {
  const rows = await prisma.jobHunterCvDocument.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(serializeDocument);
}

export async function getCvDocument(userId: string, id: string) {
  const row = await prisma.jobHunterCvDocument.findFirst({ where: { id, userId } });
  if (!row) return null;
  return serializeDocument(row);
}

export async function createCvDocument(
  userId: string,
  input: {
    title?: string;
    region?: string;
    role?: string;
    industry?: string;
    templateId?: string;
    content?: JobHunterCvContent;
    source?: JobHunterCvSource;
  },
) {
  const region = normalizeJobHunterRegion(input.region);
  let content = input.content ? emptyCvContent(input.content) : emptyCvContent();
  let title = input.title?.trim() || "Untitled CV";
  let role = input.role?.trim() || null;
  let industry = input.industry?.trim() || null;
  const source: JobHunterCvSource = input.source ?? "builder";

  if (input.templateId) {
    const template = getCvTemplateById(input.templateId);
    if (!template) {
      throw new Error("Template not found");
    }
    content = structuredClone(template.content);
    title = input.title?.trim() || template.title;
    role = role ?? template.roleCategory;
    industry = industry ?? template.industry;
  }

  const row = await prisma.jobHunterCvDocument.create({
    data: {
      userId,
      title,
      region,
      role,
      industry,
      contentJson: JSON.stringify(content),
      source,
    },
  });

  return serializeDocument(row);
}

export async function updateCvDocument(
  userId: string,
  id: string,
  input: {
    title?: string;
    region?: string;
    role?: string;
    industry?: string;
    content?: JobHunterCvContent;
  },
) {
  const existing = await prisma.jobHunterCvDocument.findFirst({ where: { id, userId } });
  if (!existing) return null;

  let contentJson = existing.contentJson;
  if (input.content) {
    contentJson = JSON.stringify(emptyCvContent(input.content));
  }

  const row = await prisma.jobHunterCvDocument.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.region !== undefined ? { region: normalizeJobHunterRegion(input.region) } : {}),
      ...(input.role !== undefined ? { role: input.role.trim() || null } : {}),
      ...(input.industry !== undefined ? { industry: input.industry.trim() || null } : {}),
      contentJson,
    },
  });

  return serializeDocument(row);
}

export async function exportCvDocumentPdf(userId: string, tenantId: string, id: string) {
  const row = await prisma.jobHunterCvDocument.findFirst({ where: { id, userId } });
  if (!row) return null;

  const content = parseCvContentJson(row.contentJson);
  const { buffer, filename } = await generateCvPdf(content, row.title);

  await ensureStorageDir(CV_PDF_NAMESPACE, tenantId);
  const stored = await saveStoredFile({
    namespace: CV_PDF_NAMESPACE,
    tenantId,
    fileName: filename,
    mimeType: "application/pdf",
    dataBase64: buffer.toString("base64"),
    maxBytes: 5 * 1024 * 1024,
    allowedMime: { "application/pdf": ".pdf" },
  });

  await prisma.jobHunterCvDocument.update({
    where: { id },
    data: { pdfStoragePath: stored.storagePath },
  });

  return { buffer, filename, mimeType: "application/pdf" as const };
}

export function previewCvDocumentHtml(userId: string, id: string) {
  return prisma.jobHunterCvDocument.findFirst({ where: { id, userId } }).then((row) => {
    if (!row) return null;
    const content = parseCvContentJson(row.contentJson);
    return renderCvHtml(content, normalizeJobHunterRegion(row.region));
  });
}
