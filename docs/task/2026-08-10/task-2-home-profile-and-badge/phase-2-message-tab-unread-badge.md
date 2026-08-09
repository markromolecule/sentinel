# Phase 2: Message Tab Unread Badge Counter

**Goal:** Calculate total unread messages across active student conversations and update bottom tab bar badge dynamically.

## Tasks

- [ ] Add conversation query using `useConversationsQuery` inside [app/(tabs)/_layout.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/(tabs)/_layout.tsx)
- [ ] Compute aggregated `unreadCount` from active conversation summaries
- [ ] Conditionally set `tabBarBadge` on the `messages` tab screen options when `unreadCount > 0`
- [ ] Write unit test for conversation unread count aggregator in `app/sentinel-mobile/features/messages/lib/unread-count.test.ts`

**Migration required:** No
