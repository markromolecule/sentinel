# Issue 2 - Phase 1: Closed Attempt Reopen Authorization in Backend Flow

**Goal:** Permit session resumption for active attempts previously marked as `CLOSED` (e.g. via HIGH flagging events) when an instructor re-opens the attempt or grants a `REOPEN` override.

## Tasks

- [x] In `app/sentinel-api/src/modules/examination/flow/data/_logic/create-session.logic.ts`:
  - Extended `canResumeLockedAttempt` in both the orchestration block and `resumeLockedAttempt()` to allow `existingAttempt.lifecycle_state === 'CLOSED'` when `hasActiveReopenWindow` is true OR `accessOverride?.overrideType === 'REOPEN'` matching `sourceAttemptId`.
  - Added JSDoc for `resumeLockedAttempt()`.
- [x] In `app/sentinel-api/src/modules/examination/access/services/evaluate-student-exam-eligibility.service.ts`:
  - Fixed `buildAttemptLifecycleRuntimeBlock` `CLOSED` branch: now returns `isBlocked: !hasActiveReopenWindow` and `isResumable: hasActiveReopenWindow` — allowing a CLOSED attempt with an active `reopened_until` window to be treated as resumable.
  - Removed the circular `latestAttemptLifecycle.isResumable` guard from `hasValidReopenOverride`: a CLOSED attempt that has a matching `REOPEN` override is now correctly recognized as having a valid reopen override, allowing the student to navigate to the lobby.
- [x] Update tests:
  - Extended `app/sentinel-api/src/modules/examination/flow/data/session.repository.test.ts` with 2 new tests:
    - Resumes a CLOSED attempt via a REOPEN override matching `sourceAttemptId` ✅
    - Resumes a CLOSED attempt via an active `reopened_until` window ✅
  - Extended `app/sentinel-api/src/modules/examination/access/access.test.ts` with 2 new tests:
    - Grants eligible access to a CLOSED attempt when a matching REOPEN override exists ✅
    - Blocks access to a CLOSED attempt when no REOPEN override or reopen window exists ✅
  - All 30 tests pass: `vitest run "flow/data/session.repository.test" "access/access.test"`.

**Migration required:** No — backend access logic adjustment for existing overrides and attempt states.

## Completion Notes

- **Root cause:** `buildAttemptLifecycleRuntimeBlock` for `CLOSED` always set `isResumable: false`, which made `hasValidReopenOverride: false`, which in turn made `resolveStudentOverrideAccess` reject the REOPEN override entirely (circular block).
- **Fix:** `CLOSED` + active reopen window → `isResumable: true`, `isBlocked: false`. `hasValidReopenOverride` no longer depends on `isResumable`, breaking the circular dependency.
- `resumeLockedAttempt()` and the orchestration block in `executeCreateSession()` now both accept `CLOSED` lifecycle state for the reopen path, resolving the `400 "A resume request ID is required"` error that appeared when instructors reopened flagged attempts.
- No migration required; all changes are access policy logic.

