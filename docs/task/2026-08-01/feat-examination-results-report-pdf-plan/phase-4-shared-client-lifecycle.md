# Phase 4: Shared Client Contracts, Hooks, and Lifecycle UI

### Phase 4: Shared Client Contracts, Hooks, and Lifecycle UI

**Goal:** Provide one tested client contract and reusable presentation for examination-report PDF
creation, polling, retry, download, deletion, and terminal states.

## Prerequisite

- [ ] Confirm Phase 3 API lifecycle tests and a local create-to-download request pass.

## Tasks

- [ ] Add examination-report export request/record/list types and service functions to
      `packages/services/src/api/pdf-documents.ts` targeting the six Phase 3 routes; keep signed URLs
      confined to the download response and do not add storage coordinates to the record type.
- [ ] Extend `packages/services/src/api/pdf-documents.test.ts` for exact create/list/status/retry/
      download/delete paths, JSON bodies, pagination query strings, error propagation, and omission of
      undefined filters.
- [ ] Add examination-report query and mutation keys to
      `packages/shared/src/constants/analytics.ts`, keyed by `examId`, `exportId`, page, and limit so two
      examination pages cannot share lifecycle cache entries.
- [ ] Add and export hooks under `packages/hooks/src/query/pdf-documents/` for
      `use-create-exam-report-export-mutation.ts`, `use-exam-report-exports-query.ts`,
      `use-exam-report-export-status-query.ts`, `use-retry-exam-report-export-mutation.ts`,
      `use-exam-report-export-download-mutation.ts`, and
      `use-delete-exam-report-export-mutation.ts`.
- [ ] In `use-exam-report-export-status-query.ts`, poll only `PENDING`/`GENERATING`, stop on
      `READY`/`FAILED`/`EXPIRED`, honor authenticated/enabled guards, and invalidate the exam-scoped
      export list on terminal transitions without polling when `exportId` is absent.
- [ ] Extend `packages/hooks/src/query/pdf-documents/pdf-documents-hooks.test.ts` for cache-key
      isolation, polling stop rules, create/retry/delete invalidation, disabled queries, and error
      preservation.
- [ ] Add a generic presentational component
      `packages/ui/src/components/pdf-export-lifecycle-panel.tsx` with controlled props for create,
      status, retry, download, delete, disabled/permission copy, and accessible live-region updates;
      add JSDoc to its exported props/component and no API/hook imports.
- [ ] Export the component from `packages/ui/src/index.ts` and add
      `packages/ui/src/components/pdf-export-lifecycle-panel.test.tsx` for all lifecycle states,
      disabled permission state, retry availability only on `FAILED`, expired messaging, keyboard
      operation, and accessible button names.

**Migration required:** No — this phase adds client contracts, TanStack Query hooks, and
presentational UI only.

## Validation

- [ ] Run `pnpm --dir packages/services test -- src/api/pdf-documents.test.ts`.
- [ ] Run `pnpm --dir packages/hooks test -- src/query/pdf-documents/pdf-documents-hooks.test.ts`.
- [ ] Run the `packages/ui` Vitest command for
      `src/components/pdf-export-lifecycle-panel.test.tsx` using the package's existing test script.
- [ ] Run targeted lint/build commands for `packages/shared`, `packages/services`, `packages/hooks`,
      and `packages/ui`.

## Exit criteria

- Web, Core, and Support can consume the same services/hooks and lifecycle presentation.
- Cache entries remain isolated by exam/export and polling stops in every terminal state.
- The component is accessible and contains no domain-specific authorization bypass.
