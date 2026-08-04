# Task 4 — Phase 3: Browser Capture and Direct Upload

**Status:** Not started  
**Depends on:** `phase-2-evidence-before-auto-close.md`  
**Parent plan:** `../../fix-001-implementation-plan-attempt-lifecycle-progress-turn-in-evidence.md`

## Goal

Prove the exact retained browser blob reaches Supabase through its signed target and completes
without duplicate telemetry.

## Implementation Checklist

- [ ] Keep current frame encoding in
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_utils/capture-incident-evidence-frame.ts`.
- [ ] Preserve the captured blob through the server decision in
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-telemetry-dispatcher.ts`.
- [ ] Keep direct `uploadToSignedUrl()` plus completion in
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-evidence-upload.ts`.
- [ ] Add bounded capture/decision/initialization/upload/completion diagnostics without signed URLs,
      tokens, paths, bytes, hashes, or landmarks.

## Tests and Verification

- [ ] Create
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-telemetry-dispatcher.test.tsx`
      proving the exact blob uploads only for `UPLOAD`.
- [ ] Extend
      `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-attempt-mediapipe-monitoring/_hooks/use-incident-evidence-upload.test.tsx`
      for path extraction, signed upload, retry, and one completion call.
- [ ] Cover `UNAVAILABLE`, post-persistence timeout, completion failure, and terminal cleanup without
      duplicate fallback telemetry for the same `eventId`.
- [ ] Extend `app/sentinel-api/src/modules/telemetry/evidence/evidence.controller.test.ts` for
      completion idempotency and object metadata mismatch.
- [ ] Run focused web/API evidence tests.

## Migration Decision

**Migration required:** No — browser and API use the current evidence contract.

## Completion Gate

- [ ] Record focused command results here during implementation.
- [ ] Record a redacted correlation trace using only IDs, decision, and state.
- [ ] Confirm no sensitive storage data appears in logs.
- [ ] Mark this phase complete only after tests pass.
