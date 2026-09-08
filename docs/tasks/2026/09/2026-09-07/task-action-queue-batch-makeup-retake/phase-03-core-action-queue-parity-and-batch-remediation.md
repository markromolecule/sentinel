---
title: "Port ActionQueueView, DataTable, and batch remediation to sentinel-core"
type: phase
parent: "action queue batch makeup retake"
phase: "03"
status: completed
created: "2026-09-07"
tags: [task, phase, sentinel-core, action-queue, parity, data-table, batch-reschedule]
---

# Port ActionQueueView, DataTable, and batch remediation to sentinel-core

## Objective

Bring 100% UI and UX parity to `sentinel-core` by introducing the dedicated tabbed `ActionQueueView` with `DataTable` when navigating to `/exams/[id]/report?section=queue`, supporting multi-select checkboxes, batch toolbar, and batch remediation grants.

## Dependencies & Prerequisites

- Completion of Phase 01 & 02 (`phase-01-web-action-queue-multiselect-and-toolbar.md`, `phase-02-web-batch-remediation-dialog-and-dispatch.md`)
- Existing `exam-session-nav.tsx` in `sentinel-core` which already references `?section=queue`

## Impacted Files & Components

- `app/sentinel-core/src/app/(protected)/exams/[id]/report/page.tsx`: Inspect search params for `?section=queue` and conditionally render `ActionQueueView` (or tabbed section).
- `app/sentinel-core/src/app/(protected)/exams/[id]/report/_components/action-queue-view.tsx` [NEW]: Port tabbed view orchestration from `sentinel-web`.
- `app/sentinel-core/src/app/(protected)/exams/[id]/report/_components/action-queue-panel.tsx` [NEW]: Port panel with `DataTable`, faceted filter, search, and batch toolbar.
- `app/sentinel-core/src/app/(protected)/exams/[id]/report/_components/action-queue-columns.tsx` [NEW]: Port column definitions with select checkbox and attempt links.
- `app/sentinel-core/src/app/(protected)/exams/[id]/report/_components/remediation-grant-dialog.tsx`: Upgrade to match the batch-capable dialog from Phase 02.
- `app/sentinel-core/src/app/(protected)/exams/[id]/report/_helpers/report-helpers.ts`: Add `grantLifecycleOverridesBatch` helper.

## Implementation Tasks

- [x] Task 1 — Port Core Queue Components:
  - Create `action-queue-columns.tsx` under `sentinel-core/src/app/(protected)/exams/[id]/report/_components/` with checkbox select column.
  - Create `action-queue-panel.tsx` with search, section filter, row selection, and batch toolbar.
  - Create `action-queue-view.tsx` with tabs (`review`, `makeup`, `retake`) and badge counts.
  - Update `remediation-grant-dialog.tsx` in `sentinel-core` to support multiple items (`items: ExamReportActionItem[]`).
- [x] Task 2 — Implement Batch Execution in Core:
  - Add `grantLifecycleOverridesBatch` to `_helpers/report-helpers.ts`.
  - Handle batch dispatch with `Promise.allSettled`, sonner toasts, and `refetch()`.
- [x] Task 3 — Update `ExamReportPage` Routing in `sentinel-core`:
  - Wrap page content with `Suspense` (matching Next.js App Router client parameter conventions) or use `useSearchParams()`.
  - Read `section = searchParams.get('section')`.
  - When `section === 'queue'`, render `ActionQueueView`.
  - Provide a quick toggle or breadcrumb back to Summary/Overview.
  - Verify `exam-session-nav.tsx` "Actions" button properly highlights and displays the Action Queue view.

## Verification & Testing

- Automated tests: `pnpm --filter sentinel-core test src/app/(protected)/exams/[id]/report/`
  - PASS: 29/29 tests across 5 test suites (`action-queue.test.tsx`, `remediation-grant-dialog.test.tsx`, `report-helpers.test.ts`, `page.test.tsx`, `exam-report-pdf-export.test.tsx`).
- Typecheck: 0 errors in report module.

## Risks & Rollback

- Risk: Differences in route parameter types (`Promise<{ id: string }>` in Next.js 15+).
  - Mitigation: Use `use(params)` consistently as established in `sentinel-core`.
- Rollback: Revert `page.tsx` routing branch and delete newly added `_components/action-queue-*.tsx` files.
