---
title: "Phase 2: Pipeline Concurrency & Throughput Tuning"
type: phase
parent: "fix-002-vercel-serverless-timeout-ai-generation"
phase: "02"
status: completed
created: "2026-08-17"
tags: [task, phase, ai, concurrency, optimization]
---

# Phase 2: Pipeline Concurrency & Throughput Tuning

## Objective

Set `CONCURRENCY_LIMIT = 4` in `generate-batches.ts` so that generation batches of 20 items execute in parallel without queue delays, reducing wall-clock generation time for 30–50+ questions from ~40s to ~18–25s.

## Dependencies & Prerequisites

- Phase 1 completed.

## Impacted Files & Components

- [generate-batches.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts): Set `CONCURRENCY_LIMIT = 4`.

## Implementation Tasks

- [x] In `app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts`, set `const CONCURRENCY_LIMIT = 4;`.
- [x] Ensured all batches run concurrently while respecting `runWithConcurrencyLimit`.

## Verification & Testing

- Run test suites:
  ```bash
  pnpm --filter sentinel-api test src/lib/gemini/ src/tests/gemini/
  ```
  **Result**: 17/17 test files passed (93 tests). All batch execution, deficit replenishment, and orchestrator pipelines verified.

## Risks & Rollback

- **Risk**: Exceeding upstream rate limits if too many concurrent requests are sent.
- **Mitigation**: Upstream rate throttler in `aiRequestThrottler` schedules requests smoothly.
- **Rollback**: Revert `CONCURRENCY_LIMIT` back to 3.
