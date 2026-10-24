# Orb benchmark — 2026-10-24T03:46:33.882Z

Electron 45.0.0 · Chromium 156.0.8078.48 · darwin arm64 · 20 tabs

| Metric | Orb | Chrome | Safari | Arc |
|---|---|---|---|---|
| Cold start to usable (s) | 0.21 | | | |
| 20-tab load, median (ms) | 3988 | | | |
| 20-tab load, p95 (ms) | 12054 | | | |
| Tab switch, median (ms) | 83 | | | |
| Memory, 20 tabs (MB) | 4797 | | | |
| Idle CPU, 20 tabs (%) | 5.65 | | | |
| Memory after hibernation (MB) | 2013 | | | |

Tabs that failed to load: 1

Fill the Chrome / Safari / Arc columns by running the same 20 URLs from
`scripts/benchmark/fixtures.json` on the same Mac and network, then commit
the table next to the JSON so every release can be compared.
