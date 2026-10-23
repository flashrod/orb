# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file.
- Each issue has a `Status:` line near the top. Use `open`, `claimed`, or `resolved`.
- Comments and conversation history append to the bottom of the file under a `## Comments` heading.

## When a skill says “publish to the issue tracker”

Create a new file under `.scratch/<feature-slug>/`, creating the directory if needed.

## When a skill says “fetch the relevant ticket”

Read the file at the referenced path. The user will normally pass the path or issue number directly.

## Wayfinding operations

- **Map:** `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket:** `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records `research`, `prototype`, `grilling`, or `task`; a `Status:` line records `open`, `claimed`, or `resolved`.
- **Blocking:** a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every listed ticket is `resolved`.
- **Frontier:** scan `.scratch/<effort>/issues/` for open, unblocked, unclaimed files; first by number wins.
- **Claim:** set `Status: claimed` and save before any work.
- **Resolve:** append the answer under `## Answer`, set `Status: resolved`, then add a context pointer (gist + link) to the map’s Decisions-so-far in `map.md`.
