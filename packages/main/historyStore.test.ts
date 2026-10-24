import { describe, expect, it } from 'vitest';
import { HistoryStore, type HistoryStorage } from './historyStore';

class MemoryStorage implements HistoryStorage {
  data: string | null = null;
  writes = 0;

  async read(): Promise<string | null> {
    return this.data;
  }

  async write(data: string): Promise<void> {
    this.writes += 1;
    this.data = data;
  }
}

function setup(maxEntries = 100) {
  let now = 1_000;
  const storage = new MemoryStorage();
  const store = new HistoryStore(storage, () => now, maxEntries);
  return {
    store,
    storage,
    advance: (ms: number) => { now += ms; },
  };
}

describe('HistoryStore', () => {
  it('records a web visit with a normalized URL and host', async () => {
    const { store } = setup();
    await store.record('https://example.com/article?utm_source=news&id=1', 'An article');
    const [entry] = store.query('');
    expect(entry).toMatchObject({
      url: 'https://example.com/article?id=1',
      host: 'example.com',
      title: 'An article',
      visitCount: 1,
    });
  });

  it('ignores non-web URLs', async () => {
    const { store } = setup();
    await store.record('about:blank', 'New Tab');
    await store.record('file:///tmp/a.html', 'File');
    await store.record('data:text/html,hi', 'Data');
    await store.record('not a url', 'Nope');
    expect(store.query('')).toHaveLength(0);
  });

  it('updates an existing visit instead of duplicating it', async () => {
    const { store, advance } = setup();
    await store.record('https://example.com/a', 'First title');
    advance(500);
    await store.record('https://example.com/a', 'Second title');
    const entries = store.query('');
    expect(entries).toHaveLength(1);
    expect(entries[0].visitCount).toBe(2);
    expect(entries[0].title).toBe('Second title');
    expect(entries[0].visitedAt).toBe(1_500);
  });

  it('keeps the existing title when a visit has none', async () => {
    const { store } = setup();
    await store.record('https://example.com/a', 'Known');
    await store.record('https://example.com/a', '');
    expect(store.query('')[0].title).toBe('Known');
  });

  it('ranks host matches above title and URL matches', async () => {
    const { store, advance } = setup();
    await store.record('https://other.test/page', 'Orb notes');
    advance(100);
    await store.record('https://orb.example/docs', 'Documentation');
    advance(100);
    await store.record('https://third.test/orb', 'Something');
    expect(store.query('orb').map((entry) => entry.host)).toEqual(['orb.example', 'other.test', 'third.test']);
  });

  it('requires every token to match', async () => {
    const { store } = setup();
    await store.record('https://example.com/orb', 'Browser notes');
    await store.record('https://example.com/other', 'Browser other');
    expect(store.query('orb notes').map((entry) => entry.url)).toEqual(['https://example.com/orb']);
  });

  it('returns recent entries first for an empty query', async () => {
    const { store, advance } = setup();
    await store.record('https://a.test/', 'A');
    advance(100);
    await store.record('https://b.test/', 'B');
    expect(store.query('').map((entry) => entry.host)).toEqual(['b.test', 'a.test']);
  });

  it('respects the result limit', async () => {
    const { store, advance } = setup();
    for (let index = 0; index < 5; index += 1) {
      await store.record(`https://site${index}.test/`, `Site ${index}`);
      advance(10);
    }
    expect(store.query('', 2)).toHaveLength(2);
  });

  it('removes and clears entries and persists the change', async () => {
    const { store, storage } = setup();
    await store.record('https://a.test/', 'A');
    await store.record('https://b.test/', 'B');
    await store.remove('https://a.test/');
    expect(store.query('').map((entry) => entry.host)).toEqual(['b.test']);

    await store.clear();
    expect(store.query('')).toHaveLength(0);

    const reloaded = new HistoryStore(storage, () => 2_000, 100);
    await reloaded.load();
    expect(reloaded.query('')).toHaveLength(0);
  });

  it('reloads saved entries', async () => {
    const { store, storage } = setup();
    await store.record('https://example.com/a', 'A');
    const reloaded = new HistoryStore(storage, () => 2_000, 100);
    await reloaded.load();
    expect(reloaded.query('')[0]).toMatchObject({ url: 'https://example.com/a', title: 'A' });
  });

  it('ignores malformed stored data', async () => {
    const storage = new MemoryStorage();
    storage.data = JSON.stringify([
      { url: 'not a url', title: 'Bad' },
      { url: 'https://ok.test/', title: 'Ok', visitedAt: 5, visitCount: 1 },
    ]);
    const store = new HistoryStore(storage, () => 2_000, 100);
    await store.load();
    expect(store.query('').map((entry) => entry.host)).toEqual(['ok.test']);
  });

  it('drops the oldest entries beyond the cap', async () => {
    const { store, advance } = setup(3);
    for (let index = 0; index < 5; index += 1) {
      await store.record(`https://site${index}.test/`, `Site ${index}`);
      advance(10);
    }
    expect(store.query('').map((entry) => entry.host)).toEqual(['site4.test', 'site3.test', 'site2.test']);
  });
});
