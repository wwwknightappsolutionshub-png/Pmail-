import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
config({ path: resolve(monorepoRoot, ".env") });
import { resolveDatabaseUrl } from "./lib/database-url.js";
resolveDatabaseUrl();
import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { startBillingLifecycleJob } from "./jobs/billing-lifecycle.job.js";
import { startAddonTrialJob } from "./jobs/addon-trial.job.js";
import { startAutoReplyJob } from "./jobs/auto-reply.job.js";
import { startReminderDispatchJob } from "./jobs/reminder-dispatch.job.js";
import { startScheduledSendJob } from "./jobs/scheduled-send.job.js";
import { startGrowthQueueJob } from "./jobs/growth-queue.job.js";
import { startMembershipPackageJob } from "./jobs/membership-package.job.js";
import { startRecruitmentOutreachJob, startPwaMailSyncJob } from "./jobs/pwa-mail-sync.job.js";
import { startInboxContactSyncJob } from "./jobs/inbox-contact-sync.job.js";
import { startJobHunterSyncJob } from "./jobs/job-hunter-sync.job.js";
import { startBotSpamFilterJob } from "./jobs/bot-spam-filter.job.js";
import { seedAddonCatalog } from "./services/addon.service.js";
import { seedAddonMarketing, ensureAddonMarketing } from "./services/addon-marketing.service.js";
import { cleanupLegacySiteSections } from "./services/cms.service.js";
import { seedHostingPlans } from "./services/hosting-plans.service.js";
import { seedEmailTemplates } from "./services/email-template.service.js";
import { seedPublicFormDefinitions } from "./services/form-definition.service.js";

import { seedTestimonials } from "./services/testimonial.service.js";
import { seedGrowthPromptTemplates } from "./services/growth-prompt-registry.service.js";
import { ensureMarketingUploadDir } from "./services/marketing-asset.service.js";

const env = getEnv();
const app = createApp();

void Promise.all([
  ensureMarketingUploadDir(),
  seedAddonCatalog(),
  ensureAddonMarketing(),
  seedHostingPlans(),
  cleanupLegacySiteSections(),
  seedPublicFormDefinitions(),
  seedEmailTemplates(),
  seedTestimonials(),
  seedGrowthPromptTemplates(),
]).catch((err) => {
  console.error("Startup catalog seed failed:", err);
});

startAddonTrialJob();
startScheduledSendJob();
startAutoReplyJob();
startReminderDispatchJob();
startBillingLifecycleJob();
startMembershipPackageJob();
startGrowthQueueJob();
startRecruitmentOutreachJob();
startPwaMailSyncJob();
startInboxContactSyncJob();
startJobHunterSyncJob();
startBotSpamFilterJob();

app.listen(env.API_PORT, () => {
  console.log(`hmail-api listening on http://localhost:${env.API_PORT}`);
});
