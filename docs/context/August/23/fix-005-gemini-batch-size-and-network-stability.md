---
title: "Fix Gemini AI Question Generation 502 Failure & Passage Quality Validation Exhaustion"
type: context
status: ready
created: "2026-08-23"
tags: [context, ai, gemini, generation, 502, timeout, passage-quality, leak-validator, batching, production, local]
feature: "gemini-generation-resilience-and-quality-recovery"
---

# Fix Gemini AI Question Generation 502 Failure & Passage Quality Validation Exhaustion Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  Generating 40 questions (10 Multiple Choice, 10 True/False, 10 Identification, 10 Enumeration across 5 Bloom's levels) from a PDF fails with HTTP 502:
  - **Local Development:** Fails with explicit domain quality exhaustion:
    ```
    Failed to load resource: the server responded with a status of 502 (Bad Gateway)
    AI Generation Error: ApiError: AI passage generation did not meet quality checks. The questions could not be generated without leaking answers.
        at api-client.ts:173:19
        at async useGenerateQuestionsMutation.useMutation [as mutationFn] (use-generate-questions-mutation.ts:42:30)
    ```
  - **Production Environment (`api.sentinelph.tech`):** Fails after **2.4 minutes (144 seconds)** with:
    ```
    POST https://api.sentinelph.tech/ai/generate-preview 502 (Bad Gateway)
    AI Generation Error: ApiError: Gemini request timed out or failed to connect.
    ```

- **Dual-Mechanism Root Cause Analysis:**
  1. **Primary Domain Mechanism: Passage Leakage & Repair Exhaustion (`PassageQualityValidationError`):**
     - When generating 40 questions across complex factual formats (`IDENTIFICATION`, `ENUMERATION`, `MULTIPLE_CHOICE`), the initial generation frequently includes answer keywords inside the student-facing `passageContent`.
     - `assessPassageQuality` runs deterministic checks (`validateGeneratedPassage`) and LLM critic evaluations, detecting `ANSWER_EXACT_MATCH`, `ENUMERATION_LIST_REVEALED`, or `SEMANTIC_LEAK`.
     - `repairInvalidQuestions` attempts to rewrite `passageContent` across up to `MAX_PASSAGE_REPAIR_ROUNDS = 2`.
     - For factual identification or enumeration items, the model often faces a Catch-22: omitting the terms causes the critic to flag `UNANSWERABLE_PASSAGE`, while including them triggers `ANSWER_EXACT_MATCH`. If any slot is omitted in the repair response, it defaults to `EMPTY_PASSAGE` (a blocking violation).
     - When blocking violations remain after 2 rounds, `QuestionGeneratorService` throws `PassageQualityValidationError`, discarding all valid questions and aborting the entire 40-question preview with HTTP 502.
  2. **Secondary Network Mechanism: Monolithic Batch Latency & Undici Socket Timeouts:**
     - `BATCH_SIZE = 20` creates two 20-item batches generating ~6,000–8,000 tokens of structured JSON per request, taking 60–90 seconds each.
     - Sequential critic evaluations (`CRITIC_BATCH_SIZE = 20`) and multiple passage repair loops inflate total execution duration to **140+ seconds (2.4 minutes)**.
     - Over production cloud connections (Railway -> Google Gemini API), 70-second HTTP requests hit Node.js Undici keep-alive socket drops (`TypeError: fetch failed` / `UND_ERR_SOCKET`). Retrying adds another 70 seconds ($70\text{s} + 1.5\text{s} + 70\text{s} = 141.5\text{s}$), exhausting retries and masking the underlying quality error with a connection timeout 502.

- **Business / User Value:**
  - Instructors can reliably generate multi-question previews from lecture PDFs without encountering 502 Bad Gateway errors, quality exhaustion crashes, or multi-minute timeouts.
  - The generation pipeline gracefully recovers from passage leaks by regenerating compromised items rather than crashing the entire batch.

- **Success Criteria:**
  - `QuestionGeneratorService` replaces unrepairable leaked questions with fresh candidates (replenishment) instead of aborting the entire generation.
  - `buildPrompt` and `buildPassageRepairBatchPrompt` provide clear negative-leakage rules and contextual framing techniques for `IDENTIFICATION` and `ENUMERATION`.
  - `BATCH_SIZE` and `CRITIC_BATCH_SIZE` are set to `10` with `CONCURRENCY_LIMIT = 4`, reducing per-batch latency from ~70s to ~15s.
  - `MAX_NETWORK_RETRIES = 2` with exponential backoff handles transient network dropouts.
  - 40-question preview generation from PDF succeeds end-to-end on both local and production environments in < 30 seconds.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As an Instructor on Sentinel*, I want to generate a 40-question assessment containing Multiple Choice, True/False, Identification, and Enumeration from my PDF so that all 40 questions are generated cleanly with high-quality passages that do not leak answers.
- *As a Platform Engineer*, I want the question generation orchestrator to automatically regenerate or replenish any question that cannot pass passage quality checks, ensuring the API always returns valid structured questions without crashing with a 502.

### Functional Requirements

- [ ] **FR-01 (Question Replacement on Unrepairable Passage Leaks):** When a question has persistent blocking passage violations after repair, discard that flawed question and trigger targeted question replenishment to replace it with a fresh question, rather than throwing a fatal `PassageQualityValidationError`.
- [ ] **FR-02 (Prompt Engineering for Identification & Enumeration Passages):** Update `buildPrompt` and `buildPassageRepairBatchPrompt` with specific instructions for writing scenario/context-based passages for `IDENTIFICATION` and `ENUMERATION` (providing descriptive context without explicitly stating the required answer terms).
- [ ] **FR-03 (Batch Size Optimization):** In `QuestionGeneratorService`, reduce `BATCH_SIZE` from 20 to 10 so that 40 questions are partitioned into 4 fast concurrent batches of 10 items.
- [ ] **FR-04 (Critic Batch Size Optimization):** In `assessPassageQuality`, set `CRITIC_BATCH_SIZE = 10` so that critic evaluations run in fast parallel chunks.
- [ ] **FR-05 (Resilient Network Retries & Telemetry):** Configure `MAX_NETWORK_RETRIES = 2` with exponential backoff (`1_000ms`, `2_000ms`) in `GeminiProvider.fetchWithThrottle`, and add pipeline milestone performance timers.

### Edge Cases & Failure Modes

- **Edge Case 1: Identification question passage repeatedly leaks the exact term:**
  - *Behavior:* After repair attempt fails, the slot is marked as a deficit, and a fresh replacement Identification question is generated from a different section of the PDF and validated.
- **Edge Case 2: 40 questions generated with 4 distinct question types:**
  - *Behavior:* Splits into 4 concurrent batches of 10 items, completing initial generation in ~15–18 seconds in parallel.
- **Edge Case 3: Transient network reset during model call:**
  - *Behavior:* Automatically retried with exponential backoff (1s, 2s) and succeeds without exceeding request deadlines.

---

## 3. Technical & Architectural Context

- **Affected Files:**
  - `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts`:
    - Set `BATCH_SIZE = 10`.
    - Handle blocking passage failures by converting failed slots into deficits and invoking replenishment before final response construction.
    - Add pipeline milestone performance logging.
  - `app/sentinel-api/src/lib/gemini/services/question-generator/steps/assess-passage-quality.ts`:
    - Set `CRITIC_BATCH_SIZE = 10`.
  - `app/sentinel-api/src/lib/gemini/services/prompt-builder/prompt-builder.service.ts` & `passage-quality-prompts.ts`:
    - Refine passage instructions for `IDENTIFICATION` and `ENUMERATION`.
  - `app/sentinel-api/src/lib/gemini/gemini.provider.ts`:
    - Set `MAX_NETWORK_RETRIES = 2` with exponential backoff.
  - `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.test.ts` & `gemini.provider.test.ts`:
    - Update and verify test suites.

---

## 4. Scope & Boundaries

- **In Scope:**
  - Question generator orchestration quality recovery (replacing unrepairable leaked questions).
  - Prompt refinements for non-leaking passage creation.
  - Batch size and critic size reductions (`BATCH_SIZE = 10`, `CRITIC_BATCH_SIZE = 10`).
  - Network retry resilience (`MAX_NETWORK_RETRIES = 2`).
  - Unit and integration tests in `sentinel-api`.
- **Out of Scope / Non-Goals:**
  - Modifying the frontend question bank UI or import dialog components.
  - Modifying database schemas or exam player.

---

## 5. Decision Ledger

| Decision ID | Question / Fork | Chosen Option | Rationale & Trade-off |
| :--- | :--- | :--- | :--- |
| **DEC-01** | Handling persistent passage leaks after repair | **Discard flawed slot and replenish with a fresh question** | Prevents failing the entire 40-question preview when 1 or 2 items fail passage repair, guaranteeing a complete set of valid, non-leaking questions. |
| **DEC-02** | Batch size for question generation | **`BATCH_SIZE = 10`** (down from 20) | Reduces per-batch output tokens by 50%, cutting per-call latency from ~70s to ~15s and allowing 4 batches to run concurrently in parallel. |
| **DEC-03** | Critic evaluation batch size | **`CRITIC_BATCH_SIZE = 10`** (down from 20) | Keeps critic payloads small, executing critic checks in 5–8s. |
| **DEC-04** | Transient network retry strategy | **`MAX_NETWORK_RETRIES = 2` (1.0s, 2.0s backoff)** | Recovers from transient socket drops without inflating latency. |

---

## 6. References & External Context

- Context Spec: `docs/context/August/23/fix-004-gemini-generation-resilience-and-diagnostics.md`
- Context Spec: `docs/context/August/23/fix-001-ai-generation-timeout-and-env-config.md`
- Gemini API Structured Output and Thinking Guide
