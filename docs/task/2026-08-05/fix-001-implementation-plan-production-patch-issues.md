# Production Patch Issues — Implementation Plan

## 1. Context

The production patch covers five defects across student mobile UX, calendar-note privacy, examination history, and instructor grading. The immediate constraints are to preserve existing API contracts where possible, enforce note ownership at the API boundary, and correct grading data at its source without introducing a database migration.

## 3. Options

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Make targeted UI changes, filter personal notes client-side, and add a fallback section value in the grading tables.
- **Tradeoff:** Client-side note filtering would still expose private data in network responses, and section fallbacks would conceal the incorrect source relationship.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Enforce note ownership in the calendar read query, derive grading section from the student's enrolled class group, and make responsive/card behavior explicit in tested shared UI components.
- **Tradeoff:** Requires coordinated API, shared-contract, and both instructor-client verification, but no new dependencies or schema changes.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Introduce a separate personal-reminder resource and a dedicated mobile header/attempt layout system.
- **Tradeoff:** Adds an unnecessary data model and wider UI refactor for a focused production patch.

## 1. Execution

**The Recommendation:** Option B — the Strategic Path.

**Justification:** Privacy must be guaranteed before data reaches the browser, and the student section must come from the student's enrollment rather than the exam assignment. The existing `calendar_events.created_by`, `class_groups.section_id`, and `sections` records provide the needed relationships, so the patch can remain additive and low-risk without a migration or environment change.

**Task input summary:** Prepare and execute a production-patch plan that fixes the five reported issues while keeping each change scoped, testable, and organized by affected domain.

## Task Organization

1. [Task 1 — Student mobile and examination experience](task-1-student-mobile-and-examination-experience/)
    - [Phase 1 — Header search and profile spacing](task-1-student-mobile-and-examination-experience/phase-1-header-search-and-profile-spacing.md)
    - [Phase 2 — History time and upcoming access](task-1-student-mobile-and-examination-experience/phase-2-history-time-and-upcoming-access.md)
    - [Phase 3 — Attempt control layout](task-1-student-mobile-and-examination-experience/phase-3-attempt-control-layout.md)
2. [Task 2 — Calendar note privacy](task-2-calendar-note-privacy/)
    - [Phase 1 — Owner-scoped calendar reads](task-2-calendar-note-privacy/phase-1-owner-scoped-calendar-reads.md)
    - [Phase 2 — Student calendar regression coverage](task-2-calendar-note-privacy/phase-2-student-calendar-regression-coverage.md)
3. [Task 3 — Grading student-section accuracy](task-3-grading-student-section-accuracy/)
    - [Phase 1 — Canonical section source and API contract](task-3-grading-student-section-accuracy/phase-1-canonical-section-source-and-api-contract.md)
    - [Phase 2 — Instructor views and Excel export](task-3-grading-student-section-accuracy/phase-2-instructor-views-and-excel-export.md)

## Cross-Task Release Requirements

- [ ] Run focused Vitest suites listed in every phase before merging.
- [ ] Run `pnpm --dir app/sentinel-web test` and `pnpm --dir app/sentinel-api test` after the focused suites pass.
- [ ] Run `pnpm lint` and `pnpm format:check` before release.
- [ ] Perform mobile browser QA at the affected header and attempt breakpoints, and verify the calendar with two student accounts in the same institution.

**Migration required:** No — all changes use existing `calendar_events.created_by`, `class_groups.section_id`, and `sections` data. No rollback note is required because no schema change is planned.

**Breaking API changes:** None planned. Calendar-list visibility changes intentionally remove other students’ `NOTE` records from responses; non-note events retain their existing role and institution visibility.

**Environment variables:** None.
