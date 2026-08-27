---
title: "Mobile Exam Session Reliability, Audio Monitoring, Device Anomaly Alerts, and Submission Idempotency"
type: task
status: planned
created: "2026-08-26"
tags: [task, mobile, exam-session, telemetry, audio-monitoring, notifications, idempotency]
---

# Mobile Exam Session Reliability, Audio Monitoring, Device Anomaly Alerts, and Submission Idempotency

## Outcome

Deliver a resilient mobile exam experience on `sentinel-mobile` that guarantees flawless question rendering across all 8 question types and passages, resolves native iOS audio session conflicts, continuously monitors audio levels, provides immediate tactile/visual device feedback upon security anomalies, and handles exam submissions and feedback idempotently without "already submitted" errors.

---

## Pre-planning record

### Actors and goals

- **Student:** Wants seamless question display, no crash on checkup or submit, and clear haptic/banner warnings if they look away or trigger an anomaly so they can adjust their behavior.
- **Instructor:** Wants verified proctoring telemetry for gaze, backgrounding, pinning violations, and loud audio/speech events.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-1 | Student loads exam session | Started exam attempt from lobby | Questions, passages, and choices render immediately | Fallback input rendered if options empty | Planned |
| SC-2 | Student completes checkup on iOS | Mic and camera permissions granted | Audio recorder initializes without `Session activation failed` | Catch error and retry safely with fallback audio mode | Planned |
| SC-3 | Anomaly triggered (e.g. gaze/noise) | Active exam session | Device vibrates via `expo-haptics` and top warning banner displays | Banner auto-clears after cooldown | Planned |
| SC-4 | Student submits exam (or retries submit) | Exam completed or time expired | Routes to feedback/results even if server returns 409 "already submitted" | No error alert shown; proceeds forward | Planned |
| SC-5 | Student submits post-exam feedback | On feedback screen | Submits rating & experience or skips cleanly | Catches duplicate submit and redirects to thank-you | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-1 | How should physical device alert students on anomaly? | Tactile haptic pulse (`expo-haptics`) + non-blocking top warning banner | Alerts student instantly without interrupting active typing | Full-screen blocking modal (too disruptive) | Task Plan |
| DEC-2 | How to handle 409 on exam completion? | Treat 409 "already submitted" as idempotent success and route forward | Exam is already safely in DB; throwing error causes panic | Showing "Turn in failed" alert | Task Plan |

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-1 | SC-1 | All question types & passages render cleanly with no blank screens | `mobile-exam-adapter.ts`, `question-card.tsx` | Automated vitest + UI inspection | Planned |
| AC-2 | SC-2 | Audio recording initializes safely on iOS physical devices | `use-exam-checkup.ts` | Unit tests + error boundary | Planned |
| AC-3 | SC-3 | Device triggers haptics and warning banner on anomaly | `use-exam-session.ts`, `exam-session-screen.tsx` | Vitest hook tests | Planned |
| AC-4 | SC-4 | Exam turn-in handles 409 idempotently without failure alert | `use-exam-session.ts` `executeSubmission` | Vitest test case | Planned |
| AC-5 | SC-5 | All tests in `sentinel-mobile` pass with 100% success rate | Monorepo test runner | `pnpm --filter sentinel-mobile test` | Planned |

---

## Scope

- Resilient question rendering and input handling on mobile.
- Safe iOS audio session configuration during checkup and session audio anomaly telemetry.
- Tactile haptics and top warning chip on mobile anomaly triggers.
- Idempotent submission and feedback navigation.

## Non-goals

- Altering database schemas or web instructor proctoring interfaces.

---

## Phases

- [ ] [`phase-01-question-rendering-and-session-guard.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-26/task-001-feat-mobile-exam-reliability/phase-01-question-rendering-and-session-guard.md) — Phase 1: Question rendering resiliency and session storage validation
- [ ] [`phase-02-ios-audio-configuration-and-session-metering.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-26/task-001-feat-mobile-exam-reliability/phase-02-ios-audio-configuration-and-session-metering.md) — Phase 2: Safe iOS audio session configuration and live session metering
- [ ] [`phase-03-device-anomaly-haptics-and-warnings.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-26/task-001-feat-mobile-exam-reliability/phase-03-device-anomaly-haptics-and-warnings.md) — Phase 3: Physical device tactile haptics and warning banners
- [ ] [`phase-04-submission-and-feedback-idempotency.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-26/task-001-feat-mobile-exam-reliability/phase-04-submission-and-feedback-idempotency.md) — Phase 4: Submission & feedback idempotency handling
- [ ] [`phase-05-verification-and-tests.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-26/task-001-feat-mobile-exam-reliability/phase-05-verification-and-tests.md) — Phase 5: Verification, automated testing, and regression suite

---

## Verification

Command: `pnpm --filter sentinel-mobile test`
Outcome: All test files pass cleanly.
