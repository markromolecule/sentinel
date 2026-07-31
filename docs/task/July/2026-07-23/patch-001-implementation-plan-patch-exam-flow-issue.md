# Patch Exam Flow Issue Implementation Plan

## Goal

Resolve exam lobby auto-approval, fix live inspection publisher/viewer synchronization when backgrounded, and refine the standalone loading UI spinner during exam state initialization.

---

## Pre-Planning Summary

- **Task Summary**: Ensure student lobby check-in correctly enforces `MANUAL` instructor admission mode, stabilize LiveKit inspection publishing across active/background tab contexts, and elevate the `StudentExamLoadingState` UI with a sleek standalone spinner.
- **Affected DB Tables**: `exam_configurations`, `exam_lobby_admissions`, `exam_live_inspection_leases`.
- **Prisma Migration Required**: No (reusing existing `lobby_admission_mode`, `status`, and `exam_live_inspection_leases` schemas).

---

## Phase 1: Lobby Admission & Configuration Defaults (Fix Auto-Approval)

**Goal:** Ensure exam configuration forms accurately persist `lobby_admission_mode: 'MANUAL'` when instructor approval is configured, and verify backend check-in places students in `WAITING` status.

- [ ] In [`save-exam-configuration.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/configuration/services/save-exam-configuration.service.ts), ensure explicit mapping of `lobbyAdmissionMode` from request payload so `MANUAL` is persisted into `exam_configurations`.
- [ ] In [`build-default-exam-configuration.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/configuration/services/build-default-exam-configuration.service.ts), verify default mode fallback logic respects explicit exam rules.
- [ ] In [`check-in-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts), verify that when `lobby_admission_mode === 'MANUAL'`, check-in inserts or retains status as `WAITING` and does not set `decided_at`.
- [ ] In [`check-in-lobby.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.test.ts), write Vitest unit test asserting `MANUAL` mode results in `WAITING` status while `AUTOMATIC` mode results in `APPROVED`.
- [ ] Run `pnpm --dir app/sentinel-api test` and verify all lobby tests pass.

**Migration required:** No

---

## Phase 2: Live Inspection Publisher & Tab-Focus Synchronization

**Goal:** Prevent live inspection from hanging on `waiting_for_student` by adding active tab-visibility listeners, foreground reconnection triggers, and explicit device availability handling in student publisher hooks.

- [ ] In [`use-live-inspection-publisher.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-live-inspection-publisher.ts), add a `visibilitychange` event listener to re-sync pending inspection requests when the student tab transitions from background to foreground.
- [ ] In [`use-live-inspection-viewer.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-live-inspection-viewer.ts), add explicit timeout/retry handling and informative reason messaging when student publisher response is delayed.
- [ ] Write Vitest unit tests in [`use-live-inspection-publisher.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-live-inspection-publisher.test.tsx) verifying signal polling resumes upon tab visibility regain.
- [ ] Run `pnpm --dir packages/hooks test` and confirm tests pass.

**Migration required:** No

---

## Phase 3: Exam Flow Loading UI Refinement

**Goal:** Provide an engaging, modern, standalone multi-ring animated spinner without box wrappers for `StudentExamLoadingState`.

- [ ] In [`student-exam-loading-state.tsx`](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-loading-state.tsx>), render a standalone, centered multi-ring spinner with animated pulse/ring elements and styled typography.
- [ ] Write unit test [`student-exam-loading-state.test.tsx`](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/_components/student-exam-loading-state.test.tsx>) asserting loading text and spinner elements render cleanly without outer card containers.
- [ ] Run `pnpm --dir app/sentinel-web test` to verify frontend tests pass.

**Migration required:** No

---

## Done Criteria

- [ ] All checkboxes in the execution log are marked `- [x]`
- [ ] Every new or modified file matches the plan's specified paths
- [ ] `checkInLobby` correctly keeps student in `WAITING` status under `MANUAL` admission mode
- [ ] Live inspection publisher recovers and connects when tab visibility changes
- [ ] `StudentExamLoadingState` renders the updated standalone spinner without box containers
- [ ] All Vitest tests pass across `sentinel-api`, `packages/hooks`, and `sentinel-web`
