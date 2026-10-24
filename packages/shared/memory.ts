export type TabMemorySample = {
  id: string;
  pid: number | null;
  bytes: number;
};

/** Sums the renderer working sets; shared memory may be counted per process. */
export function totalTabBytes(samples: TabMemorySample[]): number {
  return samples.reduce((total, sample) => total + (Number.isFinite(sample.bytes) ? Math.max(0, sample.bytes) : 0), 0);
}

/** Largest consumers first, for the memory panel. */
export function sortByMemory(samples: TabMemorySample[]): TabMemorySample[] {
  return [...samples].sort((a, b) => b.bytes - a.bytes || a.id.localeCompare(b.id));
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const megabytes = bytes / (1024 * 1024);
  if (megabytes < 1) return '<1 MB';
  if (megabytes < 1024) return `${Math.round(megabytes)} MB`;
  return `${(megabytes / 1024).toFixed(1)} GB`;
}
