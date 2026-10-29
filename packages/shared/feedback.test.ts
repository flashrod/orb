import { describe, expect, it } from 'vitest';
import { FEEDBACK_BODY_LIMIT, FEEDBACK_ISSUE_BASE, FEEDBACK_URL_LIMIT, feedbackIssueUrl } from './feedback';
import type { BuildInfo } from './diagnostics';

const build: BuildInfo = {
  version: '0.1.0-alpha.1',
  electron: '45.0.0',
  chromium: '156.0.8078.48',
  node: '24.22.0',
  platform: 'darwin',
  arch: 'arm64',
};

function parse(url: string): { title: string; body: string } {
  const params = new URL(url).searchParams;
  return { title: params.get('title') ?? '', body: params.get('body') ?? '' };
}

describe('feedbackIssueUrl', () => {
  it('points at the repo issue form', () => {
    expect(feedbackIssueUrl(build, 'UA').startsWith(`${FEEDBACK_ISSUE_BASE}?`)).toBe(true);
  });

  it('prefills the prompts a tester should answer', () => {
    const { title, body } = parse(feedbackIssueUrl(build, 'UA'));
    expect(title).toContain('Alpha feedback');
    expect(body).toContain('What happened');
    expect(body).toContain('What you expected');
    expect(body).toContain('Steps to reproduce');
  });

  it('includes the environment block so versions are never a guess', () => {
    const { body } = parse(feedbackIssueUrl(build, 'Mozilla/5.0 test'));
    expect(body).toContain('Orb 0.1.0-alpha.1');
    expect(body).toContain('Electron 45.0.0');
    expect(body).toContain('Chromium 156.0.8078.48');
    expect(body).toContain('macOS arm64');
    expect(body).toContain('User agent: Mozilla/5.0 test');
  });

  it('keeps the URL short enough for GitHub', () => {
    const url = feedbackIssueUrl(build, 'Mozilla/5.0 ' + 'x'.repeat(20_000));
    const { body } = parse(url);
    expect(url.length).toBeLessThan(8000);
    expect(body).toContain('truncated');
    expect(body.length).toBeLessThan(FEEDBACK_BODY_LIMIT + 1000);
  });

  it('round-trips text that needs escaping', () => {
    const { body } = parse(feedbackIssueUrl({ ...build, arch: 'arm64 & "quoted"' }, 'a+b%c'));
    expect(body).toContain('arm64 & "quoted"');
    expect(body).toContain('User agent: a+b%c');
  });

  it('uses a custom title and puts extra details above the environment', () => {
    const { title, body } = parse(feedbackIssueUrl(build, 'UA', {
      title: 'Crash: Cannot read properties of undefined',
      details: '### Error\n\n```\nTypeError: boom\n```',
    }));
    expect(title).toBe('Crash: Cannot read properties of undefined');
    expect(body).toContain('TypeError: boom');
    expect(body.indexOf('TypeError: boom')).toBeLessThan(body.indexOf('Orb 0.1.0-alpha.1'));
  });

  it('truncates a runaway stack trace', () => {
    const { body } = parse(feedbackIssueUrl(build, 'UA', { details: 'x'.repeat(20_000) }));
    expect(body).toContain('truncated');
    expect(body.length).toBeLessThan(FEEDBACK_BODY_LIMIT * 2 + 1000);
  });

  it('stays under the URL limit the main process enforces', () => {
    // A deeply nested stack with percent-heavy characters is the worst case.
    const details = Array.from({ length: 400 }, (_, i) => `    at fn${i} (file:///app.asar/dist/renderer/index.js:${i}:${i})`).join('\n');
    const url = feedbackIssueUrl(build, 'Mozilla/5.0 %E2%80%94', { title: 'Crash: %%%', details });
    expect(url.length).toBeLessThanOrEqual(FEEDBACK_URL_LIMIT);
    const { body } = parse(url);
    expect(body).toContain('What happened');
    expect(body).toContain('Orb 0.1.0-alpha.1');
  });

  it('drops the details rather than producing an unopenable URL', () => {
    // A user agent made of percent signs expands threefold when encoded.
    const url = feedbackIssueUrl(build, '%'.repeat(4000), { title: 'Crash', details: 'y'.repeat(4000) });
    expect(url.length).toBeLessThanOrEqual(FEEDBACK_URL_LIMIT);
    const { body } = parse(url);
    expect(body).toContain('What happened');
    expect(body).not.toContain('yyyy');
    expect(body).toContain('truncated');
  });
});
