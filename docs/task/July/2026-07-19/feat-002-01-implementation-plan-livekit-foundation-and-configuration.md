# LiveKit Work Package 01: Foundation and Configuration

## 1. The Context

Sentinel currently has an unmounted LiveKit logging stub, empty route/DTO files, an empty AWS EC2 service, and no LiveKit dependencies or validated configuration. The first package must establish managed-service configuration with disabled-by-default behavior without creating rooms, tokens, database records, or user-visible controls.

## 2. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Read `process.env` directly inside future controllers and install LiveKit packages only in the two apps that call them.
- **Tradeoff:** Configuration errors would appear at runtime and duplicated environment access would be difficult to test safely.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Add lazy server-only Zod configuration, central constants, feature gates, explicit dependencies, health-safe validation, and remove the obsolete EC2 seam.
- **Tradeoff:** Adds foundation code before any visible feature behavior exists.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Store all provider configuration in `system_settings` and fetch it from the database on every operation.
- **Tradeoff:** Provider secrets would be mixed with application settings and create an unnecessary database dependency for token signing.

## 3. The Execution

**Recommendation:** Option B — the Strategic Path.

**Justification:** Lazy validation lets unrelated API routes run when LiveKit is disabled while failing closed when the feature is enabled with incomplete secrets. Central configuration also gives every later package the same timeouts, caps, and safe defaults without exposing server secrets to either Next.js app.

### Entry Gate

- [x] Confirm the baseline tests and repository status are recorded in `docs/task/2026-07-19/livekit-integration-execution-log.md` **[NEW]**.
- [x] Confirm no implementation from work packages 02-06 has started.

## Pre-Planning Checklist

- [x] Inspected `app/sentinel-api/src/modules/infrastructure/livekit/**`, `app/sentinel-api/.env.example`, all three app `package.json` files, `packages/hooks/package.json`, and the pnpm lockfile.
- [x] Confirmed `aws-ec2.service.ts`, `livekit.dto.ts`, and `livekit.routes.ts` are empty and the module is not registered.
- [x] Confirmed no Prisma migration is needed for dependency/configuration setup.

## Scope and Affected Files

- `app/sentinel-api/package.json`
- `packages/hooks/package.json`
- `pnpm-lock.yaml`
- `app/sentinel-api/.env.example`
- `app/sentinel-api/src/modules/infrastructure/livekit/livekit.constants.ts` **[NEW]**
- `app/sentinel-api/src/modules/infrastructure/livekit/livekit.config.ts` **[NEW]**
- `app/sentinel-api/src/modules/infrastructure/livekit/livekit.config.test.ts` **[NEW]**
- `app/sentinel-api/src/modules/infrastructure/livekit/services/aws-ec2.service.ts` **[DELETE]**
- `app/sentinel-api/src/modules/infrastructure/livekit/livekit.service.ts`

## Phase 1: Install Only the Required Managed-Service SDKs

**Goal:** Make the server and shared browser-hook layer compile against LiveKit without introducing React component wrappers or AWS dependencies.

- [x] Add `livekit-server-sdk` to `app/sentinel-api/package.json` for server-side room, token, participant, and webhook APIs.
- [x] Add `livekit-client` to `packages/hooks/package.json` for the shared student/viewer controllers; do not add `@livekit/components-react`, an AWS SDK, Egress packages, or recording dependencies.
- [x] Regenerate `pnpm-lock.yaml` with the workspace package manager and review the diff for unrelated dependency upgrades.
- [x] Add a dependency-boundary test or static import assertion in `app/sentinel-api/src/modules/infrastructure/livekit/livekit.config.test.ts` proving server configuration imports do not resolve any Next.js public environment variable or browser module.

**Migration required:** No — dependency metadata only.

## Phase 2: Define Fail-Closed Configuration

**Goal:** Provide one documented, validated configuration contract whose disabled state requires no LiveKit credentials.

- [x] Create `app/sentinel-api/src/modules/infrastructure/livekit/livekit.constants.ts` with named defaults: request timeout `20s`, viewer join timeout `15s`, maximum inspection `300s`, token TTL `60s`, room empty timeout `30s`, room departure timeout `10s`, global active-inspection cap `20`, and per-institution cap `10`.
- [x] Create exported `getLiveKitConfig()` and `resetLiveKitConfigForTests()` in `app/sentinel-api/src/modules/infrastructure/livekit/livekit.config.ts`, with JSDoc and lazy Zod parsing of `LIVE_INSPECTION_ENABLED`, `LIVE_INSPECTION_INSTITUTION_ALLOWLIST`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and the timeout/cap overrides.
- [x] Make `getLiveKitConfig()` return a disabled configuration without requiring provider secrets when `LIVE_INSPECTION_ENABLED` is false or absent; throw a bounded startup/operation error when enabled configuration is incomplete, non-`wss`, non-positive, or violates `institutionLimit <= globalLimit`.
- [x] Parse the institution allowlist as trimmed UUIDs and fail closed on malformed entries; an empty allowlist must authorize no production institution even when the global switch is true.
- [x] Extend `app/sentinel-api/.env.example` with server-only placeholders and comments stating that no `NEXT_PUBLIC_LIVEKIT_*`, AWS, recording, or Egress variables are allowed.
- [x] Add `livekit.config.test.ts` cases for disabled/no-secret startup, valid enabled config, invalid URL, absent secret, malformed UUID allowlist, invalid timeout/cap, and test-cache reset.

**Migration required:** No — configuration only.

## Phase 3: Remove AWS Scope and Preserve the Existing Audit Seam

**Goal:** Eliminate obsolete infrastructure intent while retaining the current safe token-grant audit helper for later expansion.

- [x] Delete `app/sentinel-api/src/modules/infrastructure/livekit/services/aws-ec2.service.ts` and remove any resulting empty `services/` directory if no later planned provider file occupies it.
- [x] Update JSDoc in `app/sentinel-api/src/modules/infrastructure/livekit/livekit.service.ts` to state that it is managed-LiveKit audit support and that token values must never be accepted by `logLiveKitTokenGranted()`.
- [x] Extend `LiveKitService.logLiveKitTokenGranted()` arguments with a bounded `role: 'publisher' | 'viewer'` value and ensure log details contain correlation IDs/opaque identities only.
- [x] Add `app/sentinel-api/src/modules/infrastructure/livekit/livekit.service.test.ts` **[NEW]** proving successful logging excludes token/secret fields and logging failure remains non-blocking.

**Migration required:** No — obsolete empty-file deletion and audit-helper hardening only.

## Phase 4: Verify the Disabled Foundation

**Goal:** Prove installing and configuring LiveKit does not alter current exam behavior.

- [x] Run `pnpm --dir app/sentinel-api test --run src/modules/infrastructure/livekit/livekit.config.test.ts src/modules/infrastructure/livekit/livekit.service.test.ts`.
- [x] Run `pnpm --dir app/sentinel-api typecheck`, `pnpm --dir packages/hooks build`, and `pnpm format:check` and record exact results in `docs/task/2026-07-19/livekit-integration-execution-log.md`.
- [x] Add a test in `app/sentinel-api/src/modules/infrastructure/livekit/livekit.config.test.ts` proving disabled configuration performs no network call, room creation, or token generation when imported.

**Migration required:** No — verification only.

## Exit Gate

- [x] LiveKit dependencies install and typecheck without AWS or recording dependencies.
- [x] Disabled mode works with no LiveKit credentials and changes no route behavior.
- [x] Enabled mode rejects incomplete or unsafe configuration.
- [x] The EC2 service is deleted and focused tests pass.
- [x] Commit this package before beginning work package 02.

## Compatibility, Configuration, and Rollback Notes

- **Breaking API changes:** None; no route is mounted.
- **Environment variables:** New, server-only, and disabled by default.
- **New dependencies:** `livekit-server-sdk` and `livekit-client` only.
- **Rollback:** Restore package manifests/lockfile, configuration files, audit signature, and the empty EC2 stub only if historical parity is required; no database or external-room cleanup is needed.
