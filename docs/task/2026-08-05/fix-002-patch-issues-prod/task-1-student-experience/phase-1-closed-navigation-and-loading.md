# Task 1 — Phase 1: Closed-Attempt Navigation and Loading States

**Status:** Planned  
**Parent plan:** `docs/task/2026-08-05/fix-002-implementation-plan-patch-issues-prod.md`  
**Source issues:** Issue 1 and Issue 5 in `docs/context/August/4/patch-issues-prod.md`

## Goal

Give students a safe classroom return action after an attempt is closed and standardize student
loading states around the existing spinner/text pattern.

## Analysis

The server already exposes `CLOSED` lifecycle state and terminal messaging. The likely defect is in
the student attempt terminal rendering or loss of classroom context, while the confirmed loading
defect is `exam-loading.tsx`, which renders text in a full-screen wrapper instead of using the existing
`StudentExamLoadingState` pattern.

## Options

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Add a router action directly to the closed terminal branch and replace each identified
  boxed loading component with `Loader2` plus text.
- **Tradeoff:** Fastest, but duplicate loading markup can reappear on future student pages.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Add a reusable student loading primitive and a single terminal destination resolver
  that uses classroom context with `/student/classroom` fallback.
- **Tradeoff:** Adds a small shared abstraction and requires broader student-page regression coverage.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Redirect all terminal attempts through a server-resolved classroom route and use a
  global student route-level loading boundary.
- **Tradeoff:** Couples route-level navigation and loading behavior to server-rendering boundaries.

## Execution

**Recommendation:** Option B.

1. Confirm the actual closed-attempt component and the available classroom identifier in
   `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.tsx` and
   `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-active-attempt-lifecycle.ts`.
2. Add the closed-state return action and destination fallback in the owning terminal-state component;
   keep `CLOSED`, `LOCKED`, `SUBMITTED`, and `COMPLETED` behavior distinct.
3. Reuse or extract the spinner/text layout from
   `app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-loading-state.tsx`.

## Checklist

- [ ] Trace the closed-attempt render branch in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/page.tsx` and identify the exact terminal component.
- [ ] Trace classroom context from the student exam data/session types to determine whether `classroomId` is already available; do not add a query parameter until this is confirmed.
- [ ] Add `Return to classroom` navigation in the closed terminal component using `useRouter` or the existing route helper; use `/student/classroom` only as a safe fallback.
- [ ] Add/extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-active-attempt-lifecycle.test.tsx` to cover the closed state and ensure no resume/submit action is exposed.
- [ ] Replace the wrapper in `app/sentinel-web/src/app/(protected)/student/exam/details/_components/exam-loading.tsx` with the standard spinner/text layout or a reusable student loading primitive.
- [ ] Audit loading branches under `app/sentinel-web/src/app/(protected)/student/` for the old boxed/text-only pattern and update only the student pages in scope.
- [ ] Add or extend loading assertions in the affected student page tests; verify accessible spinner/status text.
- [ ] Run focused tests for the attempt lifecycle and student exam/detail components.
      **Migration required:** No — this phase changes student routing/rendering only; existing attempt and classroom schema is sufficient.

## Completion Gate

- [ ] Closed-attempt UI has a tested classroom return path and does not permit an invalid resume.
- [ ] Student loading states in scope render spinner plus text without the old box wrapper.
- [ ] Focused Vitest tests pass and results are recorded here.
- [ ] Production smoke test passes for a manually closed attempt and an exam-details loading state.
