# Phase 2: New Message Recipient Modal & Chat Thread Screen

**Goal:** Implement New Message recipient selection modal and dedicated chat thread details screen.

## Tasks

- [x] Create `[NEW]` [features/messages/components/new-message-modal.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/messages/components/new-message-modal.tsx) consuming `useMessageRecipientsQuery` and `useCreateDirectConversationMutation` to start new direct chats
- [x] Connect `+` FAB and top action button in [app/(tabs)/messages.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/(tabs)/messages.tsx) to trigger `NewMessageModal`
- [x] Create `[NEW]` [app/messages/[id].tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/messages/[id].tsx) chat thread route powered by `useConversationMessagesQuery` and `useSendMessageMutation`
- [x] Implement message input bar, automatic scroll-to-bottom on new message, and mark-as-read trigger (`useMarkConversationReadMutation`)
- [x] Write unit test for message recipient payload builder in `app/sentinel-mobile/features/messages/lib/new-message-payload.test.ts`

**Migration required:** No
