# Task 2 — Phase 2: Student Calendar Regression Coverage

**Goal:** Confirm the student calendar renders only API-authorized notes and that personal-note creation still creates an owner-scoped `NOTE`.

- [x] Add `app/sentinel-web/src/app/(protected)/student/calendar/page.test.tsx` covering API events for a selected month: render an authorized personal note and a shared event, and assert the page does not need to apply a second ownership rule.
- [x] In `app/sentinel-web/src/app/(protected)/student/calendar/page.test.tsx`, submit the add-note dialog and assert `useCreateCalendarEventMutation` receives `eventType: 'NOTE'`, `targetAudience: 'STUDENTS'`, and the selected date/time fields.
- [x] Extend `app/sentinel-api/src/modules/general/calendar/calendar.service.test.ts` or `app/sentinel-api/src/modules/general/calendar/services/calendar-write.service.test.ts` to keep the existing `created_by = authenticated user` write path covered for a `NOTE`.
- [ ] Manually verify with two student accounts in the same institution: Student A creates a note, Student A sees it after reload/month navigation, and Student B does not receive or render it; both students still see shared calendar events allowed by role and institution scope.

Implementation and automated coverage for this phase are complete. The manual two-account verification remains pending.

**Migration required:** No — this phase adds tests and confirms existing ownership data.
