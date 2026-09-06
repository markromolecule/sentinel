---
title: "Monitoring Submitted Counts, Essay Rubric Pre-Scoring, Grading Progress Bar Accuracy & Real-Time Monitoring"
type: task
status: planned
created: "2026-09-06"
tags: [task, monitoring, grading, essay-rubric, progress-bar, realtime]
---

# Monitoring Submitted Counts, Essay Rubric Pre-Scoring, Grading Progress Bar Accuracy & Real-Time Monitoring

## Outcome

1. The instructor monitoring page accurately counts and displays all submitted students regardless of proctoring flags, matching the Lobby page admission behavior.
2. The grading list overview table progress bar accurately represents student completion relative to the cohort size without prematurely showing 100% full bars.
3. Student exam progress updates dynamically with sub-50ms latency during active exam taking using ephemeral Supabase Realtime Broadcast, eliminating database traffic and WAL overhead.
4. Essay questions can be pre-scored against the exam's multi-criterion rubric using Gemini, generating suggested 0–4 scores and analytical rationale for instructor review and calibration.

## Pre-planning record

### Context Specification
- Context Document: [`docs/context/September/6/monitoring-counts-essay-prescoring-progress-accuracy.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/September/6/monitoring-counts-essay-prescoring-progress-accuracy.md)

### Actors and Goals
- **Instructor (Exam Proctor / Grader):** Wants accurate live submission counts and real-time student progress during live exams; wants AI-assisted rubric pre-evaluations to accelerate essay grading without losing grading control; wants clear, truthful progress metrics on the grading dashboard.
- **Student (Examinee):** Takes exams with low-overhead progress broadcasts; answers are saved reliably via debounced background sync.

### Scenario Coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Student with 5 flags submits exam | Student has flagged telemetry incidents and clicks submit | Monitoring header increments `Submitted` count; student card displays both `SUBMITTED` lifecycle badge and `Flagged` badge | Filter by "Submitted" or "Flagged" properly includes student | Planned |
| SC-02 | Instructor views grading table with 1/46 submissions | 1 student submitted and graded out of 46 enrolled | Progress bar displays proportional fill (~2%), label shows `1/1 graded • 1/46 submitted` | If total is 0, progress bar gracefully shows 0% | Planned |
| SC-03 | Student answers questions during live exam | Exam in progress, instructor on monitoring page | Progress bar on student card updates in real time (<50ms) via Supabase Realtime Broadcast without DB queries | Falls back to polling overview if broadcast dropped | Planned |
| SC-04 | Instructor opens essay grading workspace | Student has submitted essay responses | Instructor can view AI-suggested criterion scores (0-4) and rationales based on active rubric, adjust sliders, and finalize | If AI service fails, sliders fall back to default manual entry | Planned |

### Decision Ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | Submitted vs Flagged Counter Model | Decouple lifecycle counting from incident status; count all submitted attempts in `stats.submitted` while retaining incident counts | Submitted students with flags vanished from `Submitted` counter and filter | Mutually exclusive status that hides submitted students | `phase-01` |
| DEC-02 | Grading Table Progress Bar Visual | Use a multi-segmented or cohort-relative progress bar (`graded / totalStudents`) | Bar was 100% full when only 1 out of 46 students finished | Basing bar solely on `submittedCount` | `phase-02` |
| DEC-03 | Real-Time Monitoring Progress Architecture | Use Supabase Realtime Broadcast (`broadcast` event on `exam:${id}:monitoring`) | Zero PostgreSQL load, bypasses WAL CPU spike documented in previous performance review | DB CDC replication (49.8% CPU) or aggressive HTTP polling | `phase-03` |
| DEC-04 | Essay Rubric Pre-Scoring Workflow | Generate draft evaluations via Gemini using the effective `EssayRubricDefinition` (levels 0–4), keeping instructor as the sole final authority | Accelerates grading while preventing unreviewed AI scoring | Autonomous final scoring without instructor confirmation | `phase-04` |

## Acceptance Criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01 / DEC-01 | `stats.submitted` reflects all attempts where `lifecycle_state === 'SUBMITTED'` or `attempt_status === 'COMPLETED'` | [`map-monitoring-response.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.ts) | Unit tests in `map-monitoring-response.test.ts` | Passed |
| AC-02 | SC-01 / DEC-01 | Filtering by "Submitted" on monitoring view displays submitted students regardless of incident flags | [`use-filters.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring/use-filters.ts) | Unit tests in `use-filters.test.ts` | Passed |
| AC-03 | SC-02 / DEC-02 | Progress bar on `/exams?view=grade` reflects progress against total cohort (`graded / total`) or dual-fill | [`columns.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/_components/columns.tsx) | Table render tests | Planned |
| AC-04 | SC-03 / DEC-03 | Student answer progress broadcasts via Supabase channel `exam:${examId}:monitoring` and updates instructor monitoring UI without DB query | `use-monitoring-realtime.ts` + `use-attempt-sync.ts` | Realtime hook unit tests | Planned |
| AC-05 | SC-04 / DEC-04 | Gemini pre-scores essay responses against active rubric criteria descriptions and levels (0-4), populating draft scores for instructor confirmation | `essay-prescoring.service.ts` + `GradingRubricPane.tsx` | Service unit tests + UI interaction tests | Planned |

## Phases

- [x] `phase-01-monitoring-submitted-count-and-status.md` — Phase 1: Monitoring Submitted Count & Status Decoupling
- [ ] `phase-02-grading-table-progress-bar-accuracy.md` — Phase 2: Grading Table Progress Bar & Visual Cohort Accuracy
- [ ] `phase-03-realtime-monitoring-progress-broadcast.md` — Phase 3: Zero-DB Real-Time Monitoring Progress Broadcast
- [ ] `phase-04-essay-rubric-ai-prescoring.md` — Phase 4: Essay Rubric AI Pre-Scoring & Calibration Workspace
