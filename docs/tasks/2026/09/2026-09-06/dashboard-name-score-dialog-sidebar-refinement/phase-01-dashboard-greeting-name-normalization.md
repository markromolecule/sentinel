---
title: "Phase 1: Dashboard Greeting Name Normalization"
type: phase
parent: "dashboard-name-score-dialog-sidebar-refinement"
phase: "01"
status: completed
created: "2026-09-06"
completed: "2026-09-06"
tags: [task, phase, greeting, normalization]
---

# Phase 1: Dashboard Greeting Name Normalization

## Objective

Normalize the user's display name rendered in the dashboard salutation header so that uppercase strings (e.g., `"KEANNA"`, `"KEANNA CRUZ"`) are displayed with proper first-letter capitalization (`"Keanna"`). Ensure identical, robust behavior across `sentinel-web`, `sentinel-core`, and `sentinel-support`.

## Dependencies & Prerequisites

- None. Can be implemented immediately as a standalone UI/logic enhancement.

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/dashboard/_components/dashboard-greeting.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/dashboard/_components/dashboard-greeting.test.tsx`
- `app/sentinel-core/src/app/(protected)/dashboard/_components/dashboard-greeting.tsx`
- `app/sentinel-core/src/app/(protected)/dashboard/_components/dashboard-greeting.test.tsx`
- `app/sentinel-support/src/app/(protected)/dashboard/_components/dashboard-greeting.tsx`
- `app/sentinel-support/src/app/(protected)/dashboard/_components/dashboard-greeting.test.tsx`

## Implementation Tasks

- [x] Update `formatDisplayName` in `sentinel-web`:
  - Split incoming name/email by `@`, dots, underscores, and hyphens.
  - Extract `firstName` and normalize character 0 to uppercase and remaining characters to lowercase:
    `firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()`.
- [x] Update `formatDisplayName` identically in `sentinel-core`:
  - `app/sentinel-core/src/app/(protected)/dashboard/_components/dashboard-greeting.tsx`.
- [x] Update `formatDisplayName` identically in `sentinel-support`:
  - `app/sentinel-support/src/app/(protected)/dashboard/_components/dashboard-greeting.tsx`.
- [x] Add unit test assertions in all three apps:
  - Assert `'KEANNA'` $\rightarrow$ `'Keanna'`.
  - Assert `'KEANNA CRUZ'` $\rightarrow$ `'Keanna'`.
  - Assert `'JAKE_HARPER'` $\rightarrow$ `'Jake'`.
  - Verify existing tests for `'support@sentinelph.tech'` and `'Joseph Cruz'` remain green.

## Verification & Testing

- `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/dashboard/_components/dashboard-greeting.test.tsx`
  - Output: 15 passed (15 tests total)
- `pnpm --filter sentinel-core test src/app/(protected)/dashboard/_components/dashboard-greeting.test.tsx`
  - Output: 15 passed (15 tests total)
- `pnpm --filter sentinel-support test src/app/(protected)/dashboard/_components/dashboard-greeting.test.tsx`
  - Output: 15 passed (15 tests total)

## Risks & Rollback

- **Risk:** Empty or undefined names.
- **Mitigation:** The function already guards against empty strings and returns `'User'` as a safe fallback.
- **Rollback:** Revert modifications to `dashboard-greeting.tsx` in git.
