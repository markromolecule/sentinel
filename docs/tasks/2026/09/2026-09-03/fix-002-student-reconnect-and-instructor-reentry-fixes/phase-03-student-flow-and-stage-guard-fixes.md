---
title: "Phase 3: Student Flow & Stage Guard Reconnect Fixes"
type: phase
parent: "docs/tasks/2026/09/2026-09-03/fix-002-student-reconnect-and-instructor-reentry-fixes/README.md"
phase: "3"
status: completed
created: "2026-09-03"
tags: [task, phase, examination, web, student-flow, stage-guard]
---

# Phase 3: Student Flow & Stage Guard Reconnect Fixes

## Objective

Prevent false `MAX_RECONNECT_EXCEEDED` redirects in `_stage-resolver.ts`, ensure placeholder `0/0` reconnect counts do not bounce students from attempt screens, and update lobby status utilities to clearly communicate strict proctor mode policies.

## Dependencies & Prerequisites

- Phase 1 complete (session logic & runtime access alignment).

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/_stage-resolver.ts`:
  - Required `reconnectCount > 0` before evaluating reconnect exhaustion, preventing 0/0 placeholder states from locking students out.
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/index.test.ts`:
  - Added tests for zero-reconnect strict mode initial entry and legitimate disconnect blocking.
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_utils/index.ts`:
  - Updated `resolveReconnectDisplay` to return `"Strict proctor mode • 0 reconnects"` and clear explanatory status text when configured for 0 reconnects.
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_utils/index.test.ts`:
  - Added test assertions for strict proctor mode copy.

## Implementation Tasks

- [x] **Task 3.1 — Fix Stage Resolver False Reconnect Lockout:**
  - In `_stage-resolver.ts`: `isReconnectLimitExceeded` requires `reconnectCount > 0 && reconnectCount >= maxReconnect && !runtimeAccess?.canResume`.
  - Initial starts with 0 reconnects are never blocked because `reconnectCount` is 0.
- [x] **Task 3.2 — Safe Token Handshake between Lobby and Attempt:**
  - `useStudentExamStageGuard.ts` safely validates `hasFreshLobbyEntry` and session match without race conditions.
- [x] **Task 3.3 — Lobby Status UI & Copy Alignment:**
  - In `_utils/index.ts:resolveReconnectDisplay`:
    - When `total === 0` and `configuredTotal === 0`: Returns header `"Strict proctor mode • 0 reconnects"` and message `"This exam does not permit unapproved reconnections. If you disconnect, instructor approval will be required to resume."`.
- [x] **Task 3.4 — Unit Tests:**
  - In `index.test.ts`:
    1. First-time student with `maxReconnect: 0` is allowed to enter `attempt` without `MAX_RECONNECT_EXCEEDED`.
    2. Student who actively reconnected (`reconnectCount: 1`, `maxReconnect: 0`) is held at `lobby` with `MAX_RECONNECT_EXCEEDED`.
  - In `lobby/_utils/index.test.ts`: Verified strict proctor mode copy rendering.

## Verification & Testing

```bash
pnpm --filter sentinel-web test src/app/\(protected\)/student/exam/\[id\]/_lib/student-exam-flow/index.test.ts src/app/\(protected\)/student/exam/\[id\]/lobby/_utils/index.test.ts
pnpm --filter sentinel-web test src/app/\(protected\)/student/exam/\[id\]/_hooks/use-student-exam-stage-guard.test.tsx
```
**Output:**
```
✓ src/app/(protected)/student/exam/[id]/lobby/_utils/index.test.ts (9 tests) 2ms
✓ src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/index.test.ts (23 tests) 3ms
Test Files  2 passed (2)
     Tests  32 passed (32)

✓ src/app/(protected)/student/exam/[id]/_hooks/use-student-exam-stage-guard.test.tsx (3 tests) 10ms
Test Files  1 passed (1)
     Tests  3 passed (3)
```

## Risks & Rollback

- **Risk:** Relaxing stage guard reconnect checks could allow students to bypass legitimate reconnect exhaustion.
- **Mitigation:** Only bypassed when `reconnectCount === 0` (no reconnections occurred). Genuine disconnects where `reconnectCount > 0` are strictly enforced.
