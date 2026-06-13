import { processDueScheduledMessages } from "../services/scheduled.service.js";

const MINUTE_MS = 60 * 1000;

export function startScheduledSendJob(): void {
  const run = async () => {
    try {
      await processDueScheduledMessages();
    } catch (err) {
      console.error("[scheduled-send-job]", err);
    }
  };

  void run();
  setInterval(run, MINUTE_MS);
}
