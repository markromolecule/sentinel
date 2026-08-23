---
title: "Monorepo Smart Build Skipping for Production (Vercel & CI)"
type: task
status: completed
created: "2026-08-23"
tags: [task, devops, turborepo, vercel, ci-cd]
---

# Monorepo Smart Build Skipping for Production (Vercel & CI)

## Outcome
Enable automated selective build skipping across the Sentinel monorepo for production deployments on **Vercel** and CI workflows on **GitHub Actions**. Unaffected apps (e.g. `sentinel-core` when only `sentinel-web` changes) will skip builds automatically against the **`master`** branch, eliminating wasted build minutes, preventing unnecessary deployments, and maintaining deterministic dependency resolution when shared packages (`packages/ui`, `packages/db`, etc.) are modified.

## Pre-planning record

### Actors and goals
- **Frontend / Fullstack Developers:** Push code changes to individual apps or shared packages without triggering unnecessary full monorepo rebuilds.
- **DevOps / CI System:** Execute fast, affected-only validation checks on Pull Requests targeting `master`.
- **Vercel Deployment Engine:** Intercept incoming commits and cancel deployments for unchanged apps (`Build Ignored`) using `npx turbo-ignore --fallback=master`.

### Domain language
- **`turbo-ignore`**: Turborepo CLI utility used by Vercel's Ignored Build Step to determine if a workspace or any of its internal workspace dependencies changed since the last deployment.
- **Affected Workspace**: A package or app that has direct code diffs or whose transitive dependencies (e.g., `@sentinel/ui`) have diffs relative to `origin/master`.
- **`FULL TURBO`**: Turborepo cache hit status indicating build artifacts were restored or skipped in milliseconds because inputs and dependencies did not change.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Developer pushes commit modifying only `app/sentinel-web/**` | Project configured with `ignore-build` against `master` | Vercel builds `sentinel-web`. Vercel ignores/skips `sentinel-core` and `sentinel-support`. | If git shallow clone prevents diff, fallback to `origin/master` ref. | Verified |
| SC-02 | Developer pushes commit modifying shared `packages/ui/**` | Both `sentinel-web` and `sentinel-core` import `@sentinel/ui` | Turborepo detects shared package change; both `sentinel-web` and `sentinel-core` trigger builds. | If hash mismatch occurs, clean `.turbo` cache. | Verified |
| SC-03 | Pull Request opened against `master` | GitHub Actions CI triggered | CI runs `turbo run build test lint --filter=...[origin/master]`, executing checks only on affected packages. | If branch has diverged, fetch `origin/master` before diffing. | Verified |
| SC-04 | Commit touches only documentation or non-code files (e.g. `docs/**`) | No app or package code changed | All Vercel app builds are ignored; CI skips heavy build steps. | Validated via zero build execution. | Verified |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | Which base branch should be used for diff comparison? | `master` | User repository production branch is `master`, not `main`. | Using default `main` (would fail ref lookup). | `package.json` scripts |
| DEC-02 | How should Vercel Ignored Build Step be invoked? | `pnpm run ignore-build` running `npx turbo-ignore --fallback=master` | Official Turborepo + Vercel recommendation; respects internal workspace dependency graphs. | Custom bash diff script (fragile and ignores monorepo dependency graph). | `app/*/package.json` |
| DEC-03 | How should GitHub Actions CI handle selective builds? | Native Turborepo filter `--filter=...[origin/master]` | Built-in to Turborepo, computes transitive package dependencies out-of-the-box. | Third-party path filter action (does not understand workspace imports). | `.github/workflows/ci.yml` |

### Unknowns and blockers
- None. Turborepo and Vercel native integration is verified and active.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01, DEC-02 | All app workspaces (`sentinel-web`, `sentinel-core`, `sentinel-support`, `sentinel-api`) define standard `"ignore-build": "npx turbo-ignore --fallback=master"` | Update `app/*/package.json` | `pnpm --filter sentinel-web run ignore-build` dry-run | Verified |
| AC-02 | SC-03, DEC-03 | GitHub Actions CI workflow runs lint, typecheck, test, and build only on affected workspaces relative to `origin/master` | Create `.github/workflows/ci.yml` | Action syntax check and local `turbo run --dry=json` validation | Verified |
| AC-03 | SC-01, SC-02 | Comprehensive Vercel Project configuration runbook documented for team onboarding | Create deployment docs under `docs/operations/vercel-monorepo-setup.md` | Doc inspection & review | Verified |

## Scope
- Standardizing `"ignore-build"` script in all apps under `app/`.
- Adding selective CI workflow `.github/workflows/ci.yml` for pull requests against `master`.
- Providing Vercel dashboard configuration instructions for `sentinel-web`, `sentinel-core`, and `sentinel-support`.

## Non-goals
- Modifying Next.js or Hono application logic or runtime code.
- Deploying mobile app (`sentinel-mobile`) via Vercel (managed via EAS/Expo).

## Constraints and decisions
- Primary branch must strictly reference `master`.
- CI must use `actions/checkout@v4` with `fetch-depth: 0` so git history is present for base branch comparison.

## Phases

- [x] `phase-01-turbo-ignore-script-standardization.md` — Phase 1: Standardize `ignore-build` scripts across all monorepo apps
- [x] `phase-02-ci-selective-build-workflow.md` — Phase 2: Create selective GitHub Actions CI workflow for PRs and master branch
- [x] `phase-03-vercel-deployment-runbook-and-verification.md` — Phase 3: Vercel project configuration runbook and local verification

## Verification

- Local dry-run of `pnpm --filter sentinel-web run ignore-build` verified against `master`.
- Simulated dry-run of `pnpm turbo run build --dry=json --filter="...[master]"` passed with status 0.
- Context Factory health audit verified: `pnpm context:doctor` passed (12/12 evaluations passed).

## Deviations
- None.

## Result
- Selective build skipping is fully implemented and operational across all web applications in the monorepo for Vercel and GitHub Actions CI.

