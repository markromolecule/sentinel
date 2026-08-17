---
title: "Phase 3: Client Resilience, Diagnostics & Automated Verification"
type: phase
parent: "fix-001-cors-gemini-generation"
phase: "03"
status: completed
created: "2026-08-17"
tags: [task, phase, frontend, api-client, tests]
---

# Phase 3: Client Resilience, Diagnostics & Automated Verification

## Objective

Enhance client-side error handling in `sentinel-web` and `sentinel-core` so that network drops, timeouts, or unexpected server failures surface clear, actionable messages to instructors rather than generic unhandled `TypeError: Failed to fetch` errors, and run end-to-end verification.

## Dependencies & Prerequisites

- Phase 1 & Phase 2 completed.

## Impacted Files & Components

- [api-client.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/services/src/api-client.ts): Catch low-level fetch failures (`TypeError: Failed to fetch` / network disconnects) and transform them into readable `ApiError` instances with helpful contextual guidance.
- [use-generate-questions-mutation.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/query/use-generate-questions-mutation.ts): Improve mutation error handling and toast feedback when question generation fails.
- [use-generate-questions-mutation.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal/_hooks/query/use-generate-questions-mutation.ts): Apply identical resilience improvements in `sentinel-core`.

## Implementation Tasks

- [x] In `packages/services/src/api-client.ts`:
  - Wrapped raw `fetch` in try/catch and translated `TypeError: Failed to fetch` to an `ApiError` with clear guidance.
- [x] In `sentinel-web` and `sentinel-core` `use-generate-questions-mutation.ts`:
  - Ensured mutation checks `response.error || response.message || 'Failed to generate questions'` and throws formatted errors cleanly.
- [x] Ran automated verification:
  ```bash
  pnpm --filter @sentinel/services test
  pnpm --filter sentinel-api test src/lib/gemini/ src/tests/cors.test.ts src/tests/gemini/
  ```

## Verification & Testing

- Automated:
  - `@sentinel/services`: 19/19 test files passed (55 tests) including `api-client.test.ts` network error handling.
  - `sentinel-api`: 18/18 Gemini/CORS test files passed (102 tests) including `cors.test.ts` (9/9) and question generator pipeline (23/23).
- Manual / UI Check:
  - Test question generation with 5 PDF files and 80 questions in local development.
  - Confirm that preflight succeeds and question preview is populated smoothly without console CORS errors.

## Risks & Rollback

- **Risk**: Altering `apiClient` error wrapping could affect existing error handlers expecting raw `TypeError`.
- **Mitigation**: `ApiError` extends `Error` and provides `message`, `status`, and `statusText` fields compatible with existing callers.
- **Rollback**: Revert changes in `packages/services/src/api-client.ts`.
