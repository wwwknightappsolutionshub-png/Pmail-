import { processDueReminders } from "../services/reminder-dispatch.service.js";

const MINUTE_MS = 60 * 1000;

export function startReminderDispatchJob(): void {
  const run = async () => {
    try {
      await processDueReminders();
    } catch (err) {
      console.error("[reminder-dispatch-job]", err);
    }
  };

  void run();
  setInterval(run, MINUTE_MS);
}
