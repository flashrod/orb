#!/usr/bin/env node
/**
 * Orb benchmark harness.
 *
 * Measures the engine Orb actually ships: a BaseWindow with WebContentsView
 * tabs (the native-tabs path), not the legacy <webview> element. Memory and CPU
 * come from `ps` over the process tree, the same method used for the other
 * browsers in compare.js, so the columns are comparable.
 *
 * Run with: npm run benchmark
 * Results: benchmarks/<timestamp>-orb.json, benchmarks/latest.json, benchmarks/latest.md
 *
 * Phases:
 *   1. cold start of the installed app (skipped when it is not installed)
 *   2. 20 tabs from fixtures.json, loaded concurrently
 *   3. idle CPU + memory with all 20 open
 *   4. tab switch latency between native views
 *   5. memory after closing 15 of the 20
 */
const { app, BaseWindow, WebContentsView, session } = require('electron');
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { idleCpu, round, sleep, treeFootprint, treeUsage } = require('./measure');

const FIXTURES = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8'));
const RESULTS_DIR = path.join(__dirname, '..', '..', 'benchmarks');
const PARTITION = 'persist:orb-benchmark';
const INSTALLED_APP = '/Applications/Orb.app/Contents/MacOS/Orb';
const HIBERNATE_COUNT = 15;
const SWITCH_SAMPLES = 10;
const LOAD_TIMEOUT_MS = 30_000;
const COLD_START_TIMEOUT_MS = 45_000;
/** Pages keep fetching ads and video after `did-stop-loading`; let them settle. */
const SETTLE_MS = 10_000;
/** Long enough that a single busy ad refresh cannot decide the median. */
const CPU_SAMPLE_MS = 10_000;

const results = {
  startedAt: new Date().toISOString(),
  electron: process.versions.electron,
  chromium: process.versions.chrome,
  node: process.versions.node,
  platform: `${process.platform} ${process.arch}`,
  engine: 'WebContentsView',
  fixtureCount: FIXTURES.urls.length,
  coldStartMs: null,
  loadTimes: [],
  switchMs: [],
  memory: {},
  idleCpuPercent: null,
  idleCpuSamples: [],
};

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function summarizeLoads(loadTimes) {
  const successful = loadTimes.filter((entry) => entry.ok).map((entry) => entry.ms);
  return {
    ok: successful.length,
    failed: loadTimes.filter((entry) => !entry.ok).length,
    medianMs: percentile(successful, 50),
    p95Ms: percentile(successful, 95),
    slowestMs: successful.length ? Math.max(...successful) : null,
  };
}

/** Physical footprint is the Activity Monitor number; RSS is kept for reference. */
async function memoryUsage() {
  const { footprintMB } = await treeFootprint(process.pid);
  const { rssMB, processCount } = treeUsage(process.pid);
  return { footprintMB, rssMB, processCount };
}

/** Kill any running Orb so the cold start is really cold. */
function quitInstalledOrb() {
  try { execFileSync('killall', ['Orb'], { stdio: 'ignore' }); } catch { /* not running */ }
}

async function waitForFile(file, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const value = fs.readFileSync(file, 'utf8').trim();
      if (value) return Number(value);
    } catch { /* not written yet */ }
    await sleep(25);
  }
  return null;
}

/**
 * Real cold start: launch the installed app, wait for its first painted frame,
 * then quit it. The app reports the marker only when ORB_STARTUP_MARKER is set.
 */
async function measureColdStart() {
  if (!fs.existsSync(INSTALLED_APP)) {
    console.warn(`[benchmark] ${INSTALLED_APP} not found; skipping cold start`);
    return null;
  }

  quitInstalledOrb();
  await sleep(2000);

  const marker = path.join(os.tmpdir(), `orb-startup-${process.pid}-${Date.now()}.txt`);
  try { fs.unlinkSync(marker); } catch { /* fresh path */ }

  const child = spawn(INSTALLED_APP, [], {
    env: { ...process.env, ORB_STARTUP_MARKER: marker },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  const ms = await waitForFile(marker, COLD_START_TIMEOUT_MS);
  try { fs.unlinkSync(marker); } catch { /* already gone */ }
  quitInstalledOrb();
  await sleep(1500);

  if (ms == null) {
    console.warn('[benchmark] the installed app never reported readiness; cold start skipped');
    return null;
  }
  return ms;
}

function loadUrl(view, url) {
  return new Promise((resolve) => {
    const started = Date.now();
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      view.webContents.removeListener('did-stop-loading', onStop);
      view.webContents.removeListener('did-fail-load', onFail);
      resolve({ url, ms: Date.now() - started, ok });
    };
    const onStop = () => finish(true);
    const onFail = (_event, errorCode, _description, _validatedURL, isMainFrame) => {
      if (isMainFrame === false) return;
      finish(false);
    };
    const timer = setTimeout(() => finish(false), LOAD_TIMEOUT_MS);
    view.webContents.on('did-stop-loading', onStop);
    view.webContents.on('did-fail-load', onFail);
    view.webContents.loadURL(url).catch(() => finish(false));
  });
}

function nextFrame(webContents) {
  return webContents.executeJavaScript(
    'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now()))))',
    true,
  );
}

function writeResults() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const loads = summarizeLoads(results.loadTimes);
  const summary = {
    ...results,
    loads,
    switches: {
      medianMs: percentile(results.switchMs, 50),
      p95Ms: percentile(results.switchMs, 95),
      samples: results.switchMs,
    },
    memory: {
      ...results.memory,
      twentyTabsMB: results.memory.twentyTabs?.footprintMB ?? null,
      hibernatedMB: results.memory.hibernated?.footprintMB ?? null,
    },
  };

  const json = `${JSON.stringify(summary, null, 2)}\n`;
  fs.writeFileSync(path.join(RESULTS_DIR, `${stamp}-orb.json`), json);
  fs.writeFileSync(path.join(RESULTS_DIR, 'latest.json'), json);

  const other = readComparison();
  const cell = (value, fallback = '') => (value == null ? fallback : value);

  // Only show browsers that were actually measured. An empty Safari column is
  // noise; a missing one is honest.
  const others = ['chrome', 'safari', 'arc'].filter((key) => other[key]);
  const labels = ['Orb', ...others.map((key) => other[key].browser)];
  const columns = others.map((key) => other[key]);

  const row = (metric, orbValue, pick, fallback = '') =>
    ['| ' + metric, String(orbValue), ...columns.map((column) => cell(pick(column), fallback))].join(' | ') + ' |';
  const header = ['| Metric | Orb', ...labels.slice(1)].join(' | ') + ' |';
  const divider = ['|---', ...labels.slice(1).map(() => '---')].join('|') + '|';

  const markdown = [
    `# Orb benchmark — ${new Date().toISOString()}`,
    '',
    `Electron ${summary.electron} · Chromium ${summary.chromium} · ${summary.platform} · ${summary.fixtureCount} tabs · engine ${summary.engine}`,
    '',
    header,
    divider,
    row('Cold start to usable (s)', summary.coldStartMs != null ? round(summary.coldStartMs / 1000, 2) : 'n/a', (column) => column.coldStartS),
    row('20-tab load, median (ms)', cell(loads.medianMs, 'n/a'), (column) => column.loadMedianMs),
    row('20-tab load, p95 (ms)', cell(loads.p95Ms, 'n/a'), (column) => column.loadP95Ms),
    row('Tab switch, median (ms)', cell(summary.switches.medianMs, 'n/a'), (column) => column.switchMedianMs),
    row('Memory, 20 tabs (MB footprint)', cell(summary.memory.twentyTabsMB, 'n/a'), (column) => column.memory20MB),
    row('Idle CPU, 20 tabs (%)', cell(summary.idleCpuPercent, 'n/a'), (column) => column.idleCpuPercent),
    `| Memory after hibernation (MB footprint) | ${cell(summary.memory.hibernatedMB, 'n/a')} |${others.map(() => ' — |').join('')}`,
    '',
    `Tabs that failed to load: ${loads.failed}`,
    '',
    "Memory is the sum of physical footprint over each browser's whole process",
    'tree (the number Activity Monitor shows), and CPU is the sum of CPU-time',
    'deltas over a fixed window. Both come from `scripts/benchmark/measure.js`',
    'and are measured the same way for every column.',
    '',
    'Fill another column with `node scripts/benchmark/compare.js chrome` (or',
    '`safari`, `arc`); only measured browsers appear in the table.',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(RESULTS_DIR, 'latest.md'), markdown);
  console.log(`\n${markdown}`);
  console.log(`Saved ${path.join(RESULTS_DIR, 'latest.json')}`);
}

/** Reads compare-<browser>.json files written by compare.js, if present. */
function readComparison() {
  const out = {};
  for (const browser of ['chrome', 'safari', 'arc']) {
    const file = path.join(RESULTS_DIR, `compare-${browser}.json`);
    try {
      out[browser] = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch { /* not measured yet */ }
  }
  return out;
}

let win;
let shell;
let views = [];
let finishTimer;

function finish() {
  clearTimeout(finishTimer);
  writeResults();
  app.quit();
}

app.whenReady().then(async () => {
  results.coldStartMs = await measureColdStart();
  results.memory.shellOnly = await memoryUsage();

  win = new BaseWindow({ width: 1440, height: 900, show: true });
  shell = new WebContentsView({
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  win.contentView.addChildView(shell);
  const { width, height } = win.getContentBounds();
  shell.setBounds({ x: 0, y: 0, width, height });
  await shell.webContents.loadURL(
    'data:text/html,' + encodeURIComponent('<!doctype html><body style="margin:0;background:#111"></body>'),
  );

  const ses = session.fromPartition(PARTITION, { cache: true });
  views = FIXTURES.urls.map(() => {
    const view = new WebContentsView({
      webPreferences: {
        partition: PARTITION,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false,
        backgroundThrottling: true,
      },
    });
    win.contentView.addChildView(view);
    view.setBounds({ x: 0, y: 0, width, height });
    view.setVisible(false);
    return view;
  });

  finishTimer = setTimeout(() => {
    console.error('[benchmark] timed out; writing partial results');
    finish();
  }, 6 * 60 * 1000);

  try {
    // --- 20-tab load -------------------------------------------------------
    console.log(`[benchmark] loading ${FIXTURES.urls.length} tabs…`);
    results.loadTimes = await Promise.all(FIXTURES.urls.map((url, index) => loadUrl(views[index], url)));

    views[0].setVisible(true);
    await sleep(SETTLE_MS);

    // --- idle CPU, then memory --------------------------------------------
    // CPU first: vmmap is expensive enough to distort the sample if it runs
    // while the CPU is being watched.
    console.log('[benchmark] sampling idle CPU…');
    const cpu = await idleCpu(process.pid, CPU_SAMPLE_MS);
    results.idleCpuPercent = cpu.percent;
    results.idleCpuSamples = cpu.samples;
    results.memory.twentyTabs = await memoryUsage();

    // --- tab switch --------------------------------------------------------
    console.log('[benchmark] measuring tab switches…');
    let current = 0;
    for (let i = 0; i < SWITCH_SAMPLES; i += 1) {
      const next = (i + 1) % views.length;
      const started = Date.now();
      views[current].setVisible(false);
      views[next].setVisible(true);
      await nextFrame(shell.webContents);
      results.switchMs.push(Date.now() - started);
      current = next;
    }

    // --- hibernation -------------------------------------------------------
    console.log(`[benchmark] hibernating ${HIBERNATE_COUNT} tabs…`);
    for (let index = views.length - 1; index >= views.length - HIBERNATE_COUNT; index -= 1) {
      const view = views[index];
      win.contentView.removeChildView(view);
      if (!view.webContents.isDestroyed()) view.webContents.close();
    }
    views = views.slice(0, views.length - HIBERNATE_COUNT);
    await sleep(3000);
    results.memory.hibernated = await memoryUsage();
  } catch (error) {
    console.error('[benchmark] failed', error);
  }

  void ses; // the partition is shared through the views
  finish();
});

app.on('window-all-closed', () => app.quit());
