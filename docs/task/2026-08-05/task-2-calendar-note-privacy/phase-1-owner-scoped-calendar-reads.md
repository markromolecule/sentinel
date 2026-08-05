# Task 2 — Phase 1: Owner-Scoped Calendar Reads

**Goal:** Ensure a personal `NOTE` is returned only to its creator while preserving existing visibility for institution calendar events.

- [x] Update `app/sentinel-api/src/modules/general/calendar/controllers/get-calendar-events.controller.ts` to pass the authenticated user ID to the calendar-query service.
- [x] Update `app/sentinel-api/src/modules/general/calendar/services/calendar-query.service.ts` and `app/sentinel-api/src/modules/general/calendar/data/get-calendar-events.ts` to accept that user ID and add an ownership predicate: return a record when it is not a `NOTE`, or when `calendar_events.created_by` equals the authenticated user ID.
- [x] Keep the existing institution-scope, role-audience, month, and year predicates in `app/sentinel-api/src/modules/general/calendar/data/get-calendar-events.ts`; owner scoping must be combined with them, not replace them.
- [x] Do not change `packages/db/prisma/schema.prisma`: `calendar_events.created_by` already identifies the note owner. Do not introduce a client-only filter because it would expose another student’s note in the API response.
- [x] Extend `app/sentinel-api/src/modules/general/calendar/services/calendar-query.service.test.ts` to verify the current user ID is forwarded to the data layer.
- [x] Extend `app/sentinel-api/src/modules/general/calendar/controllers/calendar.controller.test.ts` to verify the authenticated user ID is used for list requests and the response excludes notes owned by another student.

Implementation and automated coverage for this phase are complete.

**Migration required:** No — `calendar_events.created_by` is already populated when `create-calendar-event.controller.ts` calls `CalendarService.createCalendarEvent()`.
