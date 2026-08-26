---
title: "Phase 4: Submission & Feedback Idempotency"
type: phase
status: planned
created: "2026-08-26"
parent: "./README.md"
---

# Phase 4: Submission & Feedback Idempotency

## Objective

Ensure that turning in an exam and submitting post-exam feedback handles 409 Conflict ("This exam session has already been submitted") idempotently without displaying "Turn in failed" or "Submission Error" alerts.

## Affected Files

- [`app/sentinel-mobile/features/exam/hooks/use-exam-session.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-session.ts)
- [`app/sentinel-mobile/app/exam/[id]/feedback/index.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/exam/[id]/feedback/index.tsx)

## Implementation Steps

1. In `use-exam-session.ts` `executeSubmission`: Wrap `completeExamSession` in a try/catch block that intercepts 409 responses containing "already been submitted" / "already submitted", clears local session storage, and routes forward to `/exam/[id]/result` or `/exam/[id]/feedback` seamlessly.
2. In `app/exam/[id]/feedback/index.tsx`: Intercept feedback errors where the attempt feedback already exists or is completed and route directly to `/exam/[id]/feedback/thank-you`.

## Verification

- Command: `pnpm --filter sentinel-mobile test`
- Check `use-exam-session.test.ts` passes.
