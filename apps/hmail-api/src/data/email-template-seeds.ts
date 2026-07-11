import { EMAIL_HREF_PLACEHOLDER, PMAIL_ADDONS_URL, PMAIL_LOGIN_URL } from "./email-cta-urls.js";
import { emailBtn, emailFeature, emailMuted, PMAIL_WRAPPER, WRAPPER } from "./email-brand-shell.js";

export type EmailTemplateSeed = {
  slug: string;
  name: string;
  category: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
};

export { WRAPPER, PMAIL_WRAPPER, emailBtn, emailFeature, emailMuted };

export const EMAIL_TEMPLATE_SEEDS: EmailTemplateSeed[] = [
  {
    slug: "membership-welcome",
    name: "Membership welcome & demo credentials",
    category: "onboarding",
    subject: "Welcome to Prohost Cloud — your sample panel is ready",
    variables: ["fullName", "workEmail", "demoUsername", "demoDomain", "demoPassword", "panelLoginUrl"],
    textBody:
      "Welcome {{fullName}}. Username: {{demoUsername}} Domain: {{demoDomain}} Password: {{demoPassword}} Login: {{panelLoginUrl}}",
    htmlBody: WRAPPER(
      `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Thank you for registering with Prohost Cloud. Your <strong>sample control panel</strong> is ready so you can explore the experience while we prepare your full deployment (typically 4–8 hours).</p>
<p><strong>Panel login</strong></p>
<ul>
<li>Username: <code>{{demoUsername}}</code></li>
<li>Domain: <code>{{demoDomain}}</code></li>
<li>Password: <code>{{demoPassword}}</code></li>
</ul>
<p>${emailBtn(EMAIL_HREF_PLACEHOLDER, "Open sample panel")}</p>
${emailMuted("This environment is a preview. Production provisioning will follow a separate onboarding email.")}`,
      { brandTag: "Onboarding", headline: "Your sample panel is ready" },
    ),
  },
  {
    slug: "password-reset",
    name: "Password reset",
    category: "account",
    subject: "Reset your Prohost Cloud password",
    variables: ["fullName", "resetUrl", "expiresMinutes"],
    textBody: "Reset your password: {{resetUrl}}",
    htmlBody: WRAPPER(
      `
<p>Hi {{fullName}},</p>
<p>We received a request to reset your password. Click below to choose a new one. This link expires in {{expiresMinutes}} minutes.</p>
<p>${emailBtn(EMAIL_HREF_PLACEHOLDER, "Reset password")}</p>
${emailMuted("If you did not request this, you can ignore this email.")}`,
      { brandTag: "Account", headline: "Reset your password" },
    ),
  },
  {
    slug: "package-upsell",
    name: "Package upsell",
    category: "sales",
    subject: "Upgrade your Prohost Cloud hosting scale",
    variables: ["fullName", "currentPlan", "recommendedPlan", "ctaUrl"],
    textBody: "Hi {{fullName}}, consider upgrading from {{currentPlan}} to {{recommendedPlan}}: {{ctaUrl}}",
    htmlBody: WRAPPER(
      `
<p>Hi {{fullName}},</p>
<p>Based on your usage, <strong>{{recommendedPlan}}</strong> may be a better fit than your current <strong>{{currentPlan}}</strong> tier.</p>
<p>${emailBtn(EMAIL_HREF_PLACEHOLDER, "View upgrade options")}</p>`,
      { brandTag: "Hosting", headline: "A better plan for your growth" },
    ),
  },
  {
    slug: "addon-upsell",
    name: "Addon upsell",
    category: "sales",
    subject: "Enhance your stack with PMail+ add-ons",
    variables: ["fullName", "addonName", "addonSummary", "ctaUrl"],
    textBody: "Discover {{addonName}}: {{ctaUrl}}",
    htmlBody: PMAIL_WRAPPER(
      `
<p>Hi {{fullName}},</p>
<p>{{addonSummary}}</p>
<p><strong>{{addonName}}</strong> integrates with your Prohost Cloud workspace.</p>
<p>${emailBtn(PMAIL_ADDONS_URL, "Explore add-on")}</p>`,
      {
        brandName: "PMail+",
        headline: "Unlock more from your mailbox",
        subhead: "Platform tools that grow with the way you work",
      },
    ),
  },
  {
    slug: "inquiry-auto-reply",
    name: "Inquiry auto-response",
    category: "support",
    subject: "We received your inquiry — Prohost Cloud",
    variables: ["name", "ticketRef"],
    textBody: "Hi {{name}}, we received your inquiry (ref {{ticketRef}}). Our team will respond shortly.",
    htmlBody: WRAPPER(
      `
<p>Hi {{name}},</p>
<p>Thank you for contacting Prohost Cloud. We have received your inquiry <strong>(ref {{ticketRef}})</strong> and will respond in the shortest possible time.</p>
${emailMuted("For urgent matters, reply to this email and reference your ticket number.")}`,
      { brandTag: "Support", headline: "We received your inquiry" },
    ),
  },
  {
    slug: "provisioning-complete",
    name: "Provisioning complete",
    category: "onboarding",
    subject: "Your Prohost Cloud environment is live",
    variables: ["fullName", "panelLoginUrl", "tenantName"],
    textBody: "Hi {{fullName}}, {{tenantName}} is provisioned. Login: {{panelLoginUrl}}",
    htmlBody: WRAPPER(
      `
<p>Hi {{fullName}},</p>
<p>Great news — <strong>{{tenantName}}</strong> is fully provisioned and ready for production use.</p>
<p>${emailBtn(EMAIL_HREF_PLACEHOLDER, "Go to your panel")}</p>`,
      { brandTag: "Onboarding", headline: "Your environment is live" },
    ),
  },
  {
    slug: "trial-ending",
    name: "Trial ending soon",
    category: "billing",
    subject: "Your Prohost Cloud trial ends soon",
    variables: ["fullName", "daysLeft", "upgradeUrl"],
    textBody: "Hi {{fullName}}, {{daysLeft}} days left on your trial. Upgrade: {{upgradeUrl}}",
    htmlBody: WRAPPER(
      `
<p>Hi {{fullName}},</p>
<p>Your trial ends in <strong>{{daysLeft}} days</strong>. Upgrade now to keep uninterrupted access.</p>
<p>${emailBtn(EMAIL_HREF_PLACEHOLDER, "Choose a plan")}</p>`,
      { brandTag: "Billing", headline: "Your trial is ending soon" },
    ),
  },
  {
    slug: "payment-receipt",
    name: "Payment receipt",
    category: "billing",
    subject: "Payment receipt — Prohost Cloud",
    variables: ["fullName", "amount", "invoiceId", "paidAt"],
    textBody: "Payment of {{amount}} received. Invoice {{invoiceId}} on {{paidAt}}.",
    htmlBody: WRAPPER(
      `
<p>Hi {{fullName}},</p>
<p>We received your payment of <strong>{{amount}}</strong>.</p>
<p>Invoice: <code>{{invoiceId}}</code><br/>Date: {{paidAt}}</p>
${emailMuted("Keep this email for your records.")}`,
      { brandTag: "Billing", headline: "Payment received" },
    ),
  },
  {
    slug: "lead-follow-up",
    name: "Lead follow-up",
    category: "sales",
    subject: "Following up on your Prohost Cloud request",
    variables: ["fullName", "salesRepName", "bookingUrl"],
    textBody: "Hi {{fullName}}, {{salesRepName}} from Prohost Cloud would like to connect. Book: {{bookingUrl}}",
    htmlBody: WRAPPER(
      `
<p>Hi {{fullName}},</p>
<p>{{salesRepName}} from our solutions team would like to discuss your requirements.</p>
<p>${emailBtn(EMAIL_HREF_PLACEHOLDER, "Schedule a call")}</p>`,
      { brandTag: "Sales", headline: "Let’s continue the conversation" },
    ),
  },
  {
    slug: "admin-new-membership",
    name: "Internal: new membership application",
    category: "internal",
    subject: "New membership application — {{fullName}}",
    variables: ["fullName", "workEmail", "adminUrl"],
    textBody: "New membership: {{fullName}} ({{workEmail}}). Review: {{adminUrl}}",
    htmlBody: WRAPPER(
      `
<p>New membership application from <strong>{{fullName}}</strong> ({{workEmail}}).</p>
<p>${emailBtn(EMAIL_HREF_PLACEHOLDER, "Review in admin")}</p>`,
      { brandTag: "Internal", headline: "New membership application" },
    ),
  },
  {
    slug: "hosting-package-selection",
    name: "Hosting package selection (new signup)",
    category: "onboarding",
    subject: "Choose your Prohost Cloud hosting package, {{fullName}}",
    variables: ["fullName", "launchUrl", "businessUrl", "proUrl", "panelLoginUrl", "whatsappUrl"],
    textBody: "Hi {{fullName}}, choose Launch, Business, or Pro: {{businessUrl}} · Chat: {{whatsappUrl}}",
    htmlBody: WRAPPER(
      `
<p>Hi <strong>{{fullName}}</strong> — pick the plan that fits your project. NVMe storage, free SSL, and expert support included.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px">
<tr>
<td style="padding:6px 4px"><span style="display:inline-block;background:#ecfdf5;border:1px solid #99f6e4;border-radius:999px;padding:6px 12px;font-size:11px;color:#0f766e;font-weight:700">30-day money-back</span></td>
<td style="padding:6px 4px"><span style="display:inline-block;background:#ecfdf5;border:1px solid #99f6e4;border-radius:999px;padding:6px 12px;font-size:11px;color:#0f766e;font-weight:700">Free SSL</span></td>
</tr>
<tr>
<td style="padding:6px 4px"><span style="display:inline-block;background:#ecfdf5;border:1px solid #99f6e4;border-radius:999px;padding:6px 12px;font-size:11px;color:#0f766e;font-weight:700">Professional mailbox</span></td>
<td style="padding:6px 4px"><span style="display:inline-block;background:#ecfdf5;border:1px solid #99f6e4;border-radius:999px;padding:6px 12px;font-size:11px;color:#0f766e;font-weight:700">24/7 support</span></td>
</tr>
</table>
<table role="presentation" class="plans" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td class="plan-cell" width="33%" valign="top" style="padding:0 6px 12px">
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 12px;text-align:center">
<strong style="display:block;color:#0f172a;font-size:1rem;margin-bottom:4px">Launch</strong>
<span style="display:block;color:#64748b;font-size:11px;margin-bottom:10px">Small site or blog</span>
<span style="display:block;font-size:1.5rem;font-weight:800;color:#0d9488">$9<span style="font-size:12px;font-weight:600;color:#64748b">/mo</span></span>
<ul style="margin:12px 0;padding:0;list-style:none;text-align:left;font-size:12px;color:#334155">
<li style="padding:4px 0;border-bottom:1px solid #e2e8f0"><strong>1</strong> website</li>
<li style="padding:4px 0;border-bottom:1px solid #e2e8f0"><strong>10 GB</strong> NVMe</li>
<li style="padding:4px 0;border-bottom:1px solid #e2e8f0"><strong>1</strong> mailbox</li>
<li style="padding:4px 0">Free migration</li>
</ul>
<a href="#" style="display:block;padding:12px 14px;background:#ffffff;color:#0d9488!important;text-decoration:none;border-radius:999px;font-weight:700;font-size:13px;text-align:center;border:2px solid #0d9488">Choose Launch</a>
</div>
</td>
<td class="plan-cell" width="33%" valign="top" style="padding:0 6px 12px">
<div style="background:#ffffff;border:2px solid #0d9488;border-radius:12px;padding:16px 12px;text-align:center;box-shadow:0 10px 32px rgba(13,148,136,.18)">
<span style="display:inline-block;background:#0d9488;color:#fff;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;padding:4px 10px;border-radius:999px;margin-bottom:8px">Most popular</span>
<strong style="display:block;color:#0f172a;font-size:1rem;margin-bottom:4px">Business</strong>
<span style="display:block;color:#64748b;font-size:11px;margin-bottom:10px">Growing teams &amp; shops</span>
<span style="display:block;font-size:1.5rem;font-weight:800;color:#0d9488">$19<span style="font-size:12px;font-weight:600;color:#64748b">/mo</span></span>
<ul style="margin:12px 0;padding:0;list-style:none;text-align:left;font-size:12px;color:#334155">
<li style="padding:4px 0;border-bottom:1px solid #e2e8f0"><strong>3</strong> websites</li>
<li style="padding:4px 0;border-bottom:1px solid #e2e8f0"><strong>25 GB</strong> NVMe</li>
<li style="padding:4px 0;border-bottom:1px solid #e2e8f0"><strong>3</strong> mailboxes</li>
<li style="padding:4px 0">Vulnerability scanning</li>
</ul>
<a href="#" style="display:block;padding:12px 14px;background:#0d9488;color:#ffffff!important;text-decoration:none;border-radius:999px;font-weight:700;font-size:13px;text-align:center">Choose Business</a>
</div>
</td>
<td class="plan-cell" width="33%" valign="top" style="padding:0 6px 12px">
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 12px;text-align:center">
<strong style="display:block;color:#0f172a;font-size:1rem;margin-bottom:4px">Pro</strong>
<span style="display:block;color:#64748b;font-size:11px;margin-bottom:10px">Multiple sites at scale</span>
<span style="display:block;font-size:1.5rem;font-weight:800;color:#0d9488">$29<span style="font-size:12px;font-weight:600;color:#64748b">/mo</span></span>
<ul style="margin:12px 0;padding:0;list-style:none;text-align:left;font-size:12px;color:#334155">
<li style="padding:4px 0;border-bottom:1px solid #e2e8f0"><strong>10</strong> websites</li>
<li style="padding:4px 0;border-bottom:1px solid #e2e8f0"><strong>50 GB</strong> NVMe</li>
<li style="padding:4px 0;border-bottom:1px solid #e2e8f0"><strong>5</strong> mailboxes</li>
<li style="padding:4px 0">Priority resources</li>
</ul>
<a href="#" style="display:block;padding:12px 14px;background:#ffffff;color:#0d9488!important;text-decoration:none;border-radius:999px;font-weight:700;font-size:13px;text-align:center;border:2px solid #0d9488">Choose Pro</a>
</div>
</td>
</tr>
</table>
<p style="margin:20px 0 12px;font-size:13px;color:#64748b;text-align:center">Need help choosing? Chat with us on WhatsApp</p>
<p style="text-align:center;margin:0 0 16px"><a href="#" style="display:inline-block;padding:12px 22px;background:#25D366;color:#fff!important;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px">Chat on WhatsApp</a></p>
${emailMuted('Already signed in? <a href="#" style="color:#0d9488;font-weight:600">Open your Prohost Cloud panel</a>')}`,
      {
        brandTag: "Hosting",
        headline: "Choose your hosting package",
        subhead: "Intro pricing with NVMe, SSL, and expert support",
      },
    ),
  },
  {
    slug: "hosting-package-thank-you",
    name: "Hosting package thank you",
    category: "onboarding",
    subject: "Thank you — {{planName}} package received",
    variables: ["fullName", "planName", "panelLoginUrl"],
    textBody: "Hi {{fullName}}, we received your {{planName}} selection. Login: {{panelLoginUrl}}",
    htmlBody: WRAPPER(
      `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Thank you for selecting the <strong>{{planName}}</strong> hosting package. Our team has been notified and will follow up shortly to complete your setup.</p>
<p>${emailBtn(EMAIL_HREF_PLACEHOLDER, "Open your panel")}</p>
${emailMuted("Questions? WhatsApp us at +44 7756 183484 or reply to this email.")}`,
      { brandTag: "Hosting", headline: "Thanks — we received your package choice" },
    ),
  },
  {
    slug: "pmail-refer-friend",
    name: "PMail+ Refer a friend invitation",
    category: "pmail",
    subject: "Explore More Possibilities With Mails On PMail+ | Join Me",
    variables: ["senderName", "senderEmail", "referralUrl", "productName", "signatureFooter"],
    textBody: `Hi there,

I've been using {{productName}} for my daily mail and workspace tools, and it's been a real upgrade from a standard mail client.

Why I'm recommending {{productName}}:
- A focused mail workspace designed for modern teams and solo operators
- Platform tools like calendar, scheduling, open tracking, WhatsApp handoff, and PDF exports
- Industry workspaces with CRM-style tools for legal, accounting, healthcare, and more
- Clean upgrade path — start with regular mail, then unlock only what you need

Try it here: https://mail.prohost.cloud/addons

I'd love for you to explore the same workflow I'm using.

{{signatureFooter}}`,
    htmlBody: PMAIL_WRAPPER(
      `
<p>Hi there,</p>
<p>I've switched my day-to-day mail to <strong>{{productName}}</strong> and thought you'd benefit from it too. It's more than inbox — it's a workspace where mail, scheduling, and business tools stay in one place.</p>
${emailFeature("Mail that feels modern", "Fast compose, organized folders, signatures, and a workspace built for real operators.")}
${emailFeature("Platform tools ready when you need them", "Calendar, scheduled send, open tracking, WhatsApp handoff, and Mail2PDF exports.")}
${emailFeature("Industry workspaces", "Legal, accounting, healthcare, recruitment, and more — unlock vertical tools only when your team is ready.")}
${emailFeature("Upgrade on your terms", "Start with regular mail, explore the environment, and subscribe only to the bundles you want.")}
<p>${emailBtn(PMAIL_ADDONS_URL, "Explore {{productName}}")}</p>
${emailMuted("Use the link above to sign in and explore the same mail experience I'm using.")}`,
      {
        brandName: "{{productName}}",
        headline: "Explore More Possibilities With Mails On {{productName}} | Join Me",
        subhead: "A smarter mail workspace with tools that grow with your business",
        signatureHtml: "{{signatureFooter}}",
      },
    ),
  },
  {
    slug: "platform-tools-referral-upsell",
    name: "Platform tools referral reward upsell",
    category: "pmail",
    subject: "Your free Platform tools end tomorrow — keep them unlocked",
    variables: ["fullName", "ctaUrl", "productName"],
    textBody: `Hi {{fullName}},

Your complimentary {{productName}} Platform tools trial ends tomorrow. Subscribe now to keep calendar, scheduled send, open tracking, WhatsApp handoff, and Mail2PDF unlocked.

Upgrade here: {{ctaUrl}}`,
    htmlBody: PMAIL_WRAPPER(
      `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Your complimentary <strong>{{productName}} Platform tools</strong> trial ends <strong>tomorrow</strong>.</p>
<p>Subscribe now to keep calendar, scheduled send, open tracking, WhatsApp handoff, and Mail2PDF unlocked in your workspace.</p>
<p>${emailBtn(PMAIL_ADDONS_URL, "Unlock Platform tools")}</p>
${emailMuted("If you do not subscribe, Platform tools will be gated when the trial ends.")}`,
      {
        headline: "Keep Platform tools unlocked",
        subhead: "Your complimentary trial ends tomorrow",
      },
    ),
  },
  {
    slug: "pmail-refer-and-extend",
    name: "PMail+ Refer & Extend trial",
    category: "pmail",
    subject: "Your free addon trial ended — refer a friend to unlock 7 more days",
    variables: ["fullName", "productName", "ctaUrl", "referFriendUrl"],
    textBody: `Hi {{fullName}},

Your complimentary {{productName}} addon trial period has just ended — and the tools that made your workspace feel complete are locked again.

Refer a friend and you can reactivate 7 free days of Platform tools access.

What you unlock again when you refer:
- Unified email accounts — Connect and switch between multiple mailboxes in one workspace.
- Mail auto categorization by sender — Sort high-volume senders and keep inbox noise under control.
- Dedicated file directory — Keep shared files organized beside the conversations that need them.
- Open Tracking — Know when recipients open important messages.
- Auto Reply — Send professional acknowledgments while you focus on higher-value work.
- Auto Contacts Directory — Build and maintain a living address book from real mailbox traffic.
- File Vaults — Share large files securely with tracked download links.
- Career Huntr — Track applications, roles, and career outreach from the same mail workspace.

Click Refer & Extend Trial to open Refer a friend in {{productName}}: {{ctaUrl}}

{{referFriendUrl}}`,
    htmlBody: PMAIL_WRAPPER(
      `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Your complimentary <strong>{{productName}} addon trial</strong> has just ended. The productivity stack that sat next to your inbox is gated again — but you can bring it back without paying today.</p>
<p><strong>Refer a friend</strong> and we reactivate <strong>7 free days</strong> of Platform tools for your workspace.</p>
${emailFeature("Unified email accounts", "Connect and switch between multiple mailboxes in one focused workspace.")}
${emailFeature("Mail auto categorization by sender", "Tame high-volume senders and keep important threads visible.")}
${emailFeature("Dedicated file directory", "Keep project files organized beside the conversations that need them.")}
${emailFeature("Open Tracking", "See when recipients open critical messages so you can follow up with confidence.")}
${emailFeature("Auto Reply", "Acknowledge inbound mail professionally while you stay focused on higher-value work.")}
${emailFeature("Auto Contacts Directory", "Grow a living address book from real mailbox traffic — not manual data entry.")}
${emailFeature("File Vaults", "Share large files securely with tracked download links instead of fragile attachments.")}
${emailFeature("Career Huntr", "Track applications, roles, and career outreach from the same mail workspace.")}
<p>${emailBtn("{{ctaUrl}}", "Refer &amp; Extend Trial")}</p>
${emailMuted("This reminder repeats every 48 hours until you use Refer a friend or click the button above.")}`,
      {
        brandName: "{{productName}}",
        headline: "Your free trial ended — refer a friend to unlock 7 more days",
        subhead: "Reactivate Platform tools by sharing PMail+ with someone who will value the upgrade",
      },
    ),
  },
  {
    slug: "panel-workspace-welcome",
    name: "Panel workspace welcome trial",
    category: "pmail",
    subject: "Your {{productName}} workspace tools trial is active",
    variables: ["fullName", "ctaUrl", "productName", "trialDays"],
    textBody: `Hi {{fullName}},

Welcome to {{productName}}. Your complimentary {{trialDays}}-day Panel workspace tools trial is now active — CRM, reminders, open tracking, file vault, inbox cleanup, e-sign, email SLA, and more.

Explore add-ons: {{ctaUrl}}`,
    htmlBody: PMAIL_WRAPPER(
      `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Welcome to <strong>{{productName}}</strong>. Your complimentary <strong>{{trialDays}}-day</strong> Panel workspace tools trial is now active.</p>
<p>Unlocked during your trial: CRM pipeline, reminders, open tracking, file vault, inbox cleanup, attachment categories, e-sign, email SLA, Mail2PDF, auto-reply, and other Panel workspace tools.</p>
<p>${emailBtn(PMAIL_ADDONS_URL, "Open workspace add-ons")}</p>`,
      {
        headline: "Your workspace tools trial is active",
        subhead: "Explore Panel tools while your complimentary access is open",
      },
    ),
  },
  {
    slug: "panel-workspace-72h-reminder",
    name: "Panel workspace 72-hour reminder",
    category: "pmail",
    subject: "{{hoursLeft}} hours left on your {{productName}} workspace trial",
    variables: ["fullName", "ctaUrl", "productName", "hoursLeft", "daysLeft"],
    textBody: `Hi {{fullName}},

Your complimentary {{productName}} Panel workspace tools trial ends in about {{hoursLeft}} hours ({{daysLeft}} days). Subscribe now to keep CRM, reminders, open tracking, file vault, e-sign, email SLA, and other Panel tools after your trial ends.

Upgrade: {{ctaUrl}}`,
    htmlBody: PMAIL_WRAPPER(
      `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Your complimentary <strong>{{productName}}</strong> Panel workspace tools trial ends in about <strong>{{hoursLeft}} hours</strong> ({{daysLeft}} days).</p>
<p>Subscribe now to keep CRM, reminders, open tracking, file vault, e-sign, email SLA, and the rest of your workspace tools after your trial ends.</p>
<p>${emailBtn(PMAIL_ADDONS_URL, "Upgrade workspace tools")}</p>`,
      {
        headline: "{{hoursLeft}} hours left on your trial",
        subhead: "Subscribe to keep workspace tools unlocked",
      },
    ),
  },
  {
    slug: "panel-workspace-24h-reminder",
    name: "Panel workspace 24-hour final reminder",
    category: "pmail",
    subject: "Final reminder — workspace tools lock in 24 hours",
    variables: ["fullName", "ctaUrl", "productName", "hoursLeft"],
    textBody: `Hi {{fullName}},

This is your final reminder: your complimentary {{productName}} Panel workspace tools trial ends in {{hoursLeft}} hours. CRM, reminders, open tracking, file vault, e-sign, email SLA, and other Panel tools will be locked unless you upgrade.

Upgrade now: {{ctaUrl}}`,
    htmlBody: PMAIL_WRAPPER(
      `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p><strong>Final reminder:</strong> your complimentary <strong>{{productName}}</strong> Panel workspace tools trial ends in <strong>{{hoursLeft}} hours</strong>.</p>
<p>CRM, reminders, open tracking, file vault, e-sign, email SLA, and other Panel workspace tools will be locked unless you upgrade.</p>
<p>${emailBtn(PMAIL_ADDONS_URL, "Upgrade before tools lock")}</p>`,
      {
        headline: "Final reminder — tools lock soon",
        subhead: "Upgrade now to keep your workspace stack",
      },
    ),
  },
  {
    slug: "auto-reply-upsell",
    name: "Auto Reply complimentary ending upsell",
    category: "pmail",
    subject: "Your Auto Reply access ends in {{daysLeft}} days",
    variables: ["fullName", "daysLeft", "ctaUrl", "productName"],
    textBody: `Hi {{fullName}},

Your complimentary {{productName}} Auto Reply access ends in {{daysLeft}} days. Subscribe to keep automatic inbox acknowledgments running for your workspace.

Upgrade here: {{ctaUrl}}`,
    htmlBody: PMAIL_WRAPPER(
      `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Your complimentary <strong>{{productName}} Auto Reply</strong> access ends in <strong>{{daysLeft}} days</strong>.</p>
<p>Subscribe to keep automatic inbox acknowledgments, industry templates, and custom reply rules active in your mail workspace.</p>
<p>${emailBtn(PMAIL_ADDONS_URL, "Unlock Auto Reply")}</p>
${emailMuted("After the complimentary period, Auto Reply is gated until you subscribe from the Addon Marketplace.")}`,
      {
        headline: "Keep Auto Reply running",
        subhead: "Your complimentary access is ending soon",
      },
    ),
  },
  {
    slug: "pmail-prospect-welcome",
    name: "PMail+ prospect demo welcome",
    category: "pmail",
    subject: "Welcome to {{productName}} — your demo workspace is ready",
    variables: [
      "fullName",
      "productName",
      "loginUrl",
      "workEmail",
      "demoPassword",
      "expiresAtLabel",
      "trialHours",
      "addonsUrl",
    ],
    textBody:
      "Hi {{fullName}}, your {{trialHours}}-hour {{productName}} demo is ready. Sign in at {{loginUrl}} with {{workEmail}} / {{demoPassword}}. Access expires {{expiresAtLabel}}.",
    htmlBody: PMAIL_WRAPPER(
      `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Welcome to <strong>{{productName}}</strong>. Your personal demo workspace is ready — explore mail, workspace tools, and industry panels without connecting a live mailbox yet.</p>
<p><strong>Your demo login</strong></p>
<ul>
<li>Sign-in page: <a href="${PMAIL_LOGIN_URL}">${PMAIL_LOGIN_URL}</a></li>
<li>Email: <code>{{workEmail}}</code></li>
<li>Password: <code>{{demoPassword}}</code></li>
<li>Access valid until: <strong>{{expiresAtLabel}}</strong> ({{trialHours}} hours)</li>
</ul>
<p>${emailBtn(PMAIL_LOGIN_URL, "Open your PMail+ demo")}</p>
${emailMuted("This demo uses a sample inbox and accounting workspace data, similar to our internal PMail+ tester experience.")}
${emailMuted("When you're ready to keep going, explore upgrades from your workspace or reply to this email.")}`,
      {
        headline: "Your demo workspace is ready",
        subhead: "Explore mail and industry tools in a guided trial",
      },
    ),
  },
  {
    slug: "pmail-prospect-upsell",
    name: "PMail+ prospect demo upgrade reminder",
    category: "pmail",
    subject: "Your {{productName}} demo ends in {{hoursLeft}} hours — upgrade to keep access",
    variables: ["fullName", "productName", "loginUrl", "hoursLeft", "addonsUrl", "registerUrl"],
    textBody:
      "Hi {{fullName}}, your {{productName}} demo ends in {{hoursLeft}} hours. Sign in: {{loginUrl}} · Upgrade: {{addonsUrl}}",
    htmlBody: PMAIL_WRAPPER(
      `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Your <strong>{{productName}}</strong> demo workspace expires in about <strong>{{hoursLeft}} hours</strong>.</p>
<p>Upgrade now to keep CRM, reminders, open tracking, file vault, industry workspaces, and the rest of your PMail+ toolkit unlocked beyond the demo window.</p>
<p>${emailBtn(PMAIL_ADDONS_URL, "View upgrade options")}</p>
<p><a href="${PMAIL_ADDONS_URL}" style="color:#0d9488;font-weight:600">Return to your demo workspace</a> while access is still active.</p>
${emailMuted("Need help choosing a plan? Reply to this email or request full workspace access at {{registerUrl}}.")}`,
      {
        headline: "Your demo ends soon",
        subhead: "Upgrade to keep workspace tools unlocked",
      },
    ),
  },
  {
    slug: "pmail-account-welcome",
    name: "PMail+ account welcome",
    category: "pmail",
    subject: "Welcome to {{productName}} — your branded mail workspace",
    variables: [
      "fullName",
      "productName",
      "ctaUrl",
      "exploreUrl",
      "loginUrl",
      "workspaceAddonsList",
      "verticalAddonsList",
      "workspaceAddonsHtml",
      "verticalAddonsHtml",
    ],
    textBody: `Hi {{fullName}},

Welcome to {{productName}} — the branded mail workspace from Prohost Cloud.

PMail+ connects your existing mailbox (Gmail, Outlook, and more) to a unified inbox with CRM, reminders, open tracking, file vault, industry workspaces, and optional business-vertical add-ons.

Workspace add-ons available in PMail+:
{{workspaceAddonsList}}

Business vertical add-ons (industry toolkits):
{{verticalAddonsList}}

Sign in anytime: {{loginUrl}}
Explore PMail+: {{exploreUrl}}
Explore add-ons: {{ctaUrl}}`,
    htmlBody: PMAIL_WRAPPER(
      `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Welcome to <strong>{{productName}}</strong> — your branded mail workspace from Prohost Cloud.</p>
<p>PMail+ connects your existing mailbox to a unified inbox with CRM, reminders, calendar, open tracking, file vault, e-sign, and industry-specific toolkits you can activate when you need them.</p>
<p><strong>Workspace add-ons</strong></p>
{{workspaceAddonsHtml}}
<p><strong>Business vertical add-ons</strong></p>
{{verticalAddonsHtml}}
<p>${emailBtn(PMAIL_ADDONS_URL, "Open PMail+")}</p>
<p><a href="${PMAIL_ADDONS_URL}" style="color:#0d9488;font-weight:600">Browse the add-on marketplace</a></p>
${emailMuted("You received this email because you signed in or connected a mailbox to PMail+.")}`,
      {
        headline: "Welcome to your branded mail workspace",
        subhead: "Connect your mailbox and unlock tools as you grow",
      },
    ),
  },
  {
    slug: "job-hunter-inbox-upsell",
    name: "Job Hunter inbox signal upsell",
    category: "pmail",
    subject: "Activate {{addonName}} — we noticed career activity in your mailbox",
    variables: ["fullName", "productName", "addonName", "ctaUrl"],
    textBody: `Hi {{fullName}},

We scanned your inbox and sent mail in {{productName}} and noticed job-search activity — applications, recruiter messages, interview invites, or careers-related mail.

Activate {{addonName}} to unlock CV Hub, application tracking, interview prep, and privacy-first career intelligence inside your mail workspace.

Activate now: {{ctaUrl}}`,
    htmlBody: PMAIL_WRAPPER(
      `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>We noticed <strong>career and job-search activity</strong> in your {{productName}} inbox and sent mail — things like applications, recruiter outreach, interview scheduling, or careers newsletters.</p>
<p>Activate <strong>{{addonName}}</strong> to unlock CV Hub, application tracking, interview prep, and privacy-first career tools built into your mailbox workspace.</p>
<p>${emailBtn(PMAIL_ADDONS_URL, "Activate {{addonName}}")}</p>
${emailMuted("You can turn off automatic inbox upsell emails from the Prohost super admin panel.")}`,
      {
        headline: "Career tools for your mailbox",
        subhead: "We noticed job-search activity worth activating",
      },
    ),
  },
];
