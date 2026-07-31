# Permission Reverting And Examination Defaults Implementation Plan

## Task Summary

Fix Support-governed access-control and examination settings so role permission edits do not silently revert after successful API responses, and Support examination defaults become the canonical baseline consumed by exam creation, configuration, reports, grading, history, and client apps.

## Pre-Planning

- [x] Read and summarize the task input in one sentence: Support-managed Role Matrix and Examination Defaults currently save through successful API calls but are not reliably reflected after refresh, navigation, exam creation, or downstream exam/report flows.
- [x] Scan relevant source files to understand existing patterns:
    - `docs/context/July/permission-reverting-silent-failing.md`
    - `packages/services/src/api/access-control.ts`
    - `packages/hooks/src/query/access-control/use-access-control-role-mutations.ts`
    - `packages/hooks/src/query/access-control/use-access-control-examination-settings-query.ts`
    - `packages/shared/src/constants/access-control.ts`
    - `packages/shared/src/constants/permissions.ts`
    - `packages/shared/src/schema/access-control/access-control-schema.ts`
    - `packages/shared/src/schema/exams/exam-schema.ts`
    - `app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.ts`
    - `app/sentinel-api/src/middleware/auth.ts`
    - `app/sentinel-api/src/modules/security/roles/data/sync-system-role-permissions.ts`
    - `app/sentinel-api/src/modules/security/roles/services/replace-role-permissions.service.ts`
    - `app/sentinel-api/src/modules/security/access-control/services/access-control-examination-settings.service.ts`
    - `app/sentinel-api/src/modules/examination/exams/services/build-exam-write-values.service.ts`
    - `app/sentinel-api/src/modules/examination/configuration/services/get-exam-configuration-state.ts`
    - `app/sentinel-api/src/modules/examination/configuration/services/map-exam-configuration-state.ts`
    - `app/sentinel-web/src/features/exams/config/_hooks/use-exam-create-form.ts`
    - `app/sentinel-core/src/features/exams/config/_hooks/use-exam-create-form.ts`
- [x] Identify files, services, and DB tables the task will touch:
    - API services: RBAC catalog sync, role permission replacement, access-control examination settings, exam create/update write values, exam configuration mapping/save, reporting/grading/history response mapping.
    - Frontend hooks/components: Support Role Matrix hook/table, Support examination form, Web/Core exam create hooks, Web/Core builder stores/default helpers, Mobile exam adapter only if normalized API output is insufficient.
    - Shared contracts: access-control role/settings types, access-control schemas, exam create/update schemas, exam summary/detail/reporting schemas.
    - DB tables: `roles`, `rbac_role_permissions`, `rbac_permissions`, `system_settings`, `exams`, `exam_configurations`.
- [x] Determine if a Prisma migration is needed: Yes, add explicit RBAC permission sync metadata and remove DB defaults that prevent nullable examination fields from cleanly representing inherited global defaults.

## 1-3-1 Options

### Option 1: Guardrails And New-Exam Defaults Only

Make system role permission checkboxes read-only, reject system role permission mutations with a clear API error, and fetch Support examination settings only for Web/Core create-form defaults.

**Tradeoff:** Lowest implementation risk, but it does not let Support intentionally customize system-role baselines and does not satisfy real-time inherited defaults for reports, grading, or existing unset exam settings.

### Option 2: DB-Managed RBAC Customization And Canonical Examination Default Inheritance

Add explicit role permission sync mode metadata so Support can intentionally customize system-role mappings without catalog sync restoring blueprint permissions, and add a canonical examination-default resolver that treats nullable exam/configuration fields as inherited from `system_settings`.

**Tradeoff:** More work and a focused migration, but it directly fixes the silent revert root cause and gives all apps/API flows one source of truth for effective examination settings.

### Option 3: Full Policy Versioning And Settings Ledger

Create a versioned policy ledger for RBAC and examination defaults, store policy versions on every exam and role mutation, and recalculate downstream views by policy version.

**Tradeoff:** Strongest audit model long term, but it is a large architecture change with broad migrations, backfill complexity, and more moving parts than this fix needs.

## Best Option

Choose **Option 2: DB-Managed RBAC Customization And Canonical Examination Default Inheritance**.

It is the best fit because the current Role Matrix failure is caused by code-owned catalog sync re-inserting blueprint permissions, while the examination baseline failure is caused by hardcoded UI/API defaults bypassing `system_settings`. Option 2 keeps the current tables and route families, adds only targeted metadata/default migrations, preserves code-blueprint bootstrapping for untouched system roles, and makes Support defaults effective through shared API resolvers instead of duplicating fallback logic across apps.

## Concrete Next Steps

1. Add and migrate RBAC role permission sync metadata plus nullable inherited examination defaults.
2. Update RBAC sync and role-permission mutation services so Support-customized system roles are not silently restored from blueprints.
3. Update Support Role Matrix UX to show blueprint-managed versus customized roles and to reconcile autosave with the returned server state.
4. Add a canonical examination global-settings resolver in the API and expose a safe read endpoint for Web/Core exam creation.
5. Route exam create/update/configuration/reporting/grading/history through effective defaults when exam-local fields are unset.
6. Update Web/Core create forms and builder stores to hydrate defaults from the API instead of static constants.
7. Run focused Vitest suites and a manual cross-app validation pass for role persistence and examination baselines.

## Phase 1: Persistence And Contract Foundations

**Goal:** Add the minimum schema and shared contract support needed to distinguish code-blueprint role permissions from Support-customized role permissions and inherited examination defaults.

- [x] Add Prisma migration under `packages/db/prisma/migrations/` to add `roles.permission_sync_mode varchar(20) not null default 'BLUEPRINT'`.
- [x] In the same migration, backfill `roles.permission_sync_mode = 'CUSTOM'` for non-system roles and `roles.permission_sync_mode = 'BLUEPRINT'` for existing system roles.
- [x] In the same migration, drop DB defaults from nullable inherited examination fields: `exams.passing_score`, `exam_configurations.shuffle_questions`, `exam_configurations.show_correct_answers`, `exam_configurations.allow_review`, `exam_configurations.randomize_choices`, `exam_configurations.lobby_admission_mode`, `exam_configurations.max_reconnect_attempts`, `exam_configurations.strict_mode`, `exam_configurations.camera_required`, `exam_configurations.mic_required`, `exam_configurations.screen_lock`, and `exam_configurations.auto_submit_timeout_minutes`.
- [x] Update `packages/db/prisma/schema.prisma` to include `roles.permission_sync_mode` and remove `@default(...)` from the nullable inherited examination columns listed above.
- [x] Extend `AccessControlRole` in `packages/shared/src/types/access-control.ts` with `permissionSyncMode: 'BLUEPRINT' | 'CUSTOM'`.
- [x] Extend `accessControlRoleSchema` in `packages/shared/src/schema/access-control/access-control-schema.ts` with `permissionSyncMode`.
- [x] Update `app/sentinel-api/src/modules/security/roles/data/get-roles.ts` and `app/sentinel-api/src/modules/security/roles/services/utils.ts` to select and map `permission_sync_mode`.
- [x] Write or extend `packages/db/src/tests/roles-migration.test.ts` to assert `roles.permission_sync_mode` exists and defaults correctly for system/custom roles.
- [x] Extend `packages/shared/src/schema/access-control/access-control-schema.test.ts` to validate `permissionSyncMode` in access-control role responses.
- [x] Extend `app/sentinel-api/src/modules/security/roles/data/sync-system-roles.test.ts` to assert system-role sync does not overwrite a role already marked `CUSTOM`.

**Migration required:** Yes — this phase adds `roles.permission_sync_mode` and changes nullable examination column defaults so inherited values can be represented intentionally. Rollback should drop `roles.permission_sync_mode` and restore the previous DB defaults only after code is reverted.

## Phase 2: RBAC Sync And Mutation Semantics

**Goal:** Make a successful Role Matrix permission mutation durable by preventing catalog sync from restoring blueprint permissions for Support-customized roles.

- [x] Update `syncSystemRoles` in `app/sentinel-api/src/modules/security/roles/data/sync-system-roles.ts` so blueprint metadata updates do not reset `permission_sync_mode` for existing roles.
- [x] Update `syncSystemRolePermissions` in `app/sentinel-api/src/modules/security/roles/data/sync-system-role-permissions.ts` to insert missing blueprint permissions only for system roles with `permission_sync_mode = 'BLUEPRINT'`.
- [x] Update `replaceRolePermissions` in `app/sentinel-api/src/modules/security/roles/services/replace-role-permissions.service.ts` so replacing permissions for a system role sets `roles.permission_sync_mode = 'CUSTOM'` in the same transaction.
- [x] Add exported JSDoc-documented helper `resolveRolePermissionSyncMode(role: RoleRecord, nextPermissionIds: string[]): 'BLUEPRINT' | 'CUSTOM'` in `app/sentinel-api/src/modules/security/roles/services/role-permission-sync-mode.service.ts`.
- [x] Add service `resetRolePermissionsToBlueprint` in `app/sentinel-api/src/modules/security/roles/services/reset-role-permissions-to-blueprint.service.ts` that restores `SYSTEM_ROLE_BLUEPRINTS` mappings and sets `permission_sync_mode = 'BLUEPRINT'`.
- [x] Add controller and route `POST /access-control/roles/{roleId}/permissions/reset-blueprint` in `app/sentinel-api/src/modules/security/roles/controllers/reset-access-control-role-permissions.controller.ts` and `app/sentinel-api/src/modules/security/roles/roles.route.ts`.
- [x] Update `RolesService` in `app/sentinel-api/src/modules/security/roles/roles.service.ts` to export `resetRolePermissionsToBlueprint`.
- [x] Ensure `replaceAccessControlRolePermissionsRouteHandler` in `app/sentinel-api/src/modules/security/roles/controllers/replace-access-control-role-permissions.controller.ts` returns the updated role with the new `permissionSyncMode`.
- [x] Extend `app/sentinel-api/src/modules/security/roles/data/sync-system-role-permissions.test.ts` for blueprint roles being restored and custom roles not being restored.
- [x] Add `app/sentinel-api/src/modules/security/roles/services/replace-role-permissions.service.test.ts` covering custom-mode transition for system roles and unchanged behavior for custom roles.
- [x] Add `app/sentinel-api/src/modules/security/roles/services/reset-role-permissions-to-blueprint.service.test.ts` covering reset success, non-system rejection, and unknown role handling.
- [x] Add route tests in `app/sentinel-api/src/modules/security/roles/controllers/reset-access-control-role-permissions.controller.test.ts` for missing Support access, valid Support reset, and returned `permissionSyncMode = 'BLUEPRINT'`.

**Migration required:** No — this phase uses the metadata added in Phase 1.

## Phase 3: Support Role Matrix UX And Cache Reconciliation

**Goal:** Make the Role Matrix communicate whether a role is blueprint-managed or Support-customized and keep autosave state aligned with the server response.

- [x] Update `replaceAccessControlRolePermissions` and add `resetAccessControlRolePermissionsToBlueprint` in `packages/services/src/api/access-control.ts`.
- [x] Update `packages/hooks/src/query/access-control/use-access-control-role-mutations.ts` to expose `useResetAccessControlRolePermissionsToBlueprintMutation`.
- [x] Update `invalidateRoleQueries` in `packages/hooks/src/query/access-control/use-access-control-role-mutations.ts` so role permission replacement and blueprint reset invalidate `roles`, `overview`, and `permissions` query keys.
- [x] Update `useRoleMatrix` in `app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.ts` to reconcile `draftPermissionIdsByRoleId` from the mutation response immediately before invalidation refetch completes.
- [x] Update `useRoleMatrix` to clear pending and confirmed refs when the returned role `permissionIds` match the submitted permissions.
- [x] Update `RoleMatrixView` in `app/sentinel-support/src/app/(protected)/(support)/control/_components/views/role-matrix-view.tsx` to show a compact badge for `permissionSyncMode` beside each role header through `RoleMatrixTable`.
- [x] Update `RoleMatrixTable` and table header components under `app/sentinel-support/src/app/(protected)/(support)/control/roles/_components/table/` to expose a reset-to-blueprint action only when `role.isSystem && role.permissionSyncMode === 'CUSTOM'`.
- [x] Add confirmation dialog `app/sentinel-support/src/app/(protected)/(support)/control/roles/_components/dialog/reset-role-permissions-dialog.tsx` for resetting a customized system role to blueprint permissions.
- [x] Update user-facing toast copy in `useRoleMatrix` so a first system-role edit explains that the role is now Support-customized.
- [x] Extend `packages/hooks/src/query/access-control/use-access-control-role-mutations.test.ts` for reset mutation and broader invalidation.
- [x] Extend `app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.test.ts` for successful autosave reconciliation, system-role custom-mode response, and reset-to-blueprint mutation.
- [x] Add or extend component tests for `RoleMatrixTable` under `app/sentinel-support/src/app/(protected)/(support)/control/roles/_components/` to assert sync-mode badges and reset action visibility.

**Migration required:** No — this phase consumes Phase 1 contracts and Phase 2 endpoints.

## Phase 4: Canonical Examination Defaults Resolver

**Goal:** Provide one API resolver for effective global examination settings and make it safe for non-Support exam creation flows to read defaults.

- [x] Add exported JSDoc-documented helper `parseExaminationGlobalSettingsValue(value: unknown): ExaminationGlobalSettings` in `app/sentinel-api/src/modules/security/access-control/services/access-control-examination-settings.service.ts`.
- [x] Add exported JSDoc-documented service `resolveExaminationGlobalSettings(dbClient: DbClient): Promise<ExaminationGlobalSettings>` in `app/sentinel-api/src/modules/examination/configuration/services/resolve-examination-global-settings.service.ts`.
- [x] Update `AccessControlExaminationSettingsService.getExaminationSettings` in `app/sentinel-api/src/modules/security/access-control/services/access-control-examination-settings.service.ts` to use `resolveExaminationGlobalSettings` instead of directly casting `setting_value`.
- [x] Add public authenticated route `GET /examination/configuration/defaults` in `app/sentinel-api/src/modules/examination/configuration/configuration.route.ts` and controller `app/sentinel-api/src/modules/examination/configuration/controllers/get-examination-configuration-defaults.controller.ts` for instructor/admin/core clients that can create exams.
- [x] Gate `GET /examination/configuration/defaults` with existing active permissions that allow exam creation or management, such as `examinations:create` or `examinations:update`.
- [x] Add shared service client `getExaminationConfigurationDefaults` in `packages/services/src/api/exams/configuration.ts`.
- [x] Add hook `useExaminationConfigurationDefaultsQuery` under `packages/hooks/src/query/exams/`.
- [x] Add query key for examination defaults in `packages/shared/src/constants/exams/` or the existing query-key module used by exam hooks.
- [x] Write `app/sentinel-api/src/modules/examination/configuration/services/resolve-examination-global-settings.service.test.ts` for missing row fallback, object JSON value, stringified JSON value, partial malformed values, and Support-saved settings.
- [x] Add route tests in `app/sentinel-api/src/modules/examination/configuration/controllers/get-examination-configuration-defaults.controller.test.ts` for permission allowed, permission denied, and returned defaults.
- [x] Add hook tests for `useExaminationConfigurationDefaultsQuery` in `packages/hooks/src/query/exams/use-examination-configuration-defaults-query.test.ts`.

**Migration required:** No — this phase reads from existing `system_settings` and the Phase 1 nullable defaults.

## Phase 5: Exam Create, Update, And Configuration Inheritance

**Goal:** Make exam-local values inherit Support defaults when omitted and preserve explicit exam overrides when instructors deliberately set them.

- [x] Update `createExamBodySchema` in `packages/shared/src/schema/exams/exam-schema.ts` so `passingScore`, `shuffleQuestions`, `showCorrectAnswers`, `allowReview`, `randomizeChoices`, and `configuration` fields can be omitted to inherit global defaults.
- [x] Keep `durationMinutes` required for schedule validation, but update create-form defaults so the value comes from `defaultDurationMinutes`.
- [x] Update `updateExamBodySchema` in `packages/shared/src/schema/exams/exam-schema.ts` so passing score and default-governed settings can be set to `null` to return to inherited global defaults.
- [x] Update `buildExamSettingsInput` in `app/sentinel-api/src/modules/examination/exams/services/build-exam-write-values.service.ts` to preserve `undefined` as "do not update" and `null` as "inherit global default" instead of coercing to `false`.
- [x] Update `buildCreateExamValues` in `app/sentinel-api/src/modules/examination/exams/services/build-exam-write-values.service.ts` to write `passing_score: body.passingScore ?? null` when no explicit passing score is provided.
- [x] Update `buildUpdateExamValues` in `app/sentinel-api/src/modules/examination/exams/services/build-exam-write-values.service.ts` to support `passing_score = null` only when the client explicitly sends `passingScore: null`.
- [x] Update `resolveExamSettings` in `app/sentinel-api/src/modules/examination/configuration/services/resolve-exam-settings.ts` to accept global defaults and return nullable inherited settings for persistence.
- [x] Update `mapExamConfigurationState` in `app/sentinel-api/src/modules/examination/configuration/services/map-exam-configuration-state.ts` so null exam configuration fields resolve to `resolveExaminationGlobalSettings` defaults for response values.
- [x] Update `saveExamConfiguration` in `app/sentinel-api/src/modules/examination/configuration/services/save-exam-configuration.ts` to persist `null` for omitted inherited settings and explicit values only for changed fields.
- [x] Add exported JSDoc-documented helper `resolveEffectiveExamBaseline(record, globalSettings)` in `app/sentinel-api/src/modules/examination/exams/services/resolve-effective-exam-baseline.service.ts` for duration, passing score, and general settings.
- [x] Use `resolveEffectiveExamBaseline` in `getExamDetail` before `mapExamDetailResponse` in `app/sentinel-api/src/modules/examination/exams/services/get-exam-detail.service.ts`.
- [x] Extend `packages/shared/src/schema/exams/exam-create-schema.test.ts` and `packages/shared/src/schema/exams/exam-schema.test.ts` for omitted inherited fields and explicit/null override behavior.
- [x] Extend `app/sentinel-api/src/modules/examination/exams/services/create-exam.service.test.ts` for inherited `passing_score = null` and explicit `passing_score = 75`.
- [x] Extend `app/sentinel-api/src/modules/examination/exams/services/update-exam.service.test.ts` for explicit null reverting to global passing score.
- [x] Extend `app/sentinel-api/src/modules/examination/configuration/configuration.test.ts` and `configuration.service.test.ts` for global default inheritance across general settings and runtime configuration.
- [x] Add `app/sentinel-api/src/modules/examination/exams/services/resolve-effective-exam-baseline.service.test.ts` for null, explicit, and malformed global fallback cases.

**Migration required:** No — this phase uses the nullable columns and dropped defaults established in Phase 1.

## Phase 6: Web And Core Default Hydration

**Goal:** Remove stale hardcoded examination baselines from Web/Core create and builder flows by hydrating defaults from the API.

- [x] Update `getExamCreateFormDefaults` in `packages/shared/src/constants/exams/exam-constants.ts` to accept an optional `ExaminationGlobalSettings` argument and default to `DEFAULT_EXAMINATION_GLOBAL_SETTINGS` only when API defaults have not loaded.
- [x] Update `app/sentinel-web/src/features/exams/config/_hooks/use-exam-create-form.ts` to call `useExaminationConfigurationDefaultsQuery` and reset form defaults once settings load if the user has not dirtied the form.
- [x] Update `app/sentinel-core/src/features/exams/config/_hooks/use-exam-create-form.ts` to call `useExaminationConfigurationDefaultsQuery` and reset form defaults once settings load if the user has not dirtied the form.
- [x] Update Web builder store defaults in `app/sentinel-web/src/features/exams/builder/_stores/use-exam-store/constants.ts` so `DEFAULT_EXAM_STORE_STATE` uses shared global defaults instead of hardcoded `passingScore: 75`.
- [x] Update Core builder store defaults in `app/sentinel-core/src/features/exams/builder/_stores/use-exam-store.ts` so default setup uses shared global defaults instead of hardcoded `passingScore: 75`.
- [x] Update builder constants in `app/sentinel-web/src/features/exams/builder/_constants/builder.ts` and `app/sentinel-core/src/features/exams/builder/_constants/builder.ts` to remove the conflicting `passingScore: 60` fallback or derive it from shared defaults.
- [x] Update create-form submit logic in Web/Core hooks so untouched default-governed values can be omitted when the exam should inherit global defaults, while dirty values are submitted as explicit overrides.
- [x] Update create-form loading UI in Web/Core only if needed to avoid flashing hardcoded defaults before API defaults arrive.
- [x] Extend `app/sentinel-web/src/features/exams/config/_hooks/use-exam-create-form.test.ts` for API default hydration and dirty-form preservation.
- [x] Extend `app/sentinel-core/src/features/exams/config/_hooks/use-exam-create-form.test.ts` for API default hydration and dirty-form preservation.
- [x] Extend Web/Core builder store tests to assert default passing score comes from shared defaults and hydrate/setup still preserves explicit exam values.

**Migration required:** No — frontend and shared default hydration only.

## Phase 7: Downstream Effective Baseline Consumption

**Goal:** Ensure reports, grading, history, student responses, and mobile-facing data use effective examination baselines instead of raw nullable database values.

- [x] Update `mapExamSummaryResponse`, `mapExamDetailResponse`, and history mapping in `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.service.ts` to consume already-resolved effective `passingScore` and settings rather than falling back to `0`.
- [x] Update `getReportingExamContext` in `app/sentinel-api/src/modules/examination/reporting/services/get-reporting-exam-context.ts` to resolve null `passing_score` through `resolveExaminationGlobalSettings`.
- [x] Update `map-reporting-response.ts` and `reporting-response.shared.ts` usage only if needed so pass/fail, retake flags, and pass-rate calculations receive effective passing score.
- [x] Update grading detail services under `app/sentinel-api/src/modules/examination/grading/` to use effective passing score when an exam inherits the global baseline. No grading service consumed `passing_score`, so no code change was required after verification.
- [x] Update `get-student-exam-history-detail.ts` under `app/sentinel-api/src/modules/examination/history/services/` to use effective passing score for student result labels.
- [x] Confirm `app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.ts` can keep consuming normalized `exam.passingScore`; update only if mobile receives raw API data from another route. No mobile change required.
- [x] Extend `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.test.ts` for inherited passing score and explicit passing score.
- [x] Extend reporting tests under `app/sentinel-api/src/modules/examination/reporting/services/` for inherited global baseline pass/fail and pass-rate calculations.
- [x] Extend grading tests under `app/sentinel-api/src/modules/examination/grading/` for inherited global passing score. No new grading assertion was needed because grading services never referenced passing score.
- [x] Extend history tests in `app/sentinel-api/src/modules/examination/history/services/get-student-exam-history-detail.test.ts` for inherited global passing score.
- [x] Add or update mobile adapter tests under `app/sentinel-mobile/features/exam/lib/` if a mobile-specific mapping change is required. No adapter test change required because the adapter already consumes normalized API `exam.passingScore`.

**Migration required:** No — this phase consumes effective values resolved by API services.

## Phase 8: Validation, Rollout, And Manual QA

**Goal:** Prove the fix across RBAC persistence, Support UI state, global examination defaults, and downstream exam flows before release.

- [x] Run focused RBAC API tests with `pnpm --dir app/sentinel-api exec vitest run src/modules/security/roles src/modules/security/access-control`.
- [x] Run focused examination API tests with `pnpm --dir app/sentinel-api exec vitest run src/modules/examination/configuration src/modules/examination/exams src/modules/examination/reporting src/modules/examination/history src/modules/examination/grading`.
- [x] Run Support UI tests with `pnpm --dir app/sentinel-support exec vitest run src/app/(protected)/(support)/control`.
- [x] Run shared package schema/default tests with `pnpm --dir packages/shared test`.
- [x] Run hooks tests with `pnpm --dir packages/hooks test`.
- [x] Run Web exam configuration tests with `pnpm --dir app/sentinel-web exec vitest run src/features/exams/config src/features/exams/builder`.
- [x] Run Core exam configuration tests with `pnpm --dir app/sentinel-core exec vitest run src/features/exams/config src/features/exams/builder`.
- [x] Run `pnpm lint` after implementation to catch cross-workspace TypeScript and ESLint issues.
- [x] Manually verify editing a system role permission returns `permissionSyncMode = CUSTOM`, survives refresh, and is not restored by a later authenticated API call.
- [x] Manually verify reset-to-blueprint restores a customized system role and returns `permissionSyncMode = BLUEPRINT`.
- [x] Manually verify changing Support `defaultPassingScore` is reflected in new Web/Core exam create forms.
- [x] Manually verify a newly created inherited exam stores `exams.passing_score = null` and reports/history show the current global passing score.
- [x] Manually verify an exam with an explicit passing score keeps that score after Support defaults change.
- [x] Manually verify inherited configuration fields such as lobby admission mode and reconnect attempts resolve consistently in student lobby/attempt flows.

**Migration required:** No — validation only; the schema migration is owned by Phase 1.

## Breaking API Changes

- Exam create/update schemas will accept omitted or null default-governed values to represent inherited Support defaults. Existing clients that send explicit values remain compatible.
- Access-control role responses add `permissionSyncMode`; existing consumers should ignore the extra field unless they opt into the new UX.
- New reset-to-blueprint endpoint is additive.

## New Environment Variables

- [x] None expected.

## Migration Rollback Note

- [x] Roll back code before reverting the Phase 1 migration so runtime code does not read missing `roles.permission_sync_mode`.
- [x] To roll back RBAC metadata, drop `roles.permission_sync_mode`; system roles will return to code-blueprint sync behavior.
- [x] To roll back inherited examination defaults, restore the previous DB defaults on `exams.passing_score` and the listed `exam_configurations` columns.
- [x] Before restoring defaults, decide whether inherited null values should be backfilled to the current global defaults or to the old static defaults to avoid response ambiguity after rollback.

## Done Criteria

- [x] Role Matrix permission replacements for system roles persist after refresh and after another authenticated API request.
- [x] Support-customized system roles are clearly labeled and can be reset to blueprint permissions.
- [x] No successful Role Matrix mutation is silently undone by catalog sync.
- [x] Support examination defaults are read through one canonical API resolver.
- [x] Web and Core create forms hydrate default duration, passing score, general settings, and runtime settings from the canonical defaults endpoint.
- [x] New inherited exams store nullable inherited fields and return effective values in API responses.
- [x] Reports, grading, student history, and mobile-facing exam payloads use effective passing scores.
- [x] Every phase has focused Vitest coverage for the source files it changes.
