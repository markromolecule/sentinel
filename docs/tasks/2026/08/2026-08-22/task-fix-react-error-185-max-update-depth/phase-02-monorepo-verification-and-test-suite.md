---
title: "Phase 02: Monorepo Verification & Next.js Build"
type: phase
parent: "task-fix-react-error-185-max-update-depth"
phase: "02"
status: planned
created: "2026-08-22"
tags: [task, phase, react, verification, build]
---

# Phase 02: Monorepo Verification & Next.js Build

## Objective

Verify that all unit tests across `sentinel-web` and `sentinel-core` pass and Next.js builds produce clean bundles with zero React runtime Error #185 exceptions.

## Dependencies & Prerequisites

- Completion of Phase 01: [`phase-01-fix-question-bank-import-hooks.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-22/task-fix-react-error-185-max-update-depth/phase-01-fix-question-bank-import-hooks.md)

## Impacted Files & Components

- `app/sentinel-web` test suites & build
- `app/sentinel-core` test suites & build

## Implementation Tasks

- [ ] Run full vitest suite for `sentinel-web` and `sentinel-core`.
- [ ] Run production build for `sentinel-web`.
- [ ] Document test outcomes and evidence in task completion records.

## Verification & Testing

- `pnpm --filter sentinel-web test`
- `pnpm --filter sentinel-core test`
- `pnpm --filter sentinel-web build`

## Risks & Rollback

- None. Fix is isolated to local hook dependency lifecycle.
