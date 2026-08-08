# Issue 2 - Phase 1: Closed Attempt Reopen Authorization in Backend Flow

**Goal:** Permit session resumption for active attempts previously marked as `CLOSED` (e.g. via HIGH flagging events) when an instructor re-opens the attempt or grants a `REOPEN` override.

## Tasks

- [ ] In `app/sentinel-api/src/modules/examination/flow/data/_logic/create-session.logic.ts`:
  - Update `canResumeLockedAttempt` in `resumeLockedAttempt()` to allow `existingAttempt.lifecycle_state === 'CLOSED'` when `hasActiveReopenWindow` is true OR `accessOverride?.overrideType === 'REOPEN'` matching `sourceAttemptId`.
  - Add JSDoc for `resumeLockedAttempt()`.
- [ ] In `app/sentinel-api/src/modules/examination/access/services/evaluate-student-exam-eligibility.service.ts`:
  - Update `latestAttemptLifecycle.isResumable` logic so a `CLOSED` attempt (with `status === 'IN_PROGRESS'`) can evaluate `hasValidReopenOverride` as `true` when a valid `REOPEN` override is granted.
- [ ] Update tests:
  - Extend `app/sentinel-api/src/modules/examination/flow/data/session.repository.test.ts` to test resuming a `CLOSED` attempt that has a valid `REOPEN` override or `reopened_until` timestamp.
  - Extend `app/sentinel-api/src/modules/examination/access/access.test.ts` for reopened `CLOSED` attempts.

**Migration required:** No — backend access logic adjustment for existing overrides and attempt states.
