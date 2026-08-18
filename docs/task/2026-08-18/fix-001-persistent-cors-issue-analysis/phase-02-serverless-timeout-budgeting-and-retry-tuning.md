---
title: "Phase 2: Serverless Timeout Budgeting & Retry Tuning"
type: phase
parent: "docs/task/2026-08-18/fix-001-persistent-cors-issue-analysis/README.md"
phase: "02"
status: completed
created: "2026-08-18"
tags: [task, phase, cors, gemini, timeout, serverless]
---

# Phase 2: Serverless Timeout Budgeting & Retry Tuning

## Objective

Ensure Gemini question generation operations complete safely within Vercel Free Plan's 60-second serverless execution ceiling by optimizing quota retry delays, reducing upstream call timeouts, and implementing an internal execution budget guard in `QuestionGeneratorService`.

## Dependencies & Prerequisites

- Phase 1 completed or executed in parallel.

## Impacted Files & Components

- `app/sentinel-api/src/lib/gemini/gemini.provider.ts` — Tighten quota backoffs and upstream request timeout signal.
- `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts` — Add internal execution timeout budget check (<48s) before secondary repair/replenishment loops.
- `app/sentinel-api/vercel.json` — Ensure `maxDuration: 60` and `memory: 1024` configuration.

## Implementation Tasks

- [x] In `gemini.provider.ts`:
  - Reduce `DEFAULT_QUOTA_RETRY_DELAY_MS` from `10_000` to `2_000`.
  - Reduce `MAX_QUOTA_RETRY_DELAY_MS` from `20_000` to `3_000`.
  - Reduce `GEMINI_GENERATION_TIMEOUT_MS` from `120_000` to `35_000`.
- [x] In `orchestrator.ts`:
  - Track start timestamp `const startTime = Date.now()`.
  - Define `const SERVERLESS_EXECUTION_BUDGET_MS = 48_000`.
  - Before initiating secondary replenishment or repair rounds, check `if (Date.now() - startTime > SERVERLESS_EXECUTION_BUDGET_MS)`. If exceeded, gracefully proceed with the best available questions rather than risking a Vercel 504 edge kill.

## Verification & Testing

- Run Gemini test suite:
  ```bash
  pnpm --filter sentinel-api test src/lib/gemini/ src/tests/gemini/
  ```

## Risks & Rollback

- **Low Risk**: Reduces latency and avoids edge timeouts. If upstream Gemini API is completely down, fails fast in 35s instead of hanging 120s.
- **Rollback**: Revert `gemini.provider.ts` and `orchestrator.ts`.

