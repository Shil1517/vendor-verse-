# VendorVerse – Repo Rules

## Core rule: feature docs must always match the code

**Any change to this repo (add, modify, or remove a feature, screen, flow, API, data model, or scope item) must update the related feature docs in the same commit/PR.** Code and docs never drift.

Web and mobile are **one product**. Every Phase 1 feature exists on both with the same rules and wording. Read [docs/05-maintenance-runbook.md](docs/05-maintenance-runbook.md) before changing a feature.

### Source of truth (highest wins)

1. [docs/04-decisions-log.md](docs/04-decisions-log.md): owner decisions (D-xx) and open questions (O-xx)
2. [docs/01-feature-spec.md](docs/01-feature-spec.md): every feature and its single phase (P1 / P2 / P3 / OPEN)
3. The PRS `docs/VendorVerse_Comprehensive_PRS_v3_Global_Marketplace.docx` (read-only)
4. [docs/03-mockup-sync-matrix.md](docs/03-mockup-sync-matrix.md): which screens implement each feature on web and mobile
5. The mockup code in `web/` and `mobile/`

[docs/02-phase-scope.md](docs/02-phase-scope.md) is generated; do not edit its phase lists by hand.

### Rules

- **Never assume a phase.** If the owner has not decided, the phase is `OPEN`: add an O-xx row to the decisions log and ask. Do not build, change or remove anything for an OPEN feature.
- **One phase per feature**, set only in the feature spec. Split a feature across phases into two IDs.
- **IDs are permanent** (`F-`, `D-`, `O-`, `RET-`). Never reuse or renumber. Removed or deferred features keep their row.
- **No invented values** (prices, limits, deadlines, rates). They stay open CFG items until decided.
- **Screens:** adding, renaming or removing a screen in `web/src/registry.jsx` or `mobile/src/registry.jsx` requires updating the sync matrix. Phase 2 screens carry a visible "Phase 2" badge.
- **Run the checker** before committing anything that touches `docs/` or a registry: `python docs/tools/check_docs.py --write`. It must pass.

### Branches

`main` is production and `qa` is the shared testing branch. Work on `feature/*`, `fix/*` or `docs/*` branches created from `qa`, PR into `qa`, and only the release owner merges `qa` into `main` after the QA gate. Never commit directly to `main` or `qa`. Details: [docs/08-branching-and-release.md](docs/08-branching-and-release.md).

### Older docs

`docs/web-vs-mobile-gap-analysis.md`, `web/docs/*`, `mobile/docs/deliverables/*`, `mobile/docs/user-flows-and-roadmap.md` and `mobile/docs/screen-inventory.csv` are background. Update the one that mentions your change, but the docs above win on any conflict. `README.md` files: update where they describe a changed feature.

### Required change-log entry (timestamp + author + reason)

Every doc edit must add a line to a `## Change Log` section at the bottom of that doc (create it if missing), newest first:

```
| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
| 2026-10-29 14:30 | Shil1517 | Added: vendor KYC screen | Required by PRS v3 §4.2 |
```

- **Timestamp**: the actual current date and time of the update (check the clock; do not estimate).
- **Updated by**: the person making the change (git user name, not "Claude"). When Claude makes the edit on someone's behalf, use that person.
- **Change**: `Added`, `Modified`, or `Removed` + the feature/item name.
- **Reason**: one short sentence on *why*. Removals **must** say why the feature was dropped or deferred; do not silently delete rows. Mark them as `Removed` (or strike through) and keep the log entry.

### Checklist before committing

1. Did I change/remove behavior or scope? → matching docs updated (spec, matrix, decisions if scope or phase moved).
2. Each updated doc has a new Change Log row with timestamp, author, reason.
3. Status values (Done / Partial / Missing / Hold) in the matrix reflect reality for both platforms.
4. `python docs/tools/check_docs.py --write` passes.
5. Commit message mentions the doc update.

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-04 11:16 | Shil1517 | Added: Branches rule | Team of 3 to 4 works through qa before main. |
