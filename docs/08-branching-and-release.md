# Branching and Release Process

How the team (3 to 4 people) shares one repository: which branches exist, what each is for, how code moves from a developer's machine to production, and who may do what. It does not define scope; scope and phase come from [01-feature-spec.md](01-feature-spec.md).

## 1. Branch model

```
feature/*, fix/*, docs/*  ──PR──►  qa  ──PR (after QA sign-off)──►  main
      (each developer)        (integration + testing)         (production, deployed)
                                                                    ▲
hotfix/*  ──────────────────PR (urgent fix only)────────────────────┘  then merged back into qa
```

| Branch | Purpose | Deployed to | Who merges | Direct push |
|---|---|---|---|---|
| `main` | What is live. Always releasable. | Production | Release owner, only from `qa` after sign-off | Never |
| `qa` | Integration branch. Everyone's finished work lands here and is tested together. | QA / staging | Any team member, after one review | Never |
| `feature/<area>-<short-name>` | One feature or part of a feature. Created from `qa`. | Local only | The author, via PR into `qa` | Author only |
| `fix/<short-name>` | Bug found in `qa`. Created from `qa`. | Local only | Author, via PR into `qa` | Author only |
| `docs/<short-name>` | Doc-only change. Created from `qa`. | none | Author, via PR into `qa` | Author only |
| `hotfix/<short-name>` | Urgent production bug. Created from `main`. | Local only | PR into `main`, then merged back into `qa` | Author only |

`<area>` is a spec area or backend module name, for example `feature/bookings-recurring-series`, `feature/auth-otp-login`. Put the feature ID in the PR title (`F-BKG-04`).

## 2. Day-to-day flow

1. Update: `git switch qa && git pull`.
2. Branch: `git switch -c feature/<area>-<short-name>`.
3. Work in small commits. Pull `qa` into your branch often (`git pull origin qa`) so conflicts stay small.
4. Before the PR: run the checks in section 5, and update the docs for your change (CLAUDE.md rule, with Change Log rows).
5. Open a PR **into `qa`**. One reviewer from another person is required.
6. After merge, the author deletes the feature branch.
7. When the QA checklist for a batch of work passes (section 4), the release owner opens a PR **from `qa` into `main`**. After merge, tag the release.

Rules:

- Never commit to `main` or `qa` directly.
- Never merge a feature branch straight into `main`.
- Never merge your own PR without a review.
- Never force-push `main` or `qa`.
- Do not build, change or remove anything for an `OPEN` feature (CLAUDE.md).
- Keep branches short-lived. A branch older than about a week should be split or merged.

## 3. Avoiding clashes between 3 to 4 people

Split work by **area**, not by file type, so people rarely edit the same files. Use the backend module list in [06-architecture-and-structure.md](06-architecture-and-structure.md) section 3 and the build order in [09-phase-completion.md](09-phase-completion.md). Record who owns which area in the table below and update it when work is reassigned.

| Area / modules | Owner | Notes |
|---|---|---|
| (to be filled by the team) | | |

Shared files that cause most conflicts: `web/src/registry.jsx`, `mobile/src/registry.jsx`, `docs/01-feature-spec.md`, `docs/03-mockup-sync-matrix.md`, `docs/04-decisions-log.md`, `packages/api-contract`. Edit them in small PRs and merge quickly. Never hand-edit the generated block in `docs/02-phase-scope.md`; if it conflicts, take either side and rerun `python docs/tools/check_docs.py --write`.

## 4. QA gate (`qa` to `main`)

All must be true before the PR into `main`:

- [ ] Every feature in the batch has its spec row, matrix row and Change Log rows.
- [ ] `python docs/tools/check_docs.py --write` passes on `qa`.
- [ ] Web and mobile build (`npm ci && npm run build` in `web/` and `mobile/`).
- [ ] Each feature in the batch was tested on `qa` on both web and mobile (D-013) against its acceptance scenarios (SC-xxx in the PRS).
- [ ] No open blocking bugs against the batch.
- [ ] A named tester signed off in the PR description (name and date).

## 5. Pull request checks

Copy into every PR:

- [ ] Branch is up to date with `qa` (or `main` for hotfix).
- [ ] Feature docs updated; Change Log rows added with date and time, author and reason.
- [ ] Docs checker passes.
- [ ] Builds pass for the app(s) touched.
- [ ] Web and mobile moved together, or the matrix says what is outstanding.
- [ ] No invented values (prices, limits, deadlines).

## 6. Environments

| Environment | Branch | Status |
|---|---|---|
| Production | `main` | Currently the Render blueprint in `render.yaml` (`vendorverse-web`, `vendorverse-mobile`) |
| QA / staging | `qa` | Proposed: duplicate the two services with `branch: qa` (names `vendorverse-web-qa`, `vendorverse-mobile-qa`). Not yet created in `render.yaml` because syncing a blueprint creates paid or billable services on Render; the owner must approve. |
| Local | any | Each developer runs the apps locally |

## 7. GitHub settings to apply (repository owner)

These are settings on GitHub, not files, so they must be set by hand under Settings > Branches:

- Protect `main`: require a pull request, 1 approval, up-to-date branch, no force-push, no deletion, restrict who can push. Allow merging only from `qa` and `hotfix/*` (by convention and review).
- Protect `qa`: require a pull request, 1 approval, no force-push, no deletion.
- Add the docs checker as a required status check once a CI workflow exists (not yet built).
- Add all team members as collaborators with write access; keep the release owner list short.

## 8. Releases and hotfixes

- Tag every merge into `main`: `v<phase>.<n>`, for example `v1.0`, `v1.1`. Phase 1 launch is `v1.0` (see [09-phase-completion.md](09-phase-completion.md)).
- Hotfix: branch from `main`, PR into `main`, then open a second PR merging `main` back into `qa` so the fix is not lost.

## Change Log

| Date & time (YYYY-MM-DD HH:MM, local) | Updated by | Change | Reason |
|---|---|---|---|
| 2026-11-04 11:10 | Shil1517 | Added: branching and release process | Team of 3 to 4 needs a main / qa / feature branch model with a QA gate before production. |
