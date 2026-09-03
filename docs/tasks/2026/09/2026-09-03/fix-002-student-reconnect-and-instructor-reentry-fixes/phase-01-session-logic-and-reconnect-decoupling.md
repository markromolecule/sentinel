---
title: "Phase 1: Backend Session Logic & Reconnect Decoupling"
type: phase
parent: "docs/tasks/2026/09/2026-09-03/fix-002-student-reconnect-and-instructor-reentry-fixes/README.md"
phase: "1"
status: completed
created: "2026-09-03"
tags: [task, phase, examination, api, session-logic]
---

# Phase 1: Backend Session Logic & Reconnect Decoupling

## Objective

Decouple exam attempt counts from reconnect limits in `create-session.logic.ts`, fix zero-reconnect strict mode in `RuntimeAccessService`, and ensure idempotent session resumption never increments reconnect counters or throws 403.

## Dependencies & Prerequisites

- Context specification at `docs/context/September/3/student-reconnect-and-instructor-reentry.md` (status: `ready`).
- No prior phase dependencies.

## Impacted Files & Components

- `app/sentinel-api/src/modules/examination/flow/data/_logic/create-session.logic.ts`:
  - Modified `handleFreshAttempt` to remove `maxSessionsAllowed = Math.max(1, maxReconnectAttempts + 1)` and enforce decoupled attempt limits.
  - Modified `resumeLockedAttempt` to support authorized reopens without false 403 block.
  - Added explicit locked attempt validation preventing false fresh attempt generation.
- `app/sentinel-api/src/modules/examination/runtime-access/runtime-access.service.ts`:
  - Aligned `canResumeActiveAttempt` and `reopened` state so active reopen windows permit resumption even when `maxReconnectAttempts = 0`.
- `app/sentinel-api/src/modules/examination/flow/data/session.repository.test.ts`:
  - Added test cases validating attempt limit decoupling, locked attempt rejection, and zero-reconnect handling.
- `app/sentinel-api/src/modules/examination/runtime-access/runtime-access.service.test.ts`:
  - Added test verifying resumption of reopened attempts under zero reconnect limits.

## Implementation Tasks

- [x] **Task 1.1 — Decouple Fresh Attempt Allowance from Reconnect Limits:**
  - In `create-session.logic.ts:handleFreshAttempt`: Removed `maxSessionsAllowed = Math.max(1, maxReconnectAttempts + 1)`.
  - Fresh attempts validate against overall attempt limits (`attemptCount >= 1`), returning `"Maximum attempts reached for this exam."` when no makeup/retake override exists.
- [x] **Task 1.2 — Align Zero-Reconnect Resumption & Idempotency:**
  - In `create-session.logic.ts:resumeLockedAttempt`:
    - `isAuthorizedReopen` accounts for `hasActiveReopenWindow` and `accessOverride`.
    - Idempotent resumes return the session without incrementing reconnect count.
- [x] **Task 1.3 — Update Runtime Access Calculation:**
  - In `runtime-access.service.ts`: Active reopen windows allow resumption even when `maxReconnectAttempts` is 0.
- [x] **Task 1.4 — Unit & Regression Tests:**
  - Added tests in `session.repository.test.ts` and `runtime-access.service.test.ts`.

## Verification & Testing

```bash
pnpm --filter sentinel-api test src/modules/examination/flow/data/session.repository.test.ts src/modules/examination/runtime-access/runtime-access.service.test.ts
```

**Output:**

```
✓ src/modules/examination/runtime-access/runtime-access.service.test.ts (6 tests) 43ms
✓ src/modules/examination/flow/data/session.repository.test.ts (14 tests) 12ms

Test Files  2 passed (2)
     Tests  20 passed (20)
```

## Risks & Rollback

- **Risk:** Modifying `handleFreshAttempt` could inadvertently allow unauthorized retakes if attempt counting is not properly checked against `isFreshAttemptOverride`.
- **Mitigation:** Retain strict check: if student already has a completed attempt, return `ATTEMPT_ALREADY_COMPLETED` unless `isFreshAttemptOverride` is true.
