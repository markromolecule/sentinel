# Student Notifications and Messaging

## Objective

Implement and verify the student-facing notification experience, then improve the student messaging
page without duplicating the existing messaging stack.

This is an implementation task, not a planning-only task. Investigate the current code first,
preserve working behavior, make the smallest coherent changes, add regression tests, and report the
validation performed.

## Repository-Grounded Current State

The following findings were verified against the repository on 2026-07-25:

- The student header still renders `MOCK_NOTIFICATIONS` and mutates that mock data when “Mark all as
  read” is clicked:
  `app/sentinel-web/src/components/sidebar/student/StudentHeader.tsx`.
- The full student notifications page is already connected to the real notification query, realtime
  invalidation, and bulk-delete mutation:
  `app/sentinel-web/src/app/(protected)/student/notifications/page.tsx`.
- The instructor bell is the current reference implementation for query, unread count, realtime
  updates, mark-one-read, mark-all-read, and bulk removal:
  `app/sentinel-web/src/components/sidebar/instructor/instructor-notification-dropdown.tsx`.
- `GET /notifications` is already scoped by `recipient_user_id` and the active institution context.
  Read and delete operations are also recipient-owned. Do not replace these guarantees with a
  client-side role or action-type allowlist.
- Announcement publication already creates recipient records for users in the announcement's
  institution. Calendar notification fan-out already maps `targetAudience` to recipient roles.
  If an irrelevant notification reaches a student, fix the backend producer/routing rule that
  created it and cover that rule with a test.
- Student and instructor pages both render the shared
  `app/sentinel-web/src/features/messaging/messaging-page-client.tsx`. The student route is
  `/student/message`; the instructor route is `/messages`.
- The shared messaging client already supports conversation search, conversation creation,
  realtime messages, presence, unread handling, sending, responsive panels, and a participant
  profile dialog. Extend it or extract small reusable pieces; do not create a second student
  messaging implementation.
- The new-conversation directory currently calls `useUsersQuery`. The general `GET /users` handler
  rejects the `student` role, so student directory search cannot work as currently wired.
- `POST /messages/conversations/direct` verifies only that the recipient exists. It does not enforce
  the same institution/relationship policy as a recipient directory. A hidden or hand-crafted
  recipient ID must not bypass the search eligibility policy.

## Required Outcomes

### 1. Student notification bell uses live data

Replace the mock notification block in `StudentHeader` with the existing notification services and
hooks.

Required behavior:

- Fetch the latest five notifications for the authenticated student.
- Subscribe to recipient-scoped realtime notification changes with a stable, student-header query
  key.
- Show the total unread count returned by the API. Display `99+` when it exceeds 99.
- Match the instructor notification dropdown's interaction model and visual language:
  loading/forbidden handling, unread styling, timestamps, mark one as read, mark all as read,
  selection, bulk removal, empty state, and a link to `/student/notifications`.
- Do not mutate query results or shared mock constants.
- Preserve accessible labels for the bell, selection controls, and remove action.
- Keep the dropdown usable on narrow screens without overflowing the viewport.
- A notification row may navigate only when a valid student destination can be derived. Marking it
  read must still work when no destination exists.
- The mobile notification link must continue to reach `/student/notifications`.

Use the authenticated recipient feed as the display source. “Student notifications only” means the
student sees notifications addressed to that student's user ID and institution context. It does
not mean filtering a hard-coded set of enum values in React.

### 2. Verify student-relevant notification delivery

Audit, and fix where necessary, the backend producers for at least these student-facing cases:

- announcements targeted to the student's institution;
- calendar events whose audience includes students;
- exam events that directly affect the student, if such a producer exists in the current flow;
- direct messages received by the student.

For each audited producer:

- create notifications only for eligible recipients;
- respect institution boundaries and explicit audience settings;
- exclude the actor where the existing domain rule requires it;
- include enough resource metadata for the client to derive a safe destination when applicable;
- never expose another user's notification through list, read, read-all, or delete operations.

Do not invent new global notification categories merely to satisfy the UI. If an exam lifecycle
event has no student notification producer, document the exact missing event and add the smallest
domain-level producer only when its recipient and timing are unambiguous.

### 3. Improve the student messaging page

Keep `MessagingPageClient` as the shared implementation and make the `/student/message` rendering
feel native to the student shell.

Required behavior:

- Use the same functional baseline as `/messages`: conversation list, conversation search, new
  conversation flow, message history, send mutation, realtime refresh, unread/read behavior,
  presence, loading/error/empty states, and participant profile.
- Preserve the normal student page gutters and visual rhythm while allowing the conversation and
  message panes to use the available height. Avoid nested page scrollbars and content hidden behind
  `StudentHeader`, `StudentFooter`, or `StudentBottomNav`.
- On phone widths, show one pane at a time. Selecting a conversation opens the chat; Back returns to
  the conversation list. The composer must remain visible above the bottom navigation and software
  keyboard.
- On tablet and desktop widths, show the list and active conversation together.
- Keep the clean, minimalist styles already used by the instructor messaging surface. Reuse shared
  components and route variants instead of copying large JSX blocks.
- Sending whitespace-only messages must remain impossible. Preserve pending/disabled behavior and
  avoid duplicate sends.

### 4. Add a secure student recipient search

Interpret “search users across the system” as “search all users the authenticated student is
allowed to message.” It must not mean unrestricted cross-tenant user discovery.

Implement a backend-owned recipient eligibility contract, preferably under the messages module
(for example, a message-recipient directory endpoint) rather than weakening the administrative
`GET /users` endpoint.

The contract must:

- require authentication and `messages:create`;
- exclude the requester;
- search by name, with a documented minimum query length and bounded result limit;
- return only the profile fields required by the chooser;
- enforce the active institution and any existing relationship/hierarchy rules;
- exclude roles or account statuses that students must not discover or contact;
- apply the same eligibility check in `POST /messages/conversations/direct`, so a crafted
  `recipientId` cannot bypass it;
- return clear `403` or `404` responses without leaking whether an out-of-scope account exists.

Wire the shared new-conversation panel to this contract for students. Existing instructor behavior
must remain intact unless the same contract can safely serve both roles.

## Likely Files in Scope

### Student notifications

- `app/sentinel-web/src/components/sidebar/student/StudentHeader.tsx`
- `app/sentinel-web/src/components/sidebar/student/student-header.test.tsx`
- `app/sentinel-web/src/components/sidebar/instructor/instructor-notification-dropdown.tsx`
  (reference or shared extraction only)
- `app/sentinel-web/src/app/(protected)/student/notifications/page.tsx`
- `app/sentinel-web/src/app/(protected)/student/notifications/_lib/map-app-notification-to-student-notification.ts`
- `packages/hooks/src/query/notifications/*`
- `packages/hooks/src/use-notification-realtime.ts`
- `packages/services/src/api/notifications.ts`

### Notification producers and authorization

- `app/sentinel-api/src/modules/general/notification/**`
- `app/sentinel-api/src/modules/general/announcements/services/announcement-notification.service.ts`
- `app/sentinel-api/src/modules/general/notification/services/activity/calendar-activity-notification.service.ts`
- relevant examination service only if a concrete student event is added or corrected
- `app/sentinel-api/src/modules/general/messages/services/message-write.service.ts`

### Student messaging and recipient directory

- `app/sentinel-web/src/app/(protected)/student/layout.tsx`
- `app/sentinel-web/src/app/(protected)/student/message/page.tsx`
- `app/sentinel-web/src/features/messaging/messaging-page-client.tsx`
- `app/sentinel-web/src/features/messaging/messaging-page-client.test.tsx`
- `packages/hooks/src/query/messages/**`
- `packages/services/src/api/messages.ts`
- `packages/shared/src/types/messages/**`
- `app/sentinel-api/src/modules/general/messages/**`

Treat this list as a navigation aid, not permission for unrelated refactors.

## Acceptance Criteria

### Notifications

- No `MOCK_NOTIFICATIONS` import or mock mutation remains in `StudentHeader`.
- The student bell, full page, and unread badge update after insert, read, read-all, and delete
  operations without a full-page reload.
- An API-forbidden notification state does not render a broken or misleading bell.
- A student cannot list, mark, or delete another user's notification.
- Calendar audience tests prove that a `STUDENTS` or `ALL` event can reach eligible students and an
  audience excluding students does not.
- Announcement tests prove institution scoping.
- Existing instructor notification behavior and tests continue to pass.

### Messaging

- `/student/message` works at phone, tablet, and desktop breakpoints with no clipped composer or
  unintended double scrollbar.
- Existing conversations load, can be searched, and update in realtime.
- A student can search eligible recipients, start or reopen a direct conversation, send a message,
  and see read/unread state update.
- Empty, loading, API error, permission-denied, and no-conversation states are explicit.
- A student cannot discover or start a conversation with an ineligible or cross-tenant user by
  changing the request payload.
- `/messages` for instructors remains functional.

## Required Tests

Add or update focused Vitest coverage for:

- student header loading, forbidden, empty, unread badge, read-one, read-all, realtime query key,
  selection, bulk removal, and “View all” behavior;
- notification recipient and institution scoping for affected producers;
- recipient-directory authentication, permission, search, limit, self-exclusion, tenant scoping,
  role/status policy, and non-leaking out-of-scope behavior;
- direct-conversation creation enforcing the same eligibility policy;
- student messaging route layout and mobile pane navigation;
- successful recipient search, conversation creation, and send mutation;
- regression coverage for the instructor messaging route.

Run at minimum:

```bash
pnpm --dir app/sentinel-web test
pnpm --dir app/sentinel-api test src/modules/general/notification
pnpm --dir app/sentinel-api test src/modules/general/messages
pnpm --dir app/sentinel-api typecheck
pnpm --dir app/sentinel-web lint
pnpm format:check
```

If a broad command fails because of unrelated pre-existing issues, run the narrow affected suites,
record both results, and do not hide the failure.

## Scope Guards

- Do not add a new notification table, messaging system, websocket provider, or environment
  variable unless investigation proves the existing infrastructure cannot satisfy the task.
- Do not add client-side authorization or trust a role supplied by the browser.
- Do not make `GET /users` globally available to students as a shortcut.
- Do not allow unrestricted cross-institution user search or conversation creation.
- Do not duplicate the instructor messaging page for students.
- Do not redesign unrelated student pages, instructor pages, or backend modules.
- No Prisma migration is expected. If one becomes necessary, explain why before adding it and include
  migration and rollback notes.

## Definition of Done

The work is complete only when the implementation, focused tests, type checking, lint/format
validation, and a short manual responsive verification are finished. The final report must list:

1. the user-visible changes;
2. the authorization and recipient-scoping rules implemented;
3. files or modules changed;
4. commands run and their results;
5. any intentionally deferred notification event with its exact reason.
