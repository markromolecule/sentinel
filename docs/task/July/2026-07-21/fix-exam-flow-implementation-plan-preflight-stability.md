# Phase 4 — Preflight Flow Stability and Regression Coverage

## Task Summary

Make instruction, privacy, checkup, lobby, and attempt routes follow one deterministic guarded sequence across normal and adverse browser conditions.

## 1. The Context

Each page currently reads portions of `sessionStorage` independently, while direct URLs and persisted flags can create states the UI was not designed to reconcile. After Phases 1–3 establish authoritative admission, reconnect, and media contracts, the remaining work is to centralize stage resolution and prove the complete flow under realistic edge cases.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Add page-specific redirect effects to every route.
- **Tradeoff:** Redirect rules remain duplicated and can form loops as conditions evolve.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Add a pure canonical stage resolver and a shared route guard that every student exam page uses, then test a table of policy and lifecycle states.
- **Tradeoff:** Requires converting several page tests to a shared contract and carefully ordering loading versus redirect states.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Replace route pages with one client-rendered wizard route.
- **Tradeoff:** Reduces URL complexity but is a broad routing rewrite with accessibility and refresh risks.

## 1. The Execution

- **The Recommendation:** Option B.
- **The Justification:** A pure resolver is easy to test, retains bookmarkable routes, and makes invalid transitions explicit without adding a new framework or dependency.
- **Next Steps:**
    1. Encode the allowed stage order and authoritative inputs.
    2. Apply one guard at student exam route boundaries.
    3. Execute the full adverse-condition regression matrix.

### Phase 4: Consolidate Stage Resolution and Validate the Whole Flow

**Goal:** Every route resolves to exactly one safe next stage without loops, skipped consent, premature attempt start, or lost drafts.

- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/_types/index.ts`, define the minimum pure resolver input: requested stage, privacy consent, live checkup readiness, admission/runtime access, reconnect intent, attempt lifecycle, and completion state.
- [x] Add a JSDoc-documented `resolveStudentExamStage()` in `app/sentinel-web/src/app/(protected)/student/exam/[id]/_lib/student-exam-flow/index.ts` that returns `instruction`, `privacy`, `checkup`, `lobby`, `attempt`, or history/result plus a reason code.
- [x] Add table-driven tests beside the resolver for first visit, direct privacy/checkup/lobby/attempt URLs, revoked consent, permission denial, stale calibration, gated waiting/rejection/approval, automatic admission, reload, offline recovery, max reconnect, locked/closed/superseded, and turned-in states.
- [x] Add a shared route-guard hook under `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/` that waits for exam/config/runtime queries, performs idempotent `router.replace()`, and never renders protected stage content before resolution.
- [x] Apply the guard to `instruction/page.tsx`, `privacy/page.tsx`, `checkup/page.tsx`, `lobby/page.tsx`, and `attempt/page.tsx`; retain `useTurnedInExamRedirect()` only if it delegates to the same resolver rather than competing with it.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-student-exam-data.ts`, expose configuration-query failure separately from loading and do not silently fall back to `AUTOMATIC` when the server knows the exam is instructor-gated; use exam-embedded configuration as the safe fallback and fail closed if neither authoritative source is available.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/privacy/page.tsx`, invalidate downstream checkup/calibration readiness when consent is revoked so a later direct lobby URL cannot reuse obsolete completion state.
- [x] In `app/sentinel-web/src/app/(protected)/student/exam/[id]/checkup/page.tsx`, reset only device/calibration state on retry and preserve privacy consent; on policy/config change, invalidate readiness fields that no longer match the current requirements.
- [x] Add page-level Vitest coverage in `instruction/page.test.tsx`, `privacy/page.test.tsx`, `checkup/page.test.tsx`, `lobby/page.test.tsx`, and `attempt/page.test.tsx` proving loading/redirect/content states do not overlap and navigation has no loops.
- [x] Run `pnpm --dir app/sentinel-api test` and `pnpm --dir app/sentinel-web test`, then manually verify Chromium flows for permission prompt/deny/retry, refresh, close/reopen, DevTools offline/online, gated approve/reject, automatic entry, full-screen denial, and track removal.
      **Migration required:** No — the phase consolidates route and client-state logic over APIs and storage established in prior phases.

## Done Criteria

- [x] No student exam stage can be skipped by entering its URL directly.
- [x] Query loading/error states cannot temporarily enable automatic admission or attempt entry.
- [x] Route corrections are idempotent and produce no replace loops.
- [x] Consent revocation and policy changes invalidate only the downstream readiness they affect.
- [x] Automated and manual regression matrices pass for supported desktop browsers.

## Additional Considerations

- **Breaking API changes:** None planned.
- **New environment variables:** None.
- **Migration rollback:** Not applicable.
- **Scope:** Mobile web behaviors covered by the same routes are included; Expo/native changes are out of scope unless testing proves the shared API contract regresses them.
