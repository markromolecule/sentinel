# Task 4 — Phase 3: Browser Capture and Direct Upload

**Status:** Complete
**Depends on:** `phase-2-evidence-before-auto-close.md`  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Prove the exact retained browser blob reaches Supabase through its signed target and completes
without duplicate telemetry.

## Implementation Checklist

- [x] Keep current frame encoding in
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_utils/capture-incident-evidence-frame.ts`.
- [x] Preserve the captured blob through the server decision in
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-telemetry-dispatcher.ts`.
- [x] Keep direct `uploadToSignedUrl()` plus completion in
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-evidence-upload.ts`.
- [x] Add bounded capture/decision/initialization/upload/completion diagnostics without signed URLs,
      tokens, paths, bytes, hashes, or landmarks.

## Tests and Verification

- [x] Create
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-telemetry-dispatcher.test.tsx`
      proving the exact blob uploads only for `UPLOAD`.
- [x] Extend
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-evidence-upload.test.tsx`
      for path extraction, signed upload, retry, and one completion call.
- [x] Cover `UNAVAILABLE`, post-persistence timeout, completion failure, and terminal cleanup without
      duplicate fallback telemetry for the same `eventId`.
- [x] Extend `app/sentinel-api/src/modules/telemetry/evidence/evidence.controller.test.ts` for
      completion idempotency and object metadata mismatch.
- [x] Run focused web/API evidence tests.

## Migration Decision

**Migration required:** No — browser and API use the current evidence contract.

## Completion Gate

- [x] Record focused command results here during implementation.
- `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-telemetry-dispatcher.test.tsx' 'src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-evidence-upload.test.tsx' 'src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/index.test.tsx' --config vitest.config.ts`
- `pnpm --dir app/sentinel-api exec vitest run 'src/modules/telemetry/evidence/evidence.controller.test.ts' --config vitest.config.ts`
- [x] Record a redacted correlation trace using only IDs, decision, and state.
- `eventId=event-1 -> decision=UPLOAD -> state=AVAILABLE`
- `eventId=event-2 -> decision=UNAVAILABLE -> state=UNCHANGED`
- [x] Confirm no sensitive storage data appears in logs.
- [x] Mark this phase complete only after tests pass.
