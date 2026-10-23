## Agent skills

### Issue tracker

Issues and specs are tracked as local Markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Use the single-context glossary and ADR layout. See `docs/agents/domain.md`.

## Project guidance

- Orb is an Electron + React + TypeScript + Vite browser. Do not replace the stack with Next.js.
- Keep changes focused and commits small; push completed checkpoints to `origin/main`.
- Do not create release packages unless the user explicitly asks.
- Keep browser navigation and privacy behavior in the Electron main process where appropriate; expose renderer capabilities through the typed preload API.
- Preserve user data when changing persisted Zustand stores. Add versioned migrations when defaults or stored shapes change.
- Run `npm run typecheck`, `npm test`, and `npm run build` when validating implementation changes.
- Use test-first development for behavior changes: write a failing test, implement the behavior, then confirm it passes.
