# Phase 2: Lifecycle Authorization and Shared Clients

### Phase 2: Lifecycle Authorization and Shared Clients

**Goal:** Apply the dedicated answer-key permission and resource scope uniformly to every lifecycle
operation, then expose a frontend-ready service/hook contract that derives institution ownership on
the server.

## Prerequisite

- [ ] Confirm Phase 1 source mapping and selected-exam preview tests/visual checks pass.

## Tasks

- [ ] Change `createAnswerKeyExportBodySchema` in
      `app/sentinel-api/src/modules/general/pdf-documents/pdf-documents.dto.ts` and
      `CreateAnswerKeyExportBody` in `packages/services/src/api/pdf-documents.ts` so `institution_id` is
      optional; preserve current payload compatibility.
- [ ] Refactor
      `app/sentinel-api/src/modules/general/pdf-documents/controllers/answer-keys/post-create-answer-key-export.controller.ts`
      to load the exam first, derive its institution, reject a supplied mismatched institution, enforce
      accessible institution plus examination read/assignment scope, and snapshot the resolved
      `EXAM_ANSWER_KEY` template.
- [ ] Replace generic template/report permission alternatives with
      `examinations:export_answer_key` in all answer-key list, status, retry, download, and delete
      controllers under
      `app/sentinel-api/src/modules/general/pdf-documents/controllers/answer-keys/`; enforce scope after
      loading the target record and return the repository-standard non-leaking response for guessed IDs.
- [ ] In the list controller, derive the allowed institution/exam predicate from actor context even
      when query filters are absent; do not let a null context list all tenants unless the actor has the
      established cross-tenant permission and answer-key permission.
- [ ] In retry, require `FAILED`; in download, require `READY`, storage coordinates, and non-expiry;
      in delete, remove only the record's private object before deleting metadata. Add explicit
      lifecycle errors rather than accepting invalid transitions.
- [ ] Remove raw `storageBucket`/`storagePath` from `answerKeyExportRecordSchema` in
      `pdf-documents.dto.ts` and `ExamAnswerKeyExportRecord` in
      `packages/services/src/api/pdf-documents.ts`; storage coordinates remain server-internal and the
      download endpoint returns only a short-lived signed URL.
- [ ] Add/extend a colocated test for each answer-key controller covering dedicated permission,
      revoked permission, assigned/unassigned instructor, admin institution, parent/branch, wrong exam,
      guessed ID, valid/invalid status transition, and private download/delete.
- [ ] Extend
      `app/sentinel-api/src/modules/general/pdf-documents/tests/pdf-document-scope-authorization.test.ts`
      and `pdf-document-api.integration.test.ts` to prove a user with only `reports:*` or
      `pdf_templates:*` cannot list/status/retry/download/delete answer keys.
- [ ] Add `examinations:export_answer_key` to superadmin, admin, and instructor defaults (Support
      already has it) in `packages/shared/src/constants/permissions.ts`; keep student roles excluded.
- [ ] Extend
      `app/sentinel-api/src/modules/security/permission/data/sync-system-permissions.test.ts` to prove
      default-role membership, custom-role grant/revoke behavior, and Role Matrix catalog visibility.
- [ ] Update answer-key service tests in `packages/services/src/api/pdf-documents.test.ts` for the
      exam-only create payload and public record without storage coordinates.
- [ ] Update `useCreateAnswerKeyExportMutation()` and answer-key query invalidation in
      `packages/hooks/src/query/pdf-documents/` so institution is optional and exam-scoped keys remain
      stable; extend `pdf-documents-hooks.test.ts` for create, polling terminal states, retry/delete
      invalidation, and two-exam cache isolation.
- [ ] Update
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/answer-key-exports-panel.tsx`
      and `examinations/page.tsx` so list/download/retry/delete controls use
      `canExportAnswerKey`, not generic template view/manage permission; keep template save/publish
      controlled separately by `pdf_templates:manage`.
- [ ] Expand Support component/page tests for a template manager without answer-key permission, an
      answer-key exporter without template-manage permission, revoke/403 behavior, and lifecycle errors.

**Migration required:** No — role mappings are synchronized from the existing permission catalog
and all export lifecycle fields already exist.

## Validation

- [ ] Run focused answer-key controller, scope integration, and API integration tests in
      `app/sentinel-api`.
- [ ] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/security/permission/data/sync-system-permissions.test.ts`.
- [ ] Run focused `packages/services`, `packages/hooks`, and Support answer-key panel/page tests.
- [ ] Run targeted lint/build validation for API, shared, services, hooks, and Support.

## Exit criteria

- One dedicated permission plus resource scope protects every answer-key operation.
- Core/Web clients can create by `exam_id` without receiving/trusting institution ownership data.
- Generic report/template permissions no longer grant answer-key artifact access.
- Support template management remains separate from correct-answer export authority.
