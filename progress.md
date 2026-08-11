# Session Progress Log

## Current State

**Last Updated:** 2026-08-11 09:30 Asia/Taipei
**Session ID:** Codex desktop
**Active Feature:** None

## Status

### What's Done

- [x] Added a reproducible minimal project harness.
- [x] Completed the `cadastral_cleanup_land_auction_results` static-data dashboard module.

### What's In Progress

- [ ] No active implementation task.

### What's Next

1. Start from the user’s next scoped request and update `feature_list.json` before editing.
2. Run `npm.cmd test` and `npm.cmd run build` before marking that work complete.

## Blockers / Risks

- [ ] The official auction CSV may change without notice; re-run fetch and conversion before publishing a refresh.

## Decisions Made

- **Local static data only**: browser modules load generated JSON from `public/data/`.
  - Context: preserves reproducibility and avoids runtime dependency on Taipei Open Data.
  - Alternatives considered: live Open Data calls; rejected by project requirements.
- **Total reserve is explicit-only**: derived premium metrics use `標售總底價金額` only when the source row provides it.
  - Context: grouped continuation rows omit that field in the official CSV.

## Files Modified This Session

- `AGENTS.md` - project operating rules and verification path.
- `feature_list.json` - current feature state and evidence.
- `progress.md` - restartable handoff state.
- `init.sh` and `session-handoff.md` - standard bootstrap and handoff templates.

## Evidence of Completion

- [x] Tests pass: `npm.cmd test` — 32 passed on 2026-08-11.
- [x] Type check and production build clean: `npm.cmd run build` — passed on 2026-08-11.
- [x] Data sanity check: 35 source rows; unsuccessful bids did not become zero-valued awards.

## Notes for Next Session

Run `bash ./init.sh` (or its two PowerShell-safe commands) before the next change. Read the active feature and evidence in `feature_list.json`; do not overwrite local source files or generated data without preserving source-field and methodology constraints.
