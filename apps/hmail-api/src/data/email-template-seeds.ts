export type EmailTemplateSeed = {
  slug: string;
  name: string;
  category: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
};

const WRAPPER = (body: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
body{margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:#f0fdfa;color:#0f172a}
.wrap{max-width:560px;margin:0 auto;padding:32px 16px}
.card{background:#fff;border-radius:12px;border:1px solid #99f6e4;overflow:hidden;box-shadow:0 4px 24px rgba(13,148,136,.12)}
.head{background:linear-gradient(135deg,#0d9488,#14b8a6);padding:28px 24px;color:#fff}
.head h1{margin:0;font-size:1.35rem;font-weight:700}
.body{padding:24px;line-height:1.6;font-size:15px}
.btn{display:inline-block;margin-top:16px;padding:12px 24px;background:#0d9488;color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600}
.muted{color:#64748b;font-size:13px}
.foot{padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center}
code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px}
</style></head>
<body><div class="wrap"><div class="card">
<div class="head"><h1>Prohost Cloud</h1></div>
<div class="body">${body}</div>
<div class="foot">© Prohost Cloud · Enterprise hosting, mail &amp; infrastructure</div>
</div></div></body></html>`;

export const EMAIL_TEMPLATE_SEEDS: EmailTemplateSeed[] = [
  {
    slug: "membership-welcome",
    name: "Membership welcome & demo credentials",
    category: "onboarding",
    subject: "Welcome to Prohost Cloud — your sample panel is ready",
    variables: ["fullName", "workEmail", "demoUsername", "demoDomain", "demoPassword", "panelLoginUrl"],
    textBody: "Welcome {{fullName}}. Username: {{demoUsername}} Domain: {{demoDomain}} Password: {{demoPassword}} Login: {{panelLoginUrl}}",
    htmlBody: WRAPPER(`
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Thank you for registering with Prohost Cloud. Your <strong>sample control panel</strong> is ready so you can explore the experience while we prepare your full deployment (typically 4–8 hours).</p>
<p><strong>Panel login</strong></p>
<ul>
<li>Username: <code>{{demoUsername}}</code></li>
<li>Domain: <code>{{demoDomain}}</code></li>
<li>Password: <code>{{demoPassword}}</code></li>
</ul>
<p><a class="btn" href="{{panelLoginUrl}}">Open sample panel</a></p>
<p class="muted">This environment is a preview. Production provisioning will follow a separate onboarding email.</p>`),
  },
  {
    slug: "password-reset",
    name: "Password reset",
    category: "account",
    subject: "Reset your Prohost Cloud password",
    variables: ["fullName", "resetUrl", "expiresMinutes"],
    textBody: "Reset your password: {{resetUrl}}",
    htmlBody: WRAPPER(`
<p>Hi {{fullName}},</p>
<p>We received a request to reset your password. Click below to choose a new one. This link expires in {{expiresMinutes}} minutes.</p>
<p><a class="btn" href="{{resetUrl}}">Reset password</a></p>
<p class="muted">If you did not request this, you can ignore this email.</p>`),
  },
  {
    slug: "package-upsell",
    name: "Package upsell",
    category: "sales",
    subject: "Upgrade your Prohost Cloud hosting scale",
    variables: ["fullName", "currentPlan", "recommendedPlan", "ctaUrl"],
    textBody: "Hi {{fullName}}, consider upgrading from {{currentPlan}} to {{recommendedPlan}}: {{ctaUrl}}",
    htmlBody: WRAPPER(`
<p>Hi {{fullName}},</p>
<p>Based on your usage, <strong>{{recommendedPlan}}</strong> may be a better fit than your current <strong>{{currentPlan}}</strong> tier.</p>
<p><a class="btn" href="{{ctaUrl}}">View upgrade options</a></p>`),
  },
  {
    slug: "addon-upsell",
    name: "Addon upsell",
    category: "sales",
    subject: "Enhance your stack with PMail+ add-ons",
    variables: ["fullName", "addonName", "addonSummary", "ctaUrl"],
    textBody: "Discover {{addonName}}: {{ctaUrl}}",
    htmlBody: WRAPPER(`
<p>Hi {{fullName}},</p>
<p>{{addonSummary}}</p>
<p><strong>{{addonName}}</strong> integrates with your Prohost Cloud workspace.</p>
<p><a class="btn" href="{{ctaUrl}}">Explore add-on</a></p>`),
  },
  {
    slug: "inquiry-auto-reply",
    name: "Inquiry auto-response",
    category: "support",
    subject: "We received your inquiry — Prohost Cloud",
    variables: ["name", "ticketRef"],
    textBody: "Hi {{name}}, we received your inquiry (ref {{ticketRef}}). Our team will respond shortly.",
    htmlBody: WRAPPER(`
<p>Hi {{name}},</p>
<p>Thank you for contacting Prohost Cloud. We have received your inquiry <strong>(ref {{ticketRef}})</strong> and will respond in the shortest possible time.</p>
<p class="muted">For urgent matters, reply to this email and reference your ticket number.</p>`),
  },
  {
    slug: "provisioning-complete",
    name: "Provisioning complete",
    category: "onboarding",
    subject: "Your Prohost Cloud environment is live",
    variables: ["fullName", "panelLoginUrl", "tenantName"],
    textBody: "Hi {{fullName}}, {{tenantName}} is provisioned. Login: {{panelLoginUrl}}",
    htmlBody: WRAPPER(`
<p>Hi {{fullName}},</p>
<p>Great news — <strong>{{tenantName}}</strong> is fully provisioned and ready for production use.</p>
<p><a class="btn" href="{{panelLoginUrl}}">Go to your panel</a></p>`),
  },
  {
    slug: "trial-ending",
    name: "Trial ending soon",
    category: "billing",
    subject: "Your Prohost Cloud trial ends soon",
    variables: ["fullName", "daysLeft", "upgradeUrl"],
    textBody: "Hi {{fullName}}, {{daysLeft}} days left on your trial. Upgrade: {{upgradeUrl}}",
    htmlBody: WRAPPER(`
<p>Hi {{fullName}},</p>
<p>Your trial ends in <strong>{{daysLeft}} days</strong>. Upgrade now to avoid interruption.</p>
<p><a class="btn" href="{{upgradeUrl}}">Choose a plan</a></p>`),
  },
  {
    slug: "payment-receipt",
    name: "Payment receipt",
    category: "billing",
    subject: "Payment receipt — Prohost Cloud",
    variables: ["fullName", "amount", "invoiceId", "paidAt"],
    textBody: "Payment of {{amount}} received. Invoice {{invoiceId}} on {{paidAt}}.",
    htmlBody: WRAPPER(`
<p>Hi {{fullName}},</p>
<p>We received your payment of <strong>{{amount}}</strong>.</p>
<p>Invoice: <code>{{invoiceId}}</code><br/>Date: {{paidAt}}</p>`),
  },
  {
    slug: "lead-follow-up",
    name: "Lead follow-up",
    category: "sales",
    subject: "Following up on your Prohost Cloud request",
    variables: ["fullName", "salesRepName", "bookingUrl"],
    textBody: "Hi {{fullName}}, {{salesRepName}} from Prohost Cloud would like to connect. Book: {{bookingUrl}}",
    htmlBody: WRAPPER(`
<p>Hi {{fullName}},</p>
<p>{{salesRepName}} from our solutions team would like to discuss your requirements.</p>
<p><a class="btn" href="{{bookingUrl}}">Schedule a call</a></p>`),
  },
  {
    slug: "admin-new-membership",
    name: "Internal: new membership application",
    category: "internal",
    subject: "New membership application — {{fullName}}",
    variables: ["fullName", "workEmail", "hostingScale", "adminUrl"],
    textBody: "New membership from {{fullName}} ({{workEmail}}) — {{hostingScale}}",
    htmlBody: WRAPPER(`
<p><strong>New membership application</strong></p>
<p>{{fullName}} · {{workEmail}}<br/>Hosting scale: {{hostingScale}}</p>
<p><a class="btn" href="{{adminUrl}}">Review in admin</a></p>`),
  },
  {
    slug: "hosting-package-selection",
    name: "Hosting package selection (new signup)",
    category: "onboarding",
    subject: "Choose your Prohost Cloud hosting package, {{fullName}}",
    variables: ["fullName", "launchUrl", "businessUrl", "proUrl", "panelLoginUrl", "whatsappUrl"],
    textBody: "Hi {{fullName}}, choose Launch, Business, or Pro: {{businessUrl}} · Chat: {{whatsappUrl}}",
    htmlBody: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
body{margin:0;font-family:'Segoe UI','Inter',system-ui,sans-serif;background:#eef1f6;color:#0f172a}
.wrap{max-width:680px;margin:0 auto;padding:24px 16px 40px}
.header{background:linear-gradient(135deg,#0b1424 0%,#0f2926 100%);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;color:#fff}
.header .logo{font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#2dd4bf;margin:0 0 6px}
.header h1{margin:0;font-size:1.45rem;font-weight:700}
.header p{margin:10px 0 0;font-size:14px;color:#8ba3c7;line-height:1.5}
.body{background:#fff;border:1px solid #dbe2ec;border-top:none;border-radius:0 0 16px 16px;padding:24px 20px 28px}
.perks{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:0 0 22px;padding:0;list-style:none}
.perks li{background:#ecfdf5;border:1px solid #99f6e4;border-radius:999px;padding:6px 14px;font-size:11px;color:#0f766e;font-weight:700}
.plans{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media(max-width:560px){.plans{grid-template-columns:1fr}}
.plan{background:#f8fafc;border:1px solid #dbe2ec;border-radius:14px;padding:18px 14px;text-align:center}
.plan.featured{border:2px solid #0d9488;background:#fff;box-shadow:0 10px 32px rgba(13,148,136,.18)}
.plan .badge{display:inline-block;background:#0d9488;color:#fff;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;padding:4px 10px;border-radius:999px;margin-bottom:8px}
.plan h2{margin:0 0 4px;font-size:1rem;color:#0b1424}
.plan .tagline{margin:0 0 12px;font-size:11px;color:#64748b;min-height:30px}
.price{margin:0 0 4px;font-size:1.65rem;font-weight:800;color:#0d9488}
.price span{font-size:12px;font-weight:600;color:#64748b}
.price-note{margin:0 0 12px;font-size:10px;color:#94a3b8}
.plan ul{margin:0 0 14px;padding:0;list-style:none;text-align:left;font-size:11px;color:#334155;line-height:1.45}
.plan ul li{padding:4px 0;border-bottom:1px solid #e2e8f0}
.plan ul li:last-child{border-bottom:none}
.btn{display:block;padding:12px 14px;background:#0d9488;color:#fff!important;text-decoration:none;border-radius:10px;font-weight:700;font-size:13px;text-align:center;margin-top:4px}
.btn-outline{background:#fff;color:#0d9488!important;border:2px solid #0d9488}
.chat-wrap{text-align:center;margin:24px 0 0;padding-top:20px;border-top:1px solid #e2e8f0}
.chat-btn{display:inline-block;padding:12px 22px;background:#25D366;color:#fff!important;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px}
.chat-btn span{margin-right:6px}
.foot{margin-top:20px;padding:14px;text-align:center;font-size:12px;color:#64748b;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0}
.foot a{color:#0d9488;font-weight:600}
</style></head>
<body><div class="wrap">
<div class="header">
<p class="logo">Prohost Cloud</p>
<h1>Choose your hosting package</h1>
<p>Hi <strong>{{fullName}}</strong> — pick the plan that fits your project. NVMe storage, free SSL, and expert support included.</p>
</div>
<div class="body">
<ul class="perks">
<li>30-day money-back guarantee</li>
<li>Free SSL certificate</li>
<li>Professional mailbox</li>
<li>24/7 expert support</li>
</ul>
<div class="plans">
<div class="plan">
<h2>Launch</h2>
<p class="tagline">Small site or blog</p>
<p class="price">$9<span>/mo</span></p>
<p class="price-note">Intro pricing</p>
<ul>
<li><strong>1</strong> website</li>
<li><strong>10 GB</strong> NVMe</li>
<li><strong>1</strong> mailbox</li>
<li>Free migration</li>
</ul>
<a class="btn btn-outline" href="{{launchUrl}}" target="_blank" rel="noopener">Choose Launch</a>
</div>
<div class="plan featured">
<span class="badge">Most popular</span>
<h2>Business</h2>
<p class="tagline">Growing teams &amp; shops</p>
<p class="price">$19<span>/mo</span></p>
<p class="price-note">Intro pricing</p>
<ul>
<li><strong>3</strong> websites</li>
<li><strong>25 GB</strong> NVMe</li>
<li><strong>3</strong> mailboxes</li>
<li>Vulnerability scanning</li>
</ul>
<a class="btn" href="{{businessUrl}}" target="_blank" rel="noopener">Choose Business</a>
</div>
<div class="plan">
<h2>Pro</h2>
<p class="tagline">Multiple sites at scale</p>
<p class="price">$29<span>/mo</span></p>
<p class="price-note">Intro pricing</p>
<ul>
<li><strong>10</strong> websites</li>
<li><strong>50 GB</strong> NVMe</li>
<li><strong>5</strong> mailboxes</li>
<li>Priority resources</li>
</ul>
<a class="btn btn-outline" href="{{proUrl}}" target="_blank" rel="noopener">Choose Pro</a>
</div>
</div>
<div class="chat-wrap">
<p style="margin:0 0 12px;font-size:13px;color:#64748b">Need help choosing? Chat with us on WhatsApp</p>
<a class="chat-btn" href="{{whatsappUrl}}" target="_blank" rel="noopener"><span>💬</span> Chat on WhatsApp</a>
</div>
<p class="foot">Already signed in? <a href="{{panelLoginUrl}}">Open your Prohost Cloud panel</a></p>
</div></div></body></html>`,
  },
  {
    slug: "hosting-package-thank-you",
    name: "Hosting package thank you",
    category: "onboarding",
    subject: "Thank you — {{planName}} package received",
    variables: ["fullName", "planName", "panelLoginUrl"],
    textBody: "Hi {{fullName}}, we received your {{planName}} selection. Login: {{panelLoginUrl}}",
    htmlBody: WRAPPER(`
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Thank you for selecting the <strong>{{planName}}</strong> hosting package. Our team has been notified and will follow up shortly to complete your setup.</p>
<p><a class="btn" href="{{panelLoginUrl}}">Open your panel</a></p>
<p class="muted">Questions? WhatsApp us at +44 7756 183484 or reply to this email.</p>`),
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

Try it here: {{referralUrl}}

I'd love for you to explore the same workflow I'm using.

{{signatureFooter}}`,
    htmlBody: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
body{margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:#ecfeff;color:#0f172a}
.wrap{max-width:620px;margin:0 auto;padding:24px 16px}
.card{background:#fff;border-radius:18px;border:1px solid #99f6e4;overflow:hidden;box-shadow:0 12px 40px rgba(13,148,136,.14)}
.brand-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px;background:linear-gradient(135deg,#042f3f,#0d9488);color:#fff}
.brand-logo{font-size:1.35rem;font-weight:800;letter-spacing:-0.02em}
.brand-tag{font-size:.78rem;opacity:.88;text-transform:uppercase;letter-spacing:.12em}
.head{padding:24px 24px 8px;color:#0f172a}
.head h1{margin:0 0 8px;font-size:1.5rem;font-weight:700;line-height:1.25}
.head p{margin:0;color:#475569;font-size:.96rem;line-height:1.55}
.body{padding:8px 24px 24px;line-height:1.65;font-size:15px;color:#334155}
.feature{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:12px 0}
.feature strong{display:block;margin-bottom:4px;color:#0f172a}
.btn{display:inline-block;margin-top:18px;padding:12px 24px;background:#0d9488;color:#fff!important;text-decoration:none;border-radius:999px;font-weight:600}
.muted{color:#64748b;font-size:13px}
.foot-signature{padding:18px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:14px;color:#334155;white-space:pre-line}
.brand-foot{padding:16px 24px 20px;background:linear-gradient(135deg,#042f3f,#0d4f6c);color:#fff;text-align:center}
.brand-foot strong{display:block;font-size:1rem;font-weight:700;margin-bottom:4px}
.brand-foot p{margin:0;font-size:.82rem;opacity:.88}
</style></head>
<body><div class="wrap"><div class="card">
<div class="brand-top"><span class="brand-logo">{{productName}}</span><span class="brand-tag">Mail workspace</span></div>
<div class="head"><h1>Explore More Possibilities With Mails On {{productName}} | Join Me</h1><p>A smarter mail workspace with tools that grow with your business</p></div>
<div class="body">
<p>Hi there,</p>
<p>I've switched my day-to-day mail to <strong>{{productName}}</strong> and thought you'd benefit from it too. It's more than inbox — it's a workspace where mail, scheduling, and business tools stay in one place.</p>
<div class="feature"><strong>Mail that feels modern</strong>Fast compose, organized folders, signatures, and a workspace built for real operators.</div>
<div class="feature"><strong>Platform tools ready when you need them</strong>Calendar, scheduled send, open tracking, WhatsApp handoff, and Mail2PDF exports.</div>
<div class="feature"><strong>Industry workspaces</strong>Legal, accounting, healthcare, recruitment, and more — unlock vertical tools only when your team is ready.</div>
<div class="feature"><strong>Upgrade on your terms</strong>Start with regular mail, explore the environment, and subscribe only to the bundles you want.</div>
<p><a class="btn" href="{{referralUrl}}">Explore {{productName}}</a></p>
<p class="muted">Use the link above to sign in and explore the same mail experience I'm using.</p>
</div>
<div class="foot-signature">{{signatureFooter}}</div>
<div class="brand-foot"><strong>{{productName}}</strong><p>Modern mail workspace with calendar, industry tools, and upgrades on your terms.</p></div>
</div></div></body></html>`,
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
    htmlBody: WRAPPER(`
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Your complimentary <strong>{{productName}} Platform tools</strong> trial ends <strong>tomorrow</strong>.</p>
<p>Subscribe now to keep calendar, scheduled send, open tracking, WhatsApp handoff, and Mail2PDF unlocked in your workspace.</p>
<p><a class="btn" href="{{ctaUrl}}">Unlock Platform tools</a></p>
<p class="muted">If you do not subscribe, Platform tools will be gated when the trial ends.</p>`),
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
    htmlBody: WRAPPER(`
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Welcome to <strong>{{productName}}</strong>. Your complimentary <strong>{{trialDays}}-day</strong> Panel workspace tools trial is now active.</p>
<p>Unlocked during your trial: CRM pipeline, reminders, open tracking, file vault, inbox cleanup, attachment categories, e-sign, email SLA, Mail2PDF, auto-reply, and other Panel workspace tools.</p>
<p><a class="btn" href="{{ctaUrl}}">Open workspace add-ons</a></p>`),
  },
  {
    slug: "panel-workspace-day5-upsell",
    name: "Panel workspace day-5 upsell",
    category: "pmail",
    subject: "Upgrade your {{productName}} workspace tools",
    variables: ["fullName", "ctaUrl", "productName", "daysLeft"],
    textBody: `Hi {{fullName}},

You have been using {{productName}} workspace tools for 5 days. Subscribe now to keep all Panel workspace tools after your trial ends in {{daysLeft}} days.

Upgrade: {{ctaUrl}}`,
    htmlBody: WRAPPER(`
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>You have been exploring <strong>{{productName}}</strong> Panel workspace tools for 5 days.</p>
<p>Subscribe now to keep CRM, reminders, open tracking, file vault, e-sign, email SLA, and the rest of your workspace tools after your trial ends in <strong>{{daysLeft}} days</strong>.</p>
<p><a class="btn" href="{{ctaUrl}}">Upgrade workspace tools</a></p>`),
  },
  {
    slug: "panel-workspace-day7-final",
    name: "Panel workspace day-7 final reminder",
    category: "pmail",
    subject: "Final reminder — workspace tools lock tomorrow",
    variables: ["fullName", "ctaUrl", "productName"],
    textBody: `Hi {{fullName}},

This is your final reminder: your complimentary {{productName}} Panel workspace tools trial ends tomorrow. CRM, reminders, open tracking, file vault, e-sign, email SLA, and other Panel tools will be locked unless you upgrade.

Upgrade now: {{ctaUrl}}`,
    htmlBody: WRAPPER(`
<p>Hi <strong>{{fullName}}</strong>,</p>
<p><strong>Final reminder:</strong> your complimentary <strong>{{productName}}</strong> Panel workspace tools trial ends <strong>tomorrow</strong>.</p>
<p>CRM, reminders, open tracking, file vault, e-sign, email SLA, and other Panel workspace tools will be locked unless you upgrade.</p>
<p><a class="btn" href="{{ctaUrl}}">Upgrade before tools lock</a></p>`),
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
    htmlBody: WRAPPER(`
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Your complimentary <strong>{{productName}} Auto Reply</strong> access ends in <strong>{{daysLeft}} days</strong>.</p>
<p>Subscribe to keep automatic inbox acknowledgments, industry templates, and custom reply rules active in your mail workspace.</p>
<p><a class="btn" href="{{ctaUrl}}">Unlock Auto Reply</a></p>
<p class="muted">After the complimentary period, Auto Reply is gated until you subscribe from the Addon Marketplace.</p>`),
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
    htmlBody: WRAPPER(`
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Welcome to <strong>{{productName}}</strong>. Your personal demo workspace is ready — explore mail, workspace tools, and industry panels without connecting a live mailbox yet.</p>
<p><strong>Your demo login</strong></p>
<ul>
<li>Sign-in page: <a href="{{loginUrl}}">{{loginUrl}}</a></li>
<li>Email: <code>{{workEmail}}</code></li>
<li>Password: <code>{{demoPassword}}</code></li>
<li>Access valid until: <strong>{{expiresAtLabel}}</strong> ({{trialHours}} hours)</li>
</ul>
<p><a class="btn" href="{{loginUrl}}">Open your PMail+ demo</a></p>
<p class="muted">This demo uses a sample inbox and accounting workspace data, similar to our internal PMail+ tester experience.</p>
<p class="muted">When you're ready to keep going, explore upgrades from your workspace or reply to this email.</p>`),
  },
  {
    slug: "pmail-prospect-upsell",
    name: "PMail+ prospect demo upgrade reminder",
    category: "pmail",
    subject: "Your {{productName}} demo ends in {{hoursLeft}} hours — upgrade to keep access",
    variables: ["fullName", "productName", "loginUrl", "hoursLeft", "addonsUrl", "registerUrl"],
    textBody:
      "Hi {{fullName}}, your {{productName}} demo ends in {{hoursLeft}} hours. Sign in: {{loginUrl}} · Upgrade: {{addonsUrl}}",
    htmlBody: WRAPPER(`
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Your <strong>{{productName}}</strong> demo workspace expires in about <strong>{{hoursLeft}} hours</strong>.</p>
<p>Upgrade now to keep CRM, reminders, open tracking, file vault, industry workspaces, and the rest of your PMail+ toolkit unlocked beyond the demo window.</p>
<p><a class="btn" href="{{addonsUrl}}">View upgrade options</a></p>
<p><a href="{{loginUrl}}">Return to your demo workspace</a> while access is still active.</p>
<p class="muted">Need help choosing a plan? Reply to this email or request full workspace access at {{registerUrl}}.</p>`),
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
Explore add-ons: {{ctaUrl}}`,
    htmlBody: WRAPPER(`
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Welcome to <strong>{{productName}}</strong> — your branded mail workspace from Prohost Cloud.</p>
<p>PMail+ connects your existing mailbox to a unified inbox with CRM, reminders, calendar, open tracking, file vault, e-sign, and industry-specific toolkits you can activate when you need them.</p>
<p><strong>Workspace add-ons</strong></p>
{{workspaceAddonsHtml}}
<p><strong>Business vertical add-ons</strong></p>
{{verticalAddonsHtml}}
<p><a class="btn" href="{{loginUrl}}">Open PMail+</a></p>
<p><a href="{{ctaUrl}}">Browse the add-on marketplace</a></p>
<p class="muted">You received this email because you signed in or connected a mailbox to PMail+.</p>`),
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
    htmlBody: WRAPPER(`
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>We noticed <strong>career and job-search activity</strong> in your {{productName}} inbox and sent mail — things like applications, recruiter outreach, interview scheduling, or careers newsletters.</p>
<p>Activate <strong>{{addonName}}</strong> to unlock CV Hub, application tracking, interview prep, and privacy-first career tools built into your mailbox workspace.</p>
<p><a class="btn" href="{{ctaUrl}}">Activate {{addonName}}</a></p>
<p class="muted">You can turn off automatic inbox upsell emails from the Prohost super admin panel.</p>`),
  },
];
