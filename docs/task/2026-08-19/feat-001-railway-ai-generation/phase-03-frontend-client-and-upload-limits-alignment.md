---
title: "Phase 3: Update API Client Error Handling and Restore 25MB Upload Limits"
type: phase
parent: "feat-001-railway-ai-generation"
phase: "03"
status: completed
created: "2026-08-19"
tags: [task, phase, frontend, upload, api-client]
---

# Phase 3: Update API Client Error Handling and Restore 25MB Upload Limits

## Objective

Update frontend upload limits and validation from the temporary 4.5MB serverless cap back to the full 25MB capacity supported by the Railway backend across `sentinel-web` and `sentinel-core`. Update `packages/services/src/api-client.ts` to provide clear, actionable error messages rather than referencing serverless execution limits.

---

## Dependencies & Prerequisites

- Phase 1 and Phase 2 completed.

---

## Impacted Files & Components

- **`packages/services/src/api-client.ts`**: Update the network/AI error fallback message to remove obsolete references to the 4.5MB serverless payload limit and 60-second execution window.
- **`app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/constants.ts`**: Update `MAX_FILE_SIZE_MB = 25`.
- **`app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_components/upload-tab.tsx`**: Update copy to `"Upload one or more PDF lesson files up to 25MB total."`
- **`app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal/_hooks/constants.ts`**: Update `MAX_FILE_SIZE_MB = 25`.
- **`app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal/_components/upload-tab.tsx`**: Update copy to `"Upload one or more PDF lesson files up to 25MB total."`

---

## Implementation Tasks

- [x] **Task 3.1 (Update ApiClient Error Message):**
  Updated `packages/services/src/api-client.ts` and `api-client.test.ts` to replace obsolete serverless limit text with clean server connectivity messages.
- [x] **Task 3.2 (Update Upload Limits in Sentinel Web):**
  Updated `MAX_FILE_SIZE_MB = 25` in `constants.ts` and dropzone copy to 25MB in `upload-tab.tsx`.
- [x] **Task 3.3 (Update Upload Limits in Sentinel Core):**
  Updated `MAX_FILE_SIZE_MB = 25` in `constants.ts` and dropzone copy to 25MB in `upload-tab.tsx`.

---

## Verification & Testing

- Run unit tests for services:
  ```bash
  pnpm --filter @sentinel/services test
  ```
  *Result: 19 test files passed, 56 tests passed.*

---

## Risks & Rollback

- **Risk:** Inconsistency between web and core dialogs.
- **Mitigation:** Update both applications simultaneously and verify typechecking across the monorepo.
- **Rollback:** Revert changes to constants and dialog copy.
