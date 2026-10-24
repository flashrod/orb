# Benchmarks

Every release gets a row. Numbers are only useful when the workload and machine
stay fixed, so the fixture list in `scripts/benchmark/fixtures.json` is versioned
and should not change casually.

## Running

```bash
npm run benchmark
```

The harness boots a real Electron window, loads all 20 fixtures into `<webview>`
tabs (the engine path Orb uses today), then measures:

- **Cold start to usable** — process start to the harness window finishing load.
- **20-tab load** — median and p95 time from `src` assignment to `did-stop-loading`.
- **Tab switch** — median/p95 of hiding one pane and showing another, measured to
  the second animation frame.
- **Memory, 20 tabs** — summed `workingSetSize` across every process.
- **Idle CPU** — summed `percentCPUUsage` sampled once a second for 5s.
- **Memory after hibernation** — after destroying 15 of the 20 views.

Output: `benchmarks/<timestamp>-orb.json`, `benchmarks/latest.json`, and
`benchmarks/latest.md`.

## Comparing against Chrome, Safari and Arc

1. Open the same 20 URLs from `fixtures.json` in the other browser, on the same
   Mac, on the same network, with the same extensions off.
2. Measure memory in Activity Monitor (sum of that browser's processes) and idle
   CPU after the tabs settle.
3. Fill the empty columns in `latest.md` and commit the table with the run.

Cold-start numbers are only comparable when the browser has been quit for a
while, and load times only when the network is stable. Note anything unusual
(VPN, throttled Wi-Fi) in the commit message.

## Reading the results

- The harness uses a persistent `persist:orb-benchmark` partition, so the second
  run of the day is warm-cache. For cold numbers, clear the partition or use a
  fresh profile.
- A failed fixture is reported, not hidden: sites that block automated browsers
  show up in `loads.failed` and are excluded from the latency percentiles.
