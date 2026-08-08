# Reconnect, Resume Session, and Live Capture Frame Implementation Plan

## Status

- **Status:** Planning Mode / In Review
- **Target Date:** 2026-08-08
- **Scope:** Monorepo (`app/sentinel-api`, `app/sentinel-web`, `packages/services`, `packages/shared`)

## Goal

Resolve student attempt reconnect count inconsistencies in lobby and monitoring views, fix session resumption failures for closed/reopened attempts (eliminating the 400 Bad Request error for missing `resumeRequestId`), and resolve live capture frame evidence upload authorization failures caused by unconfigured AI proctoring rules.

## Pre-Planning Summary

- **Task Summary:** Fix reconnect limit fallback and count updates across lobby/monitoring views, ensure valid `resumeRequestId` generation and closed-attempt reopen authorization during exam resumption, and update evidence upload authorization to default missing AI proctoring rules to enabled.
- **Affected Workspaces:** `app/sentinel-api`, `app/sentinel-web`, `packages/services`, `packages/shared`.
- **Affected Services and Controllers:**
  - Lobby check-in and waiting list services (`get-waiting-list.ts`, `check-in-lobby.ts`)
  - Exam monitoring context and overview services (`get-monitoring-exam-context.ts`, `get-exam-monitoring-overview.ts`)
  - Runtime access and eligibility evaluation (`runtime-access.service.ts`, `evaluate-student-exam-eligibility.service.ts`, `resolve-student-override-access.ts`)
  - Session creation and resumption logic (`create-session.logic.ts`)
  - Student lobby actions hook (`use-lobby-actions.ts`)
  - Telemetry evidence authorization service (`evidence-authorization.service.ts`)
- **Affected DB Tables:** `exams`, `exam_configurations`, `exam_lobby_admissions`, `exam_attempts`, `system_settings`, `flagged_incidents`, `telemetry_incident_evidences`.
- **Prisma Migration Required:** No — all fixes consume existing columns, types, and settings structures.

---

## 1. The Context

When students reconnect, reload, or exit during an active attempt, three key issues occur:
1. Instructor lobby and monitoring views display `1 / 0 reconnects` instead of `1 / 2` because backend services fallback to `0` when `exam_configurations.max_reconnect_attempts` is `null`, rather than falling back to global examination defaults (`DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts`).
2. Students whose attempts are closed due to HIGH flagging events fail to reconnect after an instructor re-opens their attempt, receiving a `400 Bad Request` (`"A resume request ID is required to resume an active exam session."`) on `POST /examination/flow/start` because `useLobbyActions.ts` skips generating a `resumeRequestId` when `canResume` is false, and backend `create-session.logic.ts` rejects resumption for `CLOSED` attempt states.
3. Live capture frame upload fails with `Upload target unavailable after candidate persisted` because `EvidenceAuthorizationService.authorizeStudentUpload` strictly checks `aiRules[key] === true`, which fails when `ec.ai_rules` is `null` or unconfigured on an exam.

---

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)
- **Approach:** Apply inline `?? 3` fallback defaults in query services, relax client-side `resumeRequestId` generation checks, and bypass AI rule checks in evidence authorization when `ai_rules` is null.
- **Tradeoff:** Fastest delivery, but leaves hardcoded magic numbers scattered across endpoints, lacks robust type safety for unconfigured AI rules, and may introduce edge-case regressions when settings change.

### Option B: The Strategic Path (Robustness & Scalability)
- **Approach:** Sourced fallback to `DEFAULT_EXAMINATION_GLOBAL_SETTINGS` across all backend entitlement and monitoring queries; update session resumption logic and frontend lobby actions to handle reopened `CLOSED` attempts cleanly with guaranteed `resumeRequestId` generation; and update evidence authorization to evaluate missing AI proctoring rules against system defaults.
- **Tradeoff:** Touches several service layers in `app/sentinel-api` and `app/sentinel-web`, requiring comprehensive Vitest coverage across lifecycle, access, flow, and telemetry modules.

### Option C: The Pivot Path (Creative & Out-of-the-Box)
- **Approach:** Redesign the session creation payload to auto-generate `resumeRequestId` on the server when omitted and introduce an explicit `REOPENED_PENDING_RESUME` lifecycle state in the database.
- **Tradeoff:** Requires database migrations, breaking API payload changes, and extensive changes across mobile and web apps.

---

## 1. The Execution

- **The Recommendation:** Option B.
- **The Justification:** Option B addresses root causes cleanly without database schema changes or breaking API contracts, leveraging existing constants (`DEFAULT_EXAMINATION_GLOBAL_SETTINGS`) and establishing consistent authorization rules across all student and instructor workflows.
- **Next Steps:**
  1. Fix reconnect limit defaults and count mappings across lobby, entitlements, and monitoring services.
  2. Update session resumption logic and `useLobbyActions` hook to support reopening `CLOSED` attempts with guaranteed `resumeRequestId`.
  3. Update `EvidenceAuthorizationService.authorizeStudentUpload` to default missing AI proctoring rules to enabled (`true`).

---

## Breakdown by Issue Folders

- **Issue 1 [Folder]:** `docs/task/2026-08-08/issue-1-reconnect-counts/`
  - [phase-1-reconnect-limit-defaults.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-08/issue-1-reconnect-counts/phase-1-reconnect-limit-defaults.md)
  - [phase-2-monitoring-and-lobby-reconnect-sync.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-08/issue-1-reconnect-counts/phase-2-monitoring-and-lobby-reconnect-sync.md)

- **Issue 2 [Folder]:** `docs/task/2026-08-08/issue-2-resume-request-id/`
  - [phase-1-closed-attempt-reopen-authorization.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-08/issue-2-resume-request-id/phase-1-closed-attempt-reopen-authorization.md)
  - [phase-2-frontend-resume-request-id-generation.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-08/issue-2-resume-request-id/phase-2-frontend-resume-request-id-generation.md)

- **Issue 3 [Folder]:** `docs/task/2026-08-08/issue-3-live-capture-evidence/`
  - [phase-1-ai-proctoring-rule-default-authorization.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-08/issue-3-live-capture-evidence/phase-1-ai-proctoring-rule-default-authorization.md)
  - [phase-2-evidence-upload-verification.md](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-08/issue-3-live-capture-evidence/phase-2-evidence-upload-verification.md)

---

## Done Criteria

- [ ] Instructor lobby and monitoring overview correctly report configured max reconnect attempts (e.g. `1 / 2`) even when `exam_configurations.max_reconnect_attempts` is null.
- [ ] Student lobby updates reconnect count accurately upon returning from interrupted/reloaded attempt.
- [ ] Reopened attempts (previously `CLOSED` by HIGH flagging events) can be resumed without throwing `400 Bad Request` or `Missing resumeRequestId`.
- [ ] `EvidenceAuthorizationService` permits live capture frame uploads when AI proctoring rules are null/unconfigured by defaulting to enabled.
- [ ] All Vitest unit tests in touched modules pass cleanly.
