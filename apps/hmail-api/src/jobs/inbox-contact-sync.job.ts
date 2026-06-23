import { syncInboxContactsForDueUsers } from "../services/inbox-contact-sync.service.js";

const SIXTY_MINUTES_MS = 60 * 60 * 1000;

export function startInboxContactSyncJob(): void {
  const run = async () => {
    try {
      await syncInboxContactsForDueUsers();
    } catch (err) {
      console.error("[inbox-contact-sync-job]", err);
    }
  };

  void run();
  setInterval(run, SIXTY_MINUTES_MS);
}
