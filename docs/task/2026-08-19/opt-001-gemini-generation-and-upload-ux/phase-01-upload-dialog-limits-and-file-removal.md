---
title: "Upload Dialog Limits Copy & File Removal Action"
type: phase
parent: "opt-001-gemini-generation-and-upload-ux"
phase: "01"
status: completed
created: "2026-08-19"
tags: [task, phase, frontend, ui, upload]
---

# Phase 01: Upload Dialog Limits Copy & File Removal Action

## Objective

Align all upload dialog copy across `sentinel-web` and `sentinel-core` with Vercel serverless platform constraints (updating "100MB each" to "4.5MB total"), and introduce an interactive per-file remove button in the selected files list so instructors can remove mistakenly selected files without clearing their entire selection.

## Dependencies & Prerequisites

- Context Specification: [`docs/context/August/19/optimize-gemini-generation.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/context/August/19/optimize-gemini-generation.md)
- Master Plan: [`docs/task/2026-08-19/opt-001-gemini-generation-and-upload-ux/README.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/task/2026-08-19/opt-001-gemini-generation-and-upload-ux/README.md)

## Impacted Files & Components

- [`app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_components/upload-tab.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_components/upload-tab.tsx) — Update dropzone copy to 4.5MB and render `Trash2` / `X` button on each file row.
- [`app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/use-file-validator.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/use-file-validator.ts) — Expose `handleRemoveFile(file: File | string | number)` to cleanly remove a file by identity/index.
- [`app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/use-import-handler.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/use-import-handler.ts) — Wire `handleRemoveFile` to `UploadTab`.
- [`app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal.tsx) — Pass `onRemoveFile` prop to `UploadTab`.
- [`app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal/_components/upload-tab.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal/_components/upload-tab.tsx) — Mirror changes in core application.
- [`app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal/_hooks/use-file-validator.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal/_hooks/use-file-validator.ts) — Mirror changes in core application.
- [`app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal/_hooks/use-import-handler.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal/_hooks/use-import-handler.ts) — Mirror changes in core application.
- [`app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal.tsx) — Mirror changes in core application.

## Implementation Tasks

- [x] **Task 1.1:** Add `handleRemoveFile` method in `use-file-validator.ts` in `sentinel-web` and `sentinel-core` that removes the targeted file from `files` state, recalculates total payload size, and displays an informative toast notification.
- [x] **Task 1.2:** Update `UploadTabProps` interface to accept `onRemoveFile?: (file: File) => void` or `(index: number) => void`.
- [x] **Task 1.3:** In `upload-tab.tsx`, update dropzone description from `"Upload one or more PDF lesson files up to 100MB each."` to `"Upload one or more PDF lesson files up to 4.5MB total."`
- [x] **Task 1.4:** In `upload-tab.tsx`, add a trash/remove icon button (`Trash2` or `X`) with hover feedback (`hover:text-destructive hover:bg-destructive/10`) to the right of each file row in the selected files list.
- [x] **Task 1.5:** Connect `handleRemoveFile` through `use-import-handler.ts` and `import-modal.tsx` down to `UploadTab`.
- [x] **Task 1.6:** Verify consistent behavior across both `sentinel-web` and `sentinel-core`.

## Verification & Testing

- Run unit and component tests:
  ```bash
  pnpm --filter sentinel-web test src/app/\(protected\)/\(instructor\)/question/bank/_components/dialogs/import-modal/
  pnpm --filter sentinel-core test src/app/\(protected\)/question/bank/_components/dialogs/import-modal/
  ```
- **Verified Results:**
  - `sentinel-web` import modal tests: 2 passed, 8 tests passed.
  - `sentinel-core` import modal tests: 2 passed, 8 tests passed.
  - Removing individual files and 4.5MB limit validations verified in automated test suite.

## Risks & Rollback

- **Risk:** Removing all files must not crash Step 2 transitions.
- **Mitigation:** Continue button is disabled when `files.length === 0`.
- **Rollback:** Revert UI changes using Git without affecting backend routes.
