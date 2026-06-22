import { processBillingLifecycle } from "../services/billing-lifecycle.service.js";

const HOUR_MS = 60 * 60 * 1000;

export function startBillingLifecycleJob(): void {
  const run = async () => {
    try {
      const result = await processBillingLifecycle();
      if (result.markedPastDue > 0 || result.canceled > 0) {
        console.info("[billing-lifecycle-job]", result);
      }
    } catch (err) {
      console.error("[billing-lifecycle-job]", err);
    }
  };

  void run();
  setInterval(run, HOUR_MS);
}
