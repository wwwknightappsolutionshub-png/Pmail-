import { processPendingHostingPackageEmails } from "../services/membership-package.service.js";

const INTERVAL_MS = 30 * 1000;

export function startMembershipPackageJob(): void {
  const run = async () => {
    try {
      await processPendingHostingPackageEmails();
    } catch (err) {
      console.error("[membership-package-job]", err);
    }
  };

  void run();
  setInterval(run, INTERVAL_MS);
}
