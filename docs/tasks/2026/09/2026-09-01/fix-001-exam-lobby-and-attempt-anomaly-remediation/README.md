---
title: "Fix: Exam Lobby Synchronization, Admission State, and Attempt Anomaly Remediation"
type: task
status: completed
created: "2026-09-01"
tags: [task, fix, examination, lobby, telemetry]
---

# Fix: Exam Lobby Synchronization, Admission State, and Attempt Anomaly Remediation

## Outcome

Resolve 5 proctoring runtime issues across exam lobbies and attempt sessions:

1. Student lobby counter accurately reflects only active waiting/approved students without inflation.
2. Instructor lobby synchronization in production functions seamlessly with **Zero Polling** by fixing the Supabase Realtime broadcast topic prefix (`realtime:lobby:${examId}`).
3. Student and instructor lobby reconnect counters remain in sync.
4. Submitted students strictly partition into the `Submitted` column on the instructor lobby.
5. Screenshot attempt anomaly emits exactly one incident event per action and displays a dedicated in-attempt warning dialog inside fullscreen.

## Pre-planning record

### Context Reference

- [`docs/context/September/1/exam-lobby-and-attempt-anomaly-remediation.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/September/1/exam-lobby-and-attempt-anomaly-remediation.md)

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
| --- | --- | --- | --- | --- | --- |
| SC-01 | Single student enters lobby | Gated exam, student checks in | Lobby count shows "1 student"; instructor sees student in "Waiting" via Realtime broadcast (<50ms). | Realtime broadcast delivers to `realtime:lobby:...` | Completed |
| SC-02 | Instructor visits lobby page | 1 student in lobby | Student lobby counter remains "1 student" (instructor presence excluded). | Student counter stays accurate | Completed |
| SC-03 | Student submits exam attempt | Attempt active, student submits | Student appears in "Submitted" column on instructor lobby; excluded from "Approved" & lobby count. | Queue partitions accurately | Completed |
| SC-04 | Returning student in lobby | Student used 1 of 3 reconnects | Student lobby badge shows "1 used • 2 left"; instructor shows "1/3 reconnects". | Identical count across roles | Completed |
| SC-05 | Student takes screenshot in attempt | Student on attempt page in fullscreen | Emits exactly 1 `PRINT_SCREEN_ATTEMPT` event; displays Screenshot Incident Dialog; locks exam until acknowledged. | Single incident recorded | Completed |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
| --- | --- | --- | --- | --- | --- |
| D-01 | How should submitted students be handled in lobby queries? | Exclude from active lobby count; partition into `Submitted` column. | Submitted students are finished with the exam. | Keeping them in approved queue. | `docs/context/September/1/exam-lobby-and-attempt-anomaly-remediation.md` |
| D-02 | How to ensure instructor lobby sync in production? | **Pure Supabase Realtime Broadcast (Zero Polling):** Fix REST broadcast topic to `realtime:lobby:${examId}`. | Eliminates background database traffic and connection pool saturation while streaming instant live updates. | Polling intervals (can cause performance regressions during surges). | `docs/context/September/1/exam-lobby-and-attempt-anomaly-remediation.md` |
| D-03 | How should screenshot anomaly notify student? | In-attempt Screenshot Incident Dialog inside fullscreen container + security lock. | Visible in fullscreen mode with explicit confirmation. | Root toast only (hidden by fullscreen). | `docs/context/September/1/exam-lobby-and-attempt-anomaly-remediation.md` |

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| AC-01 | SC-01, SC-02 | Lobby count shows 1 student for 1 waiting user | Backend `getLobbyCount` distinct active filter + instructor presence exclusion | `get-lobby-count.test.ts` | Completed |
| AC-02 | SC-01, D-02 | Instructor lobby receives check-in within <50ms with 0 polling | `broadcast-lobby-event.ts` `realtime:` topic prefix + `useLobbyRealtime` | `broadcast-lobby-event.test.ts` | Completed |
| AC-03 | SC-04 | Reconnect count synchronized between student and instructor | `evaluateStudentExamEligibility` & `useLobbyState` sync | `evaluate-student-exam-eligibility.test.ts` | Completed |
| AC-04 | SC-03, D-01 | Submitted students partitioned into Submitted column | `getWaitingList` lifecycle selection + `lobby-admission-filters.ts` | `lobby-admission-filters.test.ts` | Completed |
| AC-05 | SC-05, D-03 | Screenshot triggers exactly 1 event and opens in-attempt dialog | Debounce sharing in listeners + `ScreenshotIncidentDialog` component | `use-exam-monitoring.test.ts` | Completed |

## Phases

- [x] `phase-01-backend-lobby-queries-and-status-partitioning.md` — Backend queries and status classification
- [x] `phase-02-instructor-lobby-sync-and-presence-resiliency.md` — Instructor lobby Realtime broadcast topic fix and presence cleanup
- [x] `phase-03-student-reconnect-count-synchronization.md` — Reconnect count sync across student and instructor
- [x] `phase-04-screenshot-anomaly-deduplication-and-warning-dialog.md` — Screenshot telemetry deduplication and incident warning dialog




