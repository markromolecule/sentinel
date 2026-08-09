# Phase 1: Live Conversations Query & Search Filtering

**Goal:** Connect student messages list screen to `useConversationsQuery` and integrate search input filtering.

## Tasks

- [x] Replace `MOCK_MESSAGES` in [app/(tabs)/messages.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/(tabs)/messages.tsx) with live query results from `useConversationsQuery`
- [x] Connect header search TextInput to filter conversation list by participant name or last message content
- [x] Handle loading spinner, empty conversation state, and pull-to-refresh
- [x] Write unit test for live conversation list search filtering in `app/sentinel-mobile/features/messages/lib/conversation-search.test.ts`

**Migration required:** No
