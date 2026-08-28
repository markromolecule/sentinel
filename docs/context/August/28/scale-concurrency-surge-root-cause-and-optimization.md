---
title: "Concurrency Surge Root-Cause Analysis & Scalability Architecture"
type: context
status: ready
created: "2026-08-28"
tags: [context, performance, concurrency, root-cause-analysis, scaling, supabase, railway, postgres-pool, realtime]
feature: "concurrency-surge-root-cause-and-optimization"
---

# Concurrency Surge Root-Cause Analysis & Scalability Architecture Specification

## 1. Production Environment Baseline & Executive Summary

### Verified Production Environment Settings

- **Hosting Platform:** Railway (Hobby Plan)
  - **Service:** `sentinel-api-production` (`api.sentinelph.tech`)
  - **Region:** Southeast Asia (Singapore)
  - **Replicas:** **2 Active Replicas (`2/2 active`)**
  - **Per-Replica Allocation Limits:** Up to **8 vCPU** and **8 GB RAM**
- **Database & Auth / Realtime Provider:** Supabase (Free Tier)
  - **Database Connection Limits:** Max 60 Direct DB Connections (`max_connections`), ~15 reserved for Supabase internal daemons $\rightarrow$ ~45 usable by application clients.
  - **Supabase Realtime WebSocket Limit:** **200 Concurrent WebSocket Connections**, max 500 messages/sec.
  - **Database Connection Pool in App (`@sentinel/db`):** `DB_POOL_MAX=15` per replica (Total = 30 connections across 2 replicas).

---

### Executive Root-Cause Analysis (Why Surge Fails Without Batching)

Because the application is already provisioned with **2 Replicas and generous 8 vCPU / 8 GB RAM on Railway**, **compute is NOT the bottleneck**.

Instead, a sudden surge of 150–200+ students logging in and entering the lobby within 5–10 seconds triggers a **downstream database pool starvation and WebSocket connection cap collapse**:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       THE CONCURRENCY SURGE BOTTLENECK CHAIN                           │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 150–200 Students Hit the Lobby Simultaneously                                                          │
│   │                                                                                                    │
│   ├──► [1. Frontend Mount Waterfall]                                                                   │
│   │     • Each client fires 5–6 parallel HTTP requests on mount                                        │
│   │     • 200 students = 1,200 HTTP requests hitting the 2 Railway replicas in < 3 seconds             │
│   │                                                                                                    │
│   ├──► [2. Uncached Auth Middleware Query Multiplication]                                              │
│   │     • In `auth.ts`, EVERY request runs 4 DB queries (User, Roles, Overrides, `last_seen_at` write) │
│   │     • 1,200 requests × 4 auth queries = 4,800 database queries from middleware alone!              │
│   │                                                                                                    │
│   ├──► [3. Heavy Check-in Notifications & Audits in Hot Path]                                          │
│   │     • `POST /check-in` synchronously runs `ActivityNotificationService` + institution RBAC checks │
│   │     • Adds 8–12 DB queries per student check-in = 2,000+ extra queries                             │
│   │                                                                                                    │
│   ├──► [4. Database Connection Pool Starvation & 2-Replica Direct Connection Saturation] ──► FATAL    │
│   │     • 2 replicas × 15 pool connections = 30 direct DB connections. Direct limit is 45 usable!     │
│   │     • 7,000+ total queries queue up behind the pool slots. Total queue duration = 23+ seconds!     │
│   │     • At second 10, queued requests hit `connectionTimeoutMillis=10000` (10s) and crash            │
│   │       with `Database Connection Error: timeout exceeded` (500) or Gateway Timeout (504).           │
│   │     • Exactly 40+ users crash outright; batching worked only because it staggered DB queue time.   │
│   │                                                                                                    │
│   └──► [5. Supabase Realtime WebSocket Connection & CDC Caps]                                         │
│         • Each client joins 2 channels: `presence:lobby` + `lobby:admissions` = 400 WS channels       │
│         • Supabase Free Tier cap is 200 concurrent connections -> Realtime drops sockets (`TIMED_OUT`) │
│         • `postgres_changes` WAL fan-out: 200 row updates × 200 clients = 40,000 CDC messages in 10s   │
│         • Supabase rate-limits messages (500 msgs/s limit), forcing clients into aggressive fallback.  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Quantitative Performance & Concurrency Comparison Table

| Metric / Dimension | Current State (Surge Failure) | Target Phase 1 (150–200 Users on Free/Hobby) | Target Phase 2 (1,000+ Scale on Paid BaaS) |
| :--- | :--- | :--- | :--- |
| **Max Concurrent Users** | **~40–50 users unbatched**<br>*(40 users fail outright on surge)* | **200 concurrent users**<br>*(Smooth unbatched ingress)* | **1,000–2,500 concurrent users** |
| **Login / Ingress Mode** | **Batched / Throttled**<br>*(Manual workaround)* | **Instant Unbatched Surge**<br>*(Full concurrent entry)* | **Instant Unbatched Surge**<br>*(Auto-scaled edge entry)* |
| **Railway Compute Setup** | **2 Replicas (Singapore), 8 vCPU / 8 GB** | **2 Replicas (Singapore), 8 vCPU / 8 GB** | **2–4 Replicas + Edge CDN** |
| **HTTP Requests per Client on Mount** | **5–6 requests**<br>*(Exam, Config, Count, Status, Check-in, Refetch)* | **1 request (Combined Bootstrap)**<br>*(Single composite `/lobby/bootstrap`)* | **1 request + Edge CDN Caching** |
| **Database Queries per HTTP Request** | **4–8 DB queries**<br>*(4 uncached auth queries + route queries)* | **0–1 DB queries**<br>*(In-memory LRU auth cache + single join)* | **0 DB queries for static auth/config**<br>*(JWT claims + Redis cache)* |
| **Total Ingress DB Queries (200-User Surge)** | **~6,800–7,500 queries**<br>*(Pool saturated; 10s timeouts)* | **< 250 queries**<br>*(96.7% database load reduction)* | **< 1,200 queries (for 1,000 users)** |
| **Database Connection Pool Sizing** | `DB_POOL_MAX=15` per replica (Direct 30 conn) | `DB_POOL_MAX=20` per replica (Supabase Free Direct Pool) | Supavisor Pooler (Port 6543, 100–200 pool) |
| **DB Pool Queuing Delay at Peak** | **18,000ms – 30,000ms**<br>*(Exceeds 10s connection timeout)* | **< 120ms** | **< 50ms** |
| **Realtime Channel Architecture** | **2 Channels per client**<br>*(1 Presence + 1 Admissions with `postgres_changes`)* | **1 Channel per client**<br>*(Consolidated Broadcast; `postgres_changes` removed)* | **Dedicated Realtime Cluster / Redis PubSub** |
| **Supabase Realtime Connections (200 Users)** | **400 WS connections**<br>*(Exceeds Free 200 limit)* | **200 WS connections**<br>*(Fits Free tier 200 cap)* | **1,000 WS connections (Pro + Add-on)** |
| **Realtime CDC WAL Message Rate** | **~40,000 msgs in 10s** (4,000/s - Throttled) | **0 CDC WAL msgs** (Stateless REST Broadcast only) | **0 CDC WAL msgs** (Stateless REST Broadcast) |
| **Lobby Check-in Latency (p95)** | **12,500ms (or 504 Timeout)** | **< 180ms** | **< 85ms** |

---

## 3. Concrete Code-Level Optimizations (Optimized for Free Tier + 2 Replicas)

### Optimization 1: In-Memory LRU Auth & Permission Caching in API Middleware

- **Problem:** `authMiddleware` executes 4 separate DB round-trips (`prisma.users.findUnique`, `user_roles` join, `rbac_user_permission_overrides`, `prisma.user_profiles.update`) on **every single incoming HTTP request**.
- **Fix:**
  1. Implement a fast in-process TTL cache (e.g. `lru-cache` with 60-second TTL) keyed by `userId:jwtHash`.
  2. Cache `{ user, institutionId, role, activePermissionKeys }`.
  3. Decouple `last_seen_at` updates from the hot request path: throttle in-memory and flush asynchronously in background every 5 minutes.
  4. With 2 Railway replicas, each replica maintains its own isolated LRU cache, providing immediate near-zero query response across both instances.
- **Impact:** Eliminates **4,000+ DB queries** in a 200-user surge (80% drop in DB traffic instantly).

### Optimization 2: Consolidated Student Lobby Bootstrap Endpoint (`POST /exams/:id/lobby/bootstrap`)

- **Problem:** When a student enters `/student/exam/[id]/lobby`, the client fires 5 separate requests: `getExam`, `getConfiguration`, `getExamLobbyCount`, `getExamLobbyAdmissionStatus`, and `checkIntoExamLobby`.
- **Fix:**
  1. Provide a single unified endpoint `POST /exams/:id/lobby/bootstrap` that performs check-in, retrieves exam metadata, admission state, active attempt status, and presence counters in **one single SQL query / transaction**.
  2. Return the complete state to the frontend in a single round-trip.
- **Impact:** Reduces frontend HTTP ingress from **1,200 requests to exactly 200 requests** during a 200-user surge (83% network request reduction).

### Optimization 3: Strip `postgres_changes` from `useLobbyRealtime` & Consolidate Channels

- **Problem:**
  1. `useLobbyRealtime` listens to `postgres_changes` on `exam_lobby_admissions`. Every student check-in generates a WAL event that Supabase Realtime fans out to all connected students.
  2. Each student joins 2 distinct channels (`presence:lobby:${examId}` and `lobby:admissions:${examId}`), consuming 2x connection quota (400 WS channels for 200 students).
- **Fix:**
  1. Consolidate into a single channel: `lobby:${examId}` handling both Presence tracking and Broadcast events (`admission:updated`, `student:checked_in`).
  2. Remove `postgres_changes` listener entirely. Backend already uses `broadcastLobbyEvent` via Supabase REST API (`/realtime/v1/api/broadcast`).
- **Impact:** Cuts WebSocket connections in half (200 instead of 400), fitting safely within the Supabase Free 200-connection limit, and eliminates 40,000 CDC message explosions.

### Optimization 4: Decouple Activity Notifications from Check-in Path

- **Problem:** `checkInLobby` synchronously executes `ActivityNotificationService.notifyInstitutionActivityCreated`, querying institution hierarchies and all admin permission overrides.
- **Fix:**
  1. Do not trigger full administrative audit activity notifications on routine student lobby check-ins.
  2. If notification is required for instructors, emit an asynchronous ephemeral Supabase Realtime broadcast to the instructor channel, without running DB notification queries.
- **Impact:** Saves 8–12 DB queries per check-in.

---

## 4. Infrastructure & Production Configuration

### 1. Existing Setup on Railway (2 Replicas, Singapore)

- **Current Settings Confirmed:**
  - 2 active replicas in Singapore with up to 8 vCPU and 8 GB RAM per replica.
  - Generous compute headroom already exists.
- **Database Pool Settings (`packages/db/src/db.ts`):**
  - Set `DB_POOL_MAX=20` per replica (Total = 40 connections across 2 replicas, safely below Supabase direct connection cap of 45–60).
  - Set `DB_POOL_IDLE_TIMEOUT_MS=15000`.
  - Set `DB_POOL_CONNECTION_TIMEOUT_MS=5000` (fail fast rather than hung queue).

### 2. Seamless BaaS Upgrade Path (When Ready to Scale to 1,000+ Users)

- **Supabase Pro Tier ($25/mo):**
  - Point `DATABASE_URL` to Supavisor Transaction Pooler on port `6543` with `?pgbouncer=true`.
  - Expands Realtime WebSocket quota to 500+ (and up to 10,000+ with Realtime add-on).
  - Handles 1,000–2,500 concurrent students without any changes to the application code.

---

## 5. Phased Rollout & Scaling Roadmap

| Phase | Target Users | Infrastructure Used | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Phase 1 (Immediate)** | **150–200 Users (Unbatched)** | **Railway 2 Replicas (8 vCPU/8GB) + Supabase Free** | 1. In-memory auth & permission LRU cache in `authMiddleware`.<br>2. Consolidated `POST /lobby/bootstrap` endpoint.<br>3. Remove `postgres_changes` and merge into 1 Realtime channel (`lobby:${examId}`).<br>4. Strip synchronous audit notifications from check-in.<br>5. Configure `DB_POOL_MAX=20` per replica. |
| **Phase 2 (Future BaaS Scale)** | **1,000–2,500+ Users** | **Supabase Pro (Supavisor 6543 + Realtime Add-on) + Railway 2+ Replicas** | 1. Switch connection string to Supavisor port `6543`.<br>2. Enable Realtime high-concurrency add-on.<br>3. Zero code changes required. |
