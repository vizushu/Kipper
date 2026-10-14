# Contributing to Kipper

## Branches
- `main` is sacred: it always builds green. Never push directly to `main`.
- Feature branches: `phase-<n>-<short-desc>` (e.g. `phase-3-property-pages`) or `fix/<short-desc>`.

## Pull requests
- One PR per unit of work. Link the Notion Team Updates entry.
- Every PR must pass CI: `npm run typecheck`, `npm test`, `npm run build`.
- A second pair of eyes reviews before merge. Muse (program manager) is the verification gate.

## Verification checklist (must all pass before merge)
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm test` — all passing
- [ ] `npm run build` — all routes compile
- [ ] Smoke test new/changed routes (200s, no layout breaks at 393px)
- [ ] No invented content: every guest-facing fact must be verified or labeled SAMPLE
- [ ] `docs/TEST-REPORT.md` updated if routes or behavior changed

## Secrets
Never commit `.env`, API keys, or credentials. Copy `.env.example` to `.env` locally.
