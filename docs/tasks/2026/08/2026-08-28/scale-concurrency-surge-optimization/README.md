---
title: "Task: Exam Lobby Concurrency Surge Optimization & Scalability Architecture (Web + Mobile)"
type: task
status: planned
created: "2026-08-28"
tags: [task, concurrency, performance, lobby, auth-cache, bootstrap, realtime, mobile, web, scaling]
---

# Task: Exam Lobby Concurrency Surge Optimization & Scalability Architecture (Web + Mobile)

## Outcome

Eliminate downstream database pool starvation, uncached auth query multiplication, frontend/mobile request waterfalls, and Supabase Realtime channel saturation to enable **150–200 concurrent unbatched students** across Web and Mobile to log in and enter the exam lobby smoothly on the existing **Railway Hobby (2 Replicas in Singapore, 8 vCPU / 8 GB RAM) + Supabase Free (Supavisor Port 6543 Active)** setup.

---

## Pre-planning Record

### Context & Discovery Grounding

- Discovery Record: [`docs/tasks/2026/08/2026-08-27/lobby-network-optimization/DISCOVERY.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-27/lobby-network-optimization/DISCOVERY.md)
- Context Specification: [`docs/context/August/28/scale-concurrency-surge-root-cause-and-optimization.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/28/scale-concurrency-surge-root-cause-and-optimization.md)
- Metrics & Comparison: [`docs/tasks/2026/08/2026-08-27/lobby-network-optimization/COMPARISON_AND_METRICS.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-27/lobby-network-optimization/COMPARISON_AND_METRICS.md)

### Verified Production Environment

- **Railway Hobby Plan:** Service `sentinel-api-production` (`api.sentinelph.tech`) in Southeast Asia (Singapore), **2 Active Replicas (`2/2 active`)**, up to **8 vCPU** and **8 GB RAM** per replica.
- **Supabase Free Tier:** **Supavisor Transaction Pooler (Port 6543) is active**, Max 200 Realtime WebSockets, max 500 msgs/s.

---

### Scenario Coverage

| ID | Actor & Situation | Preconditions | Expected Outcome | Failure/Recovery Mode | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SC-01** | 200 students open lobby simultaneously (Web & Mobile) | 200 students authenticated | Exactly 1 composite bootstrap HTTP request per student; all 200 succeed with p95 < 200ms | Retry with exponential backoff on transient network failure | Planned |
| **SC-02** | Simultaneous API requests hit `authMiddleware` | High burst of distinct JWTs | In-memory LRU cache serves user & role permissions with 0 DB queries on subsequent requests | Cache miss falls back to single fast DB read | Planned |
| **SC-03** | Student presence tracking & admission updates | 200 students joined | 1 WebSocket channel `lobby:${examId}` per student (200 total WS $\le$ 200 Free cap); 0 CDC WAL messages | Falls back to adaptive 10s polling if WS disconnects | Planned |
| **SC-04** | Instructor admits Student A | Student A waiting in lobby | Sub-50ms admission push via REST broadcast; only Student A unlocks | Adaptive 10s polling fallback | Planned |
| **SC-05** | Student turns in exam | Attempt marked SUBMITTED | Student moves to dedicated `Submitted` column on instructor board | Refreshes via instructor query or broadcast | Planned |

---

### Decision Ledger

| ID | Question | Decision | Evidence & Rationale | Alternatives Rejected | Artifact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | How to eliminate the 5–6 request frontend/mobile mount waterfall? | Implement atomic `POST /api/examination/:id/lobby/bootstrap` endpoint | Reduces burst HTTP ingress by 83.3% (from 1,200 to 200 requests) and executes in 1 DB query | Keep separate queries with client-side batching (still creates HTTP round-trips) | `Phase 2` |
| **DEC-02** | How to stop auth middleware from running 4,800 DB queries? | In-process LRU cache (60s TTL) for decoded JWTs in `auth.ts` | 2 Railway replicas each cache user profile + permission sets; drops DB auth queries by >96% | Redis cluster (overkill for Free Tier; adds network latency) | `Phase 1` |
| **DEC-03** | How to prevent Realtime WebSocket connection cap exhaustion? | Consolidate Presence + Admissions into 1 channel `lobby:${examId}` on Web and Mobile | 200 students = 200 WS channels (fits Free 200 cap) vs 400 channels previously | Stagger presence connections (degrades UX) | `Phase 3` |
| **DEC-04** | How to eliminate CDC WAL amplification? | Strip `postgres_changes` and rely strictly on REST broadcast | REST broadcast is stateless, sub-50ms, and generates 0 CDC WAL replication messages | Postgres CDC filter (still processes WAL in Realtime engine) | `Phase 3` |
| **DEC-05** | How to handle high-frequency check-in notifications? | Decouple administrative audit notifications from check-in | Check-in is ephemeral telemetry, not an audit incident; saves 8–12 DB queries per check-in | Async message queue (unnecessary complexity on Free tier) | `Phase 2` |
| **DEC-06** | How to size the database connection pool with active port 6543? | `DB_POOL_MAX=25` per replica, `connectionTimeoutMillis=5000` | 2 replicas = 50 connections total, taking full advantage of Supavisor transaction pooler on port 6543 | `DB_POOL_MAX=15` (creates artificial queue inside Node) | `Phase 1` |

---

## Acceptance Criteria

| ID | Source | Criterion | Implementation | Verification | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AC-01** | DEC-02 / SC-02 | Auth middleware resolves subsequent requests for authenticated users in < 1ms with 0 DB queries | In-memory LRU cache in `auth.ts` | Unit tests verify cache hit bypasses DB queries | Planned |
| **AC-02** | DEC-01 / SC-01 | Web & Mobile lobby mounts issue exactly 1 bootstrap HTTP request returning exam metadata, config, admission, and presence | `POST /:id/lobby/bootstrap` endpoint & client hook | API test verifies single combined response | Planned |
| **AC-03** | DEC-03 / DEC-04 | Web & Mobile lobbies establish exactly 1 WebSocket channel without `postgres_changes` CDC listeners | Merged channel in `use-lobby-realtime.ts` | Hook test verifies single channel subscription & broadcast handling | Planned |
| **AC-04** | DEC-05 | Routine student check-in executes in < 35ms without triggering administrative audit queries | Updated `checkInLobby` service | Service test verifies no notification records created on check-in | Planned |
| **AC-05** | DEC-06 | Database connection pool operates with `DB_POOL_MAX=25` and 5000ms fail-fast timeout with active port 6543 pooler | Updated `packages/db/src/db.ts` | Pool configuration test passes | Planned |
| **AC-06** | SC-05 | Instructor lobby displays dedicated `Submitted` column for `attemptStatus === 'SUBMITTED'` | Updated filter and UI panel in `sentinel-web` & `sentinel-core` | UI tests verify student categorization | Planned |

---

## Phases

- [x] [`phase-01-database-pool-and-in-memory-auth-caching.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-28/scale-concurrency-surge-optimization/phase-01-database-pool-and-in-memory-auth-caching.md) — Phase 1: Database Connection Pool Tuning & In-Memory Auth LRU Cache
- [x] [`phase-02-consolidated-lobby-bootstrap-endpoint.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-28/scale-concurrency-surge-optimization/phase-02-consolidated-lobby-bootstrap-endpoint.md) — Phase 2: Consolidated Student Lobby Bootstrap Endpoint & Check-in Decoupling
- [x] [`phase-03-realtime-channel-consolidation-and-cdc-removal.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-28/scale-concurrency-surge-optimization/phase-03-realtime-channel-consolidation-and-cdc-removal.md) — Phase 3: Realtime Channel Consolidation & Stripping `postgres_changes` CDC
- [ ] [`phase-04-frontend-student-mount-and-instructor-queue-update.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-28/scale-concurrency-surge-optimization/phase-04-frontend-student-mount-and-instructor-queue-update.md) — Phase 4: Web & Mobile Student Mount Hook Migration & Instructor Lobby Submitted Column
- [ ] [`phase-05-surge-verification-and-concurrency-testing.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-28/scale-concurrency-surge-optimization/phase-05-surge-verification-and-concurrency-testing.md) — Phase 5: Automated Regression Testing, Concurrency Verification & Metrics Reporting

---

## Verification Plan

```bash
# 1. Full monorepo package test suites
pnpm --filter @sentinel/db test
pnpm --filter sentinel-api test
pnpm --filter @sentinel/hooks test
pnpm --filter sentinel-web test
pnpm --filter sentinel-core test
pnpm --filter sentinel-mobile test
```
