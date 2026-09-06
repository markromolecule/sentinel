---
title: "Phase 3: Zero-DB Real-Time Monitoring Progress Broadcast"
type: phase
parent: "monitoring-counts-essay-prescoring-progress-accuracy"
phase: "03"
status: planned
created: "2026-09-06"
tags: [task, phase, realtime, supabase, monitoring, progress]
---

# Phase 3: Zero-DB Real-Time Monitoring Progress Broadcast

## Objective

Implement an ultra-low-latency (<50ms) real-time student progress update mechanism for the instructor monitoring page using ephemeral Supabase Realtime Broadcast, eliminating PostgreSQL polling load and WAL overhead.

## Dependencies & Prerequisites

- Phase 1 (Monitoring response mapping and lifecycle status accuracy).

## Impacted Files & Components

- [`packages/hooks/src/use-monitoring-realtime.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/use-monitoring-realtime.ts): New hook subscribing to `exam:${examId}:monitoring` broadcast channel for live student progress and turn-in events.
- [`app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/index.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/index.ts): Integrate `useMonitoringRealtime` to update local student progress and counts instantaneously.
- [`app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync.ts): Broadcast lightweight progress events when answers change.
- [`app/sentinel-mobile/features/exam/hooks/use-exam-session-sync.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-session-sync.ts): Broadcast lightweight progress events on mobile.
- [`app/sentinel-api/src/modules/examination/flow/data/_mutations/attempt-mutations.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/flow/data/_mutations/attempt-mutations.ts): Ensure `insertNewAttempt` initializes `answered_question_count: 0` (preventing `null` calculation pitfalls).

## Implementation Tasks

- [ ] **Task 3.1 (Broadcast Hook for Instructor Monitoring):**
  - Create `useMonitoringRealtime({ examId, onProgressUpdate, onStudentSubmitted })` in `packages/hooks/`.
  - Channel name: `exam:${examId}:monitoring`.
  - Listens to:
    1. `broadcast` event `student:progress` with payload: `{ studentId: string, answeredCount: number, totalQuestions: number, progress: number }`.
    2. `broadcast` event `student:submitted` with payload: `{ studentId: string, submittedAt: string }`.
- [ ] **Task 3.2 (Student Progress Broadcaster):**
  - In `use-attempt-sync.ts` (Web) and `use-exam-session-sync.ts` (Mobile):
  - When the student selects/changes an answer, alongside the existing local draft save and debounced remote HTTP sync, trigger:

    ```ts
    monitoringChannel.send({
        type: 'broadcast',
        event: 'student:progress',
        payload: { studentId, answeredCount, totalQuestions, progress },
    });
    ```

  - This is a non-blocking WebSocket broadcast taking <50ms and incurring zero database writes or locks.
- [ ] **Task 3.3 (Instructor UI Local State Merge):**
  - In `use-monitoring`, maintain an in-memory map of live progress overrides: `liveProgressMap: Record<string, number>`.
  - Merged student item computes `progress = liveProgressMap[student.id] ?? student.progress`.
  - When `student:submitted` is received, immediately mark the student as submitted and bump `stats.submitted` without waiting for the 6-second query refetch.
- [ ] **Task 3.4 (DB Initialization Sanity):**
  - In `insertNewAttempt` (`attempt-mutations.ts`), set `answered_question_count: 0` explicitly on attempt creation.

## Verification & Testing

- Unit tests for `useMonitoringRealtime`.
- Integration test simulating student progress broadcasts and asserting UI update without network refetch.
- Verify zero extra rows in PostgreSQL `pg_stat_statements` or WAL logs during active student broadcasts.

## Risks & Rollback

- **Low Risk:** Realtime broadcast is purely enhancement layer; if WebSocket disconnects, the existing 6-second HTTP polling acts as a continuous safety fallback.
- **Rollback:** Disable broadcast sending in `use-attempt-sync.ts`.
