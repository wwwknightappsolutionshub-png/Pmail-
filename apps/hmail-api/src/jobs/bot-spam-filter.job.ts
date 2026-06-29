import { processBotSpamFilterForAllUsers } from "../services/spam-filter.service.js";

const TEN_MINUTES_MS = 10 * 60 * 1000;

export function startBotSpamFilterJob(): void {
  const run = async () => {
    try {
      await processBotSpamFilterForAllUsers();
    } catch (err) {
      console.error("[bot-spam-filter-job]", err);
    }
  };

  void run();
  setInterval(run, TEN_MINUTES_MS);
}
