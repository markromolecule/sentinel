---
title: "Phase 1: Client-Side Payload & Network Resilience"
type: phase
parent: "docs/task/2026-08-18/fix-001-persistent-cors-issue-analysis/README.md"
phase: "01"
status: completed
created: "2026-08-18"
tags: [task, phase, cors, client, payload-validation]
---

# Phase 1: Client-Side Payload & Network Resilience

## Objective

Prevent Vercel Edge 4.5MB request body drops by enforcing client-side aggregate file size validation in `sentinel-web` and `sentinel-core` and enhancing `apiClient` error translation for cross-origin serverless failures.

## Dependencies & Prerequisites

- Resolved discovery confirming Vercel Free (Hobby) Plan with 4.5MB request body limit.

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/use-file-validator.ts` — Add aggregate payload size validation (<4.2MB safe limit).
- `app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal/_hooks/use-file-validator.ts` — Add aggregate payload size validation (<4.2MB safe limit).
- `packages/services/src/api-client.ts` — Provide precise diagnostic messages when network/CORS failure occurs.

## Implementation Tasks

- [x] Add `MAX_AGGREGATE_FILE_SIZE_BYTES = 4.2 * 1024 * 1024` (4.2MB) check in `use-file-validator.ts` for both `sentinel-web` and `sentinel-core`.
- [x] Display an immediate user toast error when combined PDF size exceeds 4.2MB: *"Combined PDF file size (X MB) exceeds the 4.2MB upload limit for serverless processing. Please upload smaller files or separate them into smaller batches."*
- [x] Update `api-client.ts` network error catcher to surface actionable guidance for edge timeouts and payload limits.

## Verification & Testing

- Automated test run for `@sentinel/services`:
  ```bash
  pnpm --filter @sentinel/services test
  ```
- Manual validation: attempting to upload files totaling >4.5MB triggers the client-side toast before network dispatch.

## Risks & Rollback

- **Low Risk**: Purely client-side preflight validation; prevents broken network calls from being dispatched to the serverless edge.
- **Rollback**: Revert `use-file-validator.ts` and `api-client.ts`.

