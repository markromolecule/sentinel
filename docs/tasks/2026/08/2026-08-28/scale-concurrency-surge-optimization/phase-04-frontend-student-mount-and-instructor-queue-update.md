---
title: "Phase 4: Web & Mobile Student Mount Hook Migration & Instructor Lobby Submitted Column"
type: phase
parent: "scale-concurrency-surge-optimization"
phase: "4"
status: completed
created: "2026-08-28"
tags: [task, phase, frontend, web, mobile, student-lobby, instructor-lobby]
---

# Phase 4: Web & Mobile Student Mount Hook Migration & Instructor Lobby Submitted Column

## Objective

Migrate student lobby mount handlers in **`sentinel-web`**, **`sentinel-mobile`**, and **`sentinel-core`** to adopt the single `POST /lobby/bootstrap` endpoint on mount (eliminating the 5-request waterfall across both platforms), pass student ID into Realtime hooks, and implement the instructor lobby `Submitted` column filter (`attemptStatus === 'SUBMITTED'`).

---

## Dependencies & Prerequisites

- Phase 2 (Bootstrap endpoint) and Phase 3 (Consolidated Realtime) completed.

---

## Impacted Files & Components

1. **[`packages/hooks/src/query/exams/use-exam-lobby-bootstrap-mutation.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-lobby-bootstrap-mutation.ts)** [NEW]
   - Mutation/query hook that invokes `bootstrapExamLobby` and populates the TanStack Query cache for exam, config, and admission status simultaneously.

2. **[`packages/hooks/src/query/exams/use-exam-lobby-bootstrap-mutation.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-lobby-bootstrap-mutation.test.ts)** [NEW]
   - Unit test verifying cache updates for details, configuration, admission, and count.

3. **[`app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts)**
   - Replaced the waterfall `useEffect` check-in & refetches with the single bootstrap call.
   - Seeded query cache with returned metadata.

4. **[`app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts)**
   - Replaced the `checkIntoExamLobby` + 3-query refetch waterfall with `useExamLobbyBootstrapMutation`.
   - Passed `studentId: authSession?.user?.id` into `useLobbyRealtime` so student clients ignore other students' admission updates.
   - Consolidated presence tracking into the unified channel `lobby:${id}`.

5. **[`app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_lib/lobby-admission-filters.ts)**
   - Grouped students with `attemptStatus === 'SUBMITTED'` into `submittedStudents`.
   - Updated `approvedStudents` to exclude students who have submitted.

6. **[`app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx)**
   - Rendered the `Submitted` column UI card.

7. **`app/sentinel-core` matching files**
   - Applied the same filter and panel updates for parity.

---

## Implementation Tasks

- [x] **Task 4.1 — Create `useExamLobbyBootstrapMutation` in `@sentinel/hooks`**
  - Implement hook calling `bootstrapExamLobby`.
  - On success, populate query cache for `EXAM_QUERY_KEYS.details(examId)`, `EXAM_QUERY_KEYS.configuration(examId)`, and `EXAM_QUERY_KEYS.lobbyAdmissionStatus(examId)`.

- [x] **Task 4.2 — Refactor Web `use-lobby-state.ts` to Use Bootstrap**
  - Trigger bootstrap mutation once on mount.
  - Eliminate the separate `checkIntoExamLobby` $\rightarrow$ `refetchAdmissionStatus` $\rightarrow$ `refetchExam` waterfall.

- [x] **Task 4.3 — Refactor Mobile `use-exam-lobby.ts` to Use Bootstrap & Filtered Realtime**
  - Replace lines 155–175 with bootstrap mutation.
  - Pass `studentId: authSession?.user?.id` to `useLobbyRealtime`.
  - Merge presence tracking to unified channel.

- [x] **Task 4.4 — Implement `Submitted` Column in Instructor Lobby Filters**
  - In `lobby-admission-filters.ts`, define `submittedStudents` (`status === 'APPROVED' && attemptStatus === 'SUBMITTED'`).
  - Update `approvedStudents` definition to exclude students who have submitted.
  - Update unit tests in `lobby-admission-filters.test.ts`.

- [x] **Task 4.5 — Update Instructor UI Panel Components**
  - Render the dedicated `Submitted` column card in `instructor-lobby-admission-panel.tsx` across `sentinel-web` and `sentinel-core`.

---

## Verification & Testing

```bash
# 1. Test bootstrap mutation in @sentinel/hooks
pnpm --filter @sentinel/hooks exec vitest run src/query/exams/use-exam-lobby-bootstrap-mutation.test.ts
# Output: PASS (1/1 test)

# 2. Test student lobby page and hooks (Web)
pnpm --filter sentinel-web exec vitest run 'src/app/(protected)/student/exam/[id]/lobby'
# Output: PASS (38/38 tests)

# 3. Test mobile exam lobby (Mobile)
pnpm --filter sentinel-mobile exec vitest run features/exam/hooks/use-exam-lobby.test.ts
# Output: PASS (4/4 tests)

# 4. Test instructor lobby filters and components (Web & Core)
pnpm --filter sentinel-web exec vitest run 'src/app/(protected)/(instructor)/exams/[id]/lobby'
# Output: PASS (24/24 tests)
pnpm --filter sentinel-core exec vitest run 'src/app/(protected)/exams/[id]/lobby'
# Output: PASS (20/20 tests)
```

---

## Risks & Rollback

- **Risk:** Discrepancy between Web and Mobile state synchronization.
  - **Mitigation:** Both platforms use the shared `@sentinel/hooks` bootstrap mutation and `@sentinel/services` client contracts.

