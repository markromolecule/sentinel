# Phase 2 — Reconnect Gate and Local Draft Recovery

## Task Summary

Route every interrupted active attempt through the lobby and resume only after restoring locally saved answers and authoritative server progress.

## 1. The Context

Answers are already written to `localStorage`, but the active `useExamSession()` explicitly treats a stored session as permission to bypass the lobby after reload. The one-use lobby marker proves intentional navigation only; it does not currently model reload, close/reopen, or offline recovery as reconnect events.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Always redirect `/attempt` to `/lobby` when the one-use lobby marker is absent.
- **Tradeoff:** Does not distinguish intentional entry from interruption or coordinate reliable reconnect counting and restoration.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Introduce a small client reconnect-intent record, checkpoint drafts before lifecycle exits, consume a fresh lobby-entry token, and let the API resume the existing attempt and increment its reconnect count.
- **Tradeoff:** Requires careful idempotency so React remounts and duplicate clicks do not consume reconnect attempts twice.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Maintain a server heartbeat/lease and force lobby re-entry whenever the lease expires.
- **Tradeoff:** More precise disconnect detection but adds polling, timing sensitivity, and backend state not required for this repair.

## 1. The Execution

- **The Recommendation:** Option B.
- **The Justification:** It uses the existing local draft and server reconnect mechanisms, works for reload/close/offline cases, and avoids relying on unreliable unload network requests. The API remains responsible for whether the attempt is resumable and how many reconnects remain.
- **Next Steps:**
    1. Define explicit entry and reconnect storage contracts.
    2. Guard the attempt route and checkpoint drafts on interruption signals.
    3. Resume idempotently from the lobby and reconcile local/server drafts.

### Phase 2: Detect, Redirect, Restore, and Resume

**Goal:** An interrupted attempt lands in the lobby, retains answers, and resumes exactly once after approval/readiness gates pass.

- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-session-storage/types.ts` and `constants.ts`, define versioned lobby-entry and reconnect-intent records keyed by exam/session, including creation time and consumed state; document exported builders with JSDoc.
- [x] Replace the boolean marker functions in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-session-storage/lobby-storage.ts` with atomic write/read/consume helpers that reject malformed, expired, wrong-exam, or already-consumed entries.
- [x] Keep answer content in `localStorage` through `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/exam-session-storage/answer-storage.ts`; add a last-write timestamp and a deterministic merge helper that chooses the newest valid local/server snapshot without clearing either during lobby redirection.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts`, redirect whenever an active/resumable attempt lacks a fresh consumed lobby-entry token; remove stored-session presence as an attempt-entry bypass.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.ts`, remove the `isResuming` lobby bypass, do not clear the stored session/draft when redirecting for reconnect, and start/resume only after intentional lobby entry.
- [x] Remove or consolidate the unused duplicate hook tree at `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session/` after verifying imports resolve to `_hooks/use-exam-session.ts`, preventing future fixes from landing in dead code.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/use-attempt-sync.ts`, checkpoint answer and elapsed-time changes locally before remote sync, retain them on network failure, and retry reconciliation after reconnection.
- [x] Add an exported interruption hook under `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/` that records reconnect intent on `pagehide`, `beforeunload`, and `offline`, and routes to the lobby on the next viable render/`online` event without attempting an unload fetch.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts`, call `startExamSession()` for a resumable attempt even when a stored session exists, guard the request with one in-flight/idempotency key, persist returned answers/counter, then issue a fresh entry token only after success.
- [x] In `app/sentinel-api/src/modules/examination/flow/data/session.repository.ts`, verify the active-attempt resume branch increments `reconnect_attempt_count` once per accepted resume request and rejects requests beyond `max_reconnect_attempts`; add idempotency support if the current repository cannot distinguish duplicate client submissions.
- [x] Add storage and hook tests beside `lobby-storage.ts`, `answer-storage.ts`, `use-exam-session.ts`, `use-attempt-sync.ts`, and `use-lobby-actions.ts` for reload, closed/reopened tab, offline/online, malformed token, duplicate click, stale session, local-newer draft, server-newer draft, and successful resume.
- [x] Extend `app/sentinel-api/src/modules/examination/flow/flow.test.ts` and the session repository tests for counter increment, duplicate request, maximum reconnect rejection, draft restoration, completed attempt, locked attempt, and superseded attempt.
      **Migration required:** No — the schema already stores `reconnect_attempt_count`, `max_reconnect_attempts`, answers, elapsed time, and attempt lifecycle state; use an existing request/session identifier for idempotency if available.

## Done Criteria

- [x] Reload, close/reopen, and offline recovery cannot render attempt content before lobby re-entry.
- [x] Lobby redirect never clears the latest valid local answer draft.
- [x] Resume restores answers and elapsed time before the attempt becomes interactive.
- [x] One user resume consumes at most one reconnect count.
- [x] Completed, locked, closed, and superseded attempts never resume.

## Additional Considerations

- **Breaking API changes:** Avoid one; if an idempotency token is required, add an optional request field/header and accept legacy callers during rollout.
- **New environment variables:** None.
- **Migration rollback:** Not applicable.
- **Browser constraint:** `beforeunload` and `pagehide` are best-effort signals; correctness must come from the next route load, not an unload API call.
