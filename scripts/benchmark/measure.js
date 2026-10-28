#!/usr/bin/env node
/**
 * One measurement method for every browser.
 *
 * Comparing browsers only works if the number means the same thing on each
 * side. Activity Monitor's "Memory" column is a physical-footprint estimate
 * that no script can read, and Electron's `getAppMetrics()` reports
 * working-set sizes for Electron only. So both numbers here come from `ps`
 * over the whole process tree:
 *
 * - memory: sum of resident set size (RSS), in MB
 * - CPU: sum of CPU time consumed over a fixed wall-clock window
 *
 * The same helpers are used for Orb and for Chrome / Safari / Arc, so the
 * comparison is apples to apples even though it is not Activity Monitor.
 *
 * Run `node scripts/benchmark/measure.js --self-test` to check the parsers.
 */
const { execFile, execFileSync } = require('node:child_process');

/**
 * "Physical footprint:         1776K" -> 1.73 (MB). This is the number Activity
 * Monitor shows in its Memory column, and unlike RSS it does not count shared
 * framework pages once per process, so browsers with many helper processes are
 * not punished for having many helpers.
 */
function parseFootprintMB(text) {
  const match = /Physical footprint:\s*([\d.]+)\s*([KMG])?B?/i.exec(String(text || ''));
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = (match[2] || '').toUpperCase();
  const bytes = unit === 'G' ? value * 1024 ** 3 : unit === 'M' ? value * 1024 ** 2 : unit === 'K' ? value * 1024 : value;
  return round(bytes / 1024 ** 2, 1);
}

/** Physical footprint for one pid, or null when vmmap refuses to read it. */
function footprintFor(pid) {
  return new Promise((resolve) => {
    execFile('vmmap', ['--summary', String(pid)], { maxBuffer: 4 * 1024 * 1024 }, (error, stdout) => {
      if (error) resolve(null);
      else resolve(parseFootprintMB(stdout));
    });
  });
}

/** Runs `worker` over `items` with bounded concurrency, preserving order. */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Physical footprint summed over a process tree. `vmmap` costs about a second
 * per process, so call this after CPU sampling, never during it.
 */
async function treeFootprint(rootPid, concurrency = 8) {
  const rows = psTable();
  const pids = [...treePids(rootPid, rows)];
  const footprints = await mapLimit(pids, concurrency, (pid) => footprintFor(pid));
  const readable = footprints.filter((value) => value != null);
  return {
    footprintMB: readable.length ? round(readable.reduce((sum, value) => sum + value, 0), 1) : null,
    readable: readable.length,
    processCount: pids.length,
  };
}


/** "1:02.50" -> 62.5; "1:02:03" -> 3723; "2-01:02:03" -> 176523 */
function parsePsTime(value) {
  const text = String(value || '').trim();
  if (!text) return 0;

  let rest = text;
  let days = 0;
  const dash = rest.indexOf('-');
  if (dash > 0) {
    days = Number(rest.slice(0, dash));
    rest = rest.slice(dash + 1);
  }

  const parts = rest.split(':').map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return 0;

  let seconds = 0;
  for (const part of parts) seconds = seconds * 60 + part;
  return days * 86400 + seconds;
}

/** Parses `ps -Ao pid=,ppid=,rss=` into rows. */
function parsePsTable(output) {
  const rows = [];
  for (const line of String(output || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [pid, ppid, rss] = trimmed.split(/\s+/);
    const row = { pid: Number(pid), ppid: Number(ppid), rssKb: Number(rss) };
    if (!Number.isFinite(row.pid) || row.pid <= 0) continue;
    if (!Number.isFinite(row.ppid)) continue;
    if (!Number.isFinite(row.rssKb) || row.rssKb < 0) continue;
    rows.push(row);
  }
  return rows;
}

/** Every pid in the tree rooted at rootPid, including the root. */
function treePids(rootPid, rows) {
  const children = new Map();
  for (const row of rows) {
    if (!children.has(row.ppid)) children.set(row.ppid, []);
    children.get(row.ppid).push(row.pid);
  }
  const seen = new Set();
  const queue = [Number(rootPid)];
  while (queue.length > 0) {
    const pid = queue.shift();
    if (!pid || seen.has(pid)) continue;
    seen.add(pid);
    for (const child of children.get(pid) || []) queue.push(child);
  }
  return seen;
}

function psTable() {
  return parsePsTable(execFileSync('ps', ['-Ao', 'pid=,ppid=,rss='], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
}

function cpuSecondsFor(pids) {
  if (pids.length === 0) return 0;
  const output = execFileSync('ps', ['-o', 'time=', '-p', pids.join(',')], { encoding: 'utf8' });
  let total = 0;
  for (const line of output.split('\n')) total += parsePsTime(line);
  return total;
}

/** Memory (MB RSS) and cumulative CPU seconds for a process tree. */
function treeUsage(rootPid) {
  const rows = psTable();
  const pids = [...treePids(rootPid, rows)];
  const rssKb = rows.filter((row) => pids.includes(row.pid)).reduce((sum, row) => sum + row.rssKb, 0);
  return {
    rssMB: round(rssKb / 1024),
    cpuSeconds: cpuSecondsFor(pids),
    processCount: pids.length,
  };
}

/**
 * Median CPU percent for a tree over `durationMs`, from CPU-time deltas.
 * `ps`'s own %cpu column is a lifetime average, so it is useless here.
 */
async function idleCpu(rootPid, durationMs = 5000, sampleMs = 1000) {
  const samples = [];
  let previous = treeUsage(rootPid);
  let previousAt = Date.now();
  for (let elapsed = 0; elapsed < durationMs; elapsed += sampleMs) {
    await sleep(sampleMs);
    const current = treeUsage(rootPid);
    const now = Date.now();
    const wall = (now - previousAt) / 1000;
    if (wall > 0) {
      const delta = Math.max(0, current.cpuSeconds - previous.cpuSeconds);
      samples.push((delta / wall) * 100);
    }
    previous = current;
    previousAt = now;
  }
  if (samples.length === 0) return { percent: 0, samples };
  const sorted = [...samples].sort((a, b) => a - b);
  return { percent: round(sorted[Math.floor(sorted.length / 2)], 2), samples: samples.map((value) => round(value, 2)) };
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { idleCpu, parseFootprintMB, parsePsTable, parsePsTime, round, sleep, treeFootprint, treePids, treeUsage };

// --- self-test -------------------------------------------------------------

function selfTest() {
  const cases = [
    ['0:00.00', 0],
    ['0:01.23', 1.23],
    ['1:02.50', 62.5],
    ['1:02:03', 3723],
    ['2-01:02:03', 176523],
    ['', 0],
    ['nonsense', 0],
  ];
  for (const [input, expected] of cases) {
    const actual = parsePsTime(input);
    if (Math.abs(actual - expected) > 0.001) {
      throw new Error(`parsePsTime(${JSON.stringify(input)}) = ${actual}, expected ${expected}`);
    }
  }

  const rows = parsePsTable('  1     0  1000\n  2     1   500\n  3     1   250\n  4     9   999\n');
  const tree = treePids(1, rows);
  if (tree.size !== 3 || !tree.has(2) || !tree.has(3) || tree.has(4)) {
    throw new Error(`treePids returned ${[...tree].join(',')}`);
  }

  if (parsePsTable('garbage\n\n').length !== 0) throw new Error('parsePsTable accepted garbage');

  const footprints = [
    ['Physical footprint:         1776K', 1.7],
    ['Physical footprint:          274.2M', 274.2],
    ['Physical footprint:          1.5G', 1536],
    ['no footprint here', null],
    ['', null],
  ];
  for (const [input, expected] of footprints) {
    const actual = parseFootprintMB(input);
    if (expected == null ? actual != null : Math.abs(actual - expected) > 0.11) {
      throw new Error(`parseFootprintMB(${JSON.stringify(input)}) = ${actual}, expected ${expected}`);
    }
  }

  console.log('measure.js self-test passed');
}

if (require.main === module) {
  if (process.argv.includes('--self-test')) selfTest();
  else {
    const pid = Number(process.argv[2]) || process.pid;
    if (process.argv.includes('--footprint')) {
      void treeFootprint(pid).then((value) => console.log(JSON.stringify(value, null, 2)));
    } else {
      console.log(JSON.stringify(treeUsage(pid), null, 2));
    }
  }
}
