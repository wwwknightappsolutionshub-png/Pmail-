export interface AutoResponseTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  description: string;
}

export const AUTO_RESPONSE_TEMPLATES: AutoResponseTemplate[] = [
  {
    id: "out-of-office",
    name: "Out of office",
    subject: "Out of office — returning soon",
    description: "Let senders know you are away and when you will reply.",
    bodyHtml:
      "<p>Thank you for your email. I am currently out of the office with limited access to email.</p><p>I will respond to your message when I return on <strong>[return date]</strong>.</p><p>For urgent matters, please contact <strong>[colleague@company.com]</strong>.</p><p>Best regards,<br>[Your name]</p>",
  },
  {
    id: "meeting-ack",
    name: "Meeting acknowledgement",
    subject: "Re: Meeting request received",
    description: "Confirm receipt of a meeting request.",
    bodyHtml:
      "<p>Thank you for your meeting request. I have received your message and will review my calendar shortly.</p><p>I will confirm a time or suggest alternatives within one business day.</p><p>Kind regards,<br>[Your name]</p>",
  },
  {
    id: "support-received",
    name: "Support ticket received",
    subject: "We have received your request",
    description: "Acknowledge a support or helpdesk enquiry.",
    bodyHtml:
      "<p>Thank you for contacting support. Your request has been logged and assigned reference <strong>[ticket #]</strong>.</p><p>Our team aims to respond within <strong>24 business hours</strong>.</p><p>Regards,<br>Support Team</p>",
  },
  {
    id: "thank-you",
    name: "Thank you",
    subject: "Thank you for your message",
    description: "A polite general acknowledgement.",
    bodyHtml:
      "<p>Thank you for reaching out. I appreciate your message and will get back to you as soon as possible.</p><p>Warm regards,<br>[Your name]</p>",
  },
];

export const SAMPLE_SCHEDULED_MESSAGES = [
  {
    id: "sched-1",
    to: "client@example.com",
    subject: "Monthly newsletter — June",
    scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending" as const,
  },
  {
    id: "sched-2",
    to: "team@company.com",
    subject: "Project kick-off reminder",
    scheduledFor: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending" as const,
  },
];
