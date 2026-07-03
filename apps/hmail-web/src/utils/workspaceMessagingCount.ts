const STORAGE_PREFIX = "bespoke-demo-workspace:";

type PersistedWorkspaceState = {
  messagingThreads?: unknown[];
};

export function readWorkspaceMessagingThreadCount(demoUseCaseId: string): number {
  if (!demoUseCaseId) return 0;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${demoUseCaseId}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as PersistedWorkspaceState;
    return Array.isArray(parsed.messagingThreads) ? parsed.messagingThreads.length : 0;
  } catch {
    return 0;
  }
}
