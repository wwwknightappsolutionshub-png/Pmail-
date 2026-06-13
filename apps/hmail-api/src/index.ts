import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
config({ path: resolve(monorepoRoot, ".env") });
import { resolveDatabaseUrl } from "./lib/database-url.js";
resolveDatabaseUrl();
import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { startAddonTrialJob } from "./jobs/addon-trial.job.js";
import { startScheduledSendJob } from "./jobs/scheduled-send.job.js";

const env = getEnv();
const app = createApp();

startAddonTrialJob();
startScheduledSendJob();

app.listen(env.API_PORT, () => {
  console.log(`hmail-api listening on http://localhost:${env.API_PORT}`);
});
