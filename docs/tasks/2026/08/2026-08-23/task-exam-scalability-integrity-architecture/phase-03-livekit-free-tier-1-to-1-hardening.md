---
title: "Phase 3: LiveKit Free-Tier 1-to-1 Spot-Inspection Hardening & Busy State UI"
type: phase
parent: "task-exam-scalability-integrity-architecture"
phase: "3"
status: completed
created: "2026-08-23"
tags: [task, phase, livekit, free-tier, 1-to-1, video, monitoring, permissions]
---

# Phase 3: LiveKit Free-Tier 1-to-1 Spot-Inspection Hardening & Busy State UI

## Objective

Harden the LiveKit monitoring subsystem to strictly operate within Free-Tier quotas (zero continuous video, on-demand 1-to-1 spot-inspections only). Ensure multiple unique instructors can inspect distinct students in parallel across exams, handle same-student contention with an informative busy UI, and guarantee instant track teardown on viewer exit.

---

## Dependencies & Prerequisites

- `live_inspection_leases` table and unique partial indexes in `packages/db/prisma/schema.prisma`.
- LiveKit backend services in `app/sentinel-api/src/modules/examination/live-inspection/`.
- Shared hooks in `packages/hooks/src/live-inspection/`.
- Web UI monitor in `app/sentinel-web/src/features/exams/monitoring/_components/live-feed-monitor.tsx`.

---

## Impacted Files & Components

- [`app/sentinel-api/src/modules/examination/live-inspection/services/start-live-inspection.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/live-inspection/services/start-live-inspection.service.ts): Lease creation and 1-to-1 conflict validation.
- [`app/sentinel-api/src/modules/examination/live-inspection/services/stop-live-inspection.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/live-inspection/services/stop-live-inspection.service.ts): Immediate lease termination and LiveKit room cleanup.
- [`packages/hooks/src/live-inspection/use-live-inspection-viewer.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-live-inspection-viewer.ts): Viewer state hook handling `409 CONFLICT` mapping.
- [`packages/hooks/src/live-inspection/use-student-live-inspection-publisher.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-student-live-inspection-publisher.ts): Student on-demand WebRTC track publisher.
- [`packages/ui/src/components/live-video-monitor.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/ui/src/components/live-video-monitor.tsx): Web monitor UI component displaying busy state.
- [`app/sentinel-api/src/modules/examination/live-inspection/services/start-live-inspection.service.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/live-inspection/services/start-live-inspection.service.test.ts): Lease tests.

---

## Implementation Tasks

- [x] **Task 3.1 (Verify Multi-Instructor Independent 1-to-1 Leases):** Ensure [`startLiveInspection`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/live-inspection/services/start-live-inspection.service.ts) allows distinct instructors $(Inst_1, Inst_2, \dots)$ to acquire leases for distinct students $(Stud_1, Stud_2, \dots)$ concurrently across exams without any cross-talk or lock contention.
- [x] **Task 3.2 (Implement Informative Busy State on 409 Conflict):** In [`use-live-inspection-viewer.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/use-live-inspection-viewer.ts) and [`live-video-monitor.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/ui/src/components/live-video-monitor.tsx), when an instructor attempts to view a student already leased by another proctor, the UI displays the informative status: *"Student is currently under live inspection by another proctor"*.
- [x] **Task 3.3 (Immediate Track Teardown & Room Reaping):** Verified that [`stopClonedInspectionTrack`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/live-inspection/live-inspection-room.utils.ts#L19-L25) and [`stopLiveInspection`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/live-inspection/services/stop-live-inspection.service.ts) release tracks immediately upon viewer departure, ensuring zero Free-Tier bandwidth consumption during idle periods.
- [x] **Task 3.4 (Automated Tests for 1-to-1 Leases & Contention):** Added test cases in [`start-live-inspection.service.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/live-inspection/services/start-live-inspection.service.test.ts) and [`live-video-monitor.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/ui/src/components/live-video-monitor.test.tsx) covering multi-instructor parallel leases and same-student conflict.

---

## Verification & Testing

```bash
# Run live-inspection API tests
pnpm --filter sentinel-api test src/modules/examination/live-inspection
# PASS: 10/10 test files passed, 51/51 tests passed

# Run live-inspection hooks tests
pnpm --filter @sentinel/hooks exec vitest run src/live-inspection
# PASS: 3/3 test files passed, 28/28 tests passed

# Run UI monitor tests
pnpm --filter @sentinel/ui test src/components/live-video-monitor.test.tsx
# PASS: 1/1 test file passed, 5/5 tests passed
```

---

## Risks & Rollback

- **Risk:** Stale leases remaining active if an instructor abruptly disconnects.
- **Mitigation:** Leases carry a strict TTL (`expires_at`, 5-10 mins) and are reaped automatically by the background reconciler.
- **Rollback:** Retain strict 1-to-1 database rollback migration if needed.
