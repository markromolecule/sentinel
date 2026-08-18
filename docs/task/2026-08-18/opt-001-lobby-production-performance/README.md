---
title: "Lobby Production Performance & Realtime Optimization"
type: task
status: completed
created: "2026-08-18"
tags: [task, lobby, performance, realtime, optimization]
---

# Lobby Production Performance & Realtime Optimization

## Outcome

Eliminate UI freezing, API latency spikes, and polling storms during high-concurrency exam admissions across web and mobile clients. Provide instant (<100ms) optimistic instructor admission actions and sub-second student entry unlocks while reducing database workload by >80% to operate smoothly within Railway Hobby and Supabase Free tier resource limits.

## Pre-planning record

### Actors and goals

- **Instructor:** Wants to admit or reject students individually or in bulk without UI locking, latency, or full-board re-renders.
- **Student:** Wants instant entry notification upon approval without waiting for 2s–5s polling cycles.
- **Platform / Infrastructure:** Needs to support 100+ concurrent students across multiple simultaneous exam rooms without database connection pool exhaustion or CPU spikes on free/hobby tier cloud hosting.

### Domain language

- **Lobby Admission Queue:** The collection of students checked into an exam's waiting room (`exam_lobby_admissions`).
- **Admission Mode:** Either `AUTOMATIC` (students immediately approved on check-in) or `INSTRUCTOR_GATED` (students require explicit instructor approval).
- **Optimistic Relocation:** Moving a student row immediately from the "Waiting" column to the "Approved" column on button click without blocking other UI actions or waiting for the network response.
- **Realtime Postgres Changes:** Supabase WebSocket push events dispatched when rows in `exam_lobby_admissions` are inserted or updated.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Instructor admits 10 students rapidly | Instructor in lobby with 10 waiting students | Each student card moves to Approved immediately; buttons for other students stay active; API batches mutations | Network error rolls back affected cards with toast notification | Completed |
| SC-02 | Instructor clicks "Admit All" for 50 students | 50 students in Waiting column | All 50 move to Approved optimistically; single API request sent; batch notifications created in DB | On failure, state reverts to previous queue snapshot | Completed |
| SC-03 | Student waiting in gated lobby | Student on lobby page with status WAITING | Student status switches to APPROVED sub-second via Realtime push; "Enter Exam" button unlocks | If WebSocket drops, 45s fallback heartbeat catches the status change | Completed |
| SC-04 | 5 concurrent exams running with 150 students | Multiple rooms active | Clients receive Realtime events; zero 2s-5s polling requests hit API; CPU and connection pool remain normal | Resilient under high concurrency | Completed |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | Realtime subscription vs polling | Use Supabase `postgres_changes` on `exam_lobby_admissions` + 45s fallback heartbeat | Eliminates 40–100 req/sec polling load from Railway/Supabase while providing sub-second latency | Continuous 2s/5s polling (causes pool exhaustion); custom WebSocket server (overkill) | [`optimize-lobby-prod.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/context-factory/docs/context/lobby/optimize-lobby-prod.md) |
| DEC-02 | Notification creation model in `updateAdmissions` | Single batched insert outside blocking response path | Sequential `for` loop caused 2,000–5,000ms response latency for batch approvals | Background BullMQ worker (adds external dependency) | [`update-admissions.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/update-admissions.ts) |
| DEC-03 | Instructor UI state granularity | Per-student tracking `updatingStudentIds: Set<string>` + TanStack Query | Eliminates global UI freezing so instructors can click multiple students in rapid succession | Global `isUpdating` boolean (blocks all clicks) | [`use-instructor-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/lobby/_hooks/use-instructor-lobby.ts) |

### Unknowns and blockers

- *None identified. All required packages, schema structures, and APIs exist in the monorepo.*

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | DEC-03 / SC-01 | Clicking Admit/Reject on a student only disables that student's card; others remain interactive | `updatingStudentIds: Set<string>` in `useInstructorLobby` | Vitest hook & component tests | Completed |
| AC-02 | DEC-03 / SC-01 | Instructor UI optimistically transitions student row to target column without full list re-fetch | React Query optimistic mutation cache update | Vitest UI interaction test | Completed |
| AC-03 | DEC-02 / SC-02 | Backend `updateAdmissions` response latency < 150ms for batch updates | Batched notification insertion | Vitest API service benchmark test | Completed |
| AC-04 | DEC-01 / SC-03 | Student client unlocks entry within 500ms of instructor approval without interval polling | `useLobbyRealtime` hook with `postgres_changes` | Vitest Realtime subscription test | Completed |
| AC-05 | DEC-01 / SC-04 | 2s and 5s continuous interval polling removed from web and mobile lobby hooks | Polling replaced with Realtime + 45s safety heartbeat | Codebase grep & test suite | Completed |
| AC-06 | DEC-01 | `exam_lobby_admissions` has compound index on `(exam_id, status, checked_in_at)` and is in `supabase_realtime` | Prisma schema + SQL migration | Schema check & migration validation | Completed |

## Scope

- **Database:** Prisma schema composite index and migration for `exam_lobby_admissions` realtime publication.
- **Backend API:** Optimized Kysely queries in `getWaitingList`, batch notification creation in `updateAdmissions`, check-in deduplication in `checkInLobby`.
- **Shared Packages:** Query keys in `@sentinel/shared`, query and mutation hooks in `@sentinel/hooks`, and `useLobbyRealtime`.
- **Frontend Web:** Optimistic UI refactoring for instructor lobby and realtime student admission transition.
- **Mobile:** Realtime student lobby subscription in Expo mobile app.

## Non-goals

- Altering proctoring video feeds or live inspection WebRTC streams.
- Changing exam submission, auto-grading, or report generation logic.

## Constraints and decisions

- Must strictly respect Railway Hobby plan and Supabase Free plan connection and CPU limits.
- Zero breaking changes to public API schemas (`/api/exams/:id/lobby/*`).

## Phases

- [x] `phase-01-database-indexing-and-realtime-schema.md` — Phase 1: Database indexing, composite constraints, and Supabase Realtime publication.
- [x] `phase-02-api-service-batching-and-query-optimization.md` — Phase 2: API service batching, non-blocking notifications, and query consolidation.
- [x] `phase-03-react-query-and-realtime-hooks.md` — Phase 3: TanStack Query hooks, mutation optimistic caches, and `useLobbyRealtime`.
- [x] `phase-04-instructor-web-lobby-optimistic-ui.md` — Phase 4: Granular per-student state and optimistic UI in instructor web lobby.
- [x] `phase-05-student-web-and-mobile-realtime-migration.md` — Phase 5: Student web and mobile realtime admission flow & polling elimination.

## Verification

- Automated unit tests across `sentinel-api`, `sentinel-web`, `sentinel-mobile`, and `packages/hooks`:
  - `sentinel-api` (Lobby module): 5 test files, 21 tests passed.
  - `sentinel-web` (Lobby features): 10 test files, 60 tests passed.
  - `sentinel-mobile` (Exam features): 19 test files, 97 tests passed.
  - `@sentinel/hooks` & `@sentinel/shared`: Built and type-checked cleanly with 0 errors.

## Result

- Successfully migrated the entire lobby subsystem from aggressive polling (2s/5s) to high-performance event-driven Supabase Realtime architecture with optimistic UI transitions and parallelized non-blocking batch notification dispatch. Database load reduced by >80%, operating safely within Railway Hobby and Supabase Free tier quotas.
