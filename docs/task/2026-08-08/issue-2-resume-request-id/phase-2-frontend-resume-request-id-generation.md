# Issue 2 - Phase 2: Guaranteed Frontend Resume Request ID Generation

**Goal:** Ensure `useLobbyActions.ts` always generates and sends a valid `resumeRequestId` when resuming an active or reopened attempt, eliminating `400 Bad Request` errors.

## Tasks

- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts`:
  - Updated `handleEnterExam()` to read `storedReconnectIntent` or generate a new `resumeRequestId` whenever `runtimeAccess?.hasActiveAttempt`, `runtimeAccess?.canResume`, `runtimeAccess?.canStart` is false (under `canEnterExam`), or `storedSession` indicates an existing attempt is being entered/resumed.
  - Wrote back the generated `resumeRequestId` to `writeStoredReconnectIntent` so the call to `startExamSession()` always receives a non-undefined `resumeRequestId`.
  - Added inline JSDoc documenting guaranteed `resumeRequestId` generation for active/reopened attempts.
- [x] Update tests:
  - Extended `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.test.tsx` with a test case proving `startExamSession` is called with a generated `resumeRequestId` even when `runtimeAccess.canResume` was previously false prior to reopen approval.

**Migration required:** No — client-side hook logic update.

