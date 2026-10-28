#!/usr/bin/env node
/**
 * Measures another browser with the same method as the Orb harness.
 *
 *   node scripts/benchmark/compare.js chrome
 *   node scripts/benchmark/compare.js safari
 *   node scripts/benchmark/compare.js arc
 *
 * Writes benchmarks/compare-<browser>.json, which `npm run benchmark` merges
 * into benchmarks/latest.md.
 *
 * Chrome and Arc are driven over the DevTools protocol in a throwaway profile,
 * so the user's own session is untouched: 20 tabs are created empty, then
 * navigated at the same moment, which is exactly what the Orb harness does with
 * its 20 WebContentsViews. Safari has no such protocol by default, so it is
 * driven through AppleScript in a new window that is closed afterwards; macOS
 * may ask for Automation permission the first time.
 *
 * Memory and CPU always come from scripts/benchmark/measure.js, so the numbers
 * mean the same thing as Orb's.
 */
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { idleCpu, round, sleep, treeFootprint, treeUsage } = require('./measure');

const FIXTURES = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8'));
const RESULTS_DIR = path.join(__dirname, '..', '..', 'benchmarks');
const LOAD_TIMEOUT_MS = 45_000;
const SETTLE_MS = 15_000;
/** Same window as the Orb harness, so the CPU columns mean the same thing. */
const CPU_SAMPLE_MS = 10_000;

const BROWSERS = {
  chrome: {
    name: 'Chrome',
    app: '/Applications/Google Chrome.app',
    binary: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    kind: 'chromium',
  },
  arc: {
    name: 'Arc',
    app: '/Applications/Arc.app',
    binary: '/Applications/Arc.app/Contents/MacOS/Arc',
    kind: 'chromium',
  },
  safari: {
    name: 'Safari',
    // macOS keeps Safari in /Applications on some installs and
    // /System/Applications on others.
    app: ['/Applications/Safari.app', '/System/Applications/Safari.app'],
    kind: 'safari',
  },
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function fetchJson(url, timeoutMs = 2000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Minimal DevTools client: request/response by id, plus events by name. */
class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message || 'CDP error'));
        else resolve(message.result);
        return;
      }
      for (const listener of this.listeners) listener(message);
    });
  }

  static connect(wsUrl) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(wsUrl);
      socket.addEventListener('open', () => resolve(new CdpClient(socket)));
      socket.addEventListener('error', () => reject(new Error(`Cannot connect to ${wsUrl}`)));
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(payload));
    });
  }

  onEvent(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    try { this.socket.close(); } catch { /* already closed */ }
  }
}

async function waitForJson(url, timeoutMs = LOAD_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await fetchJson(url);
    if (value) return value;
    await sleep(100);
  }
  return null;
}

function killTree(pid) {
  try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ }
}

function killByPattern(pattern) {
  try { execFileSync('pkill', ['-f', pattern], { stdio: 'ignore' }); } catch { /* none matched */ }
}

/** Opens a tab with about:blank, navigates it, and resolves on Page.loadEventFired. */
async function loadInTarget(client, url) {
  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
  await client.send('Page.enable', {}, sessionId);

  const started = Date.now();
  const loaded = new Promise((resolve) => {
    const timer = setTimeout(() => {
      off();
      resolve({ url, ms: Date.now() - started, ok: false });
    }, LOAD_TIMEOUT_MS);
    const off = client.onEvent((message) => {
      if (message.sessionId !== sessionId) return;
      if (message.method !== 'Page.loadEventFired') return;
      clearTimeout(timer);
      off();
      resolve({ url, ms: Date.now() - started, ok: true });
    });
  });

  await client.send('Page.navigate', { url }, sessionId);
  return loaded;
}

async function measureChromium(browser) {
  if (!fs.existsSync(browser.binary)) fail(`${browser.name} is not installed at ${browser.binary}`);

  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), `orb-bench-${browser.name.toLowerCase()}-`));
  const flags = [
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-sync',
    '--window-size=1440,900',
  ];

  // --- cold start: spawn to a usable blank window -------------------------
  const coldPort = await freePort();
  const coldStarted = Date.now();
  const cold = spawn(browser.binary, [...flags, `--remote-debugging-port=${coldPort}`, '--new-window', 'about:blank'], {
    stdio: 'ignore',
    detached: true,
  });
  cold.unref();

  const coldVersion = await waitForJson(`http://127.0.0.1:${coldPort}/json/version`);
  const coldStartMs = coldVersion ? Date.now() - coldStarted : null;

  killTree(cold.pid);
  killByPattern(profileDir);
  await sleep(2500);

  // --- 20 tabs, navigated together ---------------------------------------
  const port = await freePort();
  const child = spawn(browser.binary, [...flags, `--remote-debugging-port=${port}`, '--new-window', 'about:blank'], {
    stdio: 'ignore',
    detached: true,
  });
  child.unref();

  const version = await waitForJson(`http://127.0.0.1:${port}/json/version`);
  if (!version) {
    killTree(child.pid);
    fail(`${browser.name} never exposed a debugging port.`);
  }

  const client = await CdpClient.connect(version.webSocketDebuggerUrl);
  const loadTimes = await Promise.all(FIXTURES.urls.map((url) => loadInTarget(client, url)));
  await sleep(SETTLE_MS);

  // CPU first, then the expensive footprint scan.
  const cpu = await idleCpu(child.pid, CPU_SAMPLE_MS);
  const usage = treeUsage(child.pid);
  const footprint = await treeFootprint(child.pid);

  client.close();
  killTree(child.pid);
  killByPattern(profileDir);
  await sleep(2000);
  fs.rmSync(profileDir, { recursive: true, force: true });

  const sorted = loadTimes.filter((entry) => entry.ok).map((entry) => entry.ms).sort((a, b) => a - b);
  return {
    browser: browser.name,
    measuredAt: new Date().toISOString(),
    engine: 'chromium',
    coldStartS: coldStartMs == null ? null : round(coldStartMs / 1000, 2),
    loadMedianMs: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
    loadP95Ms: sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)] : null,
    loadSamples: sorted,
    failed: loadTimes.filter((entry) => !entry.ok).length,
    memory20MB: footprint.footprintMB,
    rssMB: usage.rssMB,
    processCount: usage.processCount,
    idleCpuPercent: cpu.percent,
    idleCpuSamples: cpu.samples,
  };
}

/**
 * AppleScript is bounded twice: the script itself gets `with timeout`, and the
 * process gets a hard kill. macOS shows its Automation permission prompt
 * outside the script, so without both a first run can block forever.
 */
function osascript(lines, timeoutMs = 20_000) {
  const script = ['with timeout of 15 seconds', ...lines, 'end timeout'];
  return execFileSync('osascript', script.flatMap((line) => ['-e', line]), {
    encoding: 'utf8',
    timeout: timeoutMs,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function safariAutomationHelp(error) {
  const message = String(error?.stderr || error?.message || error).trim().split('\n')[0];
  if (/not authorized|-1743/i.test(message)) {
    return 'macOS blocked AppleScript control of Safari (Automation permission).\n' +
      'Allow it in System Settings → Privacy & Security → Automation, then run the command again.';
  }
  if (/timed out|ETIMEDOUT/i.test(message)) {
    return 'Safari did not answer the AppleScript request in time.\n' +
      'If macOS is showing an Automation prompt, answer it and run the command again.';
  }
  return `Safari could not be driven through AppleScript: ${message}`;
}

async function measureSafari(browser) {
  const installed = browser.app.find((candidate) => fs.existsSync(candidate));
  if (!installed) fail('Safari is not installed.');

  let windowId = null;
  try {
    osascript(['tell application "Safari" to activate']);
    osascript([
      'tell application "Safari"',
      '  make new document',
      `  set URL of front document to ${JSON.stringify(FIXTURES.urls[0])}`,
      ...FIXTURES.urls.slice(1).map((url) => `  tell front document to make new tab with properties {URL:${JSON.stringify(url)}}`),
      'end tell',
    ]);
    windowId = osascript(['tell application "Safari" to return id of front window']).trim();
  } catch (error) {
    fail(safariAutomationHelp(error));
  }

  await sleep(SETTLE_MS);

  let pid = null;
  try {
    pid = Number(execFileSync('pgrep', ['-x', 'Safari'], { encoding: 'utf8' }).trim().split('\n')[0]);
  } catch { /* not running */ }
  if (!pid) fail('Could not find the Safari process.');

  const cpu = await idleCpu(pid, CPU_SAMPLE_MS);
  const usage = treeUsage(pid);
  const footprint = await treeFootprint(pid);

  if (windowId) {
    try { osascript([`tell application "Safari" to close window id ${windowId}`]); } catch { /* user closed it */ }
  }

  return {
    browser: 'Safari',
    measuredAt: new Date().toISOString(),
    engine: 'webkit',
    coldStartS: null,
    loadMedianMs: null,
    loadP95Ms: null,
    loadSamples: [],
    memory20MB: footprint.footprintMB,
    rssMB: usage.rssMB,
    processCount: usage.processCount,
    idleCpuPercent: cpu.percent,
    idleCpuSamples: cpu.samples,
    note: 'Load and switch times are not exposed to AppleScript; only memory and CPU are measured.',
  };
}

async function main() {
  const which = (process.argv[2] || '').toLowerCase();
  const browser = BROWSERS[which];
  if (!browser) fail('Usage: compare.js chrome|safari|arc');

  const result = browser.kind === 'safari' ? await measureSafari(browser) : await measureChromium(browser);

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const file = path.join(RESULTS_DIR, `compare-${which}.json`);
  fs.writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  console.log(`Saved ${file}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
