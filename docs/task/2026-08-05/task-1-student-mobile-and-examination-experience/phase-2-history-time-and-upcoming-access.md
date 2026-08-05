# Task 1 — Phase 2: History Time and Upcoming Access

**Goal:** Show the examination start time on history cards and remove navigation from cards that represent an upcoming examination.

- [x] Update `app/sentinel-web/src/app/(protected)/student/history/_components/history-card.tsx` to resolve a display timestamp from the examination start/availability field for uncompleted examinations instead of preferring `dueAt`, which represents the end time.
- [x] Update the card rendering in `app/sentinel-web/src/app/(protected)/student/history/_components/history-card.tsx` so an item with `status === 'upcoming'` is presented as non-interactive: no `Link`, no destination to an exam/attempt/result route, and no navigation chevron affordance.
- [x] Preserve `available` and `in-progress` navigation to `/student/exam/[examId]`, and preserve submitted/past-due destinations through `app/sentinel-web/src/lib/routes/student-history-routes.ts`.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/history/_components/history-card.test.tsx` with an upcoming card whose `availableAt` and `dueAt` differ; assert the rendered date/time is `availableAt`, it has no link, and it has no navigation affordance.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/history/_components/history-card.test.tsx` with available, in-progress, submitted, and past-due cases to protect their existing route behavior.
- [x] Extend `app/sentinel-web/src/app/(protected)/student/history/_hooks/use-student-history/index.test.ts` to verify that the available-list mapping preserves the scheduled/start value as `availableAt` for the card.

Implementation and automated coverage for this phase are complete.

**Migration required:** No — existing exam dates and history response fields are sufficient.
