---
title: "Fix Lobby Admission 502 Bad Gateway and Stateless Realtime Broadcast"
type: context
status: ready
created: "2026-08-25"
tags: [context, fix, lobby, realtime, 502, cors, supabase, broadcast]
feature: "fix-lobby-admission-502"
---

# Fix Lobby Admission 502 Bad Gateway and Stateless Realtime Broadcast Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  1. **502 Bad Gateway & Masked CORS Error on Admission:** When an instructor attempts to approve or reject student admissions via `PATCH /exams/:id/lobby/admissions`, the request fails with a `502 Bad Gateway` from the reverse proxy (`api.sentinelph.tech`). Because the reverse proxy generates the 502 HTML/text error response rather than the Hono application runtime, the response lacks the `Access-Control-Allow-Origin` header, causing web browsers to report a false-positive CORS failure (`Access to fetch at ... has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource`) along with `net::ERR_FAILED`.
  2. **Root Cause (Ephemeral WebSocket Channel Teardown in Node.js):** The recently added `broadcastLobbyEvent` helper instantiated ephemeral Supabase Realtime WebSocket channels (`supabase.channel(...)` + `channel.subscribe()` + `removeChannel()`) inside the backend Node.js process. In server environments, `@supabase/realtime-js` channel teardowns and socket disconnects trigger unhandled promise rejections (`channel.unsubscribe()`) and EventEmitter errors that terminate or stall the Node process, prompting the reverse proxy to sever the upstream connection and return a 502.
  3. **Row Count Dereference Fragility:** `updateAdmissions` accessed `Number(result.numUpdatedRows)` without null-safe fallback when executing Kysely update queries.

- **Business / User Value:**
  - Instructors can reliably admit individual students or "Admit All" without experiencing network timeouts or 502 server crashes.
  - Students receive instant (< 50ms) admission unlocking via stateless server-sent broadcasts.
  - Eliminates misleading CORS errors in developer tools and browser consoles.

- **Success Criteria:**
  - `PATCH /exams/:id/lobby/admissions` returns `200 OK` with `{ message: "Admissions updated successfully", data: { updatedCount: N } }` within < 100ms.
  - Broadcast delivery is migrated to Supabase Realtime's stateless HTTP REST endpoint (`POST /realtime/v1/api/broadcast`), completely eliminating WebSocket instantiation in the backend Node process.
  - `broadcastLobbyEvent` is completely non-blocking and isolated with a strict 2-second HTTP abort timeout; failure of the external broadcast cannot affect or fail the core database admission record.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As an instructor,* I want clicking "Admit" or "Admit All" in the Exam Lobby to immediately succeed without 502 Bad Gateway errors, so my students can enter their exams on schedule.
- *As a developer/operator,* I want backend Realtime events to be dispatched statelessly over standard HTTP REST, preventing WebSocket memory leaks, connection stalls, or unhandled process crashes.

### Functional Requirements

- [ ] **FR-01 (Stateless Realtime Broadcast via REST API):**
  - Refactor `broadcastLobbyEvent` in `app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.ts` to use Supabase Realtime's official HTTP REST broadcast endpoint:
    - URL: `${SUPABASE_URL}/realtime/v1/api/broadcast`
    - Method: `POST`
    - Headers: `apikey: SUPABASE_SERVICE_ROLE_KEY`, `Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY`, `Content-Type: application/json`
    - Payload:

      ```json
      {
        "messages": [
          {
            "topic": "lobby:admissions:${examId}",
            "event": "${event}",
            "payload": { ... }
          }
        ]
      }
      ```

- [ ] **FR-02 (Robust Non-Blocking Isolation & Timeout):**
  - Implement an `AbortController` timeout (2000ms) for the HTTP broadcast request.
  - Ensure any fetch error or network timeout is caught and logged as a warning without bubbling up or interrupting the HTTP response.
- [ ] **FR-03 (Null-Safe Kysely Update Count):**
  - In `update-admissions.ts`, ensure `result?.numUpdatedRows` is safely handled as `Number(result?.numUpdatedRows ?? 0)`.
- [ ] **FR-04 (Multi-Layer Realtime Resilience):**
  - Maintain the client-side triple-redundancy architecture:
    1. Direct Realtime Broadcast (sub-50ms via REST API to connected subscribers).
    2. PostgreSQL CDC WAL capture (`postgres_changes` on `exam_lobby_admissions`).
    3. Adaptive 3s fallback polling in `useExamLobbyAdmissionStatusQuery` while status is `WAITING`.

### Edge Cases & Failure Modes

- **Missing Supabase Service Role Key or URL:** If environment variables are absent, `broadcastLobbyEvent` logs a debug warning and returns immediately without throwing.
- **Supabase Realtime API Downtime / HTTP Timeout:** If the Realtime REST API responds with 5xx or exceeds 2 seconds, the request aborts gracefully. The database row is already updated, and Postgres CDC or adaptive polling ensures the student still unlocks within 3 seconds.
- **Reverse Proxy Headers:** Validates that Hono's `resolveCorsOrigin` and `applyCorsHeaders` properly cover `https://app.sentinelph.tech` on all normal and error paths.

---

## 3. Technical & Architectural Context

### Affected Files

- **Backend (`app/sentinel-api`):**
  - [`src/modules/examination/lobby/services/broadcast-lobby-event.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.ts)
  - [`src/modules/examination/lobby/services/broadcast-lobby-event.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/broadcast-lobby-event.test.ts)
  - [`src/modules/examination/lobby/services/update-admissions.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/update-admissions.ts)
  - [`src/modules/examination/lobby/controllers/update-admissions.controller.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/controllers/update-admissions.controller.ts)

### Architecture Comparison: WebSocket vs REST Broadcast

```mermaid
sequenceDiagram
    autonumber
    actor Instructor as Instructor Web UI
    participant API as Sentinel API (Hono)
    participant DB as PostgreSQL Database
    participant Realtime as Supabase Realtime REST
    actor Student as Student Web / Mobile UI

    Instructor->>API: PATCH /exams/:id/lobby/admissions
    API->>DB: UPDATE exam_lobby_admissions SET status='APPROVED'
    DB-->>API: 1 row updated
    
    par Stateless Broadcast Dispatch (Non-blocking)
        API->>Realtime: POST /realtime/v1/api/broadcast (Topic: lobby:admissions:examId)
        Realtime-->>Student: WebSocket Broadcast (sub-50ms)
    and CDC Event (Fallback)
        DB-->>Realtime: Postgres WAL CDC
        Realtime-->>Student: postgres_changes Event
    end

    API-->>Instructor: 200 OK { updatedCount: 1 }
```

---

## 4. Scope & Boundaries

- **In Scope:**
  - Replacing WebSocket-based server broadcasting with the stateless Supabase Realtime REST Broadcast endpoint.
  - Adding defensive error boundaries, timeout handling, and null-safety to `updateAdmissions` and `broadcastLobbyEvent`.
  - Updating unit tests for `broadcast-lobby-event.test.ts` and verifying full API test suite pass.
- **Out of Scope:**
  - Modifying the frontend hook signatures (`useLobbyRealtime`, `useUpdateExamLobbyAdmissionsMutation`).
  - Database schema alterations (the existing `exam_lobby_admissions` schema and indexes are already optimal).

---

## 5. Decision Ledger

| ID | Topic | Decision | Rationale | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | Stateless HTTP REST vs WebSocket Broadcast | Use `POST /realtime/v1/api/broadcast` instead of ephemeral `supabase.channel()` WebSockets in Node.js | Eliminates socket lifecycle management, unhandled promise rejections, and process crashes on the backend while delivering sub-50ms broadcast latency to connected clients | Approved |
| **DEC-02** | Independent Broadcast Failure Isolation | Run broadcast dispatch asynchronously with strict `AbortController` timeout (2s) | Ensures external network or Supabase Realtime service issues cannot block or fail the primary database update transaction | Approved |
| **DEC-03** | CORS Diagnosis Alignment | Clarified that the browser's CORS error is an artifact of the reverse proxy 502 error page rather than an application CORS policy misconfiguration | Root cause is server-side 502 termination, which is resolved by making broadcast dispatch stateless and crash-resilient | Approved |
