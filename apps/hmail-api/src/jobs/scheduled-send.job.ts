import { processDueScheduledMessages } from "../services/scheduled.service.js";

const FAST_MS = 3_000;

export function startScheduledSendJob(): void {
  let lastFast = 0;

  const run = async (forceFast = false) => {
    try {
      await processDueScheduledMessages();
    } catch (err) {
      console.error("[scheduled-send-job]", err);
    }
  };

  void run(true);
  setInterval(() => {
    const now = Date.now();
    if (now - lastFast >= FAST_MS) {
      lastFast = now;
      void run(true);
    }
  }, FAST_MS);
}
