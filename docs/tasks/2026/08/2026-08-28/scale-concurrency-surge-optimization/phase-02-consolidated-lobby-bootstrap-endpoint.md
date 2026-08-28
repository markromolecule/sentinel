---
title: "Phase 2: Consolidated Student Lobby Bootstrap Endpoint & Check-in Decoupling"
type: phase
parent: "scale-concurrency-surge-optimization"
phase: "2"
status: planned
created: "2026-08-28"
tags: [task, phase, api, lobby, bootstrap, check-in, performance]
---

# Phase 2: Consolidated Student Lobby Bootstrap Endpoint & Check-in Decoupling

## Objective

Create a unified composite endpoint `POST /api/examination/:id/lobby/bootstrap` that performs student check-in, resolves admission state, fetches exam metadata, and returns waiting counts in a single atomic SQL transaction, while decoupling heavy administrative audit notifications from the hot check-in path.

---

## Dependencies & Prerequisites

- Phase 1 completed (In-memory auth caching and tuned DB pool).

---

## Impacted Files & Components

1. **[`app/sentinel-api/src/modules/examination/lobby/controllers/bootstrap-lobby.controller.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/controllers/bootstrap-lobby.controller.ts)** [NEW]
   - Define OpenAPI route and controller for `POST /api/examination/:id/lobby/bootstrap`.

2. **[`app/sentinel-api/src/modules/examination/lobby/services/bootstrap-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/bootstrap-lobby.ts)** [NEW]
   - Execute an optimized single SQL transaction combining exam configuration, student record, existing admission/attempt status, upsert admission record, and aggregate waiting count.
   - Return `{ exam, configuration, admission, presenceCount, runtimeAccess }`.

3. **[`app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts)**
   - Remove `ActivityNotificationService.notifyInstitutionActivityCreated` from check-in.
   - Retain lightweight Realtime broadcast to instructor channel via stateless REST.

4. **[`app/sentinel-api/src/modules/examination/lobby/lobby.routes.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/lobby.routes.ts)**
   - Register the new bootstrap route.

5. **[`packages/services/src/examination/lobby.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/services/src/examination/lobby.service.ts)**
   - Add `bootstrapExamLobby(apiClient, examId)` client service function.

---

## Implementation Tasks

- [ ] **Task 2.1 — Strip Synchronous Admin Audit Notifications from Check-in**
  - In `check-in-lobby.ts`, delete the synchronous `ActivityNotificationService.notifyInstitutionActivityCreated` block.
  - Retain `broadcastLobbyEvent(examId, 'student:checked_in', ...)` for sub-50ms instructor board updates.

- [ ] **Task 2.2 — Implement `bootstrapLobby` Service (`bootstrap-lobby.ts`)**
  - Consolidate data fetching into a single query pattern:
    1. Fetch exam + configuration + student record in parallel/CTE.
    2. Upsert admission record (`WAITING` or `APPROVED`).
    3. Query latest attempt status.
    4. Count waiting admissions for the exam.
  - Return composite payload: `{ exam, configuration, admission: { status, checkedInAt, decidedAt }, waitingCount, runtimeAccess }`.

- [ ] **Task 2.3 — Create Route & Controller (`bootstrap-lobby.controller.ts`)**
  - Implement OpenAPI route definition and controller.
  - Wire into `lobby.routes.ts`.

- [ ] **Task 2.4 — Export Client Service (`packages/services/src/examination/lobby.service.ts`)**
  - Export `bootstrapExamLobby` and types in `@sentinel/services`.

---

## Verification & Testing

```bash
# 1. Test lobby services & controller
pnpm --filter sentinel-api test 'src/modules/examination/lobby'

# 2. Test contracts
pnpm --filter sentinel-api test 'src/tests/exams/exam-contracts.test.ts'
```

---

## Risks & Rollback

- **Risk:** Existing separate endpoints (`/check-in`, `/admission-status`, `/count`) might break if modified.
  - **Mitigation:** Leave existing endpoints intact for backward compatibility; add the bootstrap endpoint alongside them.
