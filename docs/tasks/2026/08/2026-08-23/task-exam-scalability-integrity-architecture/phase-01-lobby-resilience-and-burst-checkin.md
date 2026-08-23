---
title: "Phase 1: Lobby Resilience & Burst Check-in Stability"
type: phase
parent: "task-exam-scalability-integrity-architecture"
phase: "1"
status: completed
created: "2026-08-23"
tags: [task, phase, lobby, check-in, admissions, concurrency]
---

# Phase 1: Lobby Resilience & Burst Check-in Stability

## Objective

Harden the instructor lobby and student check-in subsystem to handle sudden bursts of 200+ students entering an exam simultaneously. Ensure atomic database upserts, reliable batch admissions, and resilient reconnect logic between students and instructors.

---

## Dependencies & Prerequisites

- Context specification: [`docs/context/August/23/exam-resilience-concurrency-grading-spec.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/23/exam-resilience-concurrency-grading-spec.md)
- Existing lobby services in `app/sentinel-api/src/modules/examination/lobby/`
- Mobile lobby hook in `app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts`

---

## Impacted Files & Components

- [`app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts): Lobby check-in upsert logic.
- [`app/sentinel-api/src/modules/examination/lobby/services/update-admissions.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/update-admissions.ts): Instructor batch admission handler.
- [`app/sentinel-api/src/modules/examination/lobby/services/get-admission-status.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/get-admission-status.ts): Student admission polling query.
- [`app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts): Mobile student lobby synchronization hook.
- [`app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.test.ts): Unit and concurrency tests.

---

## Implementation Tasks

- [x] **Task 1.1 (Verify Atomic Check-In Upserts):** Audit and ensure [`checkInLobby`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.ts) uses PostgreSQL `ON CONFLICT (exam_id, student_id) DO UPDATE` so rapid duplicate check-ins never throw constraint violations.
- [x] **Task 1.2 (Verify Bulk Admissions in Single Query):** Ensure [`updateAdmissions`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/update-admissions.ts) updates up to 200 student records using an SQL `where student_id in (...)` statement with non-blocking audit logging.
- [x] **Task 1.3 (Mobile Client Polling Jitter & Reconnect Resiliency):** Update [`use-exam-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts) to apply randomized polling intervals (30s–45s jitter) when waiting in `INSTRUCTOR_GATED` lobbies to prevent synchronized polling surges on the API.
- [x] **Task 1.4 (Automated Concurrency Tests):** Add comprehensive unit and concurrent load tests in [`check-in-lobby.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/lobby/services/check-in-lobby.test.ts) simulating parallel student check-in calls.

---

## Verification & Testing

```bash
# Run lobby unit and integration tests
pnpm --filter sentinel-api test src/modules/examination/lobby
# PASS: 5 test files passed, 22 tests passed
```

---

## Risks & Rollback

- **Risk:** Database index locks on `exam_lobby_admissions` under extreme contention.
- **Mitigation:** Ensure indexes on `(exam_id, student_id)` and `(exam_id, status)` are maintained.
- **Rollback:** Revert check-in queries to previous revision if any query regressions occur.
