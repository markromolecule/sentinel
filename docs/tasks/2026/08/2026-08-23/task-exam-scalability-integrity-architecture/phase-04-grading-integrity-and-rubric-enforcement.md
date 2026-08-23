---
title: "Phase 4: Scoring Engine Integrity, Rubric Binding & Baseline Preservation"
type: phase
parent: "task-exam-scalability-integrity-architecture"
phase: "4"
status: completed
created: "2026-08-23"
tags: [task, phase, grading, scoring, rubrics, baseline, integrity]
---

# Phase 4: Scoring Engine Integrity, Rubric Binding & Baseline Preservation

## Objective

Guarantee absolute scoring integrity, mathematical correctness, and tamper-resistance in the grading engine. Ensure that autograded baseline scores (`initial_score`) are preserved write-once, essay evaluations strictly adhere to captured rubric criteria snapshots, and answer checksums prevent tampering.

---

## Dependencies & Prerequisites

- Existing grading module in `app/sentinel-api/src/modules/examination/grading/`.
- Score snapshot services in `app/sentinel-api/src/modules/examination/flow/services/attempt-snapshot.service.ts`.
- Observability service in `app/sentinel-api/src/modules/examination/shared/services/score-integrity-observability.service.ts`.

---

## Impacted Files & Components

- [`app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.service.ts): Main grading evaluator and snapshot generator.
- [`app/sentinel-api/src/modules/examination/flow/services/attempt-snapshot.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/flow/services/attempt-snapshot.service.ts): Scoring snapshot builder and checksum verifier.
- [`app/sentinel-api/src/modules/examination/shared/services/score-integrity-observability.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/shared/services/score-integrity-observability.service.ts): Score audit logger.
- [`app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.test.ts): Grading test suite.

---

## Implementation Tasks

- [x] **Task 4.1 (Enforce Write-Once Baseline Preservation):** Verified that [`updateGradingAttempt`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.service.ts#L286-L291) preserves `initial_score` write-once upon the first instructor save, never overwriting historical pre-override values.
- [x] **Task 4.2 (Strict Rubric Snapshot Criteria Validation):** Verified that [`assertEvaluationMatchesRubric`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.service.ts#L76-L107) strictly rejects unknown criteria keys and out-of-bounds rating values ($<0$ or $>4$).
- [x] **Task 4.3 (Answer Checksum Verification):** Verified that [`buildAnswerPayloadChecksum`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/flow/services/attempt-snapshot.service.ts#L13) is bound to every score snapshot generated during grading to guarantee answer integrity.
- [x] **Task 4.4 (Score Integrity Test Suite):** Added comprehensive unit test cases in [`update-grading-attempt.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/grading/services/update-grading-attempt.test.ts) covering baseline preservation, point cap boundaries, and rubric validation.

---

## Verification & Testing

```bash
# Run grading and scoring integrity tests
pnpm --filter sentinel-api test src/modules/examination/grading
# PASS: 8/8 test files passed, 38/38 tests passed
```

---

## Risks & Rollback

- **Risk:** Backward compatibility with legacy exam attempts without rubric snapshots.
- **Mitigation:** Fall back to default question point scaling if rubric snapshot is null.
- **Rollback:** Preserve current score snapshot builder fallback logic.
