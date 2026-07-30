# Student Score Integrity — Validation Follow-Up

## Status

- **Status:** Open as of July 29, 2026
- **Related Task:** `docs/task/2026-07-29/fix-001-implementation-plan-student-score-integrity.md`
- **Purpose:** Separate repository-wide validation blockers from the completed student score integrity implementation so release follow-through can continue without reopening the finished scoring work.

## Summary

The score-integrity implementation is complete and its targeted regression coverage passed, but
full workspace validation remains blocked by unrelated repository issues and environment
dependencies.

This follow-up exists to:

- keep the score-integrity task finalized at the implementation level;
- track the remaining automated validation blockers explicitly;
- provide a clean handoff for the next validation and release-readiness pass.

## Confirmed Passing Validation

- `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/flow/flow.test.ts src/modules/examination/history/services/get-student-exam-history-detail.test.ts src/modules/examination/reporting/services/get-attempt-report.test.ts src/modules/examination/grading/services/update-grading-attempt.test.ts src/modules/examination/grading/services/grading-detail.test.ts src/modules/examination/exams/services/map-exam-response.test.ts`
    - Result: 6 files passed, 55 tests passed.
- `pnpm --dir packages/shared exec vitest run`
    - Result: 29 files passed, 175 tests passed.
- `pnpm --dir packages/services exec vitest run`
    - Result: 17 files passed, 39 tests passed.
- `git diff --check`
    - Result: passed.

## Blocking Validation Findings

### 1. `app/sentinel-api` full suite is not clean

Command:

- `pnpm --dir app/sentinel-api test`

Observed blockers:

- multiple unrelated failing specs outside the score-integrity change set;
- several tests depend on database access and failed because Prisma could not reach
  `aws-1-ap-northeast-1.pooler.supabase.com`;
- failures also appeared in unrelated logs, roles, analytics, lifecycle, grading-visibility, and
  notification areas.

Impact:

- cannot use the current full API suite result as a release gate for the score-integrity change
  alone.

### 2. `packages/db` depends on live database connectivity

Command:

- `pnpm --dir packages/db exec vitest run`

Observed blockers:

- schema and migration tests failed because Prisma could not reach
  `aws-1-ap-northeast-1.pooler.supabase.com`.

Impact:

- database validation needs either a reachable test database or a mocked/localized strategy before
  this suite can be considered a stable gate.

### 3. `app/sentinel-web` suite has unrelated failing specs

Command:

- `pnpm --dir app/sentinel-web test`

Observed blockers:

- unrelated failing specs in instructor reports, question-bank navigation/layout, classroom
  visibility, announcements, lobby admission, and student attempt page tests;
- the process did not return a clean exit after reporting failures during this pass.

Impact:

- the full web suite is not currently a reliable release gate for this task in isolation.

## Follow-Up Tasks

- [ ] Stabilize or quarantine unrelated failing specs in `app/sentinel-api` so score-integrity
      changes can be validated against a clean workspace baseline.
- [ ] Provide a reachable database target for `packages/db` and the DB-dependent API tests, or
      refactor those suites to run against an isolated local test database.
- [ ] Stabilize or quarantine unrelated failing specs in `app/sentinel-web`, especially the
      student attempt page suite and instructor question/report shells.
- [ ] Run the remaining release-readiness commands once the above blockers are cleared:
    - `pnpm --dir app/sentinel-api test`
    - `pnpm --dir app/sentinel-web test`
    - `pnpm --dir packages/db exec vitest run`
    - `pnpm lint`
    - `pnpm format:check`
    - `pnpm build`
- [ ] Complete the manual validation matrix from the score-integrity implementation plan:
    - shuffle questions on/off;
    - randomize choices on/off;
    - inherited randomization on/off;
    - new and resumed attempts;
    - objective and manual-review exams;
    - instructor bonuses and overrides;
    - question/settings edits after attempt start.

## Recommended Handoff Order

1. Restore a stable database-backed test environment.
2. Re-run `packages/db` and DB-dependent API tests.
3. Triage unrelated `app/sentinel-web` suite failures.
4. Run lint, format, and build after the automated suites are stable.
5. Execute the manual validation matrix and attach screenshots or notes to the main task.

## Exit Condition

This follow-up can be closed once:

- the blocked automated validation commands complete cleanly, or their unrelated failures are
  formally documented and accepted by the release owner; and
- the manual score-integrity validation matrix has been completed and attached to the July 29,
  2026 implementation-plan record.
