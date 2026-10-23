# Domain Docs

How engineering skills should consume this repo’s domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root, or **`GLOSSARY-MAP.md`** if it exists; the map points to relevant context glossaries.
- **`docs/adr/`** for decisions that touch the area being changed.

If these files do not exist, proceed silently. Do not flag their absence or suggest creating them upfront. Create them when domain terms or decisions are resolved.

## File structure

This is a single-context repo:

```text
/
├── GLOSSARY.md
├── docs/adr/
└── packages/
```

## Use the glossary vocabulary

When naming a domain concept in an issue, refactor proposal, hypothesis, or test, use the term defined in `GLOSSARY.md`. If the needed concept is missing, note the gap for domain modeling.

## Flag ADR conflicts

Surface conflicts with existing ADRs instead of silently overriding them.
