import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

export type DownloadState = 'progressing' | 'completed' | 'cancelled' | 'interrupted';

export interface DownloadItem {
  id: string;
  url: string;
  filePath: string | null;
  totalBytes: number;
  receivedBytes: number;
  state: DownloadState;
  startedAt: number;
  completedAt: number | null;
}

const DEFAULT_DOWNLOADS_PATH = path.join(app.getPath('downloads'));

export class DownloadStore {
  private downloads = new Map<string, DownloadItem>();
  private registryPath: string;

  constructor() {
    this.registryPath = path.join(app.getPath('userData'), 'downloads.json');
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.registryPath, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && item.id && item.url) {
            this.downloads.set(item.id, item as DownloadItem);
          }
        }
      }
    } catch {
      // No existing downloads file — start fresh
    }
  }

  private async save(): Promise<void> {
    const data = Array.from(this.downloads.values());
    const tmp = `${this.registryPath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmp, this.registryPath);
  }

  add(item: DownloadItem): void {
    this.downloads.set(item.id, item);
    void this.save();
  }

  update(id: string, partial: Partial<DownloadItem>): void {
    const existing = this.downloads.get(id);
    if (!existing) return;
    this.downloads.set(id, { ...existing, ...partial });
    void this.save();
  }

  get(id: string): DownloadItem | undefined {
    return this.downloads.get(id);
  }

  getAll(): DownloadItem[] {
    return Array.from(this.downloads.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  remove(id: string): void {
    this.downloads.delete(id);
    void this.save();
  }

  clearCompleted(): void {
    for (const [id, item] of this.downloads.entries()) {
      if (item.state === 'completed' || item.state === 'cancelled') {
        this.downloads.delete(id);
      }
    }
    void this.save();
  }
}
