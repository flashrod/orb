# Orb benchmark — 2026-10-28T18:02:24.146Z

Electron 45.0.0 · Chromium 156.0.8078.48 · darwin arm64 · 20 tabs · engine WebContentsView

| Metric | Orb | Chrome |
|---|---|
| Cold start to usable (s) | 0.28 | 0.53 |
| 20-tab load, median (ms) | 1148 | 1742 |
| 20-tab load, p95 (ms) | 3180 | 7135 |
| Tab switch, median (ms) | 33 |  |
| Memory, 20 tabs (MB footprint) | 3810.7 | 5053.7 |
| Idle CPU, 20 tabs (%) | 25.07 | 22.35 |
| Memory after hibernation (MB footprint) | 1650.6 | — |

Tabs that failed to load: 0

Memory is the sum of physical footprint over each browser's whole process
tree (the number Activity Monitor shows), and CPU is the sum of CPU-time
deltas over a fixed window. Both come from `scripts/benchmark/measure.js`
and are measured the same way for every column.

Fill another column with `node scripts/benchmark/compare.js chrome` (or
`safari`, `arc`); only measured browsers appear in the table.
