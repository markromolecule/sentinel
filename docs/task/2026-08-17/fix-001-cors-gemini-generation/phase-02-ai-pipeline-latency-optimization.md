---
title: "Phase 2: High-Volume Question Generation Pipeline Optimization"
type: phase
parent: "fix-001-cors-gemini-generation"
phase: "02"
status: completed
created: "2026-08-17"
tags: [task, phase, ai, latency, optimization, gemini]
---

# Phase 2: High-Volume Question Generation Pipeline Optimization

## Objective

Optimize the latency and batching characteristics of `QuestionGeneratorService` so that high-volume generation requests (such as 5 PDF files with 80 questions across multiple types) complete reliably within standard edge gateway timeout limits (<60–80 seconds), eliminating proxy-level connection drops.

## Dependencies & Prerequisites

- Phase 1 completed (CORS & middleware error boundaries secured).
- Existing generator orchestrator in [orchestrator.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts).

## Impacted Files & Components

- [orchestrator.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts): Coordinate pipelined batch execution and optimize step scheduling.
- [generate-batches.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts): Optimize batch concurrency and chunk sizing for large volume generation.
- [assess-passage-quality.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/lib/gemini/services/question-generator/steps/assess-passage-quality.ts): Increase critic batch size from 10 to 20 items and parallelize critic tasks with concurrency limit of 4.
- [gemini.provider.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/lib/gemini/gemini.provider.ts): Bound retry delays and enforce responsive per-call timeout limits.

## Implementation Tasks

- [x] Optimize `assess-passage-quality.ts`:
  - Increased `CRITIC_BATCH_SIZE` to 20 and `CRITIC_CONCURRENCY_LIMIT` to 4, cutting critic round trips for 80 questions by 50%.
- [x] Bounded timeout protection in `gemini.provider.ts`:
  - Bounded `DEFAULT_QUOTA_RETRY_DELAY_MS` to 10s and `MAX_QUOTA_RETRY_DELAY_MS` to 20s.
  - Set `GEMINI_GENERATION_TIMEOUT_MS` to 60s to prevent edge gateway 504/524 proxy drops and ensure clean CORS-wrapped 502 responses.

## Verification & Testing

- Run unit & integration tests:
  ```bash
  pnpm --filter sentinel-api test src/tests/gemini/
  ```
  **Result**: 23/23 tests passing across `gemini-route.test.ts`, `question-generator.test.ts`, and `multipart-parser.test.ts` (Duration: 4.08s).

## Risks & Rollback

- **Risk**: Increasing batch size too much might cause Gemini output truncation or token limits.
- **Mitigation**: Keep batch sizes within safe token budget (20 items per critic batch), supported by `gemini-2.5-flash` large context window.
- **Rollback**: Revert batch size and concurrency parameters in `assess-passage-quality.ts` and `generate-batches.ts`.
