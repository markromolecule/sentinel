# Fix 002 Implementation Plan: Production Patch Issues

**Status:** Planned  
**Date:** 2026-08-05  
**Type:** fix  
**Source context:** `docs/context/August/4/patch-issues-prod.md`  
**Phase directory:** `docs/task/2026-08-05/fix-002-patch-issues-prod/`

## Task Summary

Resolve the reported production issues across the student exam experience and staff examination
workflows: closed-attempt navigation, mobile MediaPipe false multi-face states, student loading
presentation, assignment crashes, notification foreign-key failures, grading actions, and section
data in the grade export.

## Pre-Planning

- [x] Read `.agents/rules/implementation-plan.md`.
- [x] Read `.agents/rules/global/1-3-1-rule.md`.
- [x] Read `.agents/workflows/to-do-workflow.md`.
- [x] Read `docs/context/August/4/patch-issues-prod.md`.
- [x] Scanned the student attempt/checkup flow, MediaPipe shared code, grading/reporting UI and API,
      assignment UI/API, notification persistence, migrations, and existing Vitest files.
- [x] Identified likely affected tables: `exam_attempts`, `exam_attempt_lifecycle_events`,
      `exam_assigned_sections`, `sections`, `notifications`, and assignment-related tables.
- [x] **Prisma migration required:** No migration is expected. Existing lifecycle, assignment,
      section, and notification schema should be reused; confirm the notification FK target and
      production migration state before implementation.

## Unified Context

The production patch contains two coupled user-facing areas. Student pages need consistent terminal
navigation/loading behavior and more stable mobile MediaPipe frame handling. Staff workflows need
assignment mutations to fail safely, notification side effects to respect the application-user FK,
and grading/reporting to preserve section data and expose valid submission/grading actions.

The implementation must preserve server-authoritative closed attempts, real multi-face detection,
assignment authorization, notification referential integrity, grading permissions, and finalized
attempt immutability. The spreadsheet exporter must be located from the deployed request if it is not
present in this checkout before any export contract is changed.

## Three Options

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Add the missing student buttons/loading markup, debounce MediaPipe status locally,
  guard assignment mutations, null invalid notification actors, and patch the existing grading/export
  columns and action props.
- **Tradeoff:** Fastest delivery, but some state coordination remains distributed across duplicate
  web/Core surfaces and may require follow-up consolidation.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Establish shared terminal/loading primitives, make MediaPipe detector ownership and
  stale-frame handling explicit, centralize assignment contract/error handling, validate actor identity
  at the notification boundary, and define a single grading/export data contract.
- **Tradeoff:** Requires broader regression coverage and careful coordination across four workspaces,
  but reduces repeated production failure modes.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Move assignment notifications to an outbox, deliver MediaPipe status through a
  dedicated worker/realtime channel, and generate grading exports from an asynchronous report job.
- **Tradeoff:** Introduces new persistence, retry, and operational concerns that exceed this patch's
  current evidence and complexity budget.

## Chosen Execution

**The Recommendation:** Choose **Option B: The Strategic Path**.

**The Justification:** The repository already has shared services, hooks, DTOs, and test patterns that
support explicit contracts without introducing dependencies. The issues are related by state and
data-boundary assumptions, so defensive boundaries and shared behavior are more reliable than isolated
UI patches, while an outbox/realtime redesign is not justified for this production patch.

## Task and Phase Index

Each task has its own folder. Each phase is a self-contained Markdown checklist with a focused goal,
concrete files/functions, tests, migration decision, and completion gate.

### Task 1: Student Experience and MediaPipe Stability

Folder: `fix-002-patch-issues-prod/task-1-student-experience/`

- [Phase 1: Closed-attempt navigation and loading states](fix-002-patch-issues-prod/task-1-student-experience/phase-1-closed-navigation-and-loading.md)
- [Phase 2: Mobile MediaPipe detector stability](fix-002-patch-issues-prod/task-1-student-experience/phase-2-mobile-mediapipe-stability.md)

### Task 2: Staff Assignment and Grading Workflows

Folder: `fix-002-patch-issues-prod/task-2-staff-workflows/`

- [Phase 1: Assignment crash and notification referential integrity](fix-002-patch-issues-prod/task-2-staff-workflows/phase-1-assignment-and-notifications.md)
- [Phase 2: Grading actions and section-aware export](fix-002-patch-issues-prod/task-2-staff-workflows/phase-2-grading-and-export.md)

## Phase Finalization Protocol

- [ ] Activate only one phase at a time unless the user explicitly authorizes parallel work.
- [ ] Implement only the checkboxes in the active phase file.
- [ ] Run the active phase's focused tests and quality commands.
- [ ] Record results and material decisions in that phase's completion gate.
- [ ] Recheck the phase's migration decision.
- [ ] Mark a phase complete only after its tests pass.
- [ ] Do not pre-check tasks in later phase files.

## API, Environment, and Compatibility Notes

- **API:** Prefer additive response/contract corrections. Preserve existing grading, assignment, and
  notification route names unless production tracing proves a deployed legacy route differs.
- **Environment:** No new required environment variables are expected. Mobile QA requires supported
  iOS Safari and Android Chrome devices; export QA requires the production/deployed exporter path.
- **Schema migration:** No migration planned. A migration is allowed only if production confirms the
  notification FK target is inconsistent with the intended identity model; document the exact FK and
  rollback SQL decision before changing schema.
- **Rollback:** Revert each phase independently. For notification behavior, retain error logging and
  restore the previous failure policy only if business requirements explicitly require transactional
  notifications. Do not remove the FK as a rollback shortcut.
- **Breaking changes:** None intended. Any grading/export field rename or route change must be treated
  as breaking and coordinated across API clients.
- **Security:** Do not bypass assignment/grading authorization, suppress genuine second-face events,
  expose student answers in list responses, or persist invalid notification actor IDs.

## Overall Done Criteria

- [ ] Closed attempts provide a correct classroom return path without reopening or resuming the attempt.
- [ ] Student loading states use the spinner/text pattern without the old boxed wrapper.
- [ ] One mobile face remains stable after calibration, while persistent second faces remain detectable.
- [ ] Assignment create/update/delete works in both sentinel-web instructor and sentinel-core admin
      surfaces without a client-side exception page.
- [ ] Notification writes never use an invalid `actor_user_id`; notification side-effect failure is
      explicit and does not create an unexplained assignment failure.
- [ ] Grading rows open the correct submission and editable attempts expose save/finalize actions;
      finalized attempts remain read-only.
- [ ] The deployed spreadsheet export includes the student section and has deterministic behavior for
      multiple section assignments.
- [ ] Every phase has passing focused tests, recorded production smoke-test results, and an explicit
      migration decision.
