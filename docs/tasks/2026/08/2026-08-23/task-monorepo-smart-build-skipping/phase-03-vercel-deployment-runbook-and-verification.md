---
title: "Phase 3: Vercel project configuration runbook and local verification"
type: phase
parent: "task-monorepo-smart-build-skipping"
phase: "03"
status: completed
created: "2026-08-23"
tags: [task, phase, devops, vercel, runbook]
---

# Phase 3: Vercel project configuration runbook and local verification

## Objective
Author a comprehensive Vercel production deployment runbook detailing the exact dashboard settings (Root Directory, Ignored Build Step, Production Branch `master`, Environment Variables) for `sentinel-web`, `sentinel-core`, and `sentinel-support`, and perform end-to-end verification.

## Dependencies & Prerequisites
- Phase 1 & Phase 2 completed.

## Impacted Files & Components
- [NEW] [`docs/operations/vercel-monorepo-setup.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/operations/vercel-monorepo-setup.md)

## Implementation Tasks

- [x] Task 3.1 — Create `docs/operations/vercel-monorepo-setup.md` with explicit UI navigation, project root paths, and command configurations.
- [x] Task 3.2 — Test selective build filtering logic across all applications.
- [x] Task 3.3 — Record verification evidence and update the task master ledger.

## Verification & Testing
- Documentation verified: `docs/operations/vercel-monorepo-setup.md`
- Turborepo selective task graph verified against `master`.
- Context Doctor health audit: `pnpm context:doctor` (12/12 evaluations passed).

## Risks & Rollback
- None.

