---
title: "Monitoring Submitted Counts, Essay Rubric Pre-Scoring, Grading Progress Bar Accuracy & Real-time Progress"
type: context
status: draft
created: "2026-09-06"
tags: [context, monitoring, grading, essay-rubric, progress-bar, realtime, examination]
feature: "monitoring-counts-essay-prescoring-progress-accuracy"
---

# Monitoring Submitted Counts, Essay Rubric Pre-Scoring, Grading Progress Bar Accuracy & Real-time Progress Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  1. **Monitoring Submitted Count Desynchronization:** On the instructor live monitoring page (`/exams/[id]/monitoring`), submitted students who have any flagged incidents (open or resolved) are categorized under `flagged` rather than counting towards `submitted`. As a result, the summary counter displays `Submitted: 0` even when students have submitted and display a `SUBMITTED` lifecycle badge, contrasting with the exam lobby where submitted users are correctly accounted for.
  2. **Manual Essay Grading Friction:** Current essay question grading requires instructors to manually adjust each rubric slider from an arbitrary default (`DEFAULT_RUBRIC_SCORE = 4`). Although the system has formalized multi-criterion essay rubrics (weights, criteria descriptions, and levels 0–4) and Gemini infrastructure, there is no automated AI-assisted pre-scoring to evaluate student essay answers against the active rubric criteria before instructor review.
  3. **Misleading Grading Progress Bar:** In the instructor grading table (`/exams?view=grade`), the progress bar width is calculated against `submittedCount` (`progressBase = submitted > 0 ? submitted : total`), showing a 100% full progress bar when 1/1 submitted student is graded even if only 1 out of 46 total enrolled students has submitted.
  4. **Latency & Latency/Traffic Concerns for Live Monitoring Progress:** During active exams, student cards on the monitoring page display 0% progress and only jump to 100% upon submission. The instructor monitoring page currently polls every 6 seconds without a lightweight push mechanism. Furthermore, previous database profiling revealed PostgreSQL WAL/CDC overhead, making heavy database polling or CDC subscriptions risky.

- **Business / User Value:**
  - Provides instructors with accurate, unambiguous live operational data during exam sessions.
  - Significantly reduces instructor workload and grading turnaround time by providing intelligent, rubric-aligned draft scores with justifications that instructors can verify and calibrate.
  - Eliminates misleading visual progress cues across the grading and monitoring workflows.
  - Delivers low-latency student progress updates without database lockup or network bottlenecks.

- **Success Criteria:**
  - `Submitted` counter on the monitoring dashboard accurately reflects all completed/submitted attempts regardless of proctoring flags.
  - Filtering by "Submitted" displays all students who have turned in their exams.
  - Essay grading workspace can generate rubric-aligned suggested scores (0–4 per criterion) and analytical feedback via AI, retaining instructor authority to review, override, and finalize.
  - The grading overview table reflects class progress accurately without filling the bar prematurely.
  - Live progress on the monitoring page updates efficiently with zero excess PostgreSQL query traffic.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As an instructor monitoring an ongoing exam, I want the summary header to accurately show the total number of students who have submitted, so that I have immediate visibility into submission volume regardless of telemetry incident flags.*
- *As an instructor grading essays, I want the system to pre-score student answers against the active rubric criteria with AI-generated feedback, so that I can quickly review, calibrate, and approve grades instead of grading entirely from scratch.*
- *As an instructor viewing the grading exam list, I want the progress bar to accurately represent grading progress relative to the entire class cohort (or distinct submitted vs. graded metrics), so that I am not misled by a full bar when only a single student has submitted.*
- *As an instructor, I want to see students' approximate live progress while they are taking the exam without overwhelming the backend database or client connections.*

### Functional Requirements

- [ ] **Issue 1 (Monitoring Submitted Counter):**
  - Revise `resolveMonitoringStatus` and `buildMonitoringOverview` in `sentinel-api` to ensure attempts with `lifecycle_state === 'SUBMITTED'` or `attempt_status === 'COMPLETED'` are correctly counted in `stats.submitted`.
  - Ensure status filtering on the frontend allows viewing submitted students, while preserving flagged incident visibility.
- [ ] **Issue 2 (Essay Rubric Pre-Scoring):**
  - Implement an essay pre-scoring pipeline leveraging Gemini and the exam's effective `EssayRubricDefinition` (criteria, weights, descriptions, level 0–4 expectations).
  - Pre-fill rubric criterion scores and feedback in the grading workspace as suggested drafts with clear visual indicators that they are AI-assisted recommendations.
  - Require instructor review and confirmation before final grade submission.
- [ ] **Issue 3 (Grading Table Progress Bar):**
  - Update `columns.tsx` on the `/exams/grading` view so the progress indicator accurately represents completion against total expected submissions (or distinct submitted and graded indicators).
- [ ] **Issue 4 (Low-Latency Real-Time Progress):**
  - Establish a low-latency, zero-DB-overhead mechanism (such as Supabase Realtime Broadcast or optimized sync cadence) to update student progress percentages on the monitoring page.

### Edge Cases & Failure Modes

- **Student with Flags Submits:** The student must appear as both submitted in the total submitted count and retain their incident count/badges for proctoring inspection.
- **AI Service Degradation/Timeout:** If Gemini pre-scoring fails or is delayed, the grading workspace gracefully falls back to manual entry without blocking grading.
- **Partial/Empty Essay Responses:** Pre-scoring handles blank or minimal answers appropriately (evaluating criteria to 0 with explanatory feedback).
- **Network Disconnects during Sync:** Progress broadcasts remain ephemeral and non-blocking; the authoritative answer state continues to sync to PostgreSQL via the robust debounced coordinator.

---

## 3. Technical & Architectural Context

- **Affected Layers:**
  - `app/sentinel-api/`: Monitoring mapping services (`map-monitoring-response.ts`, `get-exam-monitoring-overview.ts`), grading services, and Gemini pre-scoring service.
  - `app/sentinel-web/`: Monitoring components (`monitoring-stats.tsx`, `student-card.tsx`, `use-monitoring`), grading components (`columns.tsx`, `use-grading-attempt`, `grading-rubric-pane.tsx`).
  - `packages/shared/`: Scoring & rubric contracts, event payloads.
  - `packages/hooks/`: Realtime subscription hooks (`use-monitoring-realtime.ts`).
- **Existing Reference Files:**
  - `app/sentinel-api/src/modules/examination/monitoring/services/map-monitoring-response.ts`
  - `app/sentinel-web/src/features/exams/monitoring/_components/monitoring-stats.tsx`
  - `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/_components/columns.tsx`
  - `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/_hooks/use-grading-attempt/index.ts`
  - `app/sentinel-api/src/lib/gemini/`
  - `packages/hooks/src/use-lobby-realtime.ts`
- **Database / Infrastructure Impact:**
  - Zero heavy database CDC listeners to avoid repeating the WAL CPU spikes identified in `database-performance-and-query-optimization.md`.
  - Ephemeral Supabase Realtime Broadcast channels for sub-50ms monitoring updates.

---

## 4. UI/UX & Interaction Guidelines

- **Monitoring Stats:** Clear badge and counters where `Submitted` increments when a student submits, even if `Flagged` is also incremented or highlighted.
- **Grading Progress Column:** Transparent visual representation showing both Graded/Submitted and Graded/Total progress without misleading full bars.
- **Rubric Grading Pane:** Explicit "AI Pre-Scored" badge or indicator showing the suggested criterion levels and rationale, with instantaneous slider adjustments for the instructor.

---

## 5. Scope & Boundaries

- **In Scope:**
  - Fixing submitted count calculation and filtering on the monitoring page.
  - Designing and implementing AI rubric pre-scoring integration for essay questions.
  - Correcting the progress bar calculation and presentation on the grading list page.
  - Establishing a lightweight, low-latency live progress update architecture for monitoring.
- **Out of Scope:**
  - Fully automated, unreviewed final grade publication (instructor review remains mandatory).
  - Modifying the core objective question scoring engine.

---

## 6. Grill Discovery & Decision Log

| ID | Topic | Question | Options Considered | Decision / Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | Submitted vs Flagged Status Priority | How should `student.status` and `stats.submitted` behave when a submitted student also has proctoring incidents? | (A) Submitted overrides status; (B) Flagged overrides status but `stats.submitted` counts all submitted attempts; (C) Disentangle lifecycle status (`submitted`) from incident status (`flagged`). | Pending Grill Question 1 |
| **DEC-02** | Essay Pre-Scoring Trigger | Should essay rubric pre-scoring run automatically on submission (async background worker) or on-demand when the instructor clicks "Pre-Score with Rubric AI" in the grading view? | (A) Automatic on attempt submission; (B) On-demand button inside grading workspace; (C) Hybrid (batch button in grading overview + individual button in workspace). | Pending Grill |
| **DEC-03** | Grading List Progress Bar Metric | What metric should the progress bar visualize on `/exams?view=grade`? | (A) Class completion (`graded / totalStudents`); (B) Dual segmented bar (`graded` / `submitted` / `total`); (C) Submission progress (`submitted / totalStudents`). | Pending Grill |
| **DEC-04** | Low-Latency Live Progress Update | What architecture should power the live student progress bar on `/exams/[id]/monitoring`? | (A) Supabase Realtime Broadcast (ephemeral, zero DB overhead); (B) Lower HTTP polling interval; (C) Supabase DB change listener (Postgres CDC). | Recommended: Supabase Realtime Broadcast |
