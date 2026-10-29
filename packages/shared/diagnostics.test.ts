import { describe, expect, it } from 'vitest';
import { formatDiagnostics, formatErrorReport, platformLabel, type BuildInfo } from './diagnostics';

const build: BuildInfo = {
  version: '0.1.0',
  electron: '45.0.0',
  chromium: '156.0.8078.48',
  node: '24.22.0',
  platform: 'darwin',
  arch: 'arm64',
};

describe('platformLabel', () => {
  it('uses product names', () => {
    expect(platformLabel('darwin')).toBe('macOS');
    expect(platformLabel('win32')).toBe('Windows');
    expect(platformLabel('linux')).toBe('Linux');
  });

  it('falls back to the raw value, never empty', () => {
    expect(platformLabel('freebsd')).toBe('freebsd');
    expect(platformLabel('')).toBe('—');
  });
});

describe('formatDiagnostics', () => {
  it('lists every version on its own line', () => {
    const text = formatDiagnostics(build, 'Mozilla/5.0 test');
    expect(text.split('\n')).toEqual([
      'Orb 0.1.0',
      'Electron 45.0.0',
      'Chromium 156.0.8078.48',
      'Node 24.22.0',
      'macOS arm64',
      'User agent: Mozilla/5.0 test',
    ]);
  });
});

describe('formatErrorReport', () => {
  it('includes the message, stack and environment', () => {
    const error = new Error('Cannot read properties of undefined');
    const text = formatErrorReport(error, build, 'UA', { url: 'https://example.com/', at: 0 });
    expect(text).toContain('Message: Cannot read properties of undefined');
    expect(text).toContain('Stack:');
    expect(text).toContain('Error: Cannot read properties of undefined');
    expect(text).toContain('Page: https://example.com/');
    expect(text).toContain('Orb 0.1.0');
  });

  it('handles thrown non-errors', () => {
    expect(formatErrorReport('boom', build, 'UA')).toContain('Message: boom');
    expect(formatErrorReport(undefined, build, 'UA')).toContain('Message: Unknown error');
    expect(formatErrorReport(null, build, 'UA')).toContain('Message: Unknown error');
  });

  it('omits optional fields instead of printing undefined', () => {
    const text = formatErrorReport(new Error('x'), build, 'UA');
    expect(text).not.toContain('Page:');
    expect(text).not.toContain('When:');
    expect(text).not.toContain('undefined');
  });

  it('says so when a stack is missing', () => {
    const error = { message: 'no stack here' };
    expect(formatErrorReport(error, build, 'UA')).toContain('(no stack)');
  });
});
