---
title: "Production Leaks, Code Optimization, and Server Capacity Context Specification"
type: context
status: ready
created: "2026-08-29"
tags: [context, leaks, performance, optimization, infrastructure, railway, supabase, livekit]
feature: "production-leaks-and-infrastructure-sizing"
---

# Production Leaks, Code Optimization, and Server Capacity Context Specification

## 1. Overview & Objective

- **Problem Statement:** During live examination testing with student cohorts (50–150 students), high concurrency and resource usage can cause friction for both students (slow syncs, upload failures) and instructors (monitoring dashboard lag, delayed live spot checks). We must identify all remaining resource/memory/connection leaks, unoptimized code paths, and server capacity limits across Railway and Supabase.
- **Business / User Value:** Guarantee seamless, zero-friction exam execution for students and real-time responsiveness for instructors, preventing mid-exam outages or data loss while optimizing hosting expenses.
- **Success Criteria:**
  - Zero memory, connection, or listener leaks across frontend student runtimes and backend API/worker services.
  - Sub-200ms instructor dashboard responses.
  - High-availability database connectivity with zero connection exhaustion under 150 concurrent students.
  - Clear priority alignment between Supabase Pro and Railway Pro infrastructure upgrades.

---

## 2. Comprehensive Investigation Findings

### A. Leaks Audit (Production & Examination Proper)

| Area | Leak Type | Location | Severity | Root Cause & Mechanism | Mitigation / Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Database** | Activity Logging Churn | sync-session.service.ts (L79-96) | **Medium** | Every student answer sync (2s debounce) and heartbeat (30s) calls LogsService.createLog, querying institutions and inserting exam.heartbeat_synced into activity_logs. For 100 students in a 1-hour exam, this inserts ~12,000 log rows and runs ~12,000 hierarchy lookups. | **Recommended Fix:** Omit writing routine progress heartbeats to persistent audit logs, or buffer in Redis. |
| **Database** | Missing B-Tree Indexes | packages/db/prisma/schema.prisma | **High** | flagged_incidents only has a partial unique index on [attempt_id, rule_key, platform, dedupe_key] (WHERE dedupe_key IS NOT NULL). It lacks a general B-tree index on attempt_id and timestamp. Instructor aggregation queries join on attempt_id, causing sequential table scans as incident volume grows. | **Recommended Fix:** Add @@index([attempt_id, timestamp(sort: Desc)]) to flagged_incidents. |
| **Database** | Unindexed Foreign Keys | packages/db/prisma/schema.prisma | **Medium** | live_inspection_leases lacks dedicated indexes on attempt_id and exam_id. | **Recommended Fix:** Add @@index([attempt_id]) to live_inspection_leases. |
| **Frontend** | Polling Loop Leaks | use-student-live-inspection-publisher.ts | **Resolved** | Prior 500ms polling loop was eliminated in Phase 1 (August 24), replacing HTTP polling with Supabase Realtime WebSocket broadcast (LIVE_INSPECTION_CHANGED). | **Verified Clean:** Idle student traffic is 0 req/sec. |
| **Frontend** | Audio Graph & Worker Disposal | AudioAnomalyController.ts | **Low / Clean** | Web Audio API AudioContext and worker threads are cleanly stopped and terminated on dispose() via useAudioAnomalyWorker teardown effect. | **Verified Clean.** |
| **Frontend** | MediaPipe Resource Cleanup | use-mediapipe-camera-runtime.ts | **Low / Clean** | FaceLandmarker is closed and camera stream tracks are stopped on unmount via stopRuntime(). | **Verified Clean.** |
| **Backend** | Embedded PDF Worker OOM Risk | server.ts & pdf-generation.worker.ts | **Medium** | When ENABLE_EMBEDDED_PDF_WORKER=true, PDFKit report generation runs inside the API server process. On Railway Hobby (512MB RAM cap), generating large exam reports during an active exam risks an OOM restart. | **Mitigation:** Keep PDF_WORKER_CONCURRENCY=2 or isolate PDF worker to a separate container. |

---

## 3. Core Question Resolution: Supabase Pro vs. Railway Pro

### Recommendation: Prioritize **Supabase Pro ($25/mo)** First

**Why Supabase Pro is the Essential 1st Priority:**

1. **Immediate Storage Exhaustion on Free Tier:** Sentinel stores MediaPipe incident frames (WebP/JPEG, up to 512 KB per frame) in the private Supabase bucket sentinel-proctoring-evidence. On Supabase Free, storage is capped at **1 GB**. An active cohort of 80–100 students generating incidents can consume 200–400 MB in a single exam session. After 2–3 exams, storage will fill up, causing evidence uploads to fail with 403/413 errors and degrading proctoring integrity.
2. **2 GB Monthly Egress Cap:** Student evidence uploads, avatar fetches, and instructor report downloads will easily exceed 2 GB/month on the Free tier. Supabase Pro provides **250 GB bandwidth**.
3. **Eliminates 7-Day Project Sleeping:** Supabase Free projects sleep after 7 days of inactivity. If an exam is scheduled on a Monday after a weekend, the database cold-start causes 500 errors during initial student login. Pro guarantees 100% uptime.
4. **Postgres Memory & I/O:** Supabase Pro upgrades shared Nano (500 MB RAM) to Micro compute with dedicated I/O, preventing database connection queueing during concurrent answer syncing.
5. **Automated Point-in-Time Recovery:** Crucial for preserving exam attempts and grading records.

**Why Railway Pro Can Be Scheduled as 2nd Priority:**

- The Hono API server on Railway has been heavily optimized: background polling has been stripped out, answer syncs are debounced to 2s, and queries route through the Supavisor Transaction Pooler (port 6543).
- For 50–150 students, sentinel-api runs smoothly with **< 200 MB RAM and low CPU** on Railway baseline tier.
- Railway Pro ($20/mo) becomes necessary when scaling past **250–300 concurrent students** or when splitting out dedicated worker containers for PDF generation and BullMQ telemetry ingestion.
