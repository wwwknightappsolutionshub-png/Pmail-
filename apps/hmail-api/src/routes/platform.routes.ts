import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireAddon } from "../middleware/requireAddon.js";
import { generateMailPdf, buildMailPdfFilename } from "../services/mail2pdf.service.js";
import { getWhatsAppStatus, sendWhatsAppMessage, WhatsAppError } from "../services/whatsapp.service.js";

export const platformRouter = Router();

platformRouter.use(requireAuth);

const whatsappSchema = z.object({
  toPhone: z.string().min(7),
  body: z.string().min(1),
  subject: z.string().optional(),
});

const mailPdfSchema = z.object({
  subject: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  date: z.string().optional(),
  body: z.string().min(1),
  cc: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

platformRouter.get("/whatsapp/status", requireAddon("whatsapp-functionality"), (_req, res) => {
  res.json(getWhatsAppStatus());
});

platformRouter.post("/whatsapp/send", requireAddon("whatsapp-functionality"), async (req, res, next) => {
  try {
    const body = whatsappSchema.parse(req.body);
    const result = await sendWhatsAppMessage(body);
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof WhatsAppError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

platformRouter.post("/mail2pdf", requireAddon("mail2pdf-functionality"), async (req, res, next) => {
  try {
    const body = mailPdfSchema.parse(req.body);
    const { buffer, filename } = await generateMailPdf(body);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${buildMailPdfFilename(body.subject)}"`);
    res.setHeader("X-Mail2Pdf-Filename", filename);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});
