---
title: "ADR-0001: Prioritize Supabase Pro Over Railway Pro for Live Examination Infrastructure"
type: decision
status: accepted
created: "2026-08-29"
tags: [adr, infrastructure, scaling, supabase, railway, exam-concurrency, storage, database]
---

# ADR-0001: Prioritize Supabase Pro Over Railway Pro for Live Examination Infrastructure

## Context

Sentinel is an AI-proctored examination platform designed for educational institutions, supporting live exams with 50–150+ concurrent students per cohort. The application topology is split across:

- **Backend API & Workers:** Deployed on **Railway** (Node.js Hono API server, BullMQ background workers, Redis instance).
- **Database & Storage:** Deployed on **Supabase** (PostgreSQL database via Supavisor pooler, GoTrue Auth, Supabase Storage for MediaPipe incident evidence frames, Supabase Realtime for WebSocket lobby and live inspection signaling).
- **Live Video Proctoring:** **LiveKit Cloud / Server** for WebRTC spot checks.

During examination operations, both students (attempt UI, answer synchronization, client-side MediaPipe/YAMNet ML inference, evidence uploads) and instructors (live monitoring dashboard, incident feeds, student status, live inspection spot checks) generate concurrent network and database load.

The development team must decide whether to allocate infrastructure budget toward **Supabase Pro ($25/mo)** or **Railway Pro ($20/mo)** first to eliminate runtime bottlenecks, minimize user friction, and ensure rock-solid examination reliability.

---

## Options Considered

### Option 1: Prioritize Supabase Pro ($25/mo) First, Retain Optimized Railway Free/Hobby (Recommended)

- **Mechanism:** Upgrade Supabase to the Pro tier immediately while running sentinel-api on Railway with optimized connection pooling (DB_POOL_MAX=15 via Supavisor port 6543), debounced answer synchronization (2s), and relaxed instructor monitoring queries (6s).
- **Pros:**
  1. **Expands Storage from 1 GB to 100 GB:** Completely eliminates the storage overflow risk caused by MediaPipe private incident evidence frames (WebP/JPEG frames up to 512 KB per incident).
  2. **Expands Bandwidth from 2 GB to 250 GB:** Prevents mid-exam bandwidth throttling or cutoffs during heavy telemetry asset transmission and report downloads.
  3. **Guarantees Zero Inactivity Pausing:** Supabase Free projects sleep after 7 days of inactivity; Pro guarantees 100% continuous uptime, preventing 500 errors during morning exam check-ins.
  4. **Increases Postgres Memory & I/O:** Upgrades database compute from shared Nano (500 MB RAM) to Micro compute (1 GB+ RAM, dedicated I/O), preventing buffer exhaustion during concurrent answer writes.
  5. **Automated Point-in-Time Backups:** 7-day automated backups protect institutional examination records and grade integrity.
- **Cons:** Railway container memory remains capped at standard tier allocations, requiring worker processes (telemetry and PDF workers) to be managed carefully within memory budgets.

### Option 2: Prioritize Railway Pro ($20/mo) First, Retain Supabase Free Tier

- **Mechanism:** Upgrade Railway to Pro for vertical container scaling and replica load-balancing while keeping Supabase on the Free tier.
- **Pros:** Allows provisioning larger container RAM/CPU and multi-replica edge load balancing for API servers and BullMQ workers.
- **Cons:**
  1. **Immediate Storage Cliff:** Supabase Storage remains capped at 1 GB. A single cohort of 100 students generating proctoring incidents will fill the 1 GB bucket within 2–3 exams, causing subsequent image uploads to fail with 403/413 errors.
  2. **Bandwidth Exhaustion:** 2 GB monthly egress will be exceeded rapidly.
  3. **Database Auto-Sleep Risk:** Database will continue to pause after 7 days of inactivity.
  4. **Database Connection & Memory Bottleneck:** Railway API replicas will still queue behind the 500 MB shared Postgres instance on Supabase, leading to database timeouts regardless of how much CPU Railway has.

### Option 3: Upgrade Both Platforms Simultaneously (Supabase Pro + Railway Pro = $45/mo)

- **Mechanism:** Immediately upgrade both hosting tiers for maximum enterprise capacity.
- **Pros:** Completely removes all theoretical resource constraints on both compute and storage layers.
- **Cons:** Incurs double the recurring operational cost before student cohort size (>300 concurrent students) actually justifies multiple Railway Pro compute replicas.

---

## Decision

**We will prioritize upgrading to Supabase Pro ($25/mo) first.**

Application-level code optimizations (eliminating 500ms student live-inspection polling, debouncing answer syncs to 2s, disabling background session polling, and routing database traffic through Supavisor port 6543) have reduced the backend CPU and memory footprint on Railway by over 95%. Consequently, the Node.js API server operates comfortably with < 200 MB RAM and low CPU on Railway.

In contrast, the **hard failure points in production reside on Supabase Free tier limitations**:

1. **1 GB File Storage & 2 GB Bandwidth Caps:** Directly threatened by proctoring incident frame uploads.
2. **7-Day Project Auto-Pause:** Directly risks exam availability.
3. **500 MB Postgres RAM & Nano Compute:** Limits concurrent read/write throughput during multi-student answer syncing.

Railway Pro should be scheduled as a secondary milestone when concurrent cohort sizes exceed 250–300 students or when separating PDF/telemetry background workers into dedicated isolated worker services.

---

## Consequences

### Positive

- **Zero Storage Headroom Friction:** 100 GB storage bucket capacity accommodates thousands of proctoring evidence frames across dozens of exams.
- **Reliable Availability:** No risk of the database sleeping prior to scheduled exam sessions.
- **Data Protection:** Automated daily backups and point-in-time recovery satisfy institutional compliance requirements.
- **Cost Efficiency:** Delivers maximum stability and capacity for $25/month without premature infrastructure over-provisioning.

### Negative / Required Mitigations

- Railway container memory must be monitored: PDF generation should remain configured with bounded concurrency (PDF_WORKER_CONCURRENCY=2) to prevent Node.js heap spikes.
- Direct database connections must continue to route through Supavisor Transaction Pooler (port 6543) with DB_POOL_MAX=15.

---

## Validation and Review

- **Validation Gate:**
  1. Execute pnpm --dir app/sentinel-api verify:telemetry-evidence-readiness to verify Supabase Storage bucket quotas and project URL alignment.
  2. Verify that active exam answer syncs and instructor monitoring queries maintain < 150ms response times during a 100-student cohort.
  3. Confirm daily backups are active in the Supabase Pro dashboard.
- **Review Trigger:** Re-evaluate Railway Pro upgrade when single-session concurrency exceeds 250 students or when telemetry worker queue backlog exceeds 500 jobs during peak testing.
