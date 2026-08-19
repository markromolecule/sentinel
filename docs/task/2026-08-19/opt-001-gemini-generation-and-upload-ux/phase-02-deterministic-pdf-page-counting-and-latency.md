---
title: "Deterministic PDF Page Counting & Pipeline Latency Optimization"
type: phase
parent: "opt-001-gemini-generation-and-upload-ux"
phase: "02"
status: completed
created: "2026-08-19"
tags: [task, phase, backend, gemini, latency, pdf]
---

# Phase 02: Deterministic PDF Page Counting & Pipeline Latency Optimization

## Objective

Eliminate redundant upstream Gemini LLM calls during question generation by replacing LLM-based PDF page counting with deterministic in-memory buffer page count extraction in Node.js (<1ms duration), streamlining prompt sizes, and tuning model parameters for maximum speed and stability.

## Dependencies & Prerequisites

- Phase 01: [`phase-01-upload-dialog-limits-and-file-removal.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-19/opt-001-gemini-generation-and-upload-ux/phase-01-upload-dialog-limits-and-file-removal.md)
- Context Specification: [`docs/context/August/19/optimize-gemini-generation.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/19/optimize-gemini-generation.md)

## Impacted Files & Components

- [`app/sentinel-api/src/lib/gemini/services/question-generator/steps/resolve-page-counts.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/lib/gemini/services/question-generator/steps/resolve-page-counts.ts) — Replace Gemini LLM call with deterministic buffer page counting.
- [`app/sentinel-api/src/lib/gemini/services/question-generator/steps/steps.test.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/lib/gemini/services/question-generator/steps/steps.test.ts) — Update step unit tests.
- [`app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts) — Remove unnecessary `Promise.allSettled` LLM competition for page counts.
- [`app/sentinel-api/src/lib/gemini/gemini.provider.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/lib/gemini/gemini.provider.ts) — Verify fallback model resolution and timeout bounds.

## Implementation Tasks

- [x] **Task 2.1:** Implement a fast, deterministic PDF page count extractor in `resolve-page-counts.ts` that inspects the in-memory PDF `ArrayBuffer` / `Buffer` for page objects (`/Type /Page` markers and `/Count` headers) without calling Gemini LLM.
- [x] **Task 2.2:** Fall back gracefully to `1` or cited question page numbers if binary parsing encounters an encrypted or unconventional PDF structure, ensuring zero thrown exceptions.
- [x] **Task 2.3:** Update `orchestrator.ts` to execute deterministic page counting directly and synchronously/locally, avoiding an extra parallel LLM request that consumes connection pool slots and upstream tokens.
- [x] **Task 2.4:** Update `steps.test.ts` and `orchestrator.test.ts` to assert that deterministic page counts resolve without mocking or requiring `provider.generateStructuredJson`.

## Verification & Testing

- Run API and Gemini step tests:
  ```bash
  pnpm --filter sentinel-api test src/lib/gemini/services/question-generator/
  ```
- **Verified Results:**
  - `src/lib/gemini/services/question-generator/steps/steps.test.ts` (7 tests) passed.
  - `src/lib/gemini/services/question-generator/orchestrator.test.ts` (3 tests) passed.
  - Page count extraction resolves in `<1ms` in memory without any LLM network overhead.

## Risks & Rollback

- **Risk:** Malformed PDF binary might have missing standard markers.
- **Mitigation:** The implementation incorporates multiple fallback strategies (`/Type\s*\/Page\b`, `/Count\s+(\d+)`, and question citations) with a safe default of `1`.
- **Rollback:** Revert `resolve-page-counts.ts` to the previous LLM implementation if edge cases require it.
