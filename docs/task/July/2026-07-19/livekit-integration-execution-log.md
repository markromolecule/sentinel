# LiveKit Integration Execution Log

## Work Package 01: Foundation and Configuration

- Date: 2026-07-19
- Starting repository status: untracked LiveKit context/planning documents under `docs/context/July/July 19/` and `docs/task/2026-07-19/`; no implementation files modified at package start.
- Baseline tests before implementation: not run before edits; package 01 was explicitly requested for execution after plan creation.
- Package 02-06 implementation status at entry: not started in this execution.
- Dependency install:
    - `pnpm --dir app/sentinel-api add livekit-server-sdk`: passed, added `livekit-server-sdk ^2.17.0`.
    - `pnpm --dir packages/hooks add livekit-client`: passed, added `livekit-client ^2.20.1`.
- Focused tests:
    - `pnpm --dir app/sentinel-api test --run src/modules/infrastructure/livekit/livekit.config.test.ts src/modules/infrastructure/livekit/livekit.service.test.ts`: passed, 2 test files and 11 tests.
- Build and type checks:
    - `pnpm --dir packages/hooks build`: passed.
    - Scoped server SDK typecheck using `livekit-server-sdk` imports under `app/sentinel-api`: passed.
    - Scoped client SDK typecheck using `livekit-client` imports under `packages/hooks`: passed.
    - `pnpm --dir app/sentinel-api typecheck`: failed at the default 4 GB heap limit with a Node out-of-memory error.
    - `NODE_OPTIONS="--max-old-space-size=8192" pnpm --dir app/sentinel-api exec tsc --noEmit`: failed on existing repo-wide TypeScript errors outside the LiveKit package, beginning with missing `src/modules/_shared/authorization-scope/*` modules and older Hono test context typing errors.
- Formatting:
    - `pnpm format:check`: failed because the repository currently has 199 pre-existing formatting warnings across unrelated apps/docs/packages.
    - Targeted package-01 Prettier check for touched files: passed.
- Dependency/scope review:
    - No AWS SDK, recording, Egress, or `@livekit/components-react` package was added.
    - No `NEXT_PUBLIC_LIVEKIT_*` variable was added.
    - The obsolete empty EC2 service file was deleted.
    - Lockfile review found two Expo peer-resolution line normalizations around React 19.1/19.2; no Expo package dependency was added or upgraded.
    - Dependency scan found no AWS SDK, recording, Egress, `@livekit/components-react`, or `NEXT_PUBLIC_LIVEKIT_*` usage in the package-01 dependency/configuration surface.

## Work Package 02: Persistence, Contracts, and Authorization

- Date: 2026-07-19
- Entry gate:
    - Work-package-01 commit present: `d8e48b6b feat(livekit): add managed service foundation`.
    - Package 03-06 implementation status at entry: not started in this execution.
    - `LIVE_INSPECTION_ENABLED` scan found no enabled shared environment value in tracked package-02 scope.
- Implemented:
    - Shared live-inspection state, response, and transition schemas.
    - Prisma lease/webhook models, generated Kysely types, and migration SQL with active partial indexes, check constraints, private Realtime trigger, SELECT-only student policy, and no browser INSERT policy.
    - Dedicated `examinations:monitor_live_video` permission for `superadmin`, `admin`, and `instructor`; support and student are excluded.
    - Relationship-aware viewer/student access service, provider-independent repository helpers, and state-transition service.
- Verification:
    - `pnpm --dir packages/db generate`: passed.
    - `pnpm --dir packages/shared test --run src/schema/exams/live-inspection-schema.test.ts`: passed, 1 file and 6 tests.
    - `pnpm --dir packages/shared build`: passed.
    - `pnpm --dir packages/db test --run src/tests/live-inspection-schema.test.ts src/tests/live-inspection-realtime-policy.test.ts`: passed, 2 files and 6 tests.
    - `pnpm --dir packages/db build`: passed.
    - Focused API live-inspection TypeScript check through a temporary scoped tsconfig: passed.
    - `pnpm --dir app/sentinel-api test --run src/modules/security/permission/data/sync-system-permissions.test.ts src/modules/examination/live-inspection/live-inspection-access.service.test.ts src/modules/examination/live-inspection/live-inspection.repository.test.ts src/modules/examination/live-inspection/live-inspection-state.service.test.ts --testNamePattern "^(?!.*sync permissions into the database).*"`: passed, 4 files, 29 tests passed and 1 existing DB-backed sync test skipped.
    - Targeted Prettier check for package-02 touched files: passed.
- Database-backed validation:
    - `pnpm --dir packages/db exec prisma migrate status`: confirmed `20260719143000_add_live_inspection_leases` was pending before provider endpoints were mounted.
    - First deploy attempt failed on Supabase with `ERROR: must be owner of table messages` for `ALTER TABLE "realtime"."messages" ENABLE ROW LEVEL SECURITY`; follow-up catalog check confirmed `realtime.messages` already had RLS enabled and was owned by `supabase_realtime_admin`.
    - Rollback-only permission probe confirmed the migration role can create the required SELECT policy on `realtime.messages`; the migration was corrected to remove the owner-only RLS enable statement.
    - Reviewed and added `packages/db/prisma/migrations/20260719143000_add_live_inspection_leases/rollback.sql`; the empty partial LiveKit tables/functions from the failed attempt were dropped with that rollback script, then Prisma marked the failed attempt rolled back.
    - `pnpm --dir packages/db exec prisma migrate deploy`: passed after repair, applying `20260719143000_add_live_inspection_leases`.
    - DB-backed concurrent synthetic lease validation passed:
        - duplicate active attempt rejected by `live_inspection_leases_active_attempt_key`;
        - duplicate active viewer rejected by `live_inspection_leases_active_viewer_key`.
    - Cleanup verification confirmed zero remaining synthetic `codex-livekit-*` leases, attempts, and auth users.

## Work Package 03: Managed Service and Lease API

- Date: 2026-07-20
- Entry gate:
    - Work-package-02 commits present: `e9473f95 feat(livekit): add inspection persistence contracts` and `232165a9 fix(livekit): validate inspection lease migration`.
    - `LIVE_INSPECTION_ENABLED` scan found no enabled shared environment value in tracked package-03 scope.
- Implemented:
    - Managed `LiveKitManagedService` adapter for two-participant rooms, publisher/viewer token grants, idempotent provider cleanup, participant listing, and raw-body webhook verification.
    - Staff lease orchestration for start, redacted status, viewer connection, and idempotent stop under `/exams/:examId/monitoring/live-inspections`.
    - Student directive and publisher connection/acknowledgement APIs under `/examination/flow/live-inspections`, resolving ownership exclusively through `sessionId`.
    - Unauthenticated `/infrastructure/livekit/webhooks` ingress with verified SDK receiver, webhook dedupe processing, state transitions, and bounded event-result storage.
    - Expiry reconciler with startup/shutdown hooks gated by `LIVE_INSPECTION_ENABLED`.
    - Typed service clients and hooks, with token-bearing credential acquisition kept as imperative helpers outside TanStack Query caches.
- Verification:
    - Focused API implementation typecheck: `NODE_OPTIONS="--max-old-space-size=8192" pnpm --dir app/sentinel-api exec tsc --noEmit -p tsconfig.livekit-package03.tmp.json`: passed before removing the temporary config.
    - `pnpm --dir app/sentinel-api test --run src/modules/infrastructure/livekit/services/livekit-managed.service.test.ts src/modules/examination/live-inspection/live-inspection.routes.test.ts src/modules/examination/live-inspection/services/start-live-inspection.service.test.ts src/modules/examination/live-inspection/services/live-inspection-webhook.service.test.ts src/modules/examination/live-inspection/services/live-inspection-reconciler.service.test.ts`: passed, 5 files and 13 tests.
    - `pnpm --dir packages/shared build`: passed.
    - `pnpm --dir packages/services build`: passed.
    - `pnpm --dir packages/hooks build`: passed.
    - `pnpm --dir packages/services test --run src/api/exams/live-inspection.test.ts`: passed as part of the package test command, 15 files and 32 tests.
    - `pnpm --dir packages/hooks test --run src/query/exams/live-inspection/live-inspection-hooks.test.ts`: passed as part of the package test command, 46 files and 110 tests.
- Known repo-wide validation caveat:
    - The full API graph still has pre-existing unrelated TypeScript blockers outside this package, including older NodeNext explicit-extension issues in calendar controllers and `import.meta` in existing LiveKit config tests when pulled into CommonJS output. Package-03 validation therefore used the focused LiveKit API graph plus shared/service/hook builds.

## Work Package 04: Student Publisher and Signaling

- Date: 2026-07-20
- Entry gate:
    - Work-package-03 commit present: `f9e5ac7d feat(livekit): add managed inspection api`.
    - Feature remained disabled outside local test accounts.
- Implemented:
    - Shared student LiveKit publisher hook using private Supabase Broadcast only as a wake-up hint and Sentinel API as the authoritative directive source.
    - Camera-track clone utilities so LiveKit cleanup stops only the cloned inspection track, not the original MediaPipe stream.
    - Student attempt bridge and accessible live-camera indicator rendered only while a lease is actually `LIVE`.
    - Attempt/session contract updates to expose canonical attempt/session IDs and live-inspection eligibility without exposing tokens.
    - Privacy/checkup copy clarifying authorized live camera viewing, no microphone publishing, and no recording for this feature.
- Verification:
    - Hook tests covered private-channel configuration, authoritative refetch, missed-event recovery, stale revision rejection, reconnect, hidden-page behavior, cleanup, no second `getUserMedia()`, no microphone publication, ready timing, token non-persistence, and clone-only cleanup.
    - Student bridge/page/privacy/checkup tests covered eligibility, visible-live timing, false-indicator prevention, submission cleanup, blocked state, camera-optional exams, and disclosure copy.
    - `pnpm --dir packages/hooks build && pnpm --dir packages/hooks test`: passed in the package execution.
    - Focused `sentinel-web` student bridge/attempt/checkup/privacy tests and build: passed in the package execution.

## Work Package 05: Shared Cross-App Viewer

- Date: 2026-07-20
- Entry gate:
    - Work-package-04 commit present: `6168436f feat(livekit): add student publisher bridge`.
    - No portal displayed a real start control before the shared viewer tests existed.
- Implemented:
    - Shared `useLiveInspectionViewer()` hook with bounded UI states, imperative start/stop, token non-persistence, expected publisher identity filtering, expected camera/video track filtering, and `LIVE` only after video playback evidence.
    - Shared `LiveVideoMonitor` UI component with accessible states, keyboard-visible controls, no audio/record/download controls, and no provider token/room identifiers.
    - Thin `sentinel-core` and `sentinel-web` wrappers that consume the shared hook/UI while preserving each portal's routing and authorization context.
    - Cross-app race coverage for simultaneous core/web starts against the same attempt.
- Verification:
    - `pnpm --dir packages/hooks build && pnpm --dir packages/hooks test`: passed.
    - `pnpm --dir packages/ui build && pnpm --dir packages/ui test`: passed.
    - `pnpm --dir app/sentinel-core exec vitest run src/features/exams/monitoring/_components/live-feed-monitor.test.tsx src/app/'(protected)'/exams/'[id]'/monitoring/page.test.tsx`: passed.
    - `pnpm --dir app/sentinel-web exec vitest run src/features/exams/monitoring/_components/live-feed-monitor.test.tsx src/app/'(protected)'/'(instructor)'/exams/'[id]'/monitoring/page.test.tsx`: passed.
    - `pnpm --dir app/sentinel-core build`: passed with sandbox escalation for Turbopack process binding.
    - `pnpm --dir app/sentinel-web build`: passed with sandbox escalation for Google Fonts network access.

## Work Package 06: Resilience, Validation, and Rollout

- Date: 2026-07-20
- Entry gate:
    - Work-package-01 commit present: `d8e48b6b feat(livekit): add managed service foundation`.
    - Work-package-02 commits present: `e9473f95 feat(livekit): add inspection persistence contracts` and `232165a9 fix(livekit): validate inspection lease migration`.
    - Work-package-03 commit present: `f9e5ac7d feat(livekit): add managed inspection api`.
    - Work-package-04 commit present: `6168436f feat(livekit): add student publisher bridge`.
    - Work-package-05 commit present: `d0493a00 feat(livekit): add cross-app viewer`.
    - Production enablement remains guarded by `LIVE_INSPECTION_ENABLED=false` in examples and no committed institution allowlist value.
- Implemented:
    - Bounded LiveKit lifecycle audit/metric helper for requested, publisher-connecting, publisher-ready, viewer-connection-requested, live, ended, failed, expired, and cleanup-failed events.
    - Lifecycle event calls across start, publisher connection, publisher-ready acknowledgement, viewer connection, stop, verified webhook transitions, publisher failure acknowledgement, and expiry reconciliation.
    - OpenAPI registration for `/infrastructure/livekit/webhooks` so the generated API contract includes webhook ingress.
    - Opt-in managed-provider smoke test guarded by `LIVEKIT_SMOKE_TEST_ENABLED=true`; skipped by default and deletes its smoke room in `finally`.
    - Runbook, browser/network/cost matrix, and security/privacy checklist under `docs/testing/`.
- Manual gates still required before production allowlisting:
    - Two-browser Chrome/Firefox/Safari/WebKit validation with synthetic accounts.
    - Dedicated non-production LiveKit dashboard evidence for first frame, participant counts, cleanup, and quota.
    - Capacity scenarios for 60 uninspected attempts, 1 inspection, 10 inspections, duplicate starts, duplicate viewer leases, and cap exhaustion.
    - Product/privacy approval for student disclosure, allowed staff roles, metadata retention, and no-recording/no-audio policy.
- Verification:
    - `pnpm --dir app/sentinel-api exec vitest run src/modules/infrastructure/livekit/livekit.service.test.ts src/modules/infrastructure/livekit/livekit.routes.test.ts src/modules/infrastructure/livekit/services/livekit-managed.service.test.ts src/modules/infrastructure/livekit/services/livekit-managed.smoke.test.ts src/modules/examination/live-inspection/live-inspection.routes.test.ts src/modules/examination/live-inspection/live-inspection-access.service.test.ts src/modules/examination/live-inspection/live-inspection-state.service.test.ts src/modules/examination/live-inspection/live-inspection.repository.test.ts src/modules/examination/live-inspection/services/start-live-inspection.service.test.ts src/modules/examination/live-inspection/services/live-inspection-webhook.service.test.ts src/modules/examination/live-inspection/services/live-inspection-reconciler.service.test.ts`: passed, 10 files and 36 tests; opt-in provider smoke skipped by default.
    - Scoped LiveKit API source typecheck with temporary package-06 tsconfig and `NODE_OPTIONS=--max-old-space-size=8192`: passed; test compilation covered by Vitest.
    - `pnpm --dir packages/hooks build`: passed.
    - `pnpm --dir packages/ui build`: passed.
    - `pnpm --dir packages/hooks test --run src/live-inspection/use-live-inspection-viewer.test.tsx src/live-inspection/use-student-live-inspection-publisher.test.tsx`: passed, 49 files and 122 tests.
    - `pnpm --dir packages/ui test --run src/live-inspection/live-video-monitor.test.tsx`: passed, 1 file and 3 tests.
    - `pnpm --dir app/sentinel-web test --run 'src/app/(protected)/student/exam/[id]/_components/student-live-inspection-bridge.test.tsx' 'src/features/exams/monitoring/_components/live-feed-monitor.test.tsx'`: passed, 2 files and 3 tests.
    - `pnpm --dir app/sentinel-core test --run src/features/exams/monitoring/_components/live-feed-monitor.test.tsx`: passed, 1 file and 1 test.
    - `pnpm --dir app/sentinel-core build`: passed when rerun with sandbox escalation after Turbopack process/port binding was blocked in the default sandbox.
    - `pnpm --dir app/sentinel-web build`: passed when rerun with sandbox escalation after Google Fonts fetching was blocked in the default sandbox.
    - Targeted Prettier check for package-06 touched files: passed.
- Validation caveats:
    - Default `pnpm --dir app/sentinel-api exec tsc --noEmit --pretty false` failed with Node out-of-memory before diagnostics, matching the earlier repo-wide API typecheck caveat.
    - The provider smoke did not run because no non-production LiveKit credentials were intentionally enabled in this repository execution.

## Program Rollup: LiveKit Integration Program

- Date: 2026-07-20
- Commit chain reviewed in order:
    - `d8e48b6b feat(livekit): add managed service foundation`
    - `e9473f95 feat(livekit): add inspection persistence contracts`
    - `232165a9 fix(livekit): validate inspection lease migration`
    - `f9e5ac7d feat(livekit): add managed inspection api`
    - `6168436f feat(livekit): add student publisher bridge`
    - `d0493a00 feat(livekit): add cross-app viewer`
    - `36cd1de7 feat(livekit): add resilience rollout validation`
- Program status:
    - Repo implementation packages 01-06 were executed sequentially and committed.
    - Production remains disabled by default and no real institution allowlist value is committed.
    - Central execution evidence now includes all six work packages.
    - Manual provider/browser/capacity/privacy/rollback sign-off remains the release blocker before changing `LIVE_INSPECTION_ENABLED` or the institution allowlist.
