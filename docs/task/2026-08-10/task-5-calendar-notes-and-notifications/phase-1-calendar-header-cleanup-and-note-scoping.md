# Phase 1: Calendar Header Cleanup & User Note Scoping

**Goal:** Remove search button from calendar header and scope note creation and persistence to the authenticated user ID.

## Tasks

- [ ] Remove search icon button (`search`) from top action row in [features/calendar/components/calendar-header.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/calendar/components/calendar-header.tsx)
- [ ] Update [features/calendar/hooks/use-calendar.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/calendar/hooks/use-calendar.ts) to scope calendar notes per authenticated user ID in local storage/state
- [ ] Ensure created notes are visible only to their creator matching `sentinel-web` implementation
- [ ] Write unit test for user-scoped note storage and filtering in `app/sentinel-mobile/features/calendar/hooks/user-note-scoping.test.ts`

**Migration required:** No
