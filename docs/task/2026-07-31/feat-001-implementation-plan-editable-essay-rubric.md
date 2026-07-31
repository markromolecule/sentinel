# Editable Essay Rubric — Implementation Plan

**Task summary:** Replace the hardcoded essay rubric with a Support-managed baseline and permission-controlled per-exam overrides, then freeze the effective rubric on each attempt so grading changes only affect future attempts.

## 1. Context

The current rubric is compiled into `packages/shared/src/exams/essay-rubric.ts`, while the guide pages, grading UIs, validation schemas, and score calculation all assume the same five fixed criterion keys. The feature must make that rubric editable per exam without letting a later baseline or override edit change the grading basis of an attempt that has already started, and it must preserve existing attempts whose snapshots predate rubric support.

## 3. Options

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Add the baseline rubric to the existing `examination.global_defaults` JSON, add one nullable rubric JSON column to `exams`, and copy the resolved rubric into `exam_attempts.assessment_snapshot` when an attempt starts.
- **Tradeoff:** Attempt history remains safe, but baseline and per-exam edit history outside attempts is unavailable and concurrent edits have no durable version identity.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Persist immutable rubric versions in a dedicated table, resolve one active Support baseline plus an optional active version per exam, and snapshot the resolved version and definition when each attempt starts.
- **Tradeoff:** Requires a migration, dedicated resolver/write services, and more API work than storing raw JSON directly on `exams`.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Treat rubric changes as append-only domain events and rebuild the effective rubric by replaying baseline and exam-override events at a requested timestamp.
- **Tradeoff:** Adds event-replay and projection complexity that the current request and repository architecture do not otherwise require.

## 1. Execution

**Recommendation: Option B.**

The immutable-version model fits the existing attempt snapshot boundary and gives each grading decision a stable rubric identity without introducing an event-sourcing subsystem. It also keeps Support baseline management, exam-scoped customization, and historical auditability in one data model; the existing hardcoded rubric remains only as the legacy/default seed and compatibility fallback.

### Behavioral decisions carried into implementation

- “In-progress exams use the baseline rubric” is implemented as “an attempt uses the effective rubric captured when that attempt first starts.” The captured value may be the Support baseline or the exam override that was active at start, and no mid-attempt edit replaces it.
- A per-exam override affects only attempts started after that override version becomes active.
- Resetting an exam override deactivates it and makes future attempts inherit the then-current Support baseline; prior rubric versions and attempt snapshots remain intact.
- Per-exam update and reset actions require a dedicated `examinations:override_essay_rubric` permission. Support can grant or revoke this permission from roles through the existing Permission Registry and Role Matrix instead of relying on a hardcoded role-name allowlist.
- Rubric criteria are dynamic, but the performance scale remains integer `0..4`. Criterion keys are immutable identifiers within a version, criterion labels/descriptions/level descriptions are editable, criteria count is constrained to `1..10`, and weights must total exactly `100%` after normalization.
- Existing attempts without rubric snapshot data use a named `legacy-standard-v1` definition matching today’s five hardcoded criteria. No historical attempt is rewritten.

## Phase 1: Define the dynamic rubric contract and scoring rules

**Goal:** Establish one validated rubric definition used consistently by persistence, APIs, snapshots, grading, and UI.

- [x] Replace the fixed-only contract in `packages/shared/src/exams/essay-rubric.ts` with exported `EssayRubricDefinition`, `EssayRubricCriterion`, `EssayRubricVersion`, and `EssayRubricSource` types; retain the current five criteria as `LEGACY_ESSAY_RUBRIC`/`DEFAULT_ESSAY_RUBRIC` compatibility constants.
- [x] Change `calculateEssayWeightedScore()` in `packages/shared/src/exams/essay-rubric.ts` to accept `(scores, maxPoints, rubric)` and iterate the supplied criteria, while an explicitly documented compatibility overload/fallback uses `LEGACY_ESSAY_RUBRIC` for callers reading pre-feature data.
- [x] Add `essayRubricDefinitionSchema`, `essayRubricVersionSchema`, and update-input schemas in a new `packages/shared/src/schema/exams/essay-rubric-schema.ts`; enforce unique stable keys, `1..10` criteria, `0..4` level descriptions, positive weights, and a normalized total weight of `1`.
- [x] Replace the five-key objects in `packages/shared/src/schema/exams/assessment-schema.ts` and `packages/shared/src/schema/exams/grading-schema.ts` with rubric-keyed score records whose values remain integers from `0` through `4`.
- [x] Export the new schemas and inferred types through `packages/shared/src/schema/exams/index.ts`, `packages/shared/src/exams/index.ts`, and the relevant `packages/shared/src/types/index.ts` barrel.
- [x] Expand `packages/shared/src/exams/essay-rubric.test.ts` and `packages/shared/src/schema/exams/grading-schema.test.ts` to cover custom criteria, invalid duplicate keys, invalid weights, missing/unknown submitted score keys, `0..4` bounds, rounding, and legacy fallback behavior.

**Migration required:** No — this phase changes shared contracts and pure scoring logic only.

## Phase 2: Add immutable rubric-version persistence

**Goal:** Store auditable Support baseline and per-exam rubric versions without overwriting prior definitions.

- [x] Add an `essay_rubric_scope` enum and `essay_rubric_versions` model to `packages/db/prisma/schema.prisma` with `rubric_version_id`, `scope` (`BASELINE` or `EXAM_OVERRIDE`), nullable `exam_id`, monotonically increasing `version_number`, validated definition JSON, `is_active`, nullable `supersedes_version_id`, `created_by`, and timestamps; add relations to `exams` and `users`.
- [x] Create `packages/db/prisma/migrations/20260731090000_add_essay_rubric_versions/migration.sql` to create the enum/table, foreign keys, `(scope, exam_id, version_number)` uniqueness, lookup indexes, and partial unique indexes allowing only one active baseline and one active override per exam.
- [x] Seed `legacy-standard-v1` as the initial active baseline in the same migration using the exact current rubric definition, while leaving all existing attempts and scores untouched.
- [x] Add `packages/db/prisma/migrations/20260731090000_add_essay_rubric_versions/rollback.sql` that drops the partial indexes, table, and enum without modifying `exam_attempts` or their JSON snapshots.
- [x] Regenerate `packages/db/src/generated/types.ts` from the updated Prisma schema rather than hand-editing the generated database types.
- [x] Add `packages/db/src/tests/essay-rubric-schema.test.ts` to verify the enum/table, foreign keys, version uniqueness, and one-active-version partial indexes from the migration SQL.

**Migration required:** Yes — immutable baseline and exam override versions need durable relational storage and active-version constraints. Rollback removes only the new rubric catalog; attempts already carrying rubric JSON remain readable through the shared snapshot schema.

## Phase 3: Implement rubric resolution, writes, authorization, and API contracts

**Goal:** Provide audited endpoints for reading the effective rubric and creating/resetting permitted versions.

- [x] Add rubric queries and transactional mutations under `app/sentinel-api/src/modules/examination/rubric/data/` for `findActiveBaselineRubric()`, `findActiveExamRubric()`, `insertRubricVersion()`, and `deactivateActiveRubric()`; lock the current active row during version replacement to prevent two active versions.
- [x] Add `resolveEffectiveEssayRubric()` and `createEssayRubricVersion()` in `app/sentinel-api/src/modules/examination/rubric/services/`; return the exam override when present, otherwise the Support baseline, and finally `LEGACY_ESSAY_RUBRIC` only when no persisted baseline exists.
- [x] Add `get-effective-essay-rubric.controller.ts`, `update-exam-essay-rubric.controller.ts`, and `reset-exam-essay-rubric.controller.ts` under `app/sentinel-api/src/modules/examination/rubric/controllers/`, then register them in a new `rubric.route.ts` mounted with the examination routes.
- [x] Register `OVERRIDE_ESSAY_RUBRIC` in `packages/shared/src/constants/permissions.ts` with key `examinations:override_essay_rubric`, module `examinations`, action `override_essay_rubric`, category `EXAM`, and course/institution-aware scope; add it to the instructor, admin, and superadmin system-role blueprints as the initial policy while leaving it assignable/removable through Support.
- [x] Extend `app/sentinel-api/src/modules/security/permission/data/sync-system-permissions.test.ts` to prove the new permission is synchronized into `rbac_permissions`, appears in the Support Permission Registry catalog, is included in the intended default role blueprints, and is excluded from student and unrelated role blueprints.
- [x] Require authenticated staff read access for `GET /rubrics/exams/:examId`; require `requireActivePermission(c, 'examinations:override_essay_rubric')` for both update and reset endpoints, then apply the existing exam ownership/assignment and institution-scope checks independently of the actor’s role name.
- [x] Return `canOverride` in the effective-rubric response from the actor’s active permission set so clients can render editable or read-only controls, while treating the server-side permission check as the authorization boundary.
- [x] Add Support-only `GET /access-control/essay-rubric` and `PUT /access-control/essay-rubric` controllers to `app/sentinel-api/src/modules/security/access-control/controllers/`, guarded by `assertSupportAccess()`, and write baseline versions through the shared rubric version service.
- [x] Define OpenAPI request/response schemas in a new `app/sentinel-api/src/modules/examination/rubric/rubric.dto.ts`, including rubric ID, version number, source, effective definition, updated timestamp, and editor identity.
- [x] Emit `LogsService.createLog()` audit records for `essay_rubric.baseline_updated`, `essay_rubric.exam_override_updated`, and `essay_rubric.exam_override_reset`, including old/new version IDs and the target exam when applicable.
- [x] Add `app/sentinel-api/src/modules/examination/rubric/services/rubric-services.test.ts` and controller tests beside each controller for fallback resolution, sequential versions, reset-to-baseline, concurrent write protection, ownership/institution scope, Support-only baseline writes, invalid weights, permission granted/denied behavior, and proof that a custom role with the permission can override while a conventional instructor/admin role without it cannot.

**Migration required:** Yes — this phase consumes the `essay_rubric_versions` table created in Phase 2.

## Phase 4: Freeze the rubric at attempt start and use it during grading

**Goal:** Guarantee that active and historical attempts are always graded against their captured rubric.

- [x] Extend `attemptAssessmentSnapshotSchema` in `packages/shared/src/schema/exams/attempt-snapshot-schema.ts` with a required rubric snapshot for the new `attempt-assessment.v2` contract, and parse both v1 and v2 so existing v1 attempts remain valid.
- [x] Update `buildAssessmentSnapshot()` in `app/sentinel-api/src/modules/examination/flow/services/attempt-snapshot.service.ts` to receive the resolved rubric and serialize its version ID, version number, source, and full definition into the snapshot.
- [x] Update `startSessionService()` in `app/sentinel-api/src/modules/examination/flow/services/start-session.service.ts` to resolve the effective rubric only for a newly created attempt; resumed attempts must reuse their existing assessment snapshot and must never query a replacement rubric.
- [x] Update `prepareSessionService()` and the completion fallback in `app/sentinel-api/src/modules/examination/flow/services/prepare-session.service.ts` and `app/sentinel-api/src/modules/examination/flow/services/complete-session/complete-session.scoring.ts` to preserve a captured v2 rubric and attach `LEGACY_ESSAY_RUBRIC` only when adapting a pre-feature v1/missing snapshot.
- [x] Add the captured rubric to `attemptGradingDetailSchema` in `packages/shared/src/schema/exams/grading-schema.ts` and map it in `app/sentinel-api/src/modules/examination/grading/services/get-grading-attempt-detail/get-grading-attempt-detail.mapper.ts`.
- [x] Update `updateGradingAttempt()` in `app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.service.ts` to validate every evaluation against the attempt’s captured criterion keys and call `calculateEssayWeightedScore(evaluation.scores, question.points, capturedRubric.definition)`; never resolve the current exam rubric during grading.
- [x] Persist the rubric version ID/source into `score_snapshot` metadata in `packages/shared/src/schema/exams/attempt-snapshot-schema.ts` and `app/sentinel-api/src/modules/examination/flow/services/attempt-snapshot.service.ts` so reports can identify the grading basis without joining mutable configuration.
- [x] Extend `app/sentinel-api/src/modules/examination/flow/services/attempt-snapshot.service.test.ts`, `app/sentinel-api/src/modules/examination/flow/flow.test.ts`, and `app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.test.ts` with integrity cases proving that baseline/override edits do not change started, submitted, or graded attempts; resumed attempts retain the original rubric; future attempts receive the new version; and v1 attempts grade with the legacy fallback.

**Migration required:** No — rubric identity and definition are added to the existing JSON snapshot columns, with schema-level backward compatibility for v1 snapshots.

**Status update (2026-07-30):** Phase 4 completed and verified with `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/flow/services/attempt-snapshot.service.test.ts src/modules/examination/flow/flow.test.ts src/modules/examination/grading/services/update-grading-attempt.test.ts src/modules/examination/grading/services/grading-detail.test.ts` (4 files, 36 tests passed).

## Phase 5: Add reusable client APIs, hooks, and rubric editor UI

**Goal:** Expose typed rubric data flows and one accessible editor/preview used by all three web applications.

- [x] Add `packages/services/src/api/exams/essay-rubric.ts` with `getEffectiveEssayRubric()`, `updateExamEssayRubric()`, and `resetExamEssayRubric()` and export it from `packages/services/src/api/exams/index.ts`.
- [x] Extend `packages/services/src/api/access-control.ts` with `getBaselineEssayRubric()` and `updateBaselineEssayRubric()` for the Support endpoints.
- [x] Add query keys and hooks in `packages/hooks/src/query/exams/use-essay-rubric-query.ts`, `use-update-exam-essay-rubric-mutation.ts`, and `use-reset-exam-essay-rubric-mutation.ts`; invalidate the selected exam rubric, exam detail, grading detail, and exam list keys after writes.
- [x] Add Support query/mutation hooks in `packages/hooks/src/query/access-control/use-access-control-essay-rubric-query.ts` and `use-access-control-essay-rubric-mutation.ts`.
- [x] Include `canOverride` in the typed service/hook result and make the exam override mutations fail closed when the API omits or denies the capability; do not infer edit access from `instructor`, `admin`, or `superadmin` role labels.
- [x] Add controlled `EssayRubricEditor` and read-only `EssayRubricTable` components in `packages/ui/src/components/essay-rubric/`; support criterion add/remove/reorder, stable key generation for new criteria, name/description/weight editing, all five level descriptions, inline validation, dirty-state discard, save, and reset-to-baseline confirmation.
- [x] Export the components from `packages/ui/src/index.ts` and add JSDoc to every exported component, hook, service function, and rubric helper introduced by this feature.
- [x] Add co-located Vitest tests in `packages/services/src/api/exams/essay-rubric.test.ts`, each new hook’s `*.test.tsx`, and `packages/ui/src/components/essay-rubric/essay-rubric-editor.test.tsx` for payload mapping, cache invalidation, weight totals, criterion constraints, keyboard-accessible reorder controls, save enablement, and reset confirmation.

**Status update (2026-07-30):** Phase 5 completed and verified with service tests, hook tests, component tests, and a full monorepo build (all passed).

**Migration required:** No — this phase adds client contracts and reusable presentation components.

## Phase 6: Make the Support baseline and staff guide pages editable

**Goal:** Let Support manage the baseline and let instructor/admin/superadmin users customize a selected exam from the existing Essay Rubric guide section.

- [x] Add an “Essay Rubric” tab to `app/sentinel-support/src/app/(protected)/(support)/control/_components/examination/examination-settings-form.tsx` and a new `examination-views/essay-rubric-settings-view.tsx` that loads/saves the active baseline version with `EssayRubricEditor`.
- [x] Update `app/sentinel-support/src/app/(protected)/(support)/control/_components/views/examination-governance-view.tsx` to coordinate the examination-settings record and baseline-rubric query/mutation states without folding rubric data into the unrelated `examination.global_defaults` JSON.
- [x] Verify the new “Override Essay Rubric” permission is listed under the `EXAM` category by the existing `app/sentinel-support/src/app/(protected)/(support)/control/_components/views/permission-registry-view.tsx` and is assignable per role through `role-matrix-view.tsx`; add presentation code only if the existing catalog-driven grouping does not surface it automatically.
- [x] Replace the static content in `app/sentinel-web/src/app/(protected)/(instructor)/guide/rubric/page.tsx` with an exam selector backed by `useExamsQuery()`, the effective-rubric query, source/version badges, `EssayRubricEditor`, and reset-to-baseline action; limit selectable exams to those the API already scopes to the instructor.
- [x] Apply the same behavior to `app/sentinel-core/src/app/(protected)/guides/rubric/page.tsx` for admin/superadmin users, relying on API institution scope rather than client-side authorization.
- [x] Render `EssayRubricTable` read-only with a permission explanation when `canOverride` is false, and render save/reset controls only when `canOverride` is true; handle a `403` from a stale permission state by reverting to read-only mode and invalidating the active-permissions query.
- [x] Update both `app/sentinel-web/src/features/exams/builder/_components/question-forms/essay-form.tsx` and `app/sentinel-core/src/features/exams/builder/_components/question-forms/essay-form.tsx` to remove the hardcoded five-criterion copy and link users to the exam’s guide rubric editor.
- [x] Update the `ESSAY` instruction in `app/sentinel-api/src/lib/gemini/services/prompt-builder/definitions.ts` to state that grading uses the exam’s effective rubric and stop embedding obsolete fixed criterion names/weights in generated question guidance.
- [x] Add page/component tests beside the Support view and both guide pages for baseline editing, Permission Registry visibility, Role Matrix assignment, exam selection, inherited-versus-overridden state, permission-driven editable/read-only rendering, stale-permission `403` handling, failed load/save feedback, dirty navigation warning, and reset behavior.

**Status update (2026-07-30):** Phase 6 completed. All page layouts, selector inputs, prompt instructions, and builder links are fully integrated. Component/page test suites implemented and passed, and full production workspace builds verified.

**Migration required:** No — these pages use the rubric APIs and persistence introduced in Phases 2–3.

## Phase 7: Render and score the captured rubric in grading and reports

**Goal:** Make manual grading and report breakdowns reflect the rubric version stored on the attempt, not the current baseline or exam override.

- [x] Replace fixed `CriteriaScores` definitions in both grading `_types/index.ts` files under `app/sentinel-web/src/app/(protected)/(instructor)/exams/grading/[examId]/[attemptId]/` and `app/sentinel-core/src/app/(protected)/exams/grading/[examId]/[attemptId]/` with `Record<string, number>` derived from the shared rubric contract.
- [x] Update both `use-grading-attempt/index.ts` hooks to initialize evaluation scores from `attemptDetail.rubric.definition.criteria`, retain saved values by key, and pass the captured definition into local weighted-score previews.
- [x] Update both `grading-rubric-pane.tsx` components to render the captured criterion list, criterion-specific level text, weights, and rubric version/source badge instead of `ESSAY_RUBRIC_CRITERIA` and `ESSAY_RUBRIC_LEVELS`.
- [x] Update `app/sentinel-web/src/features/exams/reports/_components/attempt-report-question-card.tsx` and `attempt-report-table.tsx` to map saved evaluation keys to labels from the attempt rubric snapshot, while falling back to humanized keys for legacy reports.
- [x] Ensure `app/sentinel-api/src/modules/examination/reporting/services/get-attempt-report.ts` returns the captured rubric metadata already exposed by grading/report schemas, without reading the current active rubric.
- [x] Expand both grading hook `index.test.tsx` files, add/extend grading pane tests, and update `app/sentinel-web/src/features/exams/reports/attempt-report-view.test.tsx` to cover nonstandard criterion keys, reordered criteria, custom level text, correct weighted totals, version labels, and legacy report fallback.

**Status update (2026-07-31):** Phase 7 completed. Grading UIs, report views, mappers, hooks, and APIs successfully render and calculate scores using the snapshot rubric definition. All related unit test suites in api, web, and core passed.

**Migration required:** No — grading and reports consume captured snapshot metadata.

## Phase 8: Validate rollout, compatibility, and documentation

**Goal:** Verify the complete forward-only rubric lifecycle and document operational behavior before release.

- [x] Add an API integration scenario in `app/sentinel-api/src/modules/examination/grading/services/grading-detail.test.ts` that creates rubric v1, starts attempt A, creates rubric v2, starts attempt B, and proves A and B calculate against their respective versions.
- [x] Add an API integration scenario in `app/sentinel-api/src/modules/examination/rubric/services/rubric-services.test.ts` proving Support baseline changes affect future inherited attempts but not exams with active overrides, and reset makes only future attempts inherit the latest baseline.
- [x] Add an RBAC integration scenario using `packages/shared/src/constants/permissions.ts` and the rubric controllers that grants `examinations:override_essay_rubric` to a test role, verifies update/reset succeeds, revokes it through the role-permission mapping, and verifies the same requests return `403`.
- [x] Update `docs/architecture/system-overview.md` with the baseline → per-exam override → attempt snapshot → grading resolution chain and the legacy-v1 compatibility rule.
- [x] Run `pnpm --dir packages/shared test`, `pnpm --dir packages/db test`, `pnpm --dir app/sentinel-api test`, `pnpm --dir app/sentinel-web test`, `pnpm --dir app/sentinel-core test`, and `pnpm --dir app/sentinel-support test`, followed by repository `pnpm lint` and `pnpm format:check`.
- [x] Manually verify that Support can find “Override Essay Rubric” on `/control/permissions`, grant/revoke it on `/control/role-matrix`, and that affected users gain/lose override controls and API access; also verify baseline editing, an override edit during an in-progress attempt, grading after submission, report labels/version display, and a pre-migration attempt.

**Status update (2026-07-31):** Phase 8 completed. Added DB integration tests verifying baseline edits, overrides, resets, and dynamic RBAC route authorization via `rbac_permissions`. Updated the architecture overview documentation. Ran all test suites across the monorepo, and formatted all files successfully.

**Migration required:** No — this phase validates the migration and application behavior from earlier phases.

## API and compatibility notes

- The grading-detail and attempt-report responses gain additive `rubric` metadata; existing consumers may ignore it.
- Evaluation score objects become dynamically keyed. This is a source-level breaking change for consumers that compile against the five named properties, so all in-repository grading consumers must migrate in the same release.
- Per-exam rubric update/reset endpoints require the new `examinations:override_essay_rubric` permission. Default role blueprints initially grant it to instructor, admin, and superadmin, but Support-managed role mappings remain authoritative.
- `attempt-assessment.v1` remains readable; new attempts write `attempt-assessment.v2`.
- No new environment variables or third-party dependencies are required.
- Baseline/override version writes must be transactional and append-only. Never update a historical definition JSON in place and never backfill current rubric data into old attempts.

## Done criteria

- [ ] Every rubric shown or scored for a started attempt comes from that attempt’s snapshot.
- [ ] Support can create a new active baseline version, see `examinations:override_essay_rubric` in the Permission Registry, and grant/revoke it through the Role Matrix.
- [ ] Any in-scope staff user with `examinations:override_essay_rubric` can create/reset a per-exam override, and the same user receives `403` and read-only UI after the permission is revoked.
- [ ] Rubric edits affect only future attempts, including when an existing attempt is still in progress.
- [ ] Existing attempts without rubric metadata continue to display and score with `legacy-standard-v1`.
- [ ] UI and API validation reject duplicate keys, invalid score levels, empty rubrics, and weights that do not total `100%`.
- [ ] All new exported functions/components include JSDoc, and inline comments are limited to snapshot compatibility, concurrency, and other non-obvious integrity logic.
- [ ] The migration and rollback are tested, all targeted Vitest suites pass, and no new `.env` variables are introduced.
