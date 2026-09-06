---
title: "Phase 3: Real-Time Broadcast Subscription in Student Monitoring Detail"
type: phase
parent: "fix-lobby-reentry-result-score-student-progress"
phase: "03"
status: completed
created: "2026-09-06"
tags: [task, phase, realtime, monitoring, instructor, progress]
---

# Phase 3: Real-Time Broadcast Subscription in Student Monitoring Detail

## Objective

Connect the single-student monitoring detail view to the ephemeral Supabase Realtime broadcast channel (`exam:${examId}:monitoring`) to display live student progress (<50ms latency) without database queries or WAL load.

## Dependencies & Prerequisites

- `useMonitoringRealtime` available in `@sentinel/hooks`.
- Student exam client broadcasting `student:progress` and `student:submitted` events.

## Impacted Files & Components

- [`app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/[studentId]/page.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/monitoring/%5BstudentId%5D/page.tsx): Add `useMonitoringRealtime` subscription and local state merge.
- [`app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/[studentId]/page.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/monitoring/%5BstudentId%5D/page.test.tsx): Add test asserting live progress and submission updates from broadcast events.

## Implementation Tasks

- [x] **Task 3.1 (Wire Real-time Broadcast in `StudentMonitoringPage`):**
  - In `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/[studentId]/page.tsx`:
  - Import `useMonitoringRealtime`, `type StudentProgressPayload`, `type StudentSubmittedPayload` from `@sentinel/hooks`.
  - Maintain local state:

    ```tsx
    const [liveProgress, setLiveProgress] = useState<number | null>(null);
    const [isLiveSubmitted, setIsLiveSubmitted] = useState<boolean>(false);
    ```

  - Subscribe via `useMonitoringRealtime`:

    ```tsx
    useMonitoringRealtime({
        examId,
        onProgressUpdate: useCallback((payload: StudentProgressPayload) => {
            if (
                payload.studentId === studentId ||
                payload.studentId === student?.id ||
                payload.studentId === student?.studentRecordId
            ) {
                setLiveProgress(payload.progress);
            }
        }, [studentId, student?.id, student?.studentRecordId]),
        onStudentSubmitted: useCallback((payload: StudentSubmittedPayload) => {
            if (
                payload.studentId === studentId ||
                payload.studentId === student?.id ||
                payload.studentId === student?.studentRecordId
            ) {
                setIsLiveSubmitted(true);
            }
        }, [studentId, student?.id, student?.studentRecordId]),
    });
    ```

  - Merge into effective student object:

    ```tsx
    const effectiveStudent = useMemo(() => {
        if (!student) return student;
        return {
            ...student,
            progress: isLiveSubmitted ? 100 : liveProgress ?? student.progress,
            status: isLiveSubmitted ? (student.status === 'flagged' ? 'flagged' : 'submitted') : student.status,
        };
    }, [student, liveProgress, isLiveSubmitted]);
    ```

  - Pass `effectiveStudent` to `StudentMonitoringDetail`.

- [x] **Task 3.2 (Unit & Component Verification Tests):**
  - Create or extend `page.test.tsx` for `StudentMonitoringPage`:
    - Mock `useMonitoringRealtime`.
    - Verify that triggering `onProgressUpdate` with the matching student ID updates `student.progress` in `StudentMonitoringDetail`.
    - Verify that triggering `onStudentSubmitted` updates status and sets progress to 100%.

## Verification & Testing

- Run test suite:

  ```bash
  pnpm --dir app/sentinel-web test src/app/\(protected\)/\(instructor\)/exams/\[id\]/monitoring/\[studentId\]
  ```

## Risks & Rollback

- **Risk:** None; Supabase Realtime channel is ephemeral and gracefully degrades to existing 8-second polling if disconnected.
- **Rollback:** Remove `useMonitoringRealtime` from `StudentMonitoringPage`.
