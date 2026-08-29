---
title: "Fix Exam System Production Issues"
type: task
status: planned
created: "2026-08-28"
tags: [task, exam, bugfix, scoring-integrity, session-management, lifecycle, monitoring, ui-ux]
context: "docs/context/August/28/exam-system-production-issues-remediation.md"
---

# Fix Exam System Production Issues (ISSUE-01 to ISSUE-09)

## Outcome

Resolve 9 critical production and operational issues across the examination pipeline, ensuring 100% deterministic grading on randomized exams, eliminating false maximum-attempt lockouts, delivering immediate post-submission confirmation, enabling batch group make-up exams on parent entities, and fixing monitoring and UI/UX report glitches.

## Pre-planning record

### Actors and goals

- **Student:** Experience reliable exam starts without false lockouts, have answers graded accurately regardless of choice order, and receive immediate post-submission confirmation receipts.
- **Instructor:** Monitor accurate live counts, unlock/reopen locked student sessions with 1 click, provision batch make-up exams without duplicating exam entities, and search report tables smoothly.

### Scenario coverage

| ID | Actor & Situation | Preconditions | Expected Outcome | Failure / Recovery | Status |
| --- | --- | --- | --- | --- | --- |
| SC-01 | Student submits randomized exam with prefix labels | Choices shuffled, labels like `(A)` | Answer matches option token/text and evaluates to correct key | Fallback to sanitized text match | Planned |
| SC-02 | Student starts first attempt or reconnects after Wi-Fi drop | `maxReconnectAttempts` config = 0 | Session resumes or starts cleanly without 403 lockout | Idempotent resume request id | Planned |
| SC-03 | Student turns in final exam | Exam submitted with status `COMPLETED` | UI shows `/result` confirmation screen, no `[CLOSED]` alert | Suppress `BLOCKED_CLOSED` on completed attempt | Planned |
| SC-04 | Instructor views locked student in monitoring | Student locked out due to network drop | 1-click "Unlock / Extend Window" opens 15m resume window | Invokes `grantReopenAttemptWindow` | Planned |
| SC-05 | Instructor provisions make-up for 5 absent students | 5 students selected in Attempt Summary | Batch `MAKEUP` override created on parent exam; unified grade sheet | Batch transaction rollback on error | Planned |
| SC-06 | Instructor monitors live dashboard | Submissions and lobby arrivals active | "Submitted" counts exam finishes; "Approved" counts lobby | Clean separated stat badges | Planned |
| SC-07 | Instructor clicks Lobby Refresh | Waiting list data fetching | Refresh icon spins with `animate-spin` and disables button | Re-enables upon query settle | Planned |
| SC-08 | Instructor searches Attempt Summary | Types student name and hits Enter | In-place debounced filter updates; no full page reload | `preventDefault()` on Enter | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or Rationale | Alternatives Rejected | Artifact |
| --- | --- | --- | --- | --- | --- |
| DEC-01 | How to prevent choice shuffle grading collisions? | Strip choice prefix letters (`A.`, `(B)`) before shuffle; resolve choices via option tokens & text. | Prevents regex label-index collision where `(B)` mapped to index 1. | Relying purely on array indices | `phase-01` |
| DEC-02 | How to eliminate false max-attempt lockouts? | Fix `countAttempts` and `maxSessionsAllowed` to count only completed attempts; allow initial attempt even if limit is 0. | Prevents HTTP 403 on initial session join. | Bumping default reconnect limit globally without fixing logic | `phase-02` |
| DEC-03 | How to eliminate post-submission `[CLOSED]` alert? | Suppress `BLOCKED_CLOSED` for completed attempts (`status === 'COMPLETED'`) and route to `/result`. | Completed submissions should render positive feedback. | Showing a banner on closed stage | `phase-02` |
| DEC-04 | How to provision group make-up exams without duplicate records? | Batch create `StudentExamAccessOverride` (`overrideType: 'MAKEUP'`) for selected students on parent exam. | Keeps grading uniform and avoids DB entity cloning. | Cloning the `exams` entity | `phase-03` |
| DEC-05 | How to streamline locked student recovery? | Display locked students in Monitoring/Lobby with 1-click reopen action. | Immediate resolution of student lockouts. | Manual database override scripts | `phase-03` |
| DEC-06 | How to correct monitoring counters? | Separate "Submitted" from "Approved" in `monitoring-stats.tsx`. | Eliminates count cross-contamination. | Merging all into one status badge | `phase-04` |
| DEC-07 | How to handle deprecated Force Submit? | Remove `Force Submit` button from `integrity-timeline-card.tsx`. | Clean UX without broken endpoints. | Leaving button disabled | `phase-04` |
| DEC-08 | How to improve Lobby Refresh UX? | Expose `isFetching` in `useInstructorLobby` and animate icon. | Clear visual feedback preventing duplicate clicks. | No loading indicator | `phase-04` |
| DEC-09 | How to prevent Attempt Summary reload on search? | Add `e.preventDefault()` on Enter and debounced client-side filtering. | Smooth, instant search experience. | Full server-side route navigation | `phase-04` |

## Acceptance criteria

| ID | Source | Criterion | Implementation | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| AC-01 | ISSUE-01 | Choice randomization evaluates correctly against answer key regardless of option shuffle or label prefixes | `shuffle-exam.ts` & `score-exam-attempt-answer-resolvers.ts` | Unit tests in `score-exam-attempt.test.ts` | Completed |
| AC-02 | ISSUE-02 | First-time attempt start and reconnects do not throw HTTP 403 maximum attempts reached | `create-session.logic.ts` & `attempt-queries.ts` | Integration test in `session.repository.test.ts` | Completed |
| AC-03 | ISSUE-03 | Submitting an exam navigates to `/result` without showing `[CLOSED]` banner | `_stage-resolver.ts` & `use-student-exam-data.ts` | Component tests in `_stage-resolver.test.ts` | Completed |
| AC-04 | ISSUE-04 / 04b | Group make-up provisions batch overrides on parent exam with uniform grade sheet aggregation | `batch-create-overrides.controller.ts` & `use-exam-report` | API test & report view test | Completed |
| AC-05 | ISSUE-05 | Instructors can view locked students and grant 1-click reopen/unlock | `locked-students-panel.tsx` | Component test | Completed |
| AC-06 | ISSUE-06 | Monitoring stats correctly show "Submitted" for finished exams and "Approved" for lobby admissions | `monitoring-stats.tsx` | Component test | Completed |
| AC-07 | ISSUE-07 | Force Submit button is removed from instructor monitoring integrity card | `integrity-timeline-card.tsx` | Component test | Completed |
| AC-08 | ISSUE-08 | Lobby refresh button spins and disables while data is actively fetching | `lobby/page.tsx` & `use-instructor-lobby.ts` | Component test | Completed |
| AC-09 | ISSUE-09 | Attempt Summary Report search filters in-place without page reload | `attempt-summary-table.tsx` & `DataTable` | Interaction test | Completed |

## Scope

- Complete implementation and automated regression testing across all 9 issues.
- Backend API endpoints, shared scoring libraries, and frontend instructor/student views in `sentinel-web` and `sentinel-core`.

## Non-goals

- Modifying core database schema tables or altering unrelated grading rubrics.
- Redesigning entire question bank authoring workflows.

## Phases

- [x] `phase-01-choice-randomization-and-scoring-integrity.md` — Phase 1: Choice Randomization & Scoring Integrity (ISSUE-01)
- [x] `phase-02-session-lifecycle-and-reconnect-lockout-fix.md` — Phase 2: Session Reconnect & Submission Lifecycle Status (ISSUE-02, ISSUE-03)
- [x] `phase-03-batch-make-up-and-reopen-overrides.md` — Phase 3: Batch Make-up Provisioning & Instructor Reopen Overrides (ISSUE-04, ISSUE-04b, ISSUE-05)
- [x] `phase-04-monitoring-and-ui-ux-fixes.md` — Phase 4: Monitoring Counters & UI/UX Polish (ISSUE-06, ISSUE-07, ISSUE-08, ISSUE-09)


