import { processAutoReplies } from "../services/auto-reply.service.js";
import { processAutoReplyUpsellEmails } from "../services/auto-reply-entitlement.service.js";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function startAutoReplyJob(): void {
  const run = async () => {
    try {
      await processAutoReplyUpsellEmails();
      await processAutoReplies();
    } catch (err) {
      console.error("[auto-reply-job]", err);
    }
  };

  void run();
  setInterval(run, FIVE_MINUTES_MS);
}
