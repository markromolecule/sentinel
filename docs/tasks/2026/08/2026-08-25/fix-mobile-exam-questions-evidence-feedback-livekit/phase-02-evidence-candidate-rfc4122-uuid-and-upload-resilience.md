---
title: "Phase 2: Evidence Candidate UUID & Upload Resilience"
type: phase
parent: "Fix Mobile Exam Questions, Evidence Upload, Feedback Screen, and LiveKit Streaming"
phase: "2"
status: completed
created: "2026-08-25"
tags: [task, phase, mobile, telemetry, evidence]
---

# Phase 2: Evidence Candidate UUID & Upload Resilience

## Objective

Fix telemetry frame capture in Sentinel Mobile so anomaly evidence is cleanly ingested with valid RFC4122 v4 UUIDs, avoiding 400 Bad Request and 404 Route Not Found errors.

---

## Dependencies & Prerequisites

- Phase 1 completed.

---

## Impacted Files & Components

- [`app/sentinel-mobile/features/exam/lib/mobile-frame-capture.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/lib/mobile-frame-capture.ts)
- [`app/sentinel-mobile/features/exam/lib/mobile-frame-capture.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/lib/mobile-frame-capture.test.ts)

---

## Implementation Tasks

- [x] Update `mobile-frame-capture.ts` to generate RFC4122 v4 UUIDs using standard UUID generation for `metadata.eventId` and `metadata.dedupeKey`.
- [x] Remove the obsolete fallback call to `/student/exam-attempts/${attemptId}/incidents/evidence` which no longer exists in Sentinel API.
- [x] Ensure Supabase Storage signed URL upload handles content type `image/jpeg` or `image/webp` matching capture metadata.
- [x] Ensure `completeEvidenceUpload` is called only after successful storage upload.
- [x] Add unit tests in `mobile-frame-capture.test.ts` verifying UUID format and upload lifecycle.

---

## Verification & Testing

- Run test suite:
  ```bash
  pnpm --filter sentinel-mobile test
  ```

  - **Result**: 30/30 test files passed (148 tests passed).
  - `mobile-frame-capture.test.ts` passed 3/3 test cases verifying UUID regex match, signed upload, and graceful failure handling without 404 fallback.

---

## Risks & Rollback

- **Risk**: UUID generator dependency missing in React Native environment.
- **Mitigation**: Use standard crypto or lightweight RFC4122 v4 UUID helper compatible with React Native / Expo.
