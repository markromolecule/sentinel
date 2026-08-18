---
title: "Fix Student Lobby Realtime Admission & Instructor Lobby Avatars"
type: task
status: complete
created: "2026-08-19"
tags: [task, fix, student, lobby, realtime, avatars]
---

# Fix Student Lobby Realtime Admission & Instructor Lobby Avatars

## Outcome

Fix student exam entry gating so approved students (both fresh starts and reconnecting resumes) immediately and reliably transition to their attempt session upon instructor approval. Stabilize lobby active student counts to eliminate 1 → 0 → 1 UI flickering, and display authentic student profile avatars in the instructor lobby queue.

## Pre-planning record

### Actors and goals

- **Student:** Needs instant, reliable unlock of the "Continue to Attempt" / "Resume Exam" button upon instructor approval, with stable live lobby counts.
- **Instructor:** Needs to see authentic student avatar pictures in the lobby queue to verify student identities visually.
- **System / Platform:** Needs consistent runtime access resolution and seamless WebSocket presence without channel teardown jitter.

### Domain language

- **Lobby Admission Queue:** The collection of students checked into an exam's waiting room (`exam_lobby_admissions`).
- **Runtime Access State:** Evaluated permission model (`canStart`, `canResume`, `state`, `reasonCode`) dictating whether a student can launch or resume an exam session.
- **Avatar Resolution Hierarchy:** Resolving profile picture URLs via `COALESCE(user_profiles.avatar_url, auth.users.raw_user_meta_data->>'avatar_url', auth.users.raw_user_meta_data->>'picture')`.
- **Presence State:** Supabase Realtime presence tracking representing active clients connected to `presence:lobby:${examId}`.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Student in gated lobby gets approved (First Attempt) | Student on lobby page with status WAITING; 0 attempts | Realtime event triggers; status becomes APPROVED; button unlocks as "Continue to Attempt"; student navigates to attempt | On WebSocket drop, 45s fallback heartbeat catches approval | Complete |
| SC-02 | Student in gated lobby gets approved (Reconnect / Resume) | Student with IN_PROGRESS attempt reconnecting in lobby | Realtime event triggers; `canResume` is preserved as true; button unlocks as "Resume Exam"; `startExamSession` succeeds | Resumes with stored session draft reconciled | Complete |
| SC-03 | Student enters lobby page | Browser connects to lobby WebSocket | `displayCount` displays steady number (e.g. 1) without flickering to 0 and back | Smooth max count reconciliation | Complete |
| SC-04 | Instructor views lobby with OAuth and profile students | Students with uploaded avatars or Google OAuth profile photos checked in | Instructor admission panel displays student avatar images; falls back to initials if missing | Avatar image error gracefully shows fallback initials | Complete |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | Gating evaluation for resuming students | Support both `(canStart \|\| canResume \|\| isApprovedRuntimeAccess)` and preserve `canResume` in `resolveLobbyRuntimeAccess` | Reconnecting students have `canResume = true` and `canStart = false`; omitting `canResume` blocked all resuming students | Forcing resuming students to bypass lobby entirely (violates instructor gating security) | [`resolve-lobby-runtime-access.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/access/services/resolve-lobby-runtime-access.ts) |
| DEC-02 | Count stabilization logic | Reconcile presence state and DB count using `Math.max(dbCount, presenceCount)` and memoize channel | Prevents race condition between DB query resolution and WebSocket sync from dropping count to 0 | Removing WebSocket presence (loses instant real-time presence) | [`use-lobby-presence.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/student/exam/%5Bid%5D/lobby/_hooks/use-lobby-presence.ts) |
| DEC-03 | Avatar URL extraction pattern | Coalesce `user_profiles.avatar_url`, OAuth `avatar_url`, and OAuth `picture` from `auth.users` | Aligns with existing user avatar resolution patterns across `sentinel-api` | Manual avatar re-upload requirement | [`get-waiting-list.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/get-waiting-list.ts) |

### Unknowns and blockers

- *None identified.*

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | DEC-01 / SC-01 / SC-02 | Approved students (both new and reconnecting) can immediately enter the attempt session | Phase 1 backend resolver and Phase 2 web/mobile gating complete | `pnpm --filter sentinel-api test src/modules/examination/access`, `pnpm --filter sentinel-web test 'src/app/(protected)/student/exam/[id]/lobby'`, and `pnpm --filter sentinel-mobile test features/exam/hooks` passed | Complete |
| AC-02 | DEC-01 / SC-01 / SC-02 | Entry button dynamically updates to "Continue to Attempt" or "Resume Exam" without manual reload | `useLobbyRealtime` admission-change handler now optimistically sets `APPROVED` and refreshes access; footer label tests cover fresh/resume labels | `pnpm --filter sentinel-web test 'src/app/(protected)/student/exam/[id]/lobby'` passed | Complete |
| AC-03 | DEC-02 / SC-03 | Lobby student count remains stable without 1 → 0 → 1 drops | Smooth count calculation in `StudentExamLobbyPage` (`Math.max(numericDbCount, presenceCount)`) | `pnpm --filter sentinel-web test src/app/(protected)/student/exam/[id]/lobby` passed | Complete |
| AC-04 | DEC-03 / SC-04 | Instructor lobby displays student avatar photos with fallback initials | Render `AvatarImage` with `AvatarFallback` in `instructor-lobby-admission-panel.tsx` | `pnpm --filter sentinel-web test src/app/(protected)/(instructor)/exams/[id]/lobby` passed | Complete |

## Scope

- **Backend API (`sentinel-api`):** `resolve-lobby-runtime-access.ts`, `get-waiting-list.ts`, `lobby.dto.ts`.
- **Shared Packages (`packages/services`):** `exam-lobby-service.ts`.
- **Frontend Web (`sentinel-web`):** `use-lobby-state.ts`, `use-lobby-presence.ts`, `lobby-footer-actions.tsx`, `page.tsx` (student lobby), `instructor-lobby-admission-panel.tsx` (instructor lobby).
- **Mobile (`sentinel-mobile`):** `use-exam-lobby.ts`.

## Non-goals

- Altering proctoring telemetry or MediaPipe face tracking.
- Redesigning the exam attempt question-answering UI.

## Constraints and decisions

- Zero breaking changes to existing lobby routes.
- Must remain compatible with both web and mobile students.

## Phases

- [x] `phase-01-backend-access-and-avatars.md` — Phase 1: Backend runtime access resolution and student avatar retrieval.
- [x] `phase-02-student-lobby-gating-and-dynamic-unlock.md` — Phase 2: Student web & mobile lobby gating and realtime dynamic unlock.
- [x] `phase-03-stable-presence-count.md` — Phase 3: Stable lobby presence count and channel lifecycle.
- [x] `phase-04-instructor-lobby-avatar-ui.md` — Phase 4: Instructor lobby student avatar UI rendering.

## Verification

- `pnpm --filter sentinel-api test src/modules/examination/lobby`
- `pnpm --filter sentinel-api test src/modules/examination/access`
- `pnpm --filter sentinel-web test lobby`
- `pnpm --filter sentinel-mobile test features/exam`
- `pnpm --filter @sentinel/services build`

## Result

- Phase 1 completed on 2026-08-19. Backend runtime access now preserves approved resume access, lobby waiting-list responses include resolved `avatarUrl`, and shared service typing accepts the field.
- Phase 2 completed on 2026-08-19. Student web and mobile lobby entry gating now includes `canResume`, web realtime admission events optimistically reflect approval while refreshing access, and footer label/disabled behavior is covered by tests.
- Phase 3 completed on 2026-08-19. Student lobby presence channel lifecycle refactored with unmount guards, and `StudentExamLobbyPage` count display stabilized via `Math.max(numericDbCount, presenceCount)` with `'Syncing'` loading fallback, eliminating flash-of-zero.
- Phase 4 completed on 2026-08-19. Instructor lobby admission panel renders student profile avatar images (`AvatarImage`) with graceful fallback to student initials (`AvatarFallback`), fully covered by automated tests.


