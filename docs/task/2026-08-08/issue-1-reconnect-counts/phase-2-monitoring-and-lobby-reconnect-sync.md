# Issue 1 - Phase 2: Monitoring and Student Lobby Reconnect Display Synchronization

**Goal:** Keep student lobby header, layout, and instructor monitoring overview synchronized with the student's active attempt reconnect count.

## Tasks

- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_utils/index.ts`:
  - Updated `resolveReconnectDisplay` with expanded JSDoc explaining the placeholder-zero scenario.
  - Tightened `isPlaceholderZeroPolicy` guard: now only triggers when `configuredTotal` is a `number > 0` (previously `configuredTotal !== 0` could misfire for `null`).
  - Replaced `Math.max(0, configuredTotal ?? 0)` with direct `configuredTotal` in the fallback path (it's already guaranteed positive at that branch).
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-state.ts`:
  - On the `!requiresInstructorAdmission` path: after `checkIntoExamLobby` resolves, now calls `refreshApprovedAccess()` (which calls `refetchExam()`) so returning students see updated `reconnectAttemptsRemaining` immediately in the lobby header/layout.
- [x] Update tests:
  - Created `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_utils/index.test.ts` (9 tests) covering:
    - "1 used • 1 left" for student who used 1 of 2 reconnect attempts ✅
    - "0 used • 3 left" for no prior reconnects ✅
    - "2 used • 0 left" when fully exhausted ✅
    - Placeholder 0/0 fallback to `configuredTotal` when it is positive ✅
    - No fallback when `configuredTotal` is also 0 ✅
    - Null/undefined `runtimeAccess` cases ✅
    - "Policy unavailable" paths ✅
  - All 9 tests pass: `vitest run "_utils/index.test"` → **9 passed**.

**Migration required:** No — UI formatting and hook sync updates only.

## Completion Notes

- Root cause for stale reconnect display: the `!requiresInstructorAdmission` check-in path in `use-lobby-state.ts` never triggered `refetchExam()`, so `runtimeAccess` values stayed frozen from page load.
- `resolveReconnectDisplay` now correctly surfaces `1 used • 1 left` for a student who used 1 of 2 reconnects, instead of showing a stale/misleading value.
- No migration required; all changes are UI logic and hook orchestration.

