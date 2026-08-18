---
title: "Phase 4: Instructor Lobby Student Avatar UI Rendering"
type: phase
parent: "fix-002-student-lobby-realtime-and-avatars"
phase: "4"
status: complete
created: "2026-08-19"
tags: [task, phase, frontend, instructor, ui, avatars]
---

# Phase 4: Instructor Lobby Student Avatar UI Rendering

## Objective

Update the instructor lobby admission panel to render student avatar images (from uploaded profiles and Google OAuth accounts) with clean fallbacks to student initials, matching the avatar experience across other Sentinel instructor views.

## Dependencies & Prerequisites

- Phase 1 (Backend API `avatarUrl` field in waiting list response).

## Impacted Files & Components

- [instructor-lobby-admission-panel.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/lobby/_components/instructor-lobby-admission-panel.tsx) (`StudentLobbyRow`)
- [instructor-lobby-admission-panel.test.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/lobby/_components/instructor-lobby-admission-panel.test.tsx)
- [use-instructor-lobby.test.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/lobby/_hooks/use-instructor-lobby.test.tsx)

## Implementation Tasks

- [x] Task 4.1 — Update `StudentLobbyRow` in `instructor-lobby-admission-panel.tsx`:
  - Import `AvatarImage` from `@sentinel/ui`.
  - Render `<AvatarImage src={student.avatarUrl ?? undefined} alt={student.studentName} />` before `<AvatarFallback>`.
- [x] Task 4.2 — Update test helpers in `instructor-lobby-admission-panel.test.tsx`:
  - Include `avatarUrl: 'https://example.com/pat.jpg'` in test mocks.
  - Verify avatar image renders when provided and initials render when null.
- [x] Task 4.3 — Run full verification suites across the monorepo for `sentinel-api`, `sentinel-web`, and `sentinel-mobile`.

## Verification & Testing

- `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/exams/[id]/lobby` (4 files, 23 tests passed).
- `pnpm --filter sentinel-web test lobby` (12 files, 70 tests passed).
- `pnpm --filter sentinel-api test src/modules/examination/lobby src/modules/examination/access src/tests/exams/exam-contracts.test.ts` (8 files, 65 tests passed).
- `pnpm --filter sentinel-mobile test features/exam` (19 files, 98 tests passed).
- `pnpm --filter @sentinel/services build` (TypeScript compilation succeeded).

## Risks & Rollback

- *Risk:* Broken image URLs causing layout shift.
- *Mitigation:* Radix UI `@sentinel/ui` `<Avatar>` automatically switches to `<AvatarFallback>` on `onError` event without visual breakage.

