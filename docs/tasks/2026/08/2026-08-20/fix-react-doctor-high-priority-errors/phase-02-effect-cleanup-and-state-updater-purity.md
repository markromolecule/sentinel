---
title: "Phase 2: Missing Effect Cleanups and Impure State Updaters"
type: phase
parent: "Fix High-Priority React Doctor Errors Across Sentinel Monorepo"
phase: "02"
status: completed
created: "2026-08-20"
tags: [task, phase, react-doctor, memory-leak, effects, state-updaters]
---

# Phase 2: Missing Effect Cleanups and Impure State Updaters

## Objective

Eliminate all `effect-needs-cleanup` and `no-impure-state-updater` errors across `sentinel-web`, `sentinel-core`, `sentinel-support`, `sentinel-mobile`, `@sentinel/hooks`, and `@sentinel/ui`.

## Dependencies & Prerequisites

- Phase 1 completed or executed in parallel.

## Impacted Files & Components

- `packages/ui/src/components/ui/carousel.tsx`: Add `api?.off('reInit', onSelect)` in `useEffect` cleanup.
- `packages/hooks/src/use-lobby-realtime.ts`: Ensure `channel.unsubscribe()` and `supabase.removeChannel(channel)` teardown cleanly in all branches.
- `packages/hooks/src/use-message-realtime.ts`: Ensure channel unsubscription is called in cleanup.
- `packages/hooks/src/use-notification-realtime.ts`: Ensure channel unsubscription is called in cleanup.
- `packages/hooks/src/live-inspection/use-live-inspection-viewer.ts`: Return cleanup for event listeners/subscriptions.
- `packages/hooks/src/live-inspection/use-student-live-inspection-publication.ts`: Return cleanup for event listeners.
- `packages/hooks/src/live-inspection/use-student-live-inspection-publisher.ts`: Return cleanup for media / connection streams.
- `app/sentinel-web/src/app/(protected)/(instructor)/messages/_hooks/use-proctor-messages/index.ts`: Add cleanup function for active polling/listeners.
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/use-interaction-listeners/use-focus-listener.ts`: Add event listener cleanup.
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-presence.ts`: Add interval/heartbeat cleanup.
- `app/sentinel-web/src/features/messaging/messaging-page-client.tsx`: Add cleanup for listeners.
- `app/sentinel-core/src/app/(protected)/messages/page.tsx`: Add interval/listener cleanup.
- `app/sentinel-support/src/app/(protected)/messages/page.tsx`: Add interval/listener cleanup.
- `app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts`: Add timer/subscription cleanup.
- `app/sentinel-web/src/features/exams/builder/_components/question-bank-import-modal/_hooks/use-question-bank-import-selection.ts`: Refactor `setSelectedQuestionsById` and `setSelectedIds` so updater callbacks are pure without nested state setters.
- `app/sentinel-core/src/features/exams/builder/_components/question-bank-import-modal/_hooks/use-question-bank-import-selection.ts`: Same pure state updater refactoring.
- `app/sentinel-mobile/features/exam/hooks/use-exam-checkup.ts`: Refactor state setters at lines 249, 272 to be pure.
- `app/sentinel-mobile/features/exam/hooks/use-exam-session.ts`: Refactor state setter at line 113 to be pure.

## Implementation Tasks

- [ ] Fix uncleaned Embla carousel listener in `@sentinel/ui`.
- [ ] Add explicit `.unsubscribe()` and `removeChannel()` cleanups across Realtime and Live Inspection hooks in `@sentinel/hooks`.
- [ ] Add missing cleanups in `sentinel-web`, `sentinel-core`, `sentinel-support`, and `sentinel-mobile` messaging/lobby hooks.
- [ ] Refactor question bank selection hook state management to eliminate nested setter calls within updater functions.
- [ ] Refactor mobile checkup and session state updaters to be pure.

## Verification & Testing

- `pnpm exec react-doctor ./packages/hooks --no-warnings -y` — verify 0 errors.
- `pnpm exec react-doctor ./packages/ui --no-warnings -y` — verify 0 errors.
- `pnpm exec react-doctor ./app/sentinel-mobile --no-warnings -y` — verify `no-impure-state-updater` and `effect-needs-cleanup` error counts drop to 0.

## Risks & Rollback

- **Risk**: Improper cleanup could prematurely terminate active realtime subscriptions if dependencies change unexpectedly.
- **Mitigation**: Ensure dependencies array matches stable values (`examId`, `user.id`, `channelName`).
