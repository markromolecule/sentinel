# Fix 005 Implementation Plan: Deduplication And Audio Calibration

**Status:** Implemented (validation notes pending)  
**Date:** 2026-07-07  
**Type:** fix  
**Scope:** `sentinel-web`, `sentinel-support`, `sentinel-api`, `packages/shared`, `packages/hooks`, `packages/services`, `packages/db`

## Pre-Planning

- [x] Read and summarize the task input in one sentence: fix remaining student-attempt telemetry duplication and audio calibration issues by validating event dedupe end-to-end, wiring support-managed audio settings into live attempts, and correcting YAMNet class mappings against the bundled CSV.
- [x] Scan relevant source files to understand existing patterns:
    - `.agents/rules/implementation-plan.md`
    - `.agents/rules/global/1-3-1-rule.md`
    - `.agents/workflows/to-do-workflow.md`
    - `docs/context/July/deduplication-not-fix-audio-calibration.md`
    - `docs/task/2026-07-07/fix-004-implementation-plan-attempt-turn-in-dedupe-and-audio-anomaly.md`
    - `app/sentinel-web/public/models/yamnet/yamnet_class_map.csv`
    - `packages/shared/src/audio/audio-anomaly.ts`
    - `packages/shared/src/audio/yamnet-class-mapper.ts`
    - `packages/shared/src/audio/yamnet-class-mapper.test.ts`
    - `packages/shared/src/schema/audio/audio-settings-schema.ts`
    - `app/sentinel-web/src/workers/audio-anomaly-engine.ts`
    - `app/sentinel-web/src/workers/audio-anomaly.worker.ts`
    - `app/sentinel-web/src/workers/tests/audio-anomaly-engine.test.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-anomaly-telemetry.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/audio-anomaly-controller.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/create-audio-graph.ts`
    - `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-telemetry.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-metadata.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/payloads.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.ts`
    - `app/sentinel-web/src/features/exams/logs/hooks/use-incident-logs.ts`
    - `app/sentinel-support/src/app/(protected)/(support)/telemetry/_components/audio/audio-calibration-form.tsx`
    - `app/sentinel-support/src/app/(protected)/(support)/telemetry/_components/audio/audio-calibration-form.test.tsx`
    - `app/sentinel-support/src/app/(protected)/(support)/telemetry/_components/views/support-audio-calibration-view.tsx`
    - `packages/hooks/src/query/audio/use-audio-settings-query.ts`
    - `packages/hooks/src/query/audio/use-update-audio-settings-mutation.ts`
    - `packages/services/src/api/audio.ts`
    - `app/sentinel-api/src/modules/infrastructure/audio/audio.service.ts`
    - `app/sentinel-api/src/modules/infrastructure/audio/services/audio-resolver.service.ts`
    - `app/sentinel-api/src/modules/telemetry/ingestion/ingestion.service.ts`
    - `app/sentinel-api/src/modules/telemetry/ingestion/services/ingestion-queue.service.ts`
    - `app/sentinel-api/src/modules/telemetry/ingestion/rules/ai-rules.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-writer.service.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-details.utils.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-severity-resolver.service.ts`
    - `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts`
    - `packages/db/prisma/schema.prisma`
    - `packages/db/prisma/migrations/20260706000000_add_telemetry_dedupe_index/migration.sql`
- [x] Identify all files, services, and DB tables the task will touch:
    - Shared audio contracts: `packages/shared/src/audio/audio-anomaly.ts`, `packages/shared/src/audio/yamnet-class-mapper.ts`, `packages/shared/src/schema/audio/audio-settings-schema.ts`, and their tests.
    - Web audio runtime: `use-audio-anomaly-worker`, `use-anomaly-telemetry`, `audio-anomaly-controller`, `audio-anomaly-engine`, `audio-anomaly.worker`, and worker tests.
    - Student attempt flow: `use-student-exam-attempt/index.ts`, `use-attempt-monitoring.ts`, `use-exam-monitoring` listener/telemetry helpers, and attempt monitoring tests.
    - Support calibration UI/API consumers: `support-audio-calibration-view.tsx`, `audio-calibration-form.tsx`, audio query/mutation hooks, `packages/services/src/api/audio.ts`.
    - API audio and telemetry services: `AudioService`, `AudioSettingsResolverService`, telemetry ingestion policy/queue, incident persistence/writer/details/severity services.
    - Instructor surfaces: `use-monitoring.ts`, `use-incident-logs.ts`, and related incident/log tests.
    - DB tables: `flagged_incidents`, `exam_attempts`, and the settings table used by `getAudioSettingsData()` / `upsertAudioSettingsData()` for global audio anomaly config.
- [x] Determine if a Prisma migration is needed: No. `flagged_incidents.dedupe_key` and the partial unique index `flagged_incidents_dedupe_key_unique` already exist, and audio calibration already persists through the existing settings infrastructure. This implementation should verify the migration is applied in the target environment, but no new schema is required unless implementation proves the system needs a durable raw telemetry event ledger.

## 1-3-1 Options

### Option 1: Calibration-Only Patch

Correct `YAMNET_CLASS_IDS_BY_ANOMALY_TYPE`, adjust default thresholds, and update support UI copy while leaving the current student attempt wiring and dedupe behavior unchanged.

**Tradeoff:** Fast and focused on the obvious audio mapping bug, but support calibration can still be ignored by live attempts and duplicate event counts can remain inaccurate.

### Option 2: End-To-End Runtime Contract Fix

Correct the YAMNet class map, wire support-managed audio settings into live student attempts, make audio emission group one physical audio window predictably, and harden browser/server dedupe semantics with focused tests around the existing telemetry contracts.

**Tradeoff:** More files are touched, but it directly addresses every high-probability root cause without introducing new infrastructure or broad rewrites.

### Option 3: Raw Telemetry Ledger Refactor

Create a raw event ledger table, store every browser/audio telemetry event idempotently, derive `flagged_incidents` from the ledger, and rebuild occurrence counts from normalized raw events.

**Tradeoff:** Most robust long term for auditing, but it requires new schema, backfill/rollback planning, and a larger reporting refactor than this bug-fix scope needs.

## Best Option

Choose **Option 2: End-To-End Runtime Contract Fix**.

Why: The context points to multiple connected root causes, not one bad threshold. The current code already has clear boundaries for shared audio mapping, support settings, student attempt monitoring, audio telemetry, browser telemetry, and incident persistence. Fixing those contracts in place is maintainable, testable, and avoids the risk of a new telemetry architecture while still making student and instructor incident counts trustworthy.

## Concrete Next Steps

1. Add failing tests for YAMNet CSV mapping, support audio settings wiring, audio multi-label dedupe, clipboard/browser dedupe, and server duplicate-key semantics.
2. Correct `YAMNET_CLASS_IDS_BY_ANOMALY_TYPE` against `yamnet_class_map.csv` and recalibrate keyboard-related defaults or enabled anomaly policy.
3. Wire persisted support audio settings into the student attempt runtime instead of always passing `DEFAULT_AUDIO_ANOMALY_CONFIG`.
4. Make one physical audio window emit one predictable telemetry occurrence or one grouped metadata payload.
5. Normalize browser dedupe metadata for clipboard and other physical actions, then verify server persistence ignores exact duplicate keys and increments only distinct accepted actions.
6. Adjust instructor/log toast copy so deduped updates are not presented as separate new incidents.
7. Run focused Vitest suites for shared audio, web attempt/audio hooks, support calibration UI, telemetry persistence, and incident/log hooks.

## Phase 1: Regression Baseline And Class Map Verification

**Goal:** Lock down the current failures and prove the audio mapping is correlated with the bundled YAMNet CSV before behavior changes.

- [x] Add a CSV-backed test in `packages/shared/src/audio/yamnet-class-mapper.test.ts` that reads or mirrors the expected labels from `app/sentinel-web/public/models/yamnet/yamnet_class_map.csv` and proves `YAMNET_CLASS_IDS_BY_ANOMALY_TYPE.TYPING` maps to keyboard classes, not `Clock` / `Tick`.
- [x] Add class-map assertions in `packages/shared/src/audio/yamnet-class-mapper.test.ts` for `TALKING`, `TAPPING`, `MOUTH_BREATHING`, `BACKGROUND_NOISE`, and `SILENCE_DETECTED` so future edits cannot drift away from `yamnet_class_map.csv`.
- [x] Add a failing regression in `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx` proving `useStudentExamAttempt()` passes persisted audio settings into `useAttemptMonitoring()` when audio anomaly detection is enabled.
- [x] Add a failing regression in `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx` proving one worker `ANOMALY_DETECTED` message with multiple labels does not create duplicate student toasts or duplicate telemetry for one physical audio window according to the chosen grouping contract.
- [x] Add failing regressions in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` for one clipboard shortcut plus one resulting `copy` / `paste` DOM event producing exactly one emitted telemetry payload.
- [x] Add or update `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` for duplicate same `dedupeKey` leaving one row with `details.occurrenceCount = 1`, and a later distinct dedupe key inside the window updating to `2`.
- [x] Add or update `app/sentinel-support/src/app/(protected)/(support)/telemetry/_components/audio/audio-calibration-form.test.tsx` proving the current sensitivity helper copy matches the actual threshold math.

**Migration required:** No — this phase adds tests and source verification only.

## Phase 2: Correct YAMNet Mapping And Audio Calibration Defaults

**Goal:** Make shared audio anomaly labels evaluate the correct YAMNet classes and stop keyboard noise from being mislabeled as unknown-person audio.

- [x] Update `packages/shared/src/audio/audio-anomaly.ts` so `YAMNET_CLASS_IDS_BY_ANOMALY_TYPE` is corrected against `app/sentinel-web/public/models/yamnet/yamnet_class_map.csv`.
- [x] In `packages/shared/src/audio/audio-anomaly.ts`, include only approved talking classes such as `0 = Speech`, `1 = Child speech`, `2 = Conversation`, `3 = Narration`, and `4 = Babbling` if product policy treats each as talking.
- [x] In `packages/shared/src/audio/audio-anomaly.ts`, map keyboard classes to `378 = Typing`, `379 = Typewriter`, and `380 = Computer keyboard` if keyboard-specific detection remains enabled.
- [x] In `packages/shared/src/audio/audio-anomaly.ts`, replace the current `TAPPING` classes `398` and `402` with CSV-backed tapping classes such as `354 = Tap` only after confirming the desired semantics.
- [x] In `packages/shared/src/audio/audio-anomaly.ts`, replace `MOUTH_BREATHING: [287, 288]` with `36 = Breathing` or remove `MOUTH_BREATHING` from defaults if YAMNet cannot distinguish mouth breathing reliably enough.
- [x] In `packages/shared/src/audio/audio-anomaly.ts`, replace `BACKGROUND_NOISE: [494, 495, 496]` with background/noise classes such as `507 = Noise`, `508 = Environmental noise`, and optionally room-space classes `500-504`; keep `494 = Silence` only in the RMS-based silence path.
- [x] Update `packages/shared/src/audio/audio-anomaly.ts` defaults so `TYPING` and `TAPPING` are disabled by default or set to conservative thresholds if keyboard sounds should not create suspicious incidents during exams.
- [x] Update `packages/shared/src/audio/yamnet-class-mapper.ts` JSDoc or nearby comments to document that class IDs must be validated against `app/sentinel-web/public/models/yamnet/yamnet_class_map.csv`.
- [x] Write or update `packages/shared/src/audio/yamnet-class-mapper.test.ts` for corrected class IDs, keyboard threshold behavior, sensitivity multiplier behavior, and disabled keyboard anomaly defaults.
- [x] Write or update `app/sentinel-web/src/workers/tests/audio-anomaly-engine.test.ts` so keyboard-like scores do not trigger `TALKING` / `BACKGROUND_NOISE` and only trigger keyboard-specific labels when enabled by config.

**Migration required:** No — this phase changes shared constants, mapper documentation, and tests only.

## Phase 3: Support Audio Settings Runtime Wiring

**Goal:** Ensure support-managed global audio calibration controls live student attempts.

- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts` to query global audio settings through `useAudioSettingsQuery()` or an existing student exam provider when `effectiveConfiguration.aiRules.audio_anomaly_detection` is enabled.
- [x] Update `use-student-exam-attempt/index.ts` so `useAttemptMonitoring({ audioSettings })` receives the persisted `AudioAnomalySettingsRecord.value`, falling back to `DEFAULT_AUDIO_ANOMALY_CONFIG` only when the query has no saved record or fails in a controlled way.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.ts` to preserve the current `AudioAnomalySettings | null` contract and avoid starting audio monitoring until a stable runtime config is available.
- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/audio-anomaly-controller.ts` to continue posting `runtimeConfig ?? DEFAULT_AUDIO_ANOMALY_CONFIG` but prefer the caller-provided persisted settings whenever available.
- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.ts` so runtime config changes call `controller.updateConfig()` without tearing down the microphone stream unnecessarily.
- [x] Update `packages/hooks/src/query/audio/use-audio-settings-query.ts` only if student app authentication or query enabling prevents students from reading the settings endpoint.
- [x] Update `packages/services/src/api/audio.ts` only if the response shape needs a student-safe audio settings DTO; keep the `/settings/audio` path compatible.
- [x] Write or update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx` proving persisted support settings flow into `useAttemptMonitoring()` and defaults are used only as fallback.
- [x] Write or update `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.test.tsx` proving audio monitoring waits for a usable config and keeps using the checkup audio stream/worker.
- [x] Write or update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx` proving `UPDATE_CONFIG` reaches the worker when support settings change.

**Migration required:** No — audio settings already persist through the existing settings table and DTOs.

## Phase 4: Audio Event Grouping And Dedupe Semantics

**Goal:** Prevent one physical audio window from inflating student toasts, telemetry requests, instructor incidents, or occurrence counts.

- [x] Update `app/sentinel-web/src/workers/audio-anomaly-engine.ts` to choose the highest-confidence enabled anomaly per processed audio window, or emit a grouped anomaly payload that preserves secondary labels without creating separate incident streams.
- [x] Update `app/sentinel-web/src/workers/audio-anomaly.worker.ts` to forward the selected/grouped anomaly payload consistently to `use-audio-anomaly-worker`.
- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.ts` so one accepted worker message produces one student toast for one physical audio window.
- [x] Update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-anomaly-telemetry.ts` so audio `dedupeKey` is based on `examSessionId`, `AUDIO_ANOMALY`, the selected primary `anomalyType` or grouped window id, and a cooldown-aligned bucket.
- [x] Update `use-anomaly-telemetry.ts` metadata so grouped audio labels, `confidenceScore`, and primary `anomalyType` remain available inside `flagged_incidents.details.lastEvent.metadata`.
- [x] Update `app/sentinel-api/src/modules/telemetry/ingestion/rules/ai-rules.ts` only if grouped audio metadata no longer satisfies the existing `AudioAnomalyRule.evaluate()` confidence threshold path.
- [x] Update `app/sentinel-api/src/modules/telemetry/storage/services/incident-severity-resolver.service.ts` only if grouped audio labels require silence-specific severity filtering to look at `primaryAnomalyType` instead of `anomalyType`.
- [x] Write or update `app/sentinel-web/src/workers/tests/audio-anomaly-engine.test.ts` proving multi-label scores select/group one audio result per frame window.
- [x] Write or update `app/sentinel-web/src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx` proving one grouped worker message emits one toast and one telemetry request.
- [x] Write or update `app/sentinel-api/src/modules/telemetry/ingestion/rules/ai-rules.test.ts` proving grouped audio metadata above threshold still persists.
- [x] Write or update `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` proving repeated exact audio dedupe keys do not increment `occurrenceCount`, while separate accepted audio windows do.

**Migration required:** No — grouped audio metadata fits inside existing telemetry metadata and incident details JSON.

## Phase 5: Browser Action Dedupe Hardening

**Goal:** Make one physical browser-security action produce one client telemetry emission and one server-accepted occurrence.

- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners.ts` so clipboard events from `keydown`, `copy`, `cut`, and `paste` share one normalized `actionSource` such as `clipboard`.
- [x] Update `use-interaction-listeners.ts` so `registerClipboardIncident()` records the accepted timestamp before any path can create a second metadata object for the same physical action.
- [x] Update `use-interaction-listeners.ts` so right-click, fullscreen, focus, print-screen, and clipboard handlers all return before toast and metadata creation when the burst guard rejects the event.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-metadata.ts` only if the dedupe seed needs a more stable normalized source for clipboard and focus events.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-telemetry.ts` to preserve caller-provided `eventId`, `dedupeKey`, and `clientActionAt` without regenerating conflicting metadata.
- [x] Update `app/sentinel-api/src/modules/telemetry/storage/services/incident-writer.service.ts` only if exact duplicate `metadata.dedupeKey` submissions can still reach `updateExistingIncident()` and increment `occurrenceCount`.
- [x] Update `app/sentinel-api/src/modules/telemetry/ingestion/services/ingestion-queue.service.ts` only if Redis/sync batching can submit the same exact payload twice after retries.
- [x] Write or update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts` proving one clipboard shortcut plus browser clipboard event emits one `CLIPBOARD_ATTEMPT`.
- [x] Write or update `use-exam-monitoring.test.ts` proving right-click, fullscreen, focus, and print-screen burst duplicates emit one payload, while a later distinct action emits a second payload with a distinct dedupe key.
- [x] Write or update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-metadata.test.ts` proving normalized action sources produce stable dedupe keys.
- [x] Write or update `app/sentinel-api/src/modules/telemetry/storage/services/incident-persistence.service.test.ts` proving exact duplicate keys no-op and distinct keys inside `dedupeWindowSeconds` increment once.

**Migration required:** No — this phase uses the existing `flagged_incidents.dedupe_key` column and unique partial index.

## Phase 6: Instructor And Logs Display Semantics

**Goal:** Ensure instructor monitoring/log surfaces distinguish a new incident row from a deduped occurrence update.

- [x] Update `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.ts` so `toast.warning()` copy distinguishes a new incident from an occurrence-count update when the API exposes enough data.
- [x] Update `use-monitoring.ts` snapshot tracking to avoid warning repeatedly on initial hydration, pagination/filter churn, or unchanged `incidentCount` / `openIncidentCount`.
- [x] Update `app/sentinel-web/src/features/exams/logs/hooks/use-incident-logs.ts` so occurrence-count increases use copy such as "incident occurrence updated" instead of "new incident logged".
- [x] Update `use-incident-logs.ts` so grouped/student mode does not double-toast for the same incident ID and occurrence-count increase in one fetch cycle.
- [x] Update incident drawer or timeline components only if existing display hides `details.occurrenceCount`, `details.lastEvent.metadata.anomalyType`, or audio confidence after the above metadata changes.
- [x] Write or update `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx` proving no toast fires on initial load, one toast fires for a new incident count, and no duplicate toast fires for unchanged snapshots.
- [x] Write or update `app/sentinel-web/src/features/exams/logs/hooks/use-incident-logs.test.ts` proving new incident IDs and occurrence updates produce distinct copy and do not duplicate within one refetch.
- [x] Write or update existing incident drawer/timeline tests only if metadata display changes in this phase.

**Migration required:** No — this phase changes frontend display semantics only.

## Phase 7: Validation And Release Readiness

**Goal:** Verify the full dedupe and audio calibration fix across shared audio, student attempts, support calibration, API persistence, and instructor views.

- [x] Run `pnpm --dir packages/shared exec vitest run --passWithNoTests src/audio/yamnet-class-mapper.test.ts`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests src/workers/tests/audio-anomaly-engine.test.ts src/workers/tests/audio-anomaly.integration.test.ts`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests src/hooks/use-audio-anomaly-worker/use-audio-anomaly-worker.test.tsx`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx' 'src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-monitoring.test.tsx'`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring.test.ts' 'src/app/(protected)/student/exam/[id]/_lib/web-telemetry-client/_utils/action-metadata.test.ts'`.
- [x] Run `pnpm --dir app/sentinel-support exec vitest run --passWithNoTests 'src/app/(protected)/(support)/telemetry/_components/audio/audio-calibration-form.test.tsx'`.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run --passWithNoTests src/modules/telemetry/ingestion/rules/ai-rules.test.ts src/modules/telemetry/storage/services/incident-persistence.service.test.ts`.
- [x] Run `pnpm --dir app/sentinel-web exec vitest run --passWithNoTests 'src/app/(protected)/(instructor)/exams/[id]/monitoring/_hooks/use-monitoring.test.tsx' src/features/exams/logs/hooks/use-incident-logs.test.ts`.
- [ ] Run `pnpm lint` after focused tests pass.
- [ ] Run `pnpm format:check` after implementation files are formatted.
- [ ] Manually verify the target database has `flagged_incidents_dedupe_key_unique` applied before production QA.
- [ ] Manually verify support audio calibration changes alter live student attempt runtime config without redeploying.
- [ ] Manually verify keyboard typing during an exam does not create an unknown-person/talking audio flag under calibrated defaults.
- [ ] Manually verify intentional speech or configured background noise still creates one audio anomaly toast and one instructor-visible incident when the rule is enabled.
- [ ] Manually verify one clipboard action creates one toast and `occurrenceCount = 1`, while a second separate action increments to `2`.
- [ ] Manually verify instructor monitoring/logs show deduped occurrence updates as updates, not separate new incidents.

**Migration required:** No — validation only; existing migration state is verified manually.

## Public API / Type Changes

- No endpoint path changes are planned.
- `GET /settings/audio` and `PUT /settings/audio` should remain compatible.
- Student attempt runtime will begin consuming the existing audio settings response.
- Telemetry ingestion remains compatible; audio metadata may add grouped label fields if Phase 4 chooses grouped payloads.
- Shared audio constants will change semantic class IDs to match the bundled YAMNet CSV.

## Breaking API Changes

- None expected.

## New Environment Variables

- [x] None expected.

## Migration Rollback Note

- [x] No Prisma migration is planned.
- [ ] Verify `packages/db/prisma/migrations/20260706000000_add_telemetry_dedupe_index/migration.sql` is already applied in environments where duplicates are reported.
- [x] If a new migration becomes necessary, rollback must drop only the newly introduced index/table/column and preserve existing `flagged_incidents` rows.

## Done Criteria

- [x] `YAMNET_CLASS_IDS_BY_ANOMALY_TYPE` is proven against `app/sentinel-web/public/models/yamnet/yamnet_class_map.csv`.
- [x] Student attempts use support-managed audio calibration settings when audio anomaly detection is enabled.
- [x] Keyboard typing/tapping is not mislabeled as unknown-person/talking audio under calibrated defaults.
- [x] One physical audio window creates one student toast and one server-accepted occurrence.
- [x] One physical browser-security action creates one student toast and one server-accepted occurrence.
- [x] Duplicate telemetry posts with the same `dedupeKey` do not create new rows or increment `occurrenceCount`.
- [x] Distinct accepted actions inside the dedupe window increment occurrence counts correctly.
- [x] Instructor monitoring/logs distinguish new incidents from occurrence updates.
- [x] Focused Vitest suites and formatting/lint validation are recorded in the execution notes when implementation begins.

<!-- NOTE: Phase 5 source files already matched the intended clipboard/right-click/focus/fullscreen dedupe behavior during verification, so no additional production code edits were required beyond existing regression coverage. -->
<!-- NOTE: `pnpm lint` currently fails at `packages/db` because the workspace lint script cannot resolve `eslint` in this environment (`sh: eslint: command not found`). -->
<!-- NOTE: Full-repo `pnpm format:check` currently fails because the repository already contains unrelated Prettier drift across 95 files. Touched implementation files were formatted with `pnpm exec prettier --write ...` before final validation. -->
<!-- NOTE: Manual QA items and target-environment migration verification remain pending because they require a running app and deployment-specific database inspection beyond local source/test execution. -->
