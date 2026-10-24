#!/usr/bin/env node
/**
 * Orb benchmark harness.
 *
 * Measures the engine primitives Orb's tab model is built on: cold start,
 * loading 20 fixed tabs, tab-switch latency, idle CPU, and memory before and
 * after hibernating 15 of those tabs.
 *
 * Run with: npm run benchmark
 * Results: benchmarks/<timestamp>-orb.json, benchmarks/latest.json, benchmarks/latest.md
 *
 * The same fixture list (scripts/benchmark/fixtures.json) is the workload to use
 * when filling in the Chrome / Safari / Arc columns by hand.
 */
const { app, BrowserWindow, ipcMain, webContents } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const startedAt = Date.now() - Math.round(process.uptime() * 1000);
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8'));
const resultsDir = path.join(__dirname, '..', '..', 'benchmarks');

const results = {
  startedAt: new Date(startedAt).toISOString(),
  electron: process.versions.electron,
  chromium: process.versions.chrome,
  node: process.versions.node,
  platform: `${process.platform} ${process.arch}`,
  fixtureCount: fixtures.urls.length,
  coldStartMs: null,
  loadTimes: [],
  switchMs: [],
  memory: {},
  idleCpuPercent: null,
};

function memorySnapshot() {
  const metrics = app.getAppMetrics();
  const byType = {};
  let totalKb = 0;
  for (const metric of metrics) {
    const kb = metric.memory?.workingSetSize ?? 0;
    totalKb += kb;
    const type = metric.type || 'unknown';
    byType[type] = (byType[type] ?? 0) + kb;
  }
  return {
    totalMB: round(totalKb / 1024),
    byTypeMB: Object.fromEntries(Object.entries(byType).map(([type, kb]) => [type, round(kb / 1024)])),
    processCount: metrics.length,
  };
}

function guestProcessMap() {
  return webContents
    .getAllWebContents()
    .filter((contents) => contents.getType() === 'webview')
    .map((contents) => ({ id: contents.id, pid: contents.getOSProcessId() }));
}

async function idleCpuSample(durationMs = 5000) {
  const samples = [];
  const interval = 1000;
  for (let elapsed = 0; elapsed < durationMs; elapsed += interval) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    const metrics = app.getAppMetrics();
    const percent = metrics.reduce((sum, metric) => sum + (metric.cpu?.percentCPUUsage ?? 0), 0);
    samples.push(percent);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return round(sorted[Math.floor(sorted.length / 2)] ?? 0, 2);
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function summarizeLoads(loadTimes) {
  const successful = loadTimes.filter((entry) => entry.ok).map((entry) => entry.ms);
  const failed = loadTimes.filter((entry) => !entry.ok).length;
  return {
    ok: successful.length,
    failed,
    medianMs: percentile(successful, 50),
    p95Ms: percentile(successful, 95),
    slowestMs: successful.length ? Math.max(...successful) : null,
  };
}

function writeResults() {
  fs.mkdirSync(resultsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summary = {
    ...results,
    loads: summarizeLoads(results.loadTimes),
    switches: {
      medianMs: percentile(results.switchMs, 50),
      p95Ms: percentile(results.switchMs, 95),
      samples: results.switchMs,
    },
    guests: guestProcessMap(),
  };

  const json = `${JSON.stringify(summary, null, 2)}\n`;
  fs.writeFileSync(path.join(resultsDir, `${stamp}-orb.json`), json);
  fs.writeFileSync(path.join(resultsDir, 'latest.json'), json);

  const memory = results.memory;
  const markdown = [
    `# Orb benchmark — ${new Date().toISOString()}`,
    '',
    `Electron ${summary.electron} · Chromium ${summary.chromium} · ${summary.platform} · ${summary.fixtureCount} tabs`,
    '',
    '| Metric | Orb | Chrome | Safari | Arc |',
    '|---|---|---|---|---|',
    `| Cold start to usable (s) | ${summary.coldStartMs != null ? round(summary.coldStartMs / 1000, 2) : 'n/a'} | | | |`,
    `| 20-tab load, median (ms) | ${summary.loads.medianMs ?? 'n/a'} | | | |`,
    `| 20-tab load, p95 (ms) | ${summary.loads.p95Ms ?? 'n/a'} | | | |`,
    `| Tab switch, median (ms) | ${summary.switches.medianMs ?? 'n/a'} | | | |`,
    `| Memory, 20 tabs (MB) | ${memory.twentyTabs?.totalMB ?? 'n/a'} | | | |`,
    `| Idle CPU, 20 tabs (%) | ${summary.idleCpuPercent ?? 'n/a'} | | | |`,
    `| Memory after hibernation (MB) | ${memory.hibernated?.totalMB ?? 'n/a'} | | | |`,
    '',
    `Tabs that failed to load: ${summary.loads.failed}`,
    '',
    'Fill the Chrome / Safari / Arc columns by running the same 20 URLs from',
    '`scripts/benchmark/fixtures.json` on the same Mac and network, then commit',
    'the table next to the JSON so every release can be compared.',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(resultsDir, 'latest.md'), markdown);
  console.log(`\n${markdown}`);
  console.log(`Saved ${path.join(resultsDir, 'latest.json')}`);
}

let window;
let finishTimer;

function finish() {
  clearTimeout(finishTimer);
  writeResults();
  app.quit();
}

app.whenReady().then(() => {
  window = new BrowserWindow({
    width: 1440,
    height: 900,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      backgroundThrottling: false,
    },
  });

  window.webContents.on('did-finish-load', () => {
    results.coldStartMs = Date.now() - startedAt;
    results.memory.shellOnly = memorySnapshot();
    window.webContents.send('benchmark:start', { urls: fixtures.urls });
  });

  ipcMain.on('benchmark:report', async (_event, payload) => {
    try {
      if (payload.phase === 'loaded') {
        results.loadTimes = payload.loadTimes ?? [];
        results.memory.twentyTabs = memorySnapshot();
        results.idleCpuPercent = await idleCpuSample();
        window.webContents.send('benchmark:continue');
      } else if (payload.phase === 'switched') {
        results.switchMs = payload.switchMs ?? [];
        window.webContents.send('benchmark:continue');
      } else if (payload.phase === 'hibernated') {
        results.memory.hibernated = memorySnapshot();
        finish();
      }
    } catch (error) {
      console.error('[benchmark] report failed', error);
      finish();
    }
  });

  finishTimer = setTimeout(() => {
    console.error('[benchmark] timed out; writing partial results');
    finish();
  }, 5 * 60 * 1000);

  window.loadFile(path.join(__dirname, 'harness.html'));
});

app.on('window-all-closed', () => app.quit());
