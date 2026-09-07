---
title: "Multi-select checkbox column, row selection state, and batch toolbar in sentinel-web"
type: phase
parent: "action queue batch makeup retake"
phase: "01"
status: completed
created: "2026-09-07"
tags: [task, phase, sentinel-web, multi-select, data-table, checkbox]
---

# Multi-select checkbox column, row selection state, and batch toolbar in sentinel-web

## Objective

Equip the "Needs Makeup" and "Needs Retake" Action Queue tables in `sentinel-web` with row selection checkboxes, header select-all with indeterminate state support, and a responsive batch action toolbar (`Grant Makeup/Retake ({N})` and `Clear Selection`).

## Dependencies & Prerequisites

- Context specification: `docs/context/September/7/action-queue-batch-makeup-retake.md`
- Core UI components: `@sentinel/ui` (`DataTable`, `Checkbox`, `Button`, `Badge`)

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/action-queue-columns.tsx`: Add select column definition conditionally when `isSelectable` is true.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/action-queue-panel.tsx`: Add local or controlled `rowSelection` state, extract selected items, render batch toolbar with dynamic actions.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/action-queue-view.tsx`: Connect batch action callback (`onBatchAction`), handle tab switching to clear selections across queues.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/_components/action-queue.test.tsx`: Unit tests verifying column generation, row selection, header toggle, and toolbar behavior.

## Implementation Tasks

- [x] Task 1 — Extend `getActionQueueColumns` in `action-queue-columns.tsx`:
  - Add `isSelectable?: boolean` to `ActionQueueColumnsArgs`.
  - When `isSelectable` is true, prepend a `select` column with header checkbox (`table.getIsAllPageRowsSelected()`, indeterminate state `table.getIsSomePageRowsSelected()`) and row checkbox (`row.getIsSelected()`).
  - Set `enableSorting: false` and `enableHiding: false` on the select column.
- [x] Task 2 — Implement Row Selection & Batch Toolbar in `ActionQueuePanel`:
  - Add state `rowSelection: Record<string, boolean>` initialized to `{}`.
  - Pass `rowSelection`, `onRowSelectionChange={setRowSelection}`, and `getRowId={(row) => row.studentId}` to `DataTable`.
  - Compute `selectedItems = items.filter(item => rowSelection[item.studentId])`.
  - When `selectedItems.length > 0`, render a prominent batch toolbar above the table:
    - Button: `Grant ${actionLabel} (${selectedItems.length})` (variant default/primary).
    - Button: `Clear Selection` (variant ghost/outline) which resets `rowSelection` to `{}`.
  - Reset `rowSelection` when page changes or search/section filter changes.
- [x] Task 3 — Update `ActionQueueView` to Coordinate Selection and Tabs:
  - Add `onBatchAction?: (items: ExamReportActionItem[]) => void` wiring to `ActionQueuePanel`.
  - Add `key={activeQueue}` to `ActionQueuePanel` ensuring state isolation and immediate reset on tab switch.
  - Set `isSelectable={true}` for `makeup` and `retake` queues, and `isSelectable={false}` for `review`.

## Verification & Testing

- Automated Test: `pnpm --filter sentinel-web test src/app/\(protected\)/\(instructor\)/exams/reports/\[examId\]/_components/action-queue.test.tsx`
  - Result: 5/5 tests passed.
  - Coverage:
    - `omits select column when isSelectable is false or undefined` (PASS)
    - `includes select column when isSelectable is true` (PASS)
    - `renders empty queue message when items list is empty` (PASS)
    - `renders student rows and allows selecting students for batch actions` (PASS)
    - `selects all rows when header checkbox is clicked` (PASS)
- Type check: zero type errors in `action-queue-columns.tsx`, `action-queue-panel.tsx`, or `action-queue-view.tsx`.

## Risks & Rollback

- Risk: TanStack Table pagination might retain row selection unexpectedly across pages if keying is misconfigured.
  - Mitigation: Explicit `getRowId={(row) => row.studentId}` and clear on filter/tab change.
- Rollback: Revert `action-queue-columns.tsx` and `action-queue-panel.tsx` to omit the select column.
