---
title: "Fix Exam Result Score Inconsistency, Lobby Re-entry Actions, and Real-Time Student Progress Tracking"
type: task
status: completed
created: "2026-09-06"
tags: [task, scoring, lobby, reentry, progress, realtime, monitoring]
---

# Fix Exam Result Score Inconsistency, Lobby Re-entry Actions, and Real-Time Student Progress Tracking

## Outcome

Eliminate post-turn-in score jump discrepancies between pre-submission preview and final score snapshot, strictly gate lobby admission actions so reconnecting students show exclusively "Authorize Re-entry", provide low-latency (<50ms) real-time student progress updates on the instructor monitoring detail view, and ensure student attempt background sync recovers cleanly from temporary lockouts.

## Pre-planning record

- Context Specification: [`docs/context/September/6/fix-lobby-reentry-result-score-student-progress.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/September/6/fix-lobby-reentry-result-score-student-progress.md) (`status: ready`).

### Actors and goals

- **Student:** Sees a transparent and consistent score on `/student/exam/[id]/result` that does not suddenly jump from `2/8` (25%) to `5/8` (63%) when clicking "Turn In". On attempt re-entry, student answers continue saving reliably to the database.
- **Instructor (Exam Lobby):** In `/exams/[id]/lobby`, clearly distinguishes students reconnecting to an existing attempt (showing exclusively `Authorize Re-entry`) from first-time admissions (showing `Admit` and `Reject`).
- **Instructor (Exam Monitoring Detail):** In `/exams/[id]/monitoring/[studentId]`, observes live student progress updating in real-time as answers are selected, with zero database polling load and zero lag.

### Domain language

- **Turn-In Preview (`prepareSession`):** Pre-submission score calculation on `/result` confirming answered questions, auto-graded points, and rubric pre-scores.
- **Session Completion (`completeSession`):** Final submission boundary persisting attempt evaluations, IRT triggers, and score snapshot.
- **Deterministic Rubric Pre-Scoring (`evaluateEssayWithRubric`):** In-memory heuristic essay evaluation assigning Levels 0–4 per rubric criterion without external AI calls.
- **Lobby Re-entry Gating:** Differentiating students with active/locked attempts requiring re-entry authorization (`needsReentry`) from fresh joiners.
- **Monitoring Realtime Broadcast:** Ephemeral Supabase Realtime channel `exam:${examId}:monitoring` publishing lightweight `student:progress` events (<50ms, 0 DB queries).

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
| --- | --- | --- | --- | --- | --- |
| SC-01 | Student turns in exam with essay responses | Student on `/result` reviewing auto-graded + essay score | Pre-turn-in score (`5/8`) identically matches post-turn-in score; no sudden score jumps | If answers change, preparation token invalidates and re-prepares | Planned |
| SC-02 | Instructor reviews waiting students in exam lobby | Student with active attempt or lockout is in waiting queue | Student card renders ONLY `Authorize Re-entry` button; `Admit` and `Reject` are omitted | Fallback to refresh query if mutation fails | Planned |
| SC-03 | Instructor reviews fresh student in exam lobby | Student joining exam for first time | Student card renders `Admit` and `Reject` buttons; `Authorize Re-entry` is omitted | Standard admission update flow | Planned |
| SC-04 | Instructor monitors specific student detail view | Student answering questions in active attempt | Student detail card updates progress bar & percentage in real time (<50ms) via broadcast | 8s React Query polling acts as network fallback | Planned |
| SC-05 | Student resumes exam after re-entry authorization | Student was previously locked out (409 on sync) and resumed | Sync coordinator unblocks; debounced PostgreSQL saves resume updating `answered_question_count` | Local answer draft preserved in localStorage | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
| --- | --- | --- | --- | --- | --- |
| DEC-01 | Should essay pre-scoring run during `prepareSession`? | Yes, execute identical `evaluateEssayWithRubric` and pass `evaluations` into `buildScoreSnapshot`. | Eliminates score mismatch between `/result` preview and `completeSession`. | Leaving prepare un-evaluated (causes confusing score jumps). | [`prepare-session.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/flow/services/prepare-session.service.ts) |
| DEC-02 | Which buttons should render for reconnecting students in lobby? | Option A: Exclusively render `Authorize Re-entry`; completely omit `Admit` and `Reject`. | Explicit user selection; ensures instructors do not accidentally treat re-entries as standard first-time admissions. | Option B: Keeping `Reject` alongside `Authorize Re-entry`. | [`instructor-lobby-admission-panel.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/lobby/_components/instructor-lobby-admission-panel.tsx) |
| DEC-03 | How should student detail monitoring receive real-time updates? | Subscribe to existing `exam:${examId}:monitoring` broadcast channel using `useMonitoringRealtime`. | Delivers instant UI responsiveness without triggering PostgreSQL queries or WAL write amplification. | Heavy database polling or CDC subscriptions. | [`[studentId]/page.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/monitoring/%5BstudentId%5D/page.tsx) |
| DEC-04 | How to recover student HTTP sync after re-entry authorization? | Reset `isTerminallyBlockedRef` and `localBlockedMessage` upon active session resumption. | Allows debounced sync to resume updating `answered_question_count` in DB without getting permanently blocked by prior 409. | Requiring full page reload by student. | [`use-attempt-sync-coordinator.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/student/exam/%5Bid%5D/attempt/_hooks/use-student-exam-attempt/use-attempt-sync-coordinator.ts) |

### Unknowns and blockers

- None. All root causes and contracts have been verified directly in the codebase.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| AC-01 | SC-01 / DEC-01 | `prepareSessionService` evaluates essay responses using `evaluateEssayWithRubric` and includes them in `scoreSnapshot`. | [`prepare-session.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/flow/services/prepare-session.service.ts) | Unit test in `prepare-session.service.test.ts` asserts identical score to complete-session | Completed |
| AC-02 | SC-02 / SC-03 / DEC-02 | Waiting student cards render ONLY `Authorize Re-entry` if `needsReentry`, and `Admit`/`Reject` otherwise. | [`instructor-lobby-admission-panel.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/lobby/_components/instructor-lobby-admission-panel.tsx) | Vitest in `instructor-lobby-admission-panel.test.tsx` verifies button counts | Completed |
| AC-03 | SC-04 / DEC-03 | Student detail monitoring page subscribes to `useMonitoringRealtime` and updates progress bar live. | [`[studentId]/page.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/monitoring/%5BstudentId%5D/page.tsx) | Component test verifying live progress update on broadcast event | Completed |
| AC-04 | SC-05 / DEC-04 | Client sync coordinator unblocks terminal state on session resumption after re-entry. | [`use-attempt-sync-coordinator.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/student/exam/%5Bid%5D/attempt/_hooks/use-student-exam-attempt/use-attempt-sync-coordinator.ts) | Vitest in `use-attempt-sync.test.tsx` verifying sync resumes after 409 recovery | Completed |

## Scope

- Pre-scoring parity in `prepareSessionService`.
- Conditional rendering of lobby waiting queue buttons according to `needsReentry`.
- Subscribing `StudentMonitoringPage` to `useMonitoringRealtime`.
- Unblocking client sync coordinators upon attempt resumption.

## Non-goals

- Altering rubric grading heuristics, weights, or level definitions.
- Changing instructor manual grading override mechanics.
- Modifying student lobby check-in or presence channel architecture.

## Constraints and decisions

- Zero extra PostgreSQL query load: Real-time progress updates must rely on ephemeral Supabase Realtime Broadcast.
- Option A strictly enforced: Reconnecting students must not show Admit or Reject buttons.

## Phases

- [x] `phase-01-result-score-snapshot-parity.md` — Phase 1: Essay rubric pre-scoring integration in `prepareSessionService`
- [x] `phase-02-exam-lobby-reentry-action-gating.md` — Phase 2: Conditional action button rendering in exam lobby
- [x] `phase-03-realtime-student-monitoring-detail-progress.md` — Phase 3: Real-time broadcast subscription in student monitoring detail
- [x] `phase-04-sync-coordinator-lockout-recovery.md` — Phase 4: Client sync coordinator unblocking upon attempt resumption

## Verification

- `pnpm --dir app/sentinel-api test src/modules/examination/flow`
- `pnpm --dir app/sentinel-web test src/app/\(protected\)/\(instructor\)/exams/\[id\]/lobby`
- `pnpm --dir app/sentinel-web test src/app/\(protected\)/\(instructor\)/exams/\[id\]/monitoring`
- `pnpm --dir app/sentinel-web test src/app/\(protected\)/student/exam/\[id\]/attempt`

## Deviations

- None.

## Result

- Completed successfully with all test suites passing.
