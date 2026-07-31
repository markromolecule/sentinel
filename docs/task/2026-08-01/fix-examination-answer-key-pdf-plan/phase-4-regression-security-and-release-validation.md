# Phase 4: Regression, Security, and Release Validation

### Phase 4: Regression, Security, and Release Validation

**Goal:** Prove canonical answer-key generation is correct for every supported question type,
private across all access paths, visually stable, and operationally safe before release.

## Prerequisite

- [ ] Confirm Phase 3 Core/Web replacements pass and duplicate renderer searches return no callers.

## Tasks

- [ ] Expand
      `app/sentinel-api/src/modules/general/pdf-documents/rendering/tests/exam-answer-key-renderer.test.ts`
      with one current-shape case for each supported product type, long passages, long options, Unicode,
      empty optional essay guidance, and multiple pages; extract text to assert each correct answer is
      present exactly where expected.
- [ ] Create
      `app/sentinel-api/src/modules/general/pdf-documents/data/answer-keys/answer-key-source-to-renderer.integration.test.ts`
      so current DB-shaped `content` flows through normalization and renderer without manually
      constructing the intermediate view model.
- [ ] Add regression assertions that `passage_content` is used, `source_evidence` is not substituted,
      deterministic option IDs/output do not use `Math.random()`, malformed/unsupported content fails
      safely, and error/log messages contain no answer text.
- [ ] Extend
      `app/sentinel-api/src/modules/general/pdf-documents/tests/pdf-document-api.integration.test.ts`
      for create-to-ready-to-download with current mixed-question content, template snapshot/branding,
      retry, delete, and no public object URL.
- [ ] Extend
      `app/sentinel-api/src/modules/general/pdf-documents/tests/pdf-document-scope-authorization.test.ts`
      with Support, superadmin, admin, assigned instructor, unassigned instructor, custom granted role,
      revoked role, student, wrong institution, parent/branch, guessed export ID, and expired signed URL
      scenarios.
- [ ] Add a schema/response regression test proving ordinary exam detail, student exam, and preview
      endpoints outside `/pdf-documents/answer-keys` do not return `correctAnswer`, `acceptedAnswers`,
      `blanks`, `pairs`, or rubric answer guidance to unauthorized/student clients.
- [ ] Update `docs/operations/pdf-generation.md` only where necessary to describe canonical
      Core/Web entry points, selected-exam preview diagnosis, dedicated permission checks, current-shape
      mapping failures, private download/retry/delete investigation, and the removal of the browser
      print renderer.
- [ ] Generate PDFs for a small all-types exam and a large mixed-question exam; record render time,
      queue wait, byte size, page count, and peak worker memory using the existing operations checklist.
- [ ] Visually inspect selected-exam Support preview and completed exports from Support, Core, and
      Web for identical selected content/template output, passage safety, correct answers, page breaks,
      branding, headers, footers, page numbers, and clipping.
- [ ] Run `pnpm format:check`, all focused Phase 1–3 suites, then `pnpm lint`, `pnpm test`, and
      `pnpm build`; record unrelated pre-existing failures separately and resolve every feature-specific
      failure before marking complete.

**Migration required:** No — this phase is test, security, operations, and release verification.

## Validation

- [ ] Run the answer-key source, source-to-renderer, renderer, API integration, and scope
      authorization tests named above in `app/sentinel-api`.
- [ ] Run focused Support, Web, Core, services, hooks, shared, and UI tests from Phases 1–3.
- [ ] Complete the performance, security-matrix, and visual inspections above and attach evidence to
      the implementation execution note.

## Release gate

- [ ] Deploy the API authorization/source fix before or with Support/Core/Web so clients never send
      selected preview/export traffic to the fixture-only or weakly protected behavior.
- [ ] Confirm permission synchronization has applied updated default blueprints and that Role Matrix
      grant/revoke changes take effect without a code restart beyond established cache behavior.
- [ ] Confirm no new environment variables or runtime dependencies are required.
- [ ] Confirm `exam_answer_key_exports` data and private artifacts need no migration or backfill;
      existing records remain downloadable only under the tightened permission.
- [ ] Mark every checkbox in all four phase files only after test and visual evidence is recorded.

## Exit criteria

- All eight product question types render from current persisted content with correct answers.
- Support preview and completed exports agree for the same selected examination and template.
- Security matrix proves no generic permission, wrong scope, student endpoint, guessed ID, or stale
  URL exposes answer-key data.
- All targeted tests, lint, formatting, builds, performance checks, and visual inspection pass.
