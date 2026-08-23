---
title: "Phase 2: Create selective GitHub Actions CI workflow for PRs and master branch"
type: phase
parent: "task-monorepo-smart-build-skipping"
phase: "02"
status: completed
created: "2026-08-23"
tags: [task, phase, devops, github-actions, ci]
---

# Phase 2: Create selective GitHub Actions CI workflow for PRs and master branch

## Objective
Author a production-grade GitHub Actions CI workflow (`.github/workflows/ci.yml`) using Turborepo's native filter (`--filter=...[origin/master]`) to lint, typecheck, test, and build only affected apps and packages on pull requests targeting `master` and on pushes to `master`.

## Dependencies & Prerequisites
- Phase 1 complete.
- `pnpm` and Node 22 setup action compatibility.

## Impacted Files & Components
- [NEW] [`.github/workflows/ci.yml`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/.github/workflows/ci.yml)

## Implementation Tasks

- [x] Task 2.1 — Author `.github/workflows/ci.yml` with triggers on `pull_request` to `master` and `push` to `master`.
- [x] Task 2.2 — Include `actions/checkout@v4` with `fetch-depth: 0` so Git has access to `origin/master` for diffing.
- [x] Task 2.3 — Add `turbo run lint test build --filter=...[origin/master]` command steps (or fallback to full build when directly on `master`).

## Verification & Testing
- Workflow created: `.github/workflows/ci.yml`
- Simulated dry run: `pnpm turbo run build --dry=json --filter="...[master]"` passed with exit code 0 and valid workspace dependency graph.

## Risks & Rollback
- **Risk:** Shallow clones causing git comparison failures.
- **Mitigation:** Setting `fetch-depth: 0` explicitly solves this.

