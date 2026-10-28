# Benchmarks

Every release gets a row. Numbers are only useful when the workload and machine
stay fixed, so the fixture list in `scripts/benchmark/fixtures.json` is versioned
and should not change casually.

## Running

```bash
npm run benchmark
```

The harness boots a real `BaseWindow` with 20 `WebContentsView` tabs — the same
engine Orb ships, not the legacy `<webview>` path — then measures:

- **Cold start to usable** — the installed app is launched fresh and reports the
  moment its shell has painted a frame (`ORB_STARTUP_MARKER`). Skipped when
  `/Applications/Orb.app` is not installed.
- **20-tab load** — median and p95 from navigation start to `did-stop-loading`,
  with all 20 views loading at once.
- **Tab switch** — median of hiding one native view and showing another, measured
  to the next painted frame of the window.
- **Memory, 20 tabs** — summed physical footprint of Orb's whole process tree.
- **Idle CPU** — summed CPU-time deltas over a fixed 10 s window, after a 10 s
  settle.
- **Memory after hibernation** — after closing 15 of the 20 views.

Output: `benchmarks/<timestamp>-orb.json`, `benchmarks/latest.json`, and
`benchmarks/latest.md`.

## One method for every browser

`scripts/benchmark/measure.js` is the only source of memory and CPU numbers:

- **Memory** is the sum of `vmmap --summary` physical footprints across the
  browser's process tree. That is the number Activity Monitor shows in its
  Memory column, and unlike RSS it does not count shared framework pages once
  per helper process.
- **CPU** is the sum of `ps -o time=` deltas over a fixed window. `ps`'s `%cpu`
  column is a lifetime average, so it is useless for idle measurements.

Both browsers are measured with the same code, so the columns are comparable
even though neither is an Activity Monitor screenshot.

## Comparing against Chrome, Safari and Arc

```bash
node scripts/benchmark/compare.js chrome
```

Chrome and Arc are driven over the DevTools protocol in a throwaway profile: 20
empty tabs are created, then navigated at the same moment, which mirrors the Orb
harness. Your own browser session is untouched. Cold start is spawn to a usable
blank window.

Safari has no such protocol by default, so `compare.js safari` uses AppleScript
in a new window and closes it afterwards. macOS may ask for Automation
permission; the script is bounded so a blocked prompt fails with an explanation
instead of hanging. Safari load and switch times are not exposed that way, so
only memory and CPU are reported.

Only browsers that have a `benchmarks/compare-<browser>.json` appear in the
table. Arc is not installed on every machine; a missing column is better than an
invented one.

## Reading the results

- The harness uses a persistent `persist:orb-benchmark` partition, so a second
  run on the same day is warm-cache. Clear it for cold numbers.
- A failed fixture is reported, not hidden: sites that block automated browsers
  show up in `loads.failed` and are excluded from the latency percentiles.
- Idle CPU is the noisiest number here. Pages with autoplay video keep working
  long after `did-stop-loading`, so treat differences under a few points as
  noise.
