# feat-001 — Student Notifications and Messaging Implementation Plan

**Date:** 2026-07-25  
**Type:** Feature / Security Hardening  
**Source:** `docs/context/July/July 24/feat-notification-student.md`  
**Affected workspaces:** `app/sentinel-web`, `app/sentinel-api`, `packages/hooks`,
`packages/services`, `packages/shared`

## Pre-Planning Checklist

- [x] Read and summarize the task input in one sentence.
- [x] Scan the current student and instructor notification surfaces, notification hooks, API
      ownership checks, notification producers, shared messaging client, message API, user search
      API, and student layout.
- [x] Identify the files, services, API contracts, and database tables the implementation will
      touch.
- [x] Determine whether a Prisma migration is needed: **No**. The existing notification,
      conversation, participant, message, profile, role, permission, and institution tables contain
      the required fields.

## Task Summary

Replace the student's mock notification bell with the existing recipient-scoped realtime
notification system, verify student notification producers, secure student message-recipient
discovery and direct-conversation creation behind one backend eligibility policy, and refine the
shared messaging client for the `/student/message` layout without regressing `/messages`.

## 1. The Context

The student notification page is API-backed, but `StudentHeader` still displays and mutates shared
mock data, leaving its badge and read actions disconnected from the authenticated recipient feed.
The shared messaging UI already serves students and instructors, but student recipient search calls
an administrative `/users` endpoint that rejects students, while direct-conversation creation only
checks that a supplied recipient ID exists and therefore does not enforce tenant or recipient
eligibility.

The implementation must reuse the current React Query, Supabase Realtime, Hono, Kysely, and
permission patterns; preserve the instructor experience; keep authorization server-owned; and
avoid a schema migration or a duplicate student messaging stack.

## 2. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Copy the instructor notification dropdown logic into `StudentHeader`, allow students
  through the existing `/users` controller with a same-institution filter, and add a student-role
  check directly inside `createDirectConversation()`.
- **Tradeoff:** This is fast, but duplicates notification state and UI logic, mixes a
  messaging-specific discovery policy into the administrative user directory, and risks the search
  and creation authorization rules drifting apart.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Extract the shared web notification dropdown behavior behind route-specific props,
  add a dedicated `/messages/recipients` contract, and centralize student recipient eligibility in
  one messages-domain resolver used by both recipient search and direct-conversation creation.
- **Tradeoff:** This adds several small shared schemas, services, hooks, and tests, so the initial
  implementation is larger than a direct copy even though it stays within existing architecture.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Introduce a database view or RPC that projects messageable recipients and a unified
  communication-center component that merges notification and message activity into one client
  feed.
- **Tradeoff:** This changes the data-access paradigm, requires a migration and new RLS review, and
  expands the feature into a communication-platform redesign with substantially more rollout risk.

## 3. The Execution

**The Recommendation:** Choose **Option B: The Strategic Path**.

**The Justification:** A dedicated message-recipient contract matches the domain boundary, leaves
the administrative `/users` behavior intact, and ensures a crafted `recipientId` is evaluated by
the same policy as visible search results. A shared web notification dropdown removes the existing
student/instructor behavior split without moving domain behavior into the generic `packages/ui`
workspace. This option uses existing dependencies and tables, provides the clearest security
boundary, and keeps the added complexity proportional to the feature.

**Next Steps:**

1. Extract and connect the common notification dropdown behavior, then verify producer and
   recipient ownership rules.
2. Add the message-recipient schema, eligibility resolver, data query, controller, service facade,
   service client, and React Query hook.
3. Use the recipient hook and route-aware layout behavior in `MessagingPageClient`, then run focused
   backend, shared-package, and web regression suites.

## Existing Findings

- `app/sentinel-web/src/components/sidebar/student/StudentHeader.tsx` imports
  `MOCK_NOTIFICATIONS`, slices four rows, and mutates `isRead` on those shared objects.
- `app/sentinel-web/src/app/(protected)/student/notifications/page.tsx` already uses
  `useNotificationsQuery`, `useNotificationRealtime`, and
  `useDeleteNotificationsMutation`.
- `app/sentinel-web/src/components/sidebar/instructor/instructor-notification-dropdown.tsx`
  already implements unread counts, a `99+` cap, mark-one, mark-all, selection, bulk removal,
  empty state, and realtime invalidation.
- `app/sentinel-api/src/modules/general/notification/data/get-notifications.ts` scopes list and
  unread-count queries to `recipient_user_id` and the active institution hierarchy.
- Notification read and delete data access also includes the authenticated recipient ID.
- `AnnouncementNotificationService` scopes institution announcements and excludes the author.
- `CalendarActivityNotificationService` maps `ALL`, `STUDENTS`, `INSTRUCTORS`, `ADMINS`, and
  `SPECIFIC_GROUP` audiences to recipient roles; `SPECIFIC_GROUP` currently intentionally emits no
  notification because group resolution is not implemented.
- Student examination notifications already exist for lobby admission decisions in
  `update-admissions.ts` and attempt lifecycle events in
  `lifecycle-notification.service.ts`; the generic instructor exam-assignment notifications are not
  student assignment notifications.
- `sendMessage()` creates a notification for other conversation participants, but it does not set
  `institutionId` or message-navigation metadata beyond the conversation resource ID.
- `/student/message` and `/messages` both render
  `app/sentinel-web/src/features/messaging/messaging-page-client.tsx`.
- `MessagingPageClient` treats only `/messages` as its full-height split-pane route and uses
  `useUsersQuery` for the new-conversation directory.
- `app/sentinel-api/src/modules/identity/users/controllers/get-users.controller.ts` rejects
  student callers.
- `createDirectConversation()` prevents self-conversations and verifies recipient existence, but it
  does not verify tenant, profile status, recipient role, or messaging eligibility.
- `StudentLayout` already special-cases `/student/message` as a constrained-height page, while
  `StudentFooter` remains in normal flow and `StudentBottomNav` is fixed on mobile.

## Fixed Policy Decisions

These decisions make the implementation executable without delegating authorization choices to the
client:

- The notification UI renders every record returned by the authenticated recipient feed; it does
  not maintain a client-side action-type allowlist.
- Student recipient search requires at least 2 trimmed characters and accepts a maximum result
  limit of 20.
- A student-searchable recipient must:
    - not be the requester;
    - have an `ACTIVE` `user_profiles.status`;
    - belong to the requester's exact active institution;
    - not have a primary role of `support` or `superadmin`;
    - retain active `messages:view` permission after user-level overrides are applied.
- Search returns only `userId`, display name, avatar URL, primary role, profile status, and
  institution ID/name.
- A student direct-conversation request applies the same policy by recipient ID. A missing and an
  ineligible recipient both return the same `404` message: `Message recipient not found.`
- Non-student direct-conversation behavior remains unchanged in this feature to avoid silently
  narrowing established instructor/admin workflows. Their broader recipient policy can be
  hardened separately.
- The existing instructor directory continues to use `useUsersQuery`; only the student surface
  switches to the messages recipient hook.
- Student page gutters remain `p-4 md:p-6`. The message workspace consumes the remaining height
  inside those gutters; the desktop footer is omitted on `/student/message`, and the mobile
  composer reserves the fixed bottom-navigation safe area.
- Student notification destinations are derived only from validated API resource fields or metadata:
  announcements open `/student/classroom`, calendar activity opens `/student/calendar`, exam
  resources with an exam ID use the existing student exam destination, and message activity opens
  `/student/message?conversationId=<uuid>`. Unsupported records remain readable but non-navigable.
- `SPECIFIC_GROUP` calendar audience resolution remains out of scope and must stay explicitly
  covered as a no-fan-out case.

## Files, Services, and Database Tables in Scope

### Frontend — Student Notifications

- `app/sentinel-web/src/components/sidebar/common/web-notification-dropdown.tsx` — new shared
  app-level notification dropdown.
- `app/sentinel-web/src/components/sidebar/common/web-notification-dropdown.test.tsx` — shared
  dropdown behavior tests.
- `app/sentinel-web/src/components/sidebar/student/StudentHeader.tsx` — replace mock bell with the
  shared live dropdown.
- `app/sentinel-web/src/components/sidebar/student/student-header.test.tsx` — student header
  integration tests.
- `app/sentinel-web/src/components/sidebar/instructor/instructor-notification-dropdown.tsx` —
  delegate to the shared dropdown while preserving instructor behavior.
- `app/sentinel-web/src/components/sidebar/instructor/instructor-notification-dropdown.test.tsx` —
  instructor regression tests.
- `app/sentinel-web/src/app/(protected)/student/notifications/_lib/map-app-notification-to-student-notification.ts`
  — export a reusable student destination resolver.
- `app/sentinel-web/src/app/(protected)/student/notifications/_lib/map-app-notification-to-student-notification.test.ts`
  — destination and fallback tests.

### Backend — Notification Producers and Ownership

- `app/sentinel-api/src/modules/general/announcements/services/announcement-notification.service.test.ts`
- `app/sentinel-api/src/modules/general/notification/services/activity/calendar-activity-notification.service.test.ts`
- `app/sentinel-api/src/modules/general/notification/tests/get-notifications-scoping.test.ts`
- `app/sentinel-api/src/modules/general/notification/data/mark-notification-read.ts`
- `app/sentinel-api/src/modules/general/notification/data/delete-notifications.ts`
- `app/sentinel-api/src/modules/general/notification/data/mark-all-notifications-read.ts`
- `app/sentinel-api/src/modules/general/messages/services/message-write.service.ts`
- `app/sentinel-api/src/modules/general/messages/services/message-write.service.test.ts`
- `app/sentinel-api/src/modules/examination/lobby/services/update-admissions.ts`
- `app/sentinel-api/src/modules/examination/lobby/services/update-admissions.test.ts` — new focused
  producer test.
- `app/sentinel-api/src/modules/examination/lifecycle/services/lifecycle-notification.service.ts`
- `app/sentinel-api/src/modules/examination/lifecycle/services/lifecycle-notification.service.test.ts`
  — new focused producer test.

### Backend — Message Recipient Directory

- `app/sentinel-api/src/modules/general/messages/messages.dto.ts`
- `app/sentinel-api/src/modules/general/messages/messages.routes.ts`
- `app/sentinel-api/src/modules/general/messages/messages.service.ts`
- `app/sentinel-api/src/modules/general/messages/controllers/get-message-recipients.controller.ts`
  — new route controller.
- `app/sentinel-api/src/modules/general/messages/controllers/get-message-recipients.controller.test.ts`
  — new controller tests.
- `app/sentinel-api/src/modules/general/messages/controllers/create-direct-conversation.controller.ts`
- `app/sentinel-api/src/modules/general/messages/controllers/messages.controller.test.ts`
- `app/sentinel-api/src/modules/general/messages/data/get-message-recipients.ts` — new bounded,
  tenant-scoped query.
- `app/sentinel-api/src/modules/general/messages/data/get-message-recipients.test.ts` — new data
  query tests.
- `app/sentinel-api/src/modules/general/messages/services/message-recipient-eligibility.service.ts`
  — new shared search/direct-create policy.
- `app/sentinel-api/src/modules/general/messages/services/message-recipient-eligibility.service.test.ts`
  — new policy tests.
- `app/sentinel-api/src/modules/general/messages/services/message-write.service.ts`
- `app/sentinel-api/src/modules/general/messages/services/message-write.service.test.ts`

### Shared Contracts, Services, and Hooks

- `packages/shared/src/schema/messages/message-schema.ts`
- `packages/shared/src/schema/messages/message-schema.test.ts`
- `packages/shared/src/types/messages/index.ts`
- `packages/shared/src/constants/admin/messages/index.ts`
- `packages/services/src/api/messages.ts`
- `packages/services/src/api/messages.test.ts` — new API client tests.
- `packages/hooks/src/query/messages/use-message-recipients-query.ts` — new query hook.
- `packages/hooks/src/query/messages/use-message-recipients-query.test.ts` — new hook tests.
- `packages/hooks/src/query/messages/index.ts`

### Frontend — Student Messaging

- `app/sentinel-web/src/app/(protected)/student/layout.tsx`
- `app/sentinel-web/src/app/(protected)/student/layout.test.tsx` — new layout regression tests.
- `app/sentinel-web/src/app/(protected)/student/message/page.tsx`
- `app/sentinel-web/src/app/(protected)/student/message/page.test.tsx` — new route fallback test.
- `app/sentinel-web/src/features/messaging/messaging-page-client.tsx`
- `app/sentinel-web/src/features/messaging/messaging-page-client.test.tsx`

### Existing Database Tables Used

- `public.notifications`
- `public.conversations`
- `public.conversation_participants`
- `public.messages`
- `public.user_profiles`
- `public.user_roles`
- `public.roles`
- `public.rbac_permissions`
- `public.rbac_role_permissions`
- `public.rbac_user_permission_overrides`
- `public.institutions`
- `auth.users`

## Phase 1: Consolidate the Web Notification Dropdown

**Goal:** Give student and instructor headers one tested notification interaction model while
retaining route-specific presentation and query keys.

- [ ] Create `WebNotificationDropdown` in
      `app/sentinel-web/src/components/sidebar/common/web-notification-dropdown.tsx` with exported,
      JSDoc-documented props for `queryKey`, optional `viewAllHref`, `triggerClassName`, and an
      optional notification destination resolver.
- [ ] Move the instructor dropdown's `useNotificationsQuery({ params: { limit: 5 } })`,
      `useNotificationRealtime`, mark-one/read-all mutations, selection state, bulk-delete mutation,
      unread badge, timestamp, empty state, and forbidden/loading behavior into
      `WebNotificationDropdown`.
- [ ] Keep `NOTIFICATION_QUERY_KEY = ['notifications', 'instructor-header']` in
      `app/sentinel-web/src/components/sidebar/instructor/instructor-notification-dropdown.tsx` and
      render `WebNotificationDropdown` with the same visible and accessible instructor behavior.
- [ ] Add `STUDENT_HEADER_NOTIFICATION_QUERY_KEY = ['notifications', 'student-header']` in
      `app/sentinel-web/src/components/sidebar/student/StudentHeader.tsx`, remove
      `MOCK_NOTIFICATIONS`, and render `WebNotificationDropdown` with
      `viewAllHref="/student/notifications"`.
- [ ] Export a JSDoc-documented `resolveStudentNotificationHref()` from
      `app/sentinel-web/src/app/(protected)/student/notifications/_lib/map-app-notification-to-student-notification.ts`
      and use it from both the full-page mapper and the student header dropdown; return `undefined`
      for unsupported or incomplete resources so read behavior does not depend on navigation, and
      map validated announcement, calendar, exam, and conversation metadata to the fixed student
      routes.
- [ ] Preserve the existing mobile `/student/notifications` link in `StudentHeader` and constrain
      dropdown width with viewport-aware classes so it does not overflow a narrow screen.
- [ ] Write `web-notification-dropdown.test.tsx` beside the shared component to cover loading,
      forbidden, empty, unread count and `99+`, mark-one, mark-all pending state, selection,
      bulk-delete reset, valid navigation, missing destination, and “View all”.
- [ ] Update `student-header.test.tsx` to mock the shared dropdown rather than notification data and
      assert the student query key, destination resolver, view-all route, desktop bell placement,
      and mobile notification route.
- [ ] Update `instructor-notification-dropdown.test.tsx` to assert the wrapper supplies the
      instructor query key and preserves its current live notification behavior through the shared
      component tests.
      **Migration required:** No — this phase reuses existing notification API contracts and
      database columns.

## Phase 2: Verify Student Notification Producers and Recipient Ownership

**Goal:** Prove that student-facing announcement, calendar, exam, and message notifications are
created for the correct recipient and cannot be operated on by another user.

- [ ] Extend
      `app/sentinel-api/src/modules/general/announcements/services/announcement-notification.service.test.ts`
      with separate institution, author-exclusion, publish, and update cases that assert
      `recipientUserId`, `institutionId`, `ANNOUNCEMENT` resource metadata, and no out-of-institution
      recipient fan-out.
- [ ] Extend
      `app/sentinel-api/src/modules/general/notification/services/activity/calendar-activity-notification.service.test.ts`
      to assert `ALL` and `STUDENTS` include the student role, `INSTRUCTORS` and `ADMINS` exclude it,
      and `SPECIFIC_GROUP` remains a documented no-fan-out case.
- [ ] Add
      `app/sentinel-api/src/modules/examination/lobby/services/update-admissions.test.ts` covering
      approved and rejected student notifications, missing student profiles, institution/resource
      fields, and isolation of a notification failure from the admission update result.
- [ ] Add
      `app/sentinel-api/src/modules/examination/lifecycle/services/lifecycle-notification.service.test.ts`
      covering recipient resolution from `studentId`, student-only resource metadata, explicit
      institution override, missing student profile, and every supported lifecycle event copy
      mapping.
- [ ] Update `sendMessage()` in
      `app/sentinel-api/src/modules/general/messages/services/message-write.service.ts` to resolve
      the sender's institution before notification fan-out and include `institutionId`,
      `conversationId`, and `senderId` in notification metadata while retaining
      `resourceId = conversationId`.
- [ ] Extend
      `app/sentinel-api/src/modules/general/messages/services/message-write.service.test.ts` to
      assert only other participants receive message notifications, institution/message metadata
      is present, long previews remain bounded, and notification failures do not roll back the sent
      message.
- [ ] Extend
      `app/sentinel-api/src/modules/general/notification/tests/get-notifications-scoping.test.ts`
      and the co-located read/delete data tests to prove list, unread count, mark-one, mark-all, and
      bulk delete always include the authenticated `recipient_user_id` and active institution
      scope.
      **Migration required:** No — all producers write existing notification action, resource, and
      metadata fields.

## Phase 3: Add the Message Recipient Eligibility Contract

**Goal:** Expose a bounded student recipient directory and enforce the same server-side policy when
creating a direct conversation.

- [ ] Add `messageRecipientOpenApi`, `getMessageRecipientsSchema`, and the query validation
      `search: trim().min(2).max(100)` plus `limit: int().min(1).max(20).default(20)` in
      `app/sentinel-api/src/modules/general/messages/messages.dto.ts`.
- [ ] Add the corresponding `messageRecipientSchema` and inferred `MessageRecipient` type in
      `packages/shared/src/schema/messages/message-schema.ts` and
      `packages/shared/src/types/messages/index.ts`; document all exported schema/type-facing
      helpers with JSDoc.
- [ ] Add `getMessageRecipientsData()` in
      `app/sentinel-api/src/modules/general/messages/data/get-message-recipients.ts` to select the
      minimal response fields, join the primary role and institution, exclude the requester,
      require `ACTIVE` profile status, apply exact active-institution scope, exclude `support` and
      `superadmin`, apply case-insensitive first-name/last-name/display-name search, enforce active
      `messages:view` permission including allow/deny overrides, order by last name/first name, and
      cap results at the validated limit.
- [ ] Export `getMessageRecipientsData()` from
      `app/sentinel-api/src/modules/general/messages/data/index.ts`.
- [ ] Create JSDoc-documented `listEligibleMessageRecipients()` and
      `assertEligibleDirectMessageRecipient()` in
      `app/sentinel-api/src/modules/general/messages/services/message-recipient-eligibility.service.ts`;
      apply the fixed student policy and return the same `404 Message recipient not found.` for
      missing and ineligible IDs.
- [ ] Add `listMessageRecipients` to
      `app/sentinel-api/src/modules/general/messages/messages.service.ts`.
- [ ] Create `GET /messages/recipients` in
      `app/sentinel-api/src/modules/general/messages/controllers/get-message-recipients.controller.ts`;
      require `messages:create`, pass the authenticated user and active institution context to the
      service, and return only the validated recipient projection.
- [ ] Register the recipient route before parameterized conversation routes in
      `app/sentinel-api/src/modules/general/messages/messages.routes.ts`.
- [ ] Update
      `app/sentinel-api/src/modules/general/messages/controllers/create-direct-conversation.controller.ts`
      to pass the authenticated requester's role and active institution context to
      `MessagesService.createDirectConversation`.
- [ ] Update `createDirectConversation()` in
      `app/sentinel-api/src/modules/general/messages/services/message-write.service.ts` to call
      `assertEligibleDirectMessageRecipient()` for student requesters before looking up or creating
      a conversation; keep the current non-student path unchanged.
- [ ] Add `get-message-recipients.test.ts` beside the data query to assert query length/limit
      behavior, self-exclusion, exact-tenant filtering, active status, excluded roles, permission
      override handling, ordering, and minimal selected fields.
- [ ] Add `message-recipient-eligibility.service.test.ts` beside the resolver to cover eligible,
      nonexistent, inactive, cross-tenant, excluded-role, permission-denied, self, student, and
      non-student branches with non-leaking error behavior.
- [ ] Add `get-message-recipients.controller.test.ts` beside the controller to cover authentication
      middleware expectations, `messages:create`, invalid query input, active-institution forwarding,
      successful response shape, and service errors.
- [ ] Extend `messages.controller.test.ts` and `message-write.service.test.ts` to prove a crafted
      student `recipientId` cannot bypass the resolver and an existing eligible conversation is
      still returned without creating duplicate rows.
- [ ] Add schema tests in `packages/shared/src/schema/messages/message-schema.test.ts` for valid
      minimal recipients and rejection of missing IDs, invalid status values, or excess fields if
      the schema is strict.
      **Migration required:** No — the eligibility query uses existing profile, institution, role,
      and RBAC relations.

## Phase 4: Add the Shared Recipient Service and Query Hook

**Goal:** Give the web messaging feature a typed React Query interface to the new messages-domain
recipient directory.

- [ ] Add the JSDoc-documented `getMessageRecipients(apiClient, params)` function to
      `packages/services/src/api/messages.ts`, serialize trimmed `search` and bounded `limit`, call
      `GET /messages/recipients`, and return `MessageRecipient[]`.
- [ ] Add `recipients(search, limit)` to `MESSAGES_QUERY_KEYS` in
      `packages/shared/src/constants/admin/messages/index.ts` so search caches remain separate from
      conversation and message caches.
- [ ] Create `useMessageRecipientsQuery()` in
      `packages/hooks/src/query/messages/use-message-recipients-query.ts`; debounce the trimmed
      search by 300 ms, enable the authenticated query only at two characters, and pass a maximum
      limit of 20.
- [ ] Export the hook from `packages/hooks/src/query/messages/index.ts`.
- [ ] Add `packages/services/src/api/messages.test.ts` to verify URL encoding, omission of invalid
      optional values, response mapping, and API error propagation for recipient search.
- [ ] Add `use-message-recipients-query.test.ts` beside the hook to verify debounce, query key,
      minimum length, authenticated enablement, bounded limit, successful data, and error behavior.
- [ ] Extend the existing message mutation hook tests only if the new recipient type changes the
      call site; keep `useCreateDirectConversationMutation` invalidation on
      `MESSAGES_QUERY_KEYS.conversations()`.
      **Migration required:** No — this phase adds client contracts and query caching only.

## Phase 5: Integrate Student Recipient Search and Responsive Messaging Layout

**Goal:** Make `/student/message` use the secure recipient directory and fit the student shell at
phone, tablet, and desktop sizes without changing the instructor workflow.

- [ ] In `app/sentinel-web/src/features/messaging/messaging-page-client.tsx`, derive explicit
      `isStudentMessagesRoute` and `isInstructorMessagesRoute` values instead of treating only
      `/messages` as special.
- [ ] Read an optional `conversationId` from `useSearchParams()` in `MessagingPageClient`; select it
      only after it appears in the authenticated user's `useConversationsQuery()` result, ignore
      unknown IDs without calling create-conversation, and preserve the existing `userId` flow for
      approved directory selections.
- [ ] Keep `useUsersQuery` enabled only for the instructor directory and add
      `useMessageRecipientsQuery` for `/student/message`; map `MessageRecipient` into the existing
      new-conversation presentation model without exposing additional user fields.
- [ ] Update `NewConversationPanel` in `messaging-page-client.tsx` to accept the minimal shared
      recipient presentation type, show its loading/error/empty states, exclude stale results while
      a new term is loading, and continue to call
      `useCreateDirectConversationMutation({ recipientId })`.
- [ ] Guard `handleSendMessage()` against `messageDraft.trim().length === 0` before invoking the
      mutation, retain the disabled/pending button behavior, and prevent duplicate submission while
      `sendMessageMutation.isPending`.
- [ ] Add a student route variant in `MessagingPageClient` that preserves `p-4 md:p-6`, uses a
      `min-h-0` split pane within the remaining viewport height, shows one pane at a time below the
      `md` breakpoint, restores the list on Back, and keeps the composer above the mobile safe-area
      and bottom navigation.
- [ ] Update `app/sentinel-web/src/app/(protected)/student/layout.tsx` to omit `StudentFooter` only
      when `pathname === '/student/message'`, retain `StudentHeader` and `StudentBottomNav`, and keep
      the message `PageShell` constrained with `min-h-0` and no outer scrollbar.
- [ ] Replace the plain `<div>Loading inbox...</div>` in
      `app/sentinel-web/src/app/(protected)/student/message/page.tsx` with an accessible,
      height-compatible skeleton or status fallback that does not shift the final layout.
- [ ] Extend `messaging-page-client.test.tsx` to cover student recipient hook selection,
      instructor `useUsersQuery` preservation, two-character search, empty/error/loading directory
      states, eligible recipient selection, successful create/reopen behavior, whitespace send
      prevention, pending duplicate-send prevention, authorized notification `conversationId`
      selection, rejection of an unknown conversation ID, mobile list/chat transitions, Back, and
      instructor route regression.
- [ ] Add `student/layout.test.tsx` beside the layout to assert the footer is omitted only for
      `/student/message`, the bottom navigation remains mounted, and non-message student routes keep
      their normal footer and page shell.
- [ ] Add `student/message/page.test.tsx` beside the route to assert the shared client remains the
      only messaging implementation and the Suspense fallback is accessible.
      **Migration required:** No — the work is route-aware UI composition over existing and additive
      API behavior.

## Phase 6: Integrated Verification and Handoff

**Goal:** Validate the notification, authorization, message, and responsive-layout changes and
record any pre-existing failures without masking them.

- [ ] Run the shared notification and messaging component tests:
      `pnpm --dir app/sentinel-web test -- src/components/sidebar/common/web-notification-dropdown.test.tsx src/components/sidebar/student/student-header.test.tsx src/components/sidebar/instructor/instructor-notification-dropdown.test.tsx src/features/messaging/messaging-page-client.test.tsx`.
- [ ] Run the student layout and route tests:
      `pnpm --dir app/sentinel-web test -- 'src/app/(protected)/student/layout.test.tsx' 'src/app/(protected)/student/message/page.test.tsx'`.
- [ ] Run notification backend tests:
      `pnpm --dir app/sentinel-api test src/modules/general/notification src/modules/general/announcements/services/announcement-notification.service.test.ts src/modules/examination/lobby/services/update-admissions.test.ts src/modules/examination/lifecycle/services/lifecycle-notification.service.test.ts`.
- [ ] Run message API tests:
      `pnpm --dir app/sentinel-api test src/modules/general/messages`.
- [ ] Run shared schema, service, and hook tests:
      `pnpm --dir packages/shared exec vitest run src/schema/messages/message-schema.test.ts`,
      `pnpm --dir packages/services exec vitest run src/api/messages.test.ts`, and
      `pnpm --dir packages/hooks exec vitest run src/query/messages`.
- [ ] Run workspace static checks:
      `pnpm --dir app/sentinel-api typecheck`,
      `pnpm --dir app/sentinel-web lint`, and `pnpm format:check`.
- [ ] Run the full affected frontend suite with `pnpm --dir app/sentinel-web test` and record any
      pre-existing failure separately from feature regressions.
- [ ] Manually verify `/student/notifications`, `/student/message`, and `/messages` at phone,
      tablet, and desktop widths; confirm unread realtime refresh, mark/read/delete behavior,
      mobile pane navigation, bottom-nav clearance, recipient search, direct-conversation creation,
      message send, and instructor regression.
- [ ] Test cross-user notification IDs, an inactive recipient ID, a cross-institution recipient ID,
      a support/superadmin recipient ID, and a recipient denied `messages:view`; confirm notification
      ownership remains enforced and all ineligible direct-message IDs return the same non-leaking
      `404`.
- [ ] Record commands, outcomes, changed modules, the implemented recipient policy, responsive
      screenshots, and the intentionally deferred `SPECIFIC_GROUP` calendar behavior in the final
      implementation report.
      **Migration required:** No — verification does not alter the database schema.

## Breaking API Changes

- `GET /messages/recipients` is additive.
- The `POST /messages/conversations/direct` request and success response shapes remain unchanged.
- Student callers may now receive `404 Message recipient not found.` for an existing but ineligible
  recipient. This is an intentional authorization hardening and avoids account-existence leakage.
- Existing non-student direct-conversation behavior remains unchanged in this feature.

## Environment and Deployment Considerations

- No new environment variables are required.
- No new third-party dependencies are required.
- Supabase Realtime configuration is unchanged; the existing recipient-filtered `notifications`
  subscription and message subscriptions remain in use.
- No seed change is expected because the current messages permission seed assigns `messages:view`
  and `messages:create` to students.
- Deploy the API and shared package changes before or atomically with the web change so the student
  recipient hook does not call an unavailable route.

## Migration and Rollback

**Prisma migration required:** No.

The implementation reads and writes existing tables and adds an API route plus application code.
Rollback consists of reverting the web integration, shared service/hook/schema additions, and the
new recipient route/resolver. No database rollback or data backfill is required; notifications and
conversations created before rollback remain valid.

## Done Criteria

- [ ] Every implementation task above references a concrete file, exported function, route, or test.
- [ ] `StudentHeader` no longer imports or mutates `MOCK_NOTIFICATIONS`.
- [ ] Student and instructor headers share one live notification interaction implementation with
      distinct stable query keys.
- [ ] Student notification inserts, read-one, read-all, and deletes update the bell and full page
      without a full reload.
- [ ] Announcement, calendar, lobby, lifecycle, and message producer tests prove student recipient
      and institution scoping.
- [ ] Notification list, read, read-all, and delete tests prove authenticated recipient ownership.
- [ ] Student recipient search is served by `/messages/recipients`, not `/users`.
- [ ] Recipient search and student direct-conversation creation use the same eligibility resolver.
- [ ] Ineligible and nonexistent student recipient IDs produce the same non-leaking `404`.
- [ ] `/student/message` supports secure search, create/reopen, realtime messages, read state,
      presence, explicit loading/error/empty states, and responsive pane navigation.
- [ ] `/messages` retains its current instructor directory and messaging behavior.
- [ ] Every phase includes co-located Vitest coverage.
- [ ] Focused tests, affected full suites, API typecheck, web lint, and Prettier validation pass, or
      unrelated pre-existing failures are documented with successful narrow-suite evidence.
- [ ] No Prisma migration, new environment variable, new dependency, duplicate messaging page, or
      client-side authorization allowlist is introduced.
