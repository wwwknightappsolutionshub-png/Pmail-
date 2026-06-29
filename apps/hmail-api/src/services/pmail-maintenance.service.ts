import { prisma } from "../lib/prisma.js";
import { bumpPmailClientRefresh } from "./pmail-platform-config.service.js";
import { clearPwaUnreadBaseline } from "./pwa-mail-sync.service.js";
import { clearPresenceTouchThrottle } from "./user-presence.service.js";

export type FlushPmailSessionsResult = {
  deletedSessions: number;
  clearedCaches: {
    presenceThrottle: boolean;
    pwaUnreadBaseline: boolean;
  };
  clientRefreshAt: string;
};

export async function flushPmailUserSessionsAndCaches(): Promise<FlushPmailSessionsResult> {
  const deleted = await prisma.session.deleteMany({});
  clearPresenceTouchThrottle();
  clearPwaUnreadBaseline();
  const clientRefreshAt = await bumpPmailClientRefresh();

  return {
    deletedSessions: deleted.count,
    clearedCaches: {
      presenceThrottle: true,
      pwaUnreadBaseline: true,
    },
    clientRefreshAt,
  };
}
