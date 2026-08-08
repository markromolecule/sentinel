# Issue 1 - Phase 2: Monitoring and Student Lobby Reconnect Display Synchronization

**Goal:** Keep student lobby header, layout, and instructor monitoring overview synchronized with the student's active attempt reconnect count.

## Tasks

- [ ] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_utils/index.ts`:
  - Update `resolveReconnectDisplay` to ensure valid `reconnectCount` and `maxReconnectAttempts` are displayed without falling back to placeholder zero copy when `configuredTotal` is available.
  - Add JSDoc to `resolveReconnectDisplay()`.
- [ ] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.tsx` & `_hooks/use-lobby-state.ts`:
  - Refresh exam eligibility/runtime access upon lobby check-in so returning students see updated reconnect usage immediately.
- [ ] Update tests:
  - Extend `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_utils/index.test.ts` to assert reconnect display formatted correctly when reconnect count is 1 of 2 used.
  - Run `pnpm --dir app/sentinel-web test` to verify student lobby display rendering.

**Migration required:** No — UI formatting and hook sync updates only.
