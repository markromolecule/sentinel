---
title: "Phase 1: Standardize ignore-build scripts across monorepo apps"
type: phase
parent: "task-monorepo-smart-build-skipping"
phase: "01"
status: completed
created: "2026-08-23"
tags: [task, phase, devops, turborepo]
---

# Phase 1: Standardize ignore-build scripts across monorepo apps

## Objective
Standardize the `"ignore-build"` npm script across all application `package.json` manifests (`app/sentinel-web`, `app/sentinel-core`, `app/sentinel-support`, `app/sentinel-api`) to include the explicit `--fallback=master` flag. This guarantees that when Vercel runs the Ignored Build Step on a new branch or shallow clone without prior deployment context, it correctly diffs against `master` instead of failing or using default `main`.

## Dependencies & Prerequisites
- Turborepo installed in workspace root.

## Impacted Files & Components
- [`app/sentinel-web/package.json`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/package.json)
- [`app/sentinel-core/package.json`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/package.json)
- [`app/sentinel-support/package.json`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/package.json)
- [`app/sentinel-api/package.json`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/package.json)

## Implementation Tasks

- [x] Task 1.1 — Update `app/sentinel-web/package.json` with `"ignore-build": "npx turbo-ignore --fallback=master"`.
- [x] Task 1.2 — Update `app/sentinel-core/package.json` with `"ignore-build": "npx turbo-ignore --fallback=master"`.
- [x] Task 1.3 — Update `app/sentinel-support/package.json` with `"ignore-build": "npx turbo-ignore --fallback=master"`.
- [x] Task 1.4 — Update `app/sentinel-api/package.json` with `"ignore-build": "npx turbo-ignore --fallback=master"`.

## Verification & Testing
- Command: `pnpm --filter sentinel-web run ignore-build`
- Result: Correctly analyzed `turbo@latest run build --filter="sentinel-web...[master]" --dry=json` and identified workspace change against `master`.
- Exit Status: Code 1 (`Proceeding with deployment` since `sentinel-web` package was edited in current branch).

## Risks & Rollback
- **Risk:** Missing git ref if `master` branch is not locally cloned or fetched.
- **Mitigation:** In Vercel and CI, git fetch depth is configured to fetch full history.

