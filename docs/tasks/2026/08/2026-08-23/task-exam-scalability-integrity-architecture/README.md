---
title: "Exam Scalability, Lobby Resilience, LiveKit 1-to-1 Free-Tier Architecture, and Multi-Section Grading"
type: task
status: completed
created: "2026-08-23"
tags: [task, exam-lifecycle, concurrency, livekit, free-tier, 1-to-1, grading, multi-section, pdf-export, performance]
---

# Exam Scalability, Lobby Resilience, LiveKit 1-to-1 Free-Tier Architecture, and Multi-Section Grading Master Implementation Plan

## Outcome

Deliver a resilient, high-concurrency examination architecture capable of supporting 200+ simultaneous students per exam lifecycle, guaranteeing atomic lobby check-ins, jittered telemetry syncs, strictly managed LiveKit Free-Tier 1-to-1 spot-inspections across multiple instructors/exams, tamper-proof score integrity with write-once baselines, and multi-section grading with selective PDF report exports.

---

## Pre-planning record

### Actors and goals

- **Student**: Checks into exam lobby, takes exams with smooth auto-reconnects, streams video strictly on-demand when requested by a proctor, and syncs answers reliably without loss of progress.
- **Instructor / Assigned Proctor**: Manages lobby waiting lists in bulk, monitors 200 students with real-time incident dashboards, spot-checks individual student video feeds (1-to-1) within Free-Tier limits, grades essay items against immutable rubrics, and exports section-filtered PDF reports.
- **Department Chair / Admin**: Oversees multi-section examinations across different academic programs, ensuring complete data isolation and verifiable grading audit records.

### Domain language

- **`exam_lobby_admissions`**: Entity tracking student check-in timestamps and admission state (`WAITING`, `APPROVED`, `REJECTED`).
- **`live_inspection_leases`**: Entity managing active 1-to-1 WebRTC video inspection sessions between one student and one proctor with hard TTL expiration.
- **`buildScoreSnapshot`**: Core scoring function computing question reports, rubric evaluations, item overrides, and aggregate scores.
- **`initial_score`**: Immutable baseline score captured upon the first instructor submission.
- **`Selective PDF Export`**: Export capability allowing instructors to generate either a Master Exam Report (all sections combined) or a single Section-specific report.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | 200 students check into lobby simultaneously | Exam is published; admission mode is `AUTOMATIC` or `INSTRUCTOR_GATED` | All 200 check-ins succeed within `< 500ms` p95 with zero unique key collisions | Atomic `ON CONFLICT DO UPDATE` prevents race condition crashes | Completed |
| SC-02 | Instructor bulk admits 50 waiting students | Students in `WAITING` status | Single batch SQL query updates all 50 records; students receive Realtime broadcast | Re-query waiting list falls back gracefully | Completed |
| SC-03 | 200 students sync heartbeats simultaneously | Exam `IN_PROGRESS` | Jittered timer spreads network calls across $\pm 3\text{s}$; zero connection pool exhaustion | Stored answers saved atomically | Completed |
| SC-04 | Instructor A inspects Student 1 while Proctor B inspects Student 2 | Both students in exam; separate instructors | Separate 1-to-1 LiveKit rooms created; zero cross-talk; Free-Tier bandwidth preserved | Leases expire automatically after TTL if client disconnects | Completed |
| SC-05 | Proctor B attempts to inspect Student 1 while Instructor A is already viewing | Student 1 has active lease with Instructor A | Proctor B receives informative `409 CONFLICT` badge: *"Student is currently under live inspection by another proctor"* | Prevents stream disruption to Instructor A | Completed |
| SC-06 | Instructor grades essay against captured rubric | Student completed attempt | Scores validated against rubric criteria; `initial_score` recorded write-once; audit log emitted | Invalid criterion points rejected with 400 error | Completed |
| SC-07 | Instructor exports PDF for Section B only | Exam has Sections A, B, and C | PDF generated containing only Section B students, summary KPIs, and section metadata | Master Report option remains available | Completed |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | How should the system handle concurrent lobby check-in bursts? | Atomic PostgreSQL upsert (`onConflict(['exam_id', 'student_id']).doUpdateSet(...)`) with bulk admissions in `updateAdmissions` | Prevents race condition exceptions while enabling single-query instructor batch actions. | Individual row-by-row updates or unindexed check-in tables. | Phase 1 |
| DEC-02 | How should student syncs be scheduled to prevent server spikes? | Apply $\pm 3\text{s}$ random jitter to the 15–30s heartbeat interval and send lightweight payloads when answers haven't changed | Eliminates synchronized request spikes (thundering herd) across 200 devices. | Fixed identical sync interval across all clients. | Phase 2 |
| DEC-03 | How should LiveKit operate under Free-Tier quotas? | On-demand 1-to-1 spot-inspections (1 student $\leftrightarrow$ 1 instructor) with immediate track teardown on stop | Consumes zero idle bandwidth across 200 students and keeps active WebRTC streams strictly minimal. | Continuous 24/7 video streaming (prohibitive on Free Tier). | Phase 3 |
| DEC-04 | What happens when two proctors click the same student? | Return `409 CONFLICT` mapped to an informative UI busy badge: *"Student is currently under live inspection by another proctor"* | Protects the 1-to-1 constraint without abruptly dropping the active proctor's stream. | Forceful takeover or silent failure. | Phase 3 |
| DEC-05 | How should scoring integrity and baselines be preserved? | Store `initial_score` write-once upon first save, bind essay evaluations to immutable rubric snapshots, and log audit deltas | Ensures auditability, detects tampering, and prevents accidental score loss. | Overwriting original autograded scores directly without a baseline. | Phase 4 |
| DEC-06 | How should multi-section PDF exports be structured? | Support selective export: Master Report (all sections + comparison table) or Section-Specific Report via `section_id` parameter | Gives instructors flexibility for departmental filing or class-specific review. | Forcing a single massive PDF for all sections. | Phase 5 |

### Unknowns and blockers

- *None.* All core architectural decisions have been verified with passing tests.

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01, DEC-01 | `checkInLobby` executes atomic upserts with zero duplicate key errors under 200 concurrent requests | `check-in-lobby.ts` | Concurrency integration test | Completed |
| AC-02 | SC-02, DEC-01 | `updateAdmissions` updates up to 200 students in a single SQL operation | `update-admissions.ts` | Bulk admission unit test | Completed |
| AC-03 | SC-03, DEC-02 | Client session heartbeats apply random jitter ($\pm 3\text{s}$) to avoid synchronized traffic spikes | `use-exam-session.ts` | Hook timer unit test | Completed |
| AC-04 | SC-04, DEC-03 | Multiple unique instructors can concurrently inspect distinct students across exams in separate 1-to-1 LiveKit rooms | `start-live-inspection.service.ts` | Multi-lease concurrency test | Completed |
| AC-05 | SC-05, DEC-04 | Second proctor attempting to inspect an already leased student receives `409 CONFLICT` with informative busy UI | `use-live-inspection-viewer.ts`, `live-feed-monitor.tsx` | Contention test | Completed |
| AC-06 | SC-06, DEC-05 | Grading updates preserve `initial_score` write-once baseline and enforce captured rubric weights | `update-grading-attempt.service.ts` | Score integrity test | Completed |
| AC-07 | SC-07, DEC-06 | PDF export endpoint supports optional `section_id` to generate Master or Section-specific reports | `post-create-exam-report-export.controller.ts`, renderer | PDF export unit & integration tests | Completed |

---

## Scope

- Hardening lobby check-in, batch admissions, and reconnect recovery for 200+ students.
- Client heartbeat jitter and lightweight sync payload optimization.
- LiveKit Free-Tier 1-to-1 spot-inspection multi-instructor lifecycle, auto-cleanup, and contention handling.
- Scoring snapshot integrity, rubric binding, and initial score baseline preservation.
- Multi-section grading filtering and selective section PDF generation.

---

## Non-goals

- Continuous 24/7 video streaming or grid video walls for 200 students (prohibitive on LiveKit Free Plan).
- Altering Supabase Auth infrastructure.
- Modifying local MediaPipe computer vision models.

---

## Phases

- [x] [`phase-01-lobby-resilience-and-burst-checkin.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/task-exam-scalability-integrity-architecture/phase-01-lobby-resilience-and-burst-checkin.md) — Phase 1: Lobby Resilience & Burst Check-in Stability
- [x] [`phase-02-concurrency-and-telemetry-jitter.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/task-exam-scalability-integrity-architecture/phase-02-concurrency-and-telemetry-jitter.md) — Phase 2: 200-Student Concurrency, Jittered Heartbeats & Non-Blocking Telemetry
- [x] [`phase-03-livekit-free-tier-1-to-1-hardening.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/task-exam-scalability-integrity-architecture/phase-03-livekit-free-tier-1-to-1-hardening.md) — Phase 3: LiveKit Free-Tier 1-to-1 Spot-Inspection Hardening & Busy State UI
- [x] [`phase-04-grading-integrity-and-rubric-enforcement.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/task-exam-scalability-integrity-architecture/phase-04-grading-integrity-and-rubric-enforcement.md) — Phase 4: Scoring Engine Integrity, Rubric Binding & Baseline Preservation
- [x] [`phase-05-multi-section-grading-and-selective-pdf-export.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/task-exam-scalability-integrity-architecture/phase-05-multi-section-grading-and-selective-pdf-export.md) — Phase 5: Multi-Section Grading & Selective PDF Export

---

## Verification

| Check | Target | Expected Result | Status |
|---|---|---|---|
| `pnpm test app/sentinel-api/src/modules/examination/lobby` | Lobby module test suite | 100% passing tests for atomic check-ins & batch admissions | Passed (22/22) |
| `pnpm test app/sentinel-api/src/modules/examination/flow` | Flow & sync test suite | 100% passing tests for session syncs | Passed (53/53) |
| `pnpm test app/sentinel-api/src/modules/examination/live-inspection` | Live inspection test suite | 100% passing tests for 1-to-1 leases, contention & cleanup | Passed (51/51) |
| `pnpm test app/sentinel-api/src/modules/examination/grading` | Grading test suite | 100% passing tests for scoring integrity & baseline preservation | Passed (38/38) |
| `pnpm test app/sentinel-api/src/modules/general/pdf-documents` | PDF report export test suite | 100% passing tests for master and section-filtered exports | Passed (164/164) |
| `pnpm test packages/hooks` | Shared hooks test suite | 100% passing tests for LiveKit viewer & publisher hooks | Passed (28/28) |
| `pnpm test packages/ui` | Shared UI components | 100% passing tests for monitor & video components | Passed (5/5) |
