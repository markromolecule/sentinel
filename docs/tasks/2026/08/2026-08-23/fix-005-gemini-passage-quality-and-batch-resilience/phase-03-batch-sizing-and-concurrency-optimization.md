---
title: "Phase 3: Batch Sizing (10), Critic Batch Sizing (10), Network Retries (2), and Milestone Telemetry"
type: phase
parent: "fix-005-gemini-passage-quality-and-batch-resilience"
phase: "3"
status: completed
created: "2026-08-23"
tags: [task, phase, ai, gemini, batching, performance, telemetry, resilience]
---

# Phase 3: Batch Sizing (10), Critic Batch Sizing (10), Network Retries (2), and Milestone Telemetry

## Objective

Optimize throughput, slash request duration by ~60–75%, and guarantee cloud network resilience by:
1. Setting `BATCH_SIZE = 10` in `QuestionGeneratorService`;
2. Setting `CRITIC_BATCH_SIZE = 10` in `assessPassageQuality`;
3. Configuring `MAX_NETWORK_RETRIES = 2` with exponential backoff in `GeminiProvider.fetchWithThrottle`;
4. Adding structured milestone performance telemetry across all generator pipeline stages.

## Dependencies & Prerequisites

- Phase 1 & Phase 2

## Impacted Files & Components

- `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts`:
  - Change `BATCH_SIZE = 10` (down from 20).
  - Add performance timers and milestone logging (`[generatePreviewFromPdf]` milestone timing for upload, batch generation, reconciliation, critic, repair, and response formatting).
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/assess-passage-quality.ts`:
  - Change `CRITIC_BATCH_SIZE = 10` (down from 20).
- `app/sentinel-api/src/lib/gemini/gemini.provider.ts`:
  - Set `MAX_NETWORK_RETRIES = 2`.
  - Use exponential backoff for transient retries (`attempt === 0 ? 1000 : 2000`).

## Implementation Tasks

- [x] **Task 3.1:** Update `BATCH_SIZE = 10` in `orchestrator.ts`.
- [x] **Task 3.2:** Update `CRITIC_BATCH_SIZE = 10` in `assess-passage-quality.ts`.
- [x] **Task 3.3:** Update `MAX_NETWORK_RETRIES = 2` and exponential backoff in `gemini.provider.ts`.
- [x] **Task 3.4:** Add structured milestone telemetry in `orchestrator.ts`.

## Verification & Testing

- `pnpm --dir app/sentinel-api test gemini.provider.test.ts orchestrator.test.ts` (PASS: 18/18 tests)

## Risks & Rollback

- **Risk:** More batches may exceed concurrency limits.
- **Mitigation:** `runWithConcurrencyLimit` uses `concurrencyLimit = 4` and `aiRequestThrottler` schedules with `maxConcurrent = 5`.

