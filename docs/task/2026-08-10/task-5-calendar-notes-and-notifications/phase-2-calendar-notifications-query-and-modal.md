# Phase 2: Calendar Notifications Query & Modal Integration

**Goal:** Query live user notifications via `useNotificationsQuery`, display an unread badge indicator on the header notification button, and build an interactive notifications list modal.

## Tasks

- [ ] Query notification data using `useNotificationsQuery` in [app/(tabs)/calendar.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/(tabs)/calendar.tsx)
- [ ] Pass `unreadCount` to [features/calendar/components/calendar-header.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/calendar/components/calendar-header.tsx) and render badge count pill on notification button
- [ ] Create `[NEW]` [features/calendar/components/notifications-modal.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/calendar/components/notifications-modal.tsx) displaying notification items, read states, and timestamps
- [ ] Wire notification icon button to open `NotificationsModal`
- [ ] Write unit test for notification unread badge count calculation in `app/sentinel-mobile/features/calendar/lib/notification-badge.test.ts`

**Migration required:** No
