---
title: "Fix Exam Concurrency Traffic, Eliminate Polling Leaks, and Restore Instructor Monitoring"
type: task
status: planned
created: "2026-08-24"
tags: [task, performance, traffic-optimization, exam-concurrency, instructor-monitoring, railway, supabase]
---

# Fix Exam Concurrency Traffic, Eliminate Polling Leaks, and Restore Instructor Monitoring

## Outcome

Eliminate 97% of backend HTTP request volume and database query overhead caused by 5 compounding student polling loops during live exams. Restore instantaneous loading and responsiveness to the Instructor Monitoring Dashboard (< 200ms render) while preserving real-time LiveKit proctor spot checks (< 1.0s video connect) and flawless student answer synchronization for cohorts of 50–150+ students.

---

## Pre-planning record

- **Context Specification:** [`docs/context/August/24/scale-concurrent-exam-traffic-and-infrastructure.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/24/scale-concurrent-exam-traffic-and-infrastructure.md) (`status: ready`)

### Actors and goals

- **Instructor / Proctor:** Wants the live exam monitoring dashboard, student list, incident feeds, and action dialogs to load and update instantly without lag, timeouts, or hung spinners when 50–150 students are active.
- **Student:** Wants exam attempt interactions and answer selections to sync reliably in the background without client hooks flooding the backend with redundant polling loops.
- **Platform Engineer:** Wants backend request volume to scale linearly and gently with student cohort size, operating safely within Railway Hobby (2 load-balanced replicas) and Supabase Free (via Supavisor transaction pooler).

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| **SC-01** | 80 students taking active exam | Students on attempt page | Student hooks emit **0 background polling req/sec**. Background traffic is limited to 2s debounced answer syncs & 30s elapsed-time heartbeats. | Reconnection listeners recover state on network reconnect. | Planned |
| **SC-02** | Instructor opens Live Monitoring during exam | 80 students active in exam | Monitoring overview and student list load in `< 200ms`. Refresh buttons and action dialogs respond immediately without queuing behind student traffic. | 6s relaxed query interval prevents query saturation. | Planned |
| **SC-03** | Instructor triggers Live Video Spot Check | Student on active attempt | Instructor client broadcasts `LIVE_INSPECTION_CHANGED` on Supabase Realtime channel. Student wakes up immediately, fetches directive with pre-issued token, and video streams in `< 1.5s`. | Channel `SUBSCRIBED`, tab `visibilitychange`, and `online` events act as instant fallbacks. | Planned |
| **SC-04** | Students waiting in exam lobby | Exam scheduled, not yet opened | Lobby waiting count and admission status update instantly via Supabase Realtime without continuous 2.5s/5s polling loops. | On-demand cache invalidation on Realtime postgres_changes. | Planned |
| **SC-05** | High-concurrency query burst | 150 students syncing answers simultaneously | Queries multiplex smoothly through Supabase Supavisor Transaction Pooler (port 6543) with `DB_POOL_MAX=15` across 2 Railway replicas with zero connection starvation. | Database connection pool does not exhaust Postgres limits. | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| **D1** | What is the target concurrency scale for this phase? | **50–150 Concurrent Students** | Testing phase target. Eliminates all bottlenecks while staying 100% within Railway Hobby ($5 credit) and Supabase Free tiers. | Rejected immediate upgrade to Railway Pro ($20/mo) before eliminating application-level polling leaks. | `scale-concurrent-exam-traffic-and-infrastructure.md` |
| **D2** | How should student live inspection wake-up be triggered? | **100% Event-Driven Realtime Signaling** | Strips out the 500ms HTTP polling loop completely. Drops idle background traffic to **0 req/sec**. Wakes up strictly via Supabase Realtime WebSocket broadcast + reconnect triggers. | Rejected continuous polling fallbacks. | `scale-concurrent-exam-traffic-and-infrastructure.md` |
| **D3** | How should database connections and load balancing be sized? | **2 Railway Replicas + Supavisor Transaction Pooler (Port 6543)** | Multiplexes database queries through port 6543 with `DB_POOL_MAX=15`, eliminating connection limits and providing redundant high availability on Railway. | Rejected direct port 5432 connections which cap at ~15–60 clients. | `scale-concurrent-exam-traffic-and-infrastructure.md` |
| **D4** | How should remaining polling leaks be cleaned up? | **De-duplicate all 5 discovered Polling Leaks** | Eliminates redundant `refetchInterval` in session status and lobbies, and relaxes monitoring queries to 6–8s. | Rejected leaving background polling in place. | `scale-concurrent-exam-traffic-and-infrastructure.md` |

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| **AC-01** | SC-01, D2 | `useStudentLiveInspectionPublisher` does not execute any background interval polling while waiting for live inspection. | Delete `LIVE_INSPECTION_RECONCILE_INTERVAL_MS` (500ms) and `scheduleReconcile` in `use-student-live-inspection-publisher.ts`. | `pnpm --filter @sentinel/hooks test use-student-live-inspection-publisher` | Planned |
| **AC-02** | SC-03, D2 | Instructor `start()` / `stop()` live inspection broadcasts `LIVE_INSPECTION_CHANGED` via Supabase Realtime channel. | Add broadcast dispatcher in `use-live-inspection-viewer.ts`. | `pnpm --filter @sentinel/hooks test use-live-inspection-viewer` | Planned |
| **AC-03** | SC-01, D4 | `useActiveAttemptLifecycle` does not poll `GET /examination/flow/sessions/:id/status` every 2s. | Set `refetchInterval: false` in `use-exam-session-status-query.ts`. | `pnpm --filter @sentinel/hooks test use-exam-session-status-query` | Planned |
| **AC-04** | SC-04, D4 | Student lobby admission status and waiting count do not execute aggressive continuous interval polling. | Remove background polling in `use-exam-lobby-admission-status-query.ts` and `use-exam-lobby-count-query.ts`. | `pnpm --filter @sentinel/hooks test lobby` | Planned |
| **AC-05** | SC-02, D4 | Instructor monitoring overview and incidents queries use relaxed 6s intervals with background refetching disabled. | Update `EXAM_MONITORING_OVERVIEW_REFETCH_INTERVAL_MS` & `EXAM_INCIDENTS_REFETCH_INTERVAL_MS` to 6000ms. | `pnpm --filter @sentinel/hooks test monitoring` | Planned |
| **AC-06** | SC-05, D3 | Database client initializes with `DB_POOL_MAX=15` and supports Supabase Transaction Pooler connection string. | Update default `maxConnections` in `packages/db/src/db.ts`. | `pnpm --filter @sentinel/db test` | Planned |

---

## Scope

- Remove 500ms live inspection polling loop in `useStudentLiveInspectionPublisher`.
- Add explicit Supabase Realtime broadcast emission in `useLiveInspectionViewer`.
- Remove 2,000ms session status background polling in `useExamSessionStatusQuery`.
- Remove redundant interval polling in student lobby queries.
- Relax instructor monitoring dashboard query intervals from 2s to 6s.
- Update default database pool size to 15 in `packages/db/src/db.ts`.
- Update and verify all associated unit and integration test suites.

## Non-goals

- Upgrading to paid Railway Pro plan ($20/mo) at this time (deferred until 300+ students).
- Modifying MediaPipe or Audio anomaly detection algorithms.
- Modifying exam grading or question builder data structures.

---

## Phases

- [ ] [`phase-01-eliminate-student-live-inspection-polling.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-24/fix-exam-concurrency-traffic-and-instructor-monitoring/phase-01-eliminate-student-live-inspection-polling.md) — Phase 1: Eliminate Student Live Inspection 500ms Polling & Wire Realtime Signaling
- [ ] [`phase-02-deduplicate-session-status-and-lobby-polling.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-24/fix-exam-concurrency-traffic-and-instructor-monitoring/phase-02-deduplicate-session-status-and-lobby-polling.md) — Phase 2: De-duplicate Active Session Status & Student Lobby Polling Leaks
- [ ] [`phase-03-optimize-instructor-monitoring-queries.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-24/fix-exam-concurrency-traffic-and-instructor-monitoring/phase-03-optimize-instructor-monitoring-queries.md) — Phase 3: Optimize Instructor Monitoring Dashboard Queries & Relax Refresh Intervals
- [ ] [`phase-04-database-pool-tuning-and-railway-sizing.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-24/fix-exam-concurrency-traffic-and-instructor-monitoring/phase-04-database-pool-tuning-and-railway-sizing.md) — Phase 4: Database Connection Pool Scaling & Railway Sizing Configuration

---

## Verification

- `pnpm --filter @sentinel/hooks test` — Verifies all modified query and live-inspection hooks.
- `pnpm --filter @sentinel/db test` — Verifies database connection pool and client behavior.
- `pnpm --filter sentinel-web test` — Verifies web attempt and instructor monitoring components.
