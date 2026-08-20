---
title: "Phase 1: Rules of Hooks and Ref Render Mutation Fixes"
type: phase
parent: "Fix High-Priority React Doctor Errors Across Sentinel Monorepo"
phase: "01"
status: completed
created: "2026-08-20"
tags: [task, phase, react-doctor, hooks, render-ref]
---

# Phase 1: Rules of Hooks and Ref Render Mutation Fixes

## Objective

Fix all `rules-of-hooks` violations in `sentinel-support` and `no-ref-current-in-render` violations in `sentinel-web` by hoisting hooks above conditional early returns and moving ref synchronizations inside lifecycle effects.

## Dependencies & Prerequisites

- Master plan [`README.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-20/fix-react-doctor-high-priority-errors/README.md) approved.

## Impacted Files & Components

- `app/sentinel-support/src/app/(protected)/announcements/_components/add-announcement-dialog.tsx`: Hoist `useCreateAnnouncementMutation` above `if (!hasPermission('announcement:create')) return null;`.
- `app/sentinel-support/src/app/(protected)/calendar/_components/event-dialog.tsx`: Hoist `useEffect` and `useMemo` hooks above `if (!canAddEvent) return null;` or conditionally gate at dialog open level.
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-monitoring/index.ts`: Remove render-phase direct assignments to `monitoringPhaseRef.current` and `isMonitoringSuspendedRef.current` (lines 50-51) since `useEffect` already handles synchronization safely.

## Implementation Tasks

- [ ] Hoist `useCreateAnnouncementMutation` in `add-announcement-dialog.tsx` so all hooks are invoked in stable order before conditional render returns.
- [ ] Hoist `useEffect` and `useMemo` hooks in `event-dialog.tsx` above `if (!canAddEvent)` guard.
- [ ] Remove direct mutations of `monitoringPhaseRef.current` and `isMonitoringSuspendedRef.current` in the render body of `use-exam-monitoring/index.ts`.

## Verification & Testing

- `pnpm exec react-doctor ./app/sentinel-support --no-warnings -y` — verify `rules-of-hooks` error count drops to 0.
- `pnpm exec react-doctor ./app/sentinel-web --no-warnings -y` — verify `no-ref-current-in-render` error count drops to 0.

## Risks & Rollback

- **Risk**: Moving mutation hook above permission check might instantiate mutation unnecessarily if permission is denied.
- **Mitigation**: `useCreateAnnouncementMutation` is lightweight and only executes network requests when `.mutate()` is called on user submit, which is guarded by the form.
- **Rollback**: Revert changes via git.
