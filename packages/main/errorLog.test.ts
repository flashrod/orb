import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appendErrorLog, clampReport, ERROR_LOG_MAX_BYTES } from './errorLog';

let dir = '';
let file = '';

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'orb-errors-'));
  file = path.join(dir, 'nested', 'orb-errors.log');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('appendErrorLog', () => {
  it('creates the directory and appends a timestamped entry', () => {
    expect(appendErrorLog(file, 'boom', { now: 0 })).toBe(true);
    const text = readFileSync(file, 'utf8');
    expect(text).toContain('=== 1970-01-01T00:00:00.000Z ===');
    expect(text).toContain('boom');
  });

  it('keeps appending separate entries', () => {
    appendErrorLog(file, 'first', { now: 0 });
    appendErrorLog(file, 'second', { now: 1000 });
    const text = readFileSync(file, 'utf8');
    expect(text.indexOf('first')).toBeLessThan(text.indexOf('second'));
  });

  it('rotates once the file is over the cap', () => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, 'x'.repeat(64));
    expect(appendErrorLog(file, 'new entry', { maxBytes: 32 })).toBe(true);
    expect(readFileSync(file, 'utf8')).toContain('new entry');
    expect(readFileSync(`${file}.1`, 'utf8')).toHaveLength(64);
    expect(statSync(file).size).toBeLessThan(64);
  });

  it('ignores empty entries', () => {
    expect(appendErrorLog(file, '   ')).toBe(false);
    expect(appendErrorLog(file, '')).toBe(false);
    expect(() => statSync(file)).toThrow();
  });

  it('reports failure instead of throwing on an unwritable path', () => {
    expect(appendErrorLog('/dev/null/nope/orb-errors.log', 'x')).toBe(false);
  });

  it('exposes a sane cap', () => {
    expect(ERROR_LOG_MAX_BYTES).toBeGreaterThan(64 * 1024);
  });
});

describe('clampReport', () => {
  it('passes normal reports through', () => {
    expect(clampReport('  hello  ')).toBe('hello');
  });

  it('rejects non-strings and blanks', () => {
    expect(clampReport(undefined)).toBe('');
    expect(clampReport(42)).toBe('');
    expect(clampReport('   ')).toBe('');
  });

  it('truncates runaway reports', () => {
    const text = clampReport('a'.repeat(100), 10);
    expect(text.startsWith('aaaaaaaaaa')).toBe(true);
    expect(text).toContain('truncated');
  });
});
