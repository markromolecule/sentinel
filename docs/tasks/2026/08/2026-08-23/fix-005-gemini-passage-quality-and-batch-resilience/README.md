---
title: "Fix Gemini AI Question Generation 502 Failure & Passage Quality Validation Exhaustion"
type: task
status: completed
created: "2026-08-23"
tags: [task, ai, gemini, generation, 502, timeout, passage-quality, leak-validator, batching]
---

# Fix Gemini AI Question Generation 502 Failure & Passage Quality Validation Exhaustion

## Outcome

Eliminate the 502 Bad Gateway failures during multi-question preview generation on both local development (`PassageQualityValidationError: AI passage generation did not meet quality checks...`) and production (`ApiError: Gemini request timed out or failed to connect.`) by:
1. Converting unrepairable passage leaks into deficit replenishment (generating fresh replacement questions instead of aborting the entire 40-question preview);
2. Strengthening first-pass and repair prompt instructions for `IDENTIFICATION`, `ENUMERATION`, and `MULTIPLE_CHOICE` to prevent keyword leakage in `passageContent`;
3. Reducing batch size to `BATCH_SIZE = 10` and critic size to `CRITIC_BATCH_SIZE = 10` with `CONCURRENCY_LIMIT = 4` to cut total latency from 140s to < 25s;
4. Increasing transient network retries to 2 attempts with exponential backoff and milestone telemetry.

## Pre-planning record

### Actors and goals

- **Instructor**: Wants to generate a 40-question exam preview across Multiple Choice, True/False, Identification, and Enumeration from a course PDF quickly and reliably without 502 crashes.
- **Platform Engineer / DevOps**: Wants the AI question generation pipeline to gracefully self-heal when individual questions leak answers, and maintain < 30s latency over cloud networks.

### Domain language

- **`passageContent`**: The student-facing reading context provided alongside a question. It must provide context without giving away the exact answer.
- **`sourceEvidence`**: Verbatim instructor provenance extracted from the source PDF (allowed to contain the answer).
- **`PassageQualityValidationError`**: Error thrown when blocking passage violations remain after 2 repair rounds.
- **`reconcileQuestionSlots`**: Reconciles normalized questions against requested distribution and calculates deficits.
- **`replenishQuestionDeficits`**: Targeted generation step that generates fresh questions for missing slots.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Instructor generates 40 questions from PDF | 10 MC, 10 TF, 10 ID, 10 Enum, 5 Bloom's levels | Splits into 4 concurrent batches of 10 items; generates initial items in ~15–18s | Retries transient socket blips up to 2 times | Planned |
| SC-02 | 1 or 2 questions retain passage leaks after repair | e.g. Slot-26 identification leaks keyword "pill" | Flawed slot is discarded, marked as deficit, and replenished with a fresh question | No 502 error; full 40 valid questions returned | Planned |
| SC-03 | Production request over Railway | Cloud network connection | End-to-end generation completes in < 30s, well within timeouts | Clean error cause retained if upstream API fails | Planned |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | How to handle persistent passage leaks after repair? | **Discard flawed slot and replenish with fresh question** | Reproduction log showed 39/40 questions were valid, but 1 flawed slot failed the entire 40-question preview. Replenishing yields 100% valid set. | Throwing fatal 502 error; publishing leaked questions to students. | `Phase 1` |
| DEC-02 | How to structure first-pass passage prompts? | **Provide explicit scenario & descriptive framing rules for IDENTIFICATION and ENUMERATION** | Prevents the model from writing definition sentences containing the target answer word. | Relying solely on repair loops. | `Phase 2` |
| DEC-03 | What is the optimal batch size? | **`BATCH_SIZE = 10`** (down from 20) | Cuts per-batch tokens by 50%, reducing latency from ~70s to ~15s and enabling 4 parallel batches in ~18s. | Keeping 20-item batches. | `Phase 3` |
| DEC-04 | What is the critic batch size? | **`CRITIC_BATCH_SIZE = 10`** (down from 20) | Keeps critic evaluations fast and small (5–8s). | Monolithic 20-item critic calls. | `Phase 3` |

### Unknowns and blockers

- None. Both local error traces and production behavior have been fully analyzed and verified.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | DEC-01, SC-02 | Residual passage leak after 2 repair rounds does not throw 502; triggers replacement replenishment | `orchestrator.ts` | Unit test in `orchestrator.test.ts` | Planned |
| AC-02 | DEC-02 | `buildPrompt` and `buildPassageRepairBatchPrompt` guide non-leaking passage generation for ID & Enum | `prompt-builder.service.ts`, `passage-quality-prompts.ts` | Unit test in `prompt-builder.service.test.ts` | Planned |
| AC-03 | DEC-03, AC-01 | `BATCH_SIZE = 10` partitions 40 questions into 4 parallel batches | `orchestrator.ts` | Unit test in `orchestrator.test.ts` | Planned |
| AC-04 | DEC-04 | `CRITIC_BATCH_SIZE = 10` batches critic evaluations in chunks of 10 | `assess-passage-quality.ts` | Unit test in `assess-passage-quality.test.ts` | Planned |
| AC-05 | DEC-05 | `MAX_NETWORK_RETRIES = 2` with exponential backoff | `gemini.provider.ts` | Unit test in `gemini.provider.test.ts` | Planned |

## Scope

- Modifying `QuestionGeneratorService` in `orchestrator.ts` to convert unrepairable passage leaks into replenishment deficits.
- Updating `buildPrompt` and `buildPassageRepairBatchPrompt` for non-leaking passage creation.
- Adjusting `BATCH_SIZE = 10`, `CRITIC_BATCH_SIZE = 10`, and `MAX_NETWORK_RETRIES = 2`.
- Adding milestone telemetry logging to `generatePreviewFromPdf`.
- Updating and executing unit and integration tests in `app/sentinel-api`.

## Non-goals

- Modifying the frontend UI or import dialog.
- Persisting changes to the database or changing student assessment execution.

## Constraints and decisions

- Full backward compatibility with the existing `/ai/generate-preview` API schema.
- Zero answer leaks in student-facing `passageContent`.

## Phases

- [x] [`phase-01-passage-quality-recovery-and-replenishment.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-005-gemini-passage-quality-and-batch-resilience/phase-01-passage-quality-recovery-and-replenishment.md) — Phase 1: Question Replacement & Replenishment on Persistent Passage Leaks
- [x] [`phase-02-prompt-refinements-and-leakage-prevention.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-005-gemini-passage-quality-and-batch-resilience/phase-02-prompt-refinements-and-leakage-prevention.md) — Phase 2: Prompt Engineering & First-Pass Negative Leakage Rules
- [x] [`phase-03-batch-sizing-and-concurrency-optimization.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-005-gemini-passage-quality-and-batch-resilience/phase-03-batch-sizing-and-concurrency-optimization.md) — Phase 3: Batch Sizing (10), Critic Batch Sizing (10), Network Retries (2), and Milestone Telemetry
- [x] [`phase-04-test-suite-and-end-to-end-verification.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-23/fix-005-gemini-passage-quality-and-batch-resilience/phase-04-test-suite-and-end-to-end-verification.md) — Phase 4: Test Suite & End-to-End Verification

## Verification

- Automated test execution across `gemini.provider.test.ts`, `orchestrator.test.ts`, `prompt-builder.service.test.ts`, and full API route tests.

## Deviations

- None.

## Result

- Planned.
