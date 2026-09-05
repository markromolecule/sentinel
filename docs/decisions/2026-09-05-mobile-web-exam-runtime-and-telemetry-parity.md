---
title: "ADR: Mobile and Web Exam Runtime, Question Engine, and Telemetry Parity"
type: decision
status: proposed
created: "2026-09-05"
tags: [adr, mobile, exam-runtime, mediapipe, telemetry, question-engine]
---

# ADR: Mobile and Web Exam Runtime, Question Engine, and Telemetry Parity

## Context & Problem Statement

`sentinel-web` and `sentinel-mobile` serve as the dual client runtime surfaces for students taking proctored assessments. Discrepancies have emerged between the two implementations:

1. **MediaPipe Activation Disparity:** On `sentinel-web`, `resolveStudentExamMediaPipeSandbox` dynamically enables `mediaPipeSandbox` whenever `configuration.cameraRequired` and AI rules (`gaze_tracking`, `face_detection`, `multiple_faces_detection`) are configured. On `sentinel-mobile`, the client only inspected the raw `exam.mediaPipeSandbox` property. For typical instructor-configured exams without custom developer debug overrides, `exam.mediaPipeSandbox` is undefined, causing `sentinel-mobile` to bypass camera calibration in `use-exam-checkup.ts`, fall back to a non-functional 1x1 `<CameraView>`, and fail to run `useMobileMediaPipeMonitoring.ts`.
2. **Question Engine Presentation & State Handling:**
   - On web, all 8 question types render rich option indices (`A.`, `B.`, `C.`), question point weights, and validated input layouts.
   - On mobile, options lacked letter prefixes; point indicators were absent; True/False boolean values (`true`/`false`) suffered from coercion issues in `QuestionCard`; and empty arrays/objects or boolean values produced inaccurate answered-state indications in `QuestionDrawer`.
   - On mobile, question order was unconditionally sorted by `orderIndex`, defeating exam shuffle configurations (`shuffleQuestions`).

## Options Considered

### Option 1: Ad-Hoc Component-Level Fixes
- Manually replicate AI rule checks in each mobile screen (`checkup/index.tsx`, `use-exam-session.ts`, `exam-session-screen.tsx`).
- **Trade-offs:** High probability of drift between web and mobile; duplicate logic violates DRY and SOLID principles.

### Option 2: Unified Mobile Adapter Resolution with Standardized Shared Contracts (Recommended)
- Extend `adaptExamForMobile` in `mobile-exam-adapter.ts` to implement deterministic sandbox resolution mirroring web (`resolveStudentExamMediaPipeSandbox`), guaranteeing that whenever an exam specifies AI rules, `mediaPipeSandbox` is fully resolved (`enabled: true`, `captureDuringCheckup: true`, `emitDuringExam: true`, `calibrationRequired: true`).
- Export and utilize a robust, shared `isQuestionAnswered` predicate across `use-exam-session.ts`, `question-card.tsx`, and `question-drawer.tsx`.
- Enrich `QuestionCard` with option letter badges (`A.`, `B.`, `C.`), point badges, and type-safe boolean/array/object value handling.
- Honor `shuffleQuestions` when adapting questions for mobile.
- **Trade-offs:** Requires targeted updates to adapter functions and component presentation layers, but guarantees full functional and aesthetic parity without backend schema changes.

### Option 3: Backend-Enforced Transformation
- Require `sentinel-api` to pre-calculate and inject `mediaPipeSandbox` and formatted question structures directly on the `GET /exams/:id` response.
- **Trade-offs:** Requires breaking backend API schema changes and migrations; tightly couples the API DTOs to client-specific UI requirements.

## Decision

We adopt **Option 2: Unified Mobile Adapter Resolution with Standardized Shared Contracts**.

1. **MediaPipe Lifecycle Contract:**
   - `adaptExamForMobile` dynamically resolves `mediaPipeSandbox` based on `exam.configuration.cameraRequired` and `exam.configuration.aiRules`.
   - `use-exam-checkup.ts` strictly enforces calibration when AI rules are active.
   - `exam-session-screen.tsx` mounts `MobileMediaPipeBridge` whenever camera/AI monitoring is enabled.
2. **Question Engine Contract:**
   - Add letter indicators (`A.`, `B.`, etc.) to `MULTIPLE_CHOICE` and `MULTIPLE_RESPONSE`.
   - Add point badges in `QuestionCard`.
   - Standardize answer truthiness via `isQuestionAnswered` across all session hooks and navigator components.
   - Guard question order against sorting when `shuffleQuestions` is enabled.
3. **Telemetry & Security Defense:**
   - Validate and maintain the multi-layer hardware blocking (`FLAG_SECURE`) and `SCREENSHOT_ATTEMPT` event flow.
   - Maintain the 2000ms suppression window between screenshot and `APP_PINNING_VIOLATION` to prevent gesture false-positives.

## Consequences

- **Positive:** Full parity between `sentinel-web` and `sentinel-mobile`; accurate proctoring incident detection; consistent and polished student user experience; zero backend schema alterations needed.
- **Negative / Risks:** Mobile devices with weaker hardware must handle MediaPipe WASM in the WebView; managed by `frameIntervalMs` throttling (default 500ms-1000ms).

## Validation and Review Date

- Validation via automated Vitest suite in `sentinel-mobile` and manual simulator testing.
- Review date: 2026-09-12.
