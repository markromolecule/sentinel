# Task: Lobby Network Optimization & Submitted Status

**ID:** `task-lobby-network-optimization`  
**Date:** 2026-08-27  
**Status:** ✅ Completed & Verified  
**Target Environment:** Railway Hobby + Supabase Free Tier  

---

## 1. Overview & Objectives

Eliminated the $O(N^2)$ network traffic amplification storm occurring when students enter the exam lobby, while improving the instructor lobby UX to display a dedicated `Submitted` status column for students who have turned in their exams.

---

## 2. Implemented Changes

- **Phase 1: Realtime Broadcast & Query Fixes in `@sentinel/hooks`**
  - Gated `callbackRef` strictly inside `if (isTargetStudent)` in `use-lobby-realtime.ts`.
  - Suppressed instructor query invalidations on student-side clients.
  - Relaxed polling fallback in `use-exam-lobby-admission-status-query.ts` from 3s to 10s.

- **Phase 2: Student Lobby Call Site & UI Effect Cleanup**
  - Passed `session.user.id` into `useLobbyRealtime` in `use-lobby-state.ts`.
  - Removed redundant `refetchLobbyCount` effect cascade in `StudentExamLobbyPage`.

- **Phase 3: Instructor Lobby Submitted Queue & Filters**
  - Updated `lobby-admission-filters.ts` in `sentinel-web` and `sentinel-core` to replace `rejectedStudents` with `submittedStudents` (`attemptStatus === 'SUBMITTED'`).
  - Updated `instructor-lobby-admission-panel.tsx` with `Submitted` column UI and status dropdowns.
  - Updated unit and integration tests across both frontend applications.

- **Phase 4: Verification & Automated Regression Suite**
  - Vitest test suites across `@sentinel/hooks` (188 tests), `sentinel-web` (62 tests), `sentinel-core` (20 tests), and `sentinel-api` (26 tests) all passed cleanly.

---

## 3. Acceptance Verification

1. ✅ **Zero Cross-Student Invalidation**: Non-target students ignore broadcast events and execute 0 extra HTTP requests.
2. ✅ **Instant Admission Push**: Admitted students receive sub-50ms admission status updates via Supabase Broadcast.
3. ✅ **Reduced Railway Baseline Load**: 40 students waiting in the lobby generate ~4 req/s (10s interval) instead of ~13+ req/s continuous.
4. ✅ **Submitted Column Visibility**: Students who turn in their attempt appear in the instructor lobby's `Submitted` column.

---

## 4. Documentation & Analysis Artifacts

- [Discovery Record](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-27/lobby-network-optimization/DISCOVERY.md)
- [Performance Comparison & Metrics Report](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-27/lobby-network-optimization/COMPARISON_AND_METRICS.md)
