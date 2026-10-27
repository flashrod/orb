import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { YOUTUBE_AD_SCRIPT, YOUTUBE_HOST_PATTERN, installYouTubeAdBlock } from './youtubeAds';

const scope = globalThis as typeof globalThis & { window?: Window & typeof globalThis };

describe('YouTube ad pruning', () => {
  const originalParse = JSON.parse;
  const originalFetch = globalThis.fetch;
  const hadWindow = 'window' in scope;

  beforeEach(() => {
    if (!hadWindow) scope.window = globalThis as unknown as Window & typeof globalThis;
    installYouTubeAdBlock();
  });

  afterEach(() => {
    JSON.parse = originalParse;
    globalThis.fetch = originalFetch;
    delete (globalThis as Record<string, unknown>).ytInitialPlayerResponse;
    if (!hadWindow) delete (scope as { window?: unknown }).window;
  });

  it('strips ad fields from parsed player responses', () => {
    const parsed = JSON.parse(
      '{"videoDetails":{"title":"x"},"adPlacements":[1],"playerAds":[2],"adSlots":[3],"adBreakHeartbeatParams":"y"}',
    );
    expect(parsed).toEqual({ videoDetails: { title: 'x' } });
  });

  it('keeps everything that is not an ad', () => {
    const parsed = JSON.parse('{"captions":{},"streamingData":{"formats":[1,2]}}');
    expect(parsed).toEqual({ captions: {}, streamingData: { formats: [1, 2] } });
  });

  it('strips ad fields from the initial player response global', () => {
    (globalThis as Record<string, unknown>).ytInitialPlayerResponse = {
      adPlacements: [1],
      playerAds: [2],
      videoDetails: { title: 'x' },
    };
    expect((globalThis as Record<string, unknown>).ytInitialPlayerResponse).toEqual({
      videoDetails: { title: 'x' },
    });
  });

  it('prunes the player response nested in a get_watch payload', async () => {
    const payload = {
      playerResponse: { adPlacements: [1], playerAds: [2], videoDetails: { videoId: 'x' } },
      contents: { twoColumnWatchNextResults: {} },
    };
    const stub = (async () => new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;
    const previous = globalThis.fetch;
    globalThis.fetch = stub;
    installYouTubeAdBlock();

    try {
      const response = await fetch('https://www.youtube.com/youtubei/v1/get_watch?prettyPrint=false');
      expect(await response.json()).toEqual({
        playerResponse: { videoDetails: { videoId: 'x' } },
        contents: { twoColumnWatchNextResults: {} },
      });
    } finally {
      globalThis.fetch = previous;
    }
  });

  it('leaves unrelated YouTube API responses alone', async () => {
    const payload = { events: [{ adPlacements: [1] }] };
    const stub = (async () => new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;
    const previous = globalThis.fetch;
    globalThis.fetch = stub;
    installYouTubeAdBlock();

    try {
      const response = await fetch('https://www.youtube.com/youtubei/v1/log_event?prettyPrint=false');
      expect(await response.json()).toEqual(payload);
    } finally {
      globalThis.fetch = previous;
    }
  });

  it('matches only YouTube hosts', () => {
    expect(YOUTUBE_HOST_PATTERN.test('youtube.com')).toBe(true);
    expect(YOUTUBE_HOST_PATTERN.test('www.youtube.com')).toBe(true);
    expect(YOUTUBE_HOST_PATTERN.test('music.youtube.com')).toBe(true);
    expect(YOUTUBE_HOST_PATTERN.test('youtube-nocookie.com')).toBe(true);
    expect(YOUTUBE_HOST_PATTERN.test('notyoutube.com')).toBe(false);
    expect(YOUTUBE_HOST_PATTERN.test('youtube.com.evil.test')).toBe(false);
  });

  it('ships a self-contained script string', () => {
    expect(YOUTUBE_AD_SCRIPT).toContain('adPlacements');
    expect(YOUTUBE_AD_SCRIPT.startsWith('(')).toBe(true);
    expect(YOUTUBE_AD_SCRIPT.endsWith(')();')).toBe(true);
  });
});
