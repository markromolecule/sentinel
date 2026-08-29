---
title: "Optimize Exam Runtime Performance, Database Indexing, and Infrastructure Sizing"
type: task
status: completed
created: "2026-08-29"
tags: [task, performance, database-indexing, optimization, supabase-pro, railway, exam-concurrency]
---

# Optimize Exam Runtime Performance, Database Indexing, and Infrastructure Sizing

## Outcome

Eliminate remaining database write churn and unindexed sequential scans during live exams. Ensure sub-50ms query response times for the Instructor Monitoring Dashboard, cut student answer sync write overhead by 50%, prevent backend OOM risks, and establish the validation gate for the **Supabase Pro** upgrade ($25/mo) to support 50–150+ concurrent students with zero friction.

---

## Pre-planning record

- **Context Specification:** [`docs/context/August/29/production-leaks-optimization-and-infrastructure-sizing.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/29/production-leaks-optimization-and-infrastructure-sizing.md)
- **Architecture Decision Record:** [`docs/decisions/0001-prioritize-supabase-pro-over-railway-pro-for-live-exams.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/decisions/0001-prioritize-supabase-pro-over-railway-pro-for-live-exams.md)

### Actors and goals

- **Student:** Wants answer progress to sync reliably in the background without connection latency or storage upload errors for proctoring evidence frames.
- **Instructor:** Wants the live exam monitoring dashboard, incident feeds, and action dialogs to load and update in < 200ms without queuing behind student traffic.
- **Platform Engineer:** Wants to prioritize infrastructure budget effectively (Supabase Pro over Railway Pro), prevent memory spikes on worker processes, and maintain healthy database connection pool limits.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| **SC-01** | 100 students actively taking exam | Exam in progress, students answering questions | Answer syncs complete in < 50ms with 2 DB operations per sync (no routine heartbeat logging to activity_logs table). | Network retry on transient network drop. | Completed |
| **SC-02** | Instructor monitors live exam with 1,000+ incidents | Active exam with proctoring incidents | Overview query executes in < 50ms utilizing the `flagged_incidents(attempt_id, timestamp)` index. | Cached query fallback if DB timeout. | Completed |
| **SC-03** | Instructor initiates Live Inspection spot check | Student on active attempt | Live inspection lease query uses `live_inspection_leases(attempt_id)` index; WebSocket broadcast connects in < 1.0s. | Reconnect fallback on channel drop. | Completed |
| **SC-04** | Instructor exports PDF report during active exam | Exam active, background PDF requested | PDF worker operates with bounded concurrency (`PDF_WORKER_CONCURRENCY=2`) preventing Node.js heap exhaustion on Railway. | BullMQ automatic job retry. | Completed |
| **SC-05** | High-volume incident evidence capture | 100 students generating camera alerts | Private storage bucket `sentinel-proctoring-evidence` handles frame uploads comfortably with 100 GB Supabase Pro capacity. | Upload retry with signed URL. | Completed |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| **D1** | Which infrastructure upgrade should be prioritized? | **Supabase Pro ($25/mo) First** | Hard production failure points reside on Supabase Free tier (1 GB bucket storage limit, 2 GB bandwidth cap, 7-day auto-pause, 500 MB Postgres RAM). Railway API runs lightweight (<200MB RAM). | Rejected upgrading Railway Pro first ($20/mo) which leaves database and storage bottlenecks unaddressed. | `0001-prioritize-supabase-pro-over-railway-pro-for-live-exams.md` |
| **D2** | How to eliminate answer sync write churn? | **Omit routine heartbeat writes to activity_logs** | `exam.heartbeat_synced` writes ~12,000 rows/hour to `activity_logs` table for 100 students, plus 12,000 `institutions` lookups. Removing it halves DB load. | Rejected logging every 2s sync to persistent disk table. | `production-leaks-optimization-and-infrastructure-sizing.md` |
| **D3** | How to fix slow monitoring aggregation? | **Add composite index on `flagged_incidents`** | Missing index forces sequential table scans when joining `flagged_incidents` on `attempt_id`. | Rejected in-memory caching that risks stale incident counts. | `production-leaks-optimization-and-infrastructure-sizing.md` |

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| **AC-01** | SC-02, D3 | `flagged_incidents` has a composite B-tree index on `[attempt_id, timestamp(sort: Desc)]`. | Update Prisma schema and generate migration. | `pnpm --dir packages/db run test` | Completed |
| **AC-02** | SC-03, D3 | `live_inspection_leases` has dedicated indexes on `attempt_id` and `exam_id`. | Update Prisma schema and generate migration. | `pnpm --dir packages/db run test` | Completed |
| **AC-03** | SC-01, D2 | `syncSessionService` does not write routine `exam.heartbeat_synced` logs to `activity_logs` or query `institutions` hierarchy on every sync. | Refactor `sync-session.service.ts` to perform pure state update. | `pnpm --dir app/sentinel-api test src/modules/examination/flow` | Completed |
| **AC-04** | SC-04 | PDF generation concurrency is verified bounded (`PDF_WORKER_CONCURRENCY=2`) and embedded worker is disabled by default on API replicas. | Verify `pdf-generation-queue.config.ts` defaults and startup guards. | `pnpm --dir app/sentinel-api test src/server.config.test.ts` | Completed |
| **AC-05** | SC-05, D1 | Telemetry evidence readiness verification passes against Supabase Pro bucket configuration. | Run readiness script. | `pnpm --dir app/sentinel-api verify:telemetry-evidence-readiness` | Completed |

---

## Phases

- [x] [`phase-01-database-indexing-and-query-latency.md`](./phase-01-database-indexing-and-query-latency.md) — Phase 1: Database Indexing & Query Latency Optimization
- [x] [`phase-02-eliminate-answer-sync-audit-log-churn.md`](./phase-02-eliminate-answer-sync-audit-log-churn.md) — Phase 2: Eliminate Answer Sync & Heartbeat Write Churn
- [x] [`phase-03-pdf-worker-isolation-and-memory-guards.md`](./phase-03-pdf-worker-isolation-and-memory-guards.md) — Phase 3: PDF Worker Concurrency Guards & Process Isolation Safety
- [x] [`phase-04-supabase-pro-verification-and-readiness-gate.md`](./phase-04-supabase-pro-verification-and-readiness-gate.md) — Phase 4: Supabase Pro Provisioning, Quota Verification & Pooler Health Gate

---

## Verification Evidence

- `pnpm --dir packages/db run test` — PASS: 10/10 test files passed, 30/30 tests passed in 569ms.
- `pnpm --dir app/sentinel-api test src/modules/examination/monitoring src/modules/examination/live-inspection` — PASS: 16/16 test files passed, 74/74 tests passed in 6.36s.
- `pnpm --dir app/sentinel-api test src/modules/examination/flow` — PASS: 9/9 test files passed, 55/55 tests passed in 11.91s.
- `pnpm --dir app/sentinel-api test src/server.config.test.ts src/modules/general/pdf-documents/tests/pdf-document-scope-authorization.test.ts` — PASS: 2/2 test files, 31/31 tests passed.
- `pnpm --dir app/sentinel-api verify:telemetry-evidence-readiness` — PASS: `ready: yes`, `evidenceEnabled: yes`, `bucketReadiness: ready`, `bucketExists: yes`, 0 issues.
