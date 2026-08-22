---
title: "Exam Lifecycle Resilience, 200-Student Concurrency, LiveKit 1-to-1 Free-Tier Architecture, and Section-Aware Grading"
type: context
status: ready
created: "2026-08-23"
tags: [context, exam-lifecycle, concurrency, livekit, free-tier, 1-to-1, grading, multi-section, pdf-export, performance]
feature: "exam-resilience-concurrency-grading"
---

# Exam Lifecycle Resilience, 200-Student Concurrency, LiveKit 1-to-1 Free-Tier Architecture, and Section-Aware Grading Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  In a high-stakes university examination environment running multiple exams concurrently:
  1. **Lobby & Lifecycle Stability:** When 200+ students check in and start their exam simultaneously, lobby admissions (both automatic and instructor-gated) and heartbeat syncs must not fail, deadlock, or produce out-of-sync admission states between students and proctors.
  2. **200 Simultaneous Students Scale:** The student-instructor real-time communication, telemetry ingestion (MediaPipe incidents, sync-session heartbeats, answer drafts), and database query load must scale reliably without bottlenecking connection pools or crashing server workers.
  3. **LiveKit 1-to-1 Spot-Inspection (Free-Tier Optimized):** 
     - Under LiveKit's **Free Plan**, bandwidth and concurrent connection limits are strictly managed.
     - The system operates strictly as **on-demand 1-to-1 spot inspections** (1 Instructor $\leftrightarrow$ 1 Student per active room, 2 participants max per room).
     - Students do **NOT** stream continuous video; camera feeds run local on-device MediaPipe AI and only publish a cloned WebRTC video track when an authorized instructor actively initiates an inspection.
     - Multiple unique instructors/proctors across different exams and sections can concurrently inspect different unique students (e.g., Instructor A watches Student 1 in Exam 1; Instructor B watches Student 2 in Exam 1; Instructor C watches Student 3 in Exam 2) without room collisions, token leakage, or 1-to-1 lease violations.
  4. **Grading Integrity & Accuracy:** The grading subsystem must guarantee mathematical correctness, immutable baseline recording (`initial_score`), tamper-proof answer checksums (`buildAnswerPayloadChecksum`), rubric snapshot binding, and atomic concurrency handling so concurrent grading edits do not overwrite scores or corrupt finalized attempts.
  5. **Multiple Sections & Section-Aware PDF Export:** University exams often span multiple class sections. The grading dashboard and PDF export engine must support filtering, paginating, and cleanly organizing statistics (KPIs, pass rates, student rosters, incident flags) both aggregated across the entire exam and partitioned per section.

- **Business / User Value:**
  - Keeps LiveKit resource usage within Free-Tier limits (zero continuous streaming bandwidth, strictly on-demand 1-to-1 inspection streams).
  - Ensures 100% uptime and seamless exam check-in for large batches of 200+ students without race conditions or server exhaustion.
  - Allows multiple instructors/proctors across the university to spot-check different students concurrently with full exam isolation and clear conflict resolution.
  - Guarantees bulletproof academic integrity with verifiable, audited grading snapshots and comprehensive multi-section PDF reports.

- **Measurable Success Criteria:**
  - 200 concurrent student check-ins and simultaneous heartbeats complete within `< 500ms` p95 response time.
  - LiveKit rooms maintain strict 2-participant 1-to-1 limits (1 student publisher + 1 instructor viewer) with immediate track teardown on stop/navigation.
  - Multiple distinct instructors can concurrently inspect different students across same or different exams with zero cross-talk or token leakage.
  - If two proctors attempt to inspect the *same* student simultaneously, the second proctor receives a clean, non-crashing conflict status (`409 CONFLICT: Currently inspected by another proctor`).
  - 100% score integrity verification across auto-graded items, rubric-evaluated essays, and manual score overrides.
  - Section-filtered grading views and section-partitioned PDF exports accurately reflect enrolled student distributions.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As an Instructor with 200 students taking a midterm exam, I want all students to check in and receive immediate or bulk admission without server slowdowns or connection dropped states.*
- *As a Proctor monitoring Exam Room A, I want to spot-check Student 101 via LiveKit while my co-proctor simultaneously spot-checks Student 102 in the same exam or another exam, without exceeding our LiveKit Free-Tier resource quotas.*
- *As a Proctor clicking on a student who is already being monitored by another staff member, I want to see a clear message indicating the student is currently under inspection, rather than causing a crash or stream disconnection.*
- *As an Evaluator grading essay questions, I want the scoring calculations to enforce rubric criteria bounds, preserve original baseline scores, and prevent overwrites if another instructor is reviewing the same exam.*
- *As a Department Chair, I want to export an Examination Results PDF either as a master report covering all sections with summary KPIs or filtered down to a single class section.*

### Functional Requirements

- [ ] **FR-01 (Lobby Concurrency & Atomic Admissions):** 
  - Ensure `checkInLobby` database upserts are atomic under 200-student bursts.
  - Ensure `updateAdmissions` performs batch status transitions for `studentIds: string[]`.
  - Maintain idempotent polling fallback on mobile devices when Supabase Realtime disconnects.
- [ ] **FR-02 (200-Student Heartbeat & Telemetry Throttling):**
  - Implement $\pm 3\text{s}$ jitter on the 15–30s student heartbeat sync cadence.
  - Avoid redundant answer payload updates when student answers haven't changed.
  - Ensure telemetry logging and incident persistence execute in non-blocking, isolated boundaries.
- [ ] **FR-03 (LiveKit 1-to-1 Free-Tier Enforcement & Multi-Instructor Isolation):**
  - Enforce strict 1-to-1 leases (1 student publisher + 1 instructor viewer) via database partial unique indexes (`active_attempt_key` and `active_viewer_key`).
  - Ensure distinct instructors can independently inspect distinct students across exams simultaneously.
  - Return `409 CONFLICT` with informative UI badge: *"Student is currently under live inspection by another proctor"* when two proctors inspect the same student.
  - Guarantee immediate LiveKit track cleanup (`stopClonedInspectionTrack`) on viewer exit or student navigation.
- [ ] **FR-04 (Score Integrity & Rubric Enforcement):**
  - Enforce `ATTEMPT_SCORING_VERSION` and rubric criteria matching in `assertEvaluationMatchesRubric`.
  - Record `initial_score` write-once upon first save and log all item-level score changes in `logScoreIntegrityCheck`.
  - Validate answer checksums (`buildAnswerPayloadChecksum`) to prevent post-submission tampering.
- [ ] **FR-05 (Multi-Section Grading & Selective PDF Export):**
  - Support section facet filtering and searching in `getGradingStudents`.
  - Extend `/exam-reports` export payload to support selective export: Master Report (all sections + section comparison table) vs. Single Section report.
  - Render section subheaders and page breaks in PDF generation.

### Edge Cases & Failure Modes

- **Edge Case 1: Proctor abruptly closes browser tab during active inspection:**
  - *Behavior:* Lease TTL (`expires_at`, default 5 mins) automatically cleans up orphaned leases via background reconciler, and student's device disconnects when heartbeat/signaling closes.
- **Edge Case 2: 200 students submit exam simultaneously at the deadline:**
  - *Behavior:* Final submissions execute atomic transactions freezing answer snapshots, calculating final scores, and transitioning attempt status to `COMPLETED` without lock contention.
- **Edge Case 3: Mobile student loses internet connection during exam:**
  - *Behavior:* Local session caches answers in SQLite/AsyncStorage; reconnect triggers idempotent check-in/resume logic without discarding progress.

---

## 3. Technical & Architectural Context

- **Affected Domains / Layers:**
  - Backend API (`app/sentinel-api`):
    - `src/modules/examination/lobby/` (check-in, admissions)
    - `src/modules/examination/flow/` (sync-session, submission)
    - `src/modules/examination/live-inspection/` (leases, LiveKit tokens)
    - `src/modules/examination/grading/` (scoring, rubrics)
    - `src/modules/general/pdf-documents/` (exam report queue, processors, renderer)
  - Web Application (`app/sentinel-web`):
    - `src/app/(protected)/(instructor)/exams/grading/`
    - `src/features/exams/monitoring/`
  - Mobile App (`app/sentinel-mobile`):
    - `features/exam/hooks/use-exam-lobby.ts`
    - `features/exam/hooks/use-exam-session.ts`
  - Shared Packages:
    - `packages/db` (Prisma schema, migrations, Kysely queries)
    - `packages/hooks` (`useLiveInspectionViewer`, `useStudentLiveInspectionPublisher`)
    - `packages/shared` (DTOs, scoring algorithms, validation schemas)

---

## 4. Resolved Decisions Ledger

| # | Topic | Selected Option | Rationale |
|---|---|---|---|
| **D1** | LiveKit Same-Student Contention | **Informative Busy State** | If Instructor B inspects a student already being monitored by Instructor A, display a badge/alert indicating the student is under live inspection. Prevents abrupt stream teardown and respects 1-to-1 Free Tier limits. |
| **D2** | PDF Export Section Options | **Selective Export** | Instructors can select "Master Exam Report (All Sections with comparison tables)" or "Section [Name] Only" from the export dialog. |
| **D3** | LiveKit Free-Tier Stream Mode | **On-Demand 1-to-1 Spot Check** | Video is published exclusively upon explicit proctor request and torn down immediately on exit. Zero idle video bandwidth across 200+ students. |

---

## 5. Scope & Boundaries

- **In Scope:**
  - Lobby batch admission resilience and burst check-in stability.
  - Concurrency tuning (jittered sync, lightweight payloads) for 200 simultaneous student sessions.
  - LiveKit Free-Tier 1-to-1 spot-inspection multi-instructor lifecycle, auto-cleanup, and contention handling.
  - Scoring snapshot integrity, rubric binding, and initial score baseline preservation.
  - Multi-section grading filtering and selective section PDF generation.

- **Out of Scope:**
  - Continuous 24/7 video streaming or grid video walls for 200 students (prohibitive on LiveKit Free Plan).
  - Altering Supabase Auth infrastructure.
  - Modifying local MediaPipe computer vision models.

---

## 6. Verification Strategy & Acceptance Criteria

- **Automated Tests:**
  - Unit & Integration tests for `checkInLobby` and `updateAdmissions` under concurrent requests.
  - `startLiveInspection` test confirming `409 CONFLICT` when a student is already leased, and allowing concurrent leases for distinct `(attempt_id, viewer_user_id)` pairs.
  - Scoring integrity test validating rubric boundary checks and write-once `initial_score` preservation.
  - PDF export tests verifying both Master Report and Section-specific filtered outputs.
- **Manual Verification:**
  - Simulate two instructors in different browser sessions inspecting two different students simultaneously.
  - Attempt to inspect the same student from both sessions and confirm the second session receives the clean busy message.
  - Generate and download both Master and Section-filtered PDF reports to confirm visual hierarchy, page breaks, and KPI accuracy.
