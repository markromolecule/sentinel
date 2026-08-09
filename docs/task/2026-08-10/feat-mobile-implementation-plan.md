# Mobile App Enhancement & Feature Fixes Implementation Plan

## Goal

Enhance and complete feature implementations across the Mobile application (`app/sentinel-mobile`), covering Classroom navigation, Home profile & message badge counters, Profile password validation & update mutation, Exam start date display, Calendar notifications & note parity, and full Message conversation workflows.

## Pre-Planning Summary

- **Task Summary:** Complete mobile student workflows including classroom navigation, user avatar displays, dynamic message & notification badge counters, live message thread & modal integration, calendar note parity & header cleanup, password validation matching web schema, and exam card start date formatting.
- **Affected Workspaces:** `app/sentinel-mobile`, `packages/hooks` (if helpers/queries need re-exports).
- **Affected DB Tables:** None (all backend APIs and endpoints already exist in `sentinel-api`).
- **Prisma Migration Required:** No — operations consume existing API endpoints and Supabase authentication contracts.

---

## 1. The Context

The `sentinel-mobile` app currently has several incomplete UI elements, static mock data (e.g. in messaging and calendar components), missing child routes (classroom classmates and classroom exams), missing real-time unread badge counts on navigation tabs and header buttons, and un-wired password mutations and schema validation. To achieve production readiness, the app requires full alignment with `sentinel-web` services, proper Expo Router nested routing, and real-time state synchronization via TanStack Query hooks.

---

## 3. The Triad

### Option A: The Pragmatic Path (Local Mock Enhancements)

- **Approach:** Add local state overrides and client-side mocks for new modals and sub-routes without integrating full backend hooks.
- **Tradeoff:** Fast visual completion, but fails to provide actual backend synchronization, leaves messages and profile updates non-functional in real environments.

### Option B: The Strategic Path (Full Backend Service Integration & Native Expo Router Flow)

- **Approach:** Integrate existing TanStack Query hooks (`useConversationsQuery`, `useNotificationsQuery`, `useUpdatePasswordMutation`, `useMessageRecipientsQuery`, `useCreateDirectConversationMutation`, `useSendMessageMutation`) directly into mobile features; add missing sub-routes (`classroom/[id]/exams`, `classroom/[id]/classmates`, `messages/[id]`); enforce web-equivalent Zod regex password requirements; and compute tab/header badges dynamically.
- **Tradeoff:** Requires creating focused screen and component files organized cleanly into task folders with dedicated unit tests.

### Option C: The Pivot Path (Global Webview Injection)

- **Approach:** Embed Next.js web components inside React Native WebViews for complex screens like messaging and calendar notes.
- **Tradeoff:** High latency, broken native mobile touch gestures, poor offline behavior, and inconsistent design aesthetics.

---

## 1. The Execution

- **The Recommendation:** Option B.
- **The Justification:** Option B leverages our existing shared monorepo packages (`@sentinel/hooks`, `@sentinel/services`, `@sentinel/shared`) and follows Expo Router native mobile standards cleanly without architectural debt or unnecessary webview overhead.
- **Organization Strategy:** To ensure focused execution, the implementation is decomposed into 6 independent Task Folders, each containing targeted Phase markdown documents.

---

## Breakdown by Task Folders

### Task 1 [Folder]: Classroom Navigation & Sub-routes
- **Path:** [docs/task/2026-08-10/task-1-classroom-navigation/](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-1-classroom-navigation/)
  - **[Completed]** [phase-1-header-cleanup-and-route-setup.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-1-classroom-navigation/phase-1-header-cleanup-and-route-setup.md)
  - **[Completed]** [phase-2-classroom-exams-and-classmates-screens.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-1-classroom-navigation/phase-2-classroom-exams-and-classmates-screens.md)

### Task 2 [Folder]: Home Profile & Message Badge Counter
- **Path:** [docs/task/2026-08-10/task-2-home-profile-and-badge/](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-2-home-profile-and-badge/)
  - **[Completed]** [phase-1-home-profile-avatar-display.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-2-home-profile-and-badge/phase-1-home-profile-avatar-display.md)
  - **[Completed]** [phase-2-message-tab-unread-badge.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-2-home-profile-and-badge/phase-2-message-tab-unread-badge.md)

### Task 3 [Folder]: Profile Avatar, Password Mutation & Schema Validation
- **Path:** [docs/task/2026-08-10/task-3-profile-and-password/](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-3-profile-and-password/)
  - **[Completed]** [phase-1-profile-avatar-and-update-mutation.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-3-profile-and-password/phase-1-profile-avatar-and-update-mutation.md)
  - **[Completed]** [phase-2-password-requirements-validator.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-3-profile-and-password/phase-2-password-requirements-validator.md)

### Task 4 [Folder]: Exam Card Start Date Formatting
- **Path:** [docs/task/2026-08-10/task-4-exam-card-start-date/](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-4-exam-card-start-date/)
  - **[Completed]** [phase-1-exam-card-start-date-display.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-4-exam-card-start-date/phase-1-exam-card-start-date-display.md)

### Task 5 [Folder]: Calendar Notes Parity, Header Cleanup & Notifications
- **Path:** [docs/task/2026-08-10/task-5-calendar-notes-and-notifications/](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-5-calendar-notes-and-notifications/)
  - [phase-1-calendar-header-cleanup-and-note-scoping.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-5-calendar-notes-and-notifications/phase-1-calendar-header-cleanup-and-note-scoping.md)
  - [phase-2-calendar-notifications-query-and-modal.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-5-calendar-notes-and-notifications/phase-2-calendar-notifications-query-and-modal.md)

### Task 6 [Folder]: Student Messaging Workflow & Thread Details
- **Path:** [docs/task/2026-08-10/task-6-student-messaging-workflow/](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-6-student-messaging-workflow/)
  - [phase-1-live-conversations-and-search.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-6-student-messaging-workflow/phase-1-live-conversations-and-search.md)
  - [phase-2-new-message-modal-and-thread-screen.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-10/task-6-student-messaging-workflow/phase-2-new-message-modal-and-thread-screen.md)

---

## Done Criteria

- [x] All 6 feature requirements are separated into explicit Task Folders and Phase documents.
- [x] Header 3-dots button removal and sub-routes navigation mapped under Task 1.
- [x] User profile avatar and message badge counter mapped under Task 2.
- [x] Profile avatar, password mutation, and 5-rule regex schema validator mapped under Task 3.
- [x] Exam start date display on cards mapped under Task 4.
- [x] Calendar header search removal, user note scoping, and notifications modal mapped under Task 5.
- [x] Live conversations query, search filter, new message modal, and thread view screen mapped under Task 6.
- [x] Migration decision explicit: No database migrations required.
