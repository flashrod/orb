import { describe, expect, it } from 'vitest';

type DownloadState = 'progressing' | 'completed' | 'cancelled' | 'interrupted';

interface DownloadItem {
  id: string;
  url: string;
  filePath: string | null;
  totalBytes: number;
  receivedBytes: number;
  state: DownloadState;
  startedAt: number;
}

/**
 * Computes download progress percentage (0-100).
 */
function downloadProgress(item: DownloadItem): number {
  if (item.totalBytes <= 0) return 0;
  return Math.round((item.receivedBytes / item.totalBytes) * 100);
}

/**
 * Determines if a download is complete.
 */
function isDownloadComplete(item: DownloadItem): boolean {
  return item.state === 'completed';
}

/**
 * Determines if a download is active (can still progress).
 */
function isDownloadActive(item: DownloadItem): boolean {
  return item.state === 'progressing';
}

/**
 * Formats bytes into human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

describe('downloads handler', () => {
  it('computes progress percentage', () => {
    expect(downloadProgress({ id: '1', url: 'https://example.com/file.zip', filePath: null, totalBytes: 1000, receivedBytes: 500, state: 'progressing', startedAt: Date.now() })).toBe(50);
    expect(downloadProgress({ id: '1', url: 'https://example.com/file.zip', filePath: null, totalBytes: 1000, receivedBytes: 1000, state: 'completed', startedAt: Date.now() })).toBe(100);
    expect(downloadProgress({ id: '1', url: 'https://example.com/file.zip', filePath: null, totalBytes: 0, receivedBytes: 0, state: 'progressing', startedAt: Date.now() })).toBe(0);
  });

  it('identifies completed downloads', () => {
    expect(isDownloadComplete({ id: '1', url: '', filePath: '/tmp/file.zip', totalBytes: 100, receivedBytes: 100, state: 'completed', startedAt: Date.now() })).toBe(true);
    expect(isDownloadComplete({ id: '1', url: '', filePath: null, totalBytes: 100, receivedBytes: 50, state: 'progressing', startedAt: Date.now() })).toBe(false);
  });

  it('identifies active downloads', () => {
    expect(isDownloadActive({ id: '1', url: '', filePath: null, totalBytes: 100, receivedBytes: 50, state: 'progressing', startedAt: Date.now() })).toBe(true);
    expect(isDownloadActive({ id: '1', url: '', filePath: '/tmp/file.zip', totalBytes: 100, receivedBytes: 100, state: 'completed', startedAt: Date.now() })).toBe(false);
  });

  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});
