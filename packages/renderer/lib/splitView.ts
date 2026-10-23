export type SplitPair = [string, string];

export function chooseSplitPair(activeTabId: string, selectedTabId: string, availableTabIds: string[]): SplitPair | null {
  const secondTabId = activeTabId !== selectedTabId
    ? selectedTabId
    : availableTabIds.find((id) => id !== activeTabId);
  return secondTabId ? [activeTabId, secondTabId] : null;
}

export function normalizeSplitRatio(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0.25, Math.min(0.75, value));
}
