import fs from 'node:fs/promises';
import { stripTrackingParams } from '../shared/privacy';

export interface HistoryEntry {
  url: string;
  title: string;
  host: string;
  visitedAt: number;
  visitCount: number;
}

export interface HistoryStorage {
  read(): Promise<string | null>;
  write(data: string): Promise<void>;
}

/** Atomic JSON file storage for the browser history. */
export function fileHistoryStorage(filePath: string): HistoryStorage {
  return {
    async read() {
      try {
        return await fs.readFile(filePath, 'utf8');
      } catch {
        return null;
      }
    },
    async write(data) {
      const tmp = `${filePath}.tmp`;
      await fs.writeFile(tmp, data, 'utf8');
      await fs.rename(tmp, filePath);
    },
  };
}

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function scoreEntry(entry: HistoryEntry, tokens: string[], query: string): number {
  const host = entry.host.toLowerCase();
  const title = entry.title.toLowerCase();
  const url = entry.url.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    const inHost = host.includes(token);
    const inTitle = title.includes(token);
    const inUrl = url.includes(token);
    if (!inHost && !inTitle && !inUrl) return -1;
    if (inHost) score += 4;
    if (inTitle) score += 2;
    if (inUrl) score += 1;
  }

  if (query && host.startsWith(query)) score += 6;
  if (query && title.startsWith(query)) score += 3;

  // A page opened every day should outrank a one-off with the same text match.
  // Log-scaled so a page visited 200 times is not 200x a page visited once.
  score += Math.min(6, Math.log2(1 + entry.visitCount) * 1.5);
  return score;
}

/** How often, damped by how long ago. Used to rank sites with no query text. */
function frecency(entry: HistoryEntry, now: number): number {
  const ageHours = Math.max(0, now - entry.visitedAt) / 3_600_000;
  const recency = 3 / (1 + ageHours / 24);
  return Math.log2(1 + entry.visitCount) * 2 + recency;
}

/**
 * Keeps one row per URL so repeat visits stay cheap and autocomplete is not
 * flooded with duplicates. Electron-free: storage and the clock are injected.
 */
export class HistoryStore {
  private entries = new Map<string, HistoryEntry>();

  constructor(
    private readonly storage: HistoryStorage,
    private readonly now: () => number = Date.now,
    private readonly maxEntries = 5000,
  ) {}

  async load(): Promise<void> {
    const raw = await this.storage.read().catch(() => null);
    if (!raw) return;

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(data)) return;

    for (const item of data) {
      if (!item || typeof item.url !== 'string' || !isWebUrl(item.url)) continue;
      const url = new URL(item.url).toString();
      const title = typeof item.title === 'string' ? item.title : '';
      this.entries.set(url, {
        url,
        title,
        host: new URL(url).hostname,
        visitedAt: Number.isFinite(item.visitedAt) ? item.visitedAt : 0,
        visitCount: Number.isFinite(item.visitCount) ? Math.max(1, item.visitCount) : 1,
      });
    }
  }

  async record(rawUrl: string, title: string): Promise<void> {
    const cleaned = stripTrackingParams(rawUrl);
    if (!isWebUrl(cleaned)) return;

    const url = new URL(cleaned).toString();
    const existing = this.entries.get(url);
    const nextTitle = title.trim() || existing?.title || '';

    this.entries.set(url, {
      url,
      title: nextTitle,
      host: new URL(url).hostname,
      visitedAt: this.now(),
      visitCount: (existing?.visitCount ?? 0) + 1,
    });

    this.trim();
    await this.save();
  }

  query(text: string, limit = 20): HistoryEntry[] {
    const query = text.trim().toLowerCase();
    const tokens = query.split(/\s+/).filter(Boolean);
    const matches: Array<{ entry: HistoryEntry; score: number }> = [];

    for (const entry of this.entries.values()) {
      const score = tokens.length === 0 ? 0 : scoreEntry(entry, tokens, query);
      if (score >= 0) matches.push({ entry, score });
    }

    matches.sort((a, b) =>
      b.score - a.score ||
      b.entry.visitedAt - a.entry.visitedAt ||
      a.entry.url.localeCompare(b.entry.url));

    return matches.slice(0, Math.max(0, limit)).map((match) => ({ ...match.entry }));
  }

  /** The sites someone actually lives in: one page per host, ranked by frecency. */
  topSites(limit = 8): HistoryEntry[] {
    const now = this.now();
    const best = new Map<string, HistoryEntry>();

    for (const entry of this.entries.values()) {
      const current = best.get(entry.host);
      if (!current || frecency(entry, now) > frecency(current, now)) best.set(entry.host, entry);
    }

    return [...best.values()]
      .sort((a, b) => frecency(b, now) - frecency(a, now) || a.host.localeCompare(b.host))
      .slice(0, Math.max(0, limit))
      .map((entry) => ({ ...entry }));
  }

  async remove(url: string): Promise<void> {
    this.entries.delete(url);
    await this.save();
  }

  async clear(): Promise<void> {
    this.entries.clear();
    await this.save();
  }

  get size(): number {
    return this.entries.size;
  }

  private trim(): void {
    if (this.entries.size <= this.maxEntries) return;
    const oldest = [...this.entries.values()]
      .sort((a, b) => a.visitedAt - b.visitedAt)
      .slice(0, this.entries.size - this.maxEntries);
    for (const entry of oldest) this.entries.delete(entry.url);
  }

  private async save(): Promise<void> {
    await this.storage.write(JSON.stringify([...this.entries.values()]));
  }
}
