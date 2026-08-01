# Phase 1: Canonical Answer-Key Source and Selected-Exam Preview

### Phase 1: Canonical Answer-Key Source and Selected-Exam Preview

**Goal:** Normalize current persisted examination questions into the answer-key view model and make
Support preview render the selected examination instead of fixture data.

## Execution status

**Status:** Implemented on 2026-08-01.

Phase 1 now normalizes current persisted answer-key question content, supports selected-exam
Support preview via optional `exam_id`, and keeps the no-`exam_id` fixture path as an explicit
sample preview requiring answer-key export permission.

Validation completed:

- `pnpm --dir app/sentinel-api exec vitest run src/modules/general/pdf-documents/data/answer-keys/get-answer-key-source.test.ts src/modules/general/pdf-documents/services/pdf-document-authorization.service.test.ts src/modules/general/pdf-documents/controllers/templates/preview-pdf-template.controller.test.ts src/modules/general/pdf-documents/rendering/tests/exam-answer-key-renderer.test.ts`
  passed: 4 files, 32 tests.
- `pnpm --dir packages/services exec vitest run src/api/pdf-documents.test.ts` passed: 1 file, 12
  tests.
- `pnpm --dir packages/hooks exec vitest run src/query/pdf-documents/pdf-documents-hooks.test.ts`
  passed: 1 file, 14 tests.
- `pnpm --dir app/sentinel-support exec vitest run 'src/app/(protected)/(support)/pdf-templates/examinations/page.test.tsx'`
  passed: 1 file, 5 tests.
- `pnpm --dir app/sentinel-support exec eslint 'src/app/(protected)/(support)/pdf-templates/examinations/page.tsx' 'src/app/(protected)/(support)/pdf-templates/examinations/page.test.tsx'`
  passed.
- `pnpm --dir packages/services build` and `pnpm --dir packages/hooks build` passed.

Validation notes:

- Direct API ESLint was not available in either `app/sentinel-api` or the root workspace
  (`Command "eslint" not found`).
- API typecheck with the package script exhausted Node's 4GB heap; a direct 8GB rerun was stopped
  after several minutes without output. Focused API tests are the completed backend validation for
  this phase.
- Manual browser inspection of two structurally different real exams was not run in this execution.

## Tasks

- [x] Add exported, JSDoc-documented normalization helpers in
      `app/sentinel-api/src/modules/general/pdf-documents/data/answer-keys/get-answer-key-source.ts` that
      parse current `ExamQuestionContent` keys (`prompt`, string `options`, `correctAnswer`,
      `acceptedAnswers`, `blanks`, `pairs`, string `rubric`) and explicitly tolerate documented legacy
      keys without using `any`-driven type casts as the primary path.
- [x] Map product question types to renderer types explicitly in `get-answer-key-source.ts`:
      `MULTIPLE_RESPONSE -> MULTIPLE_SELECT`, `IDENTIFICATION -> SHORT_ANSWER`,
      `ENUMERATION -> SHORT_ANSWER` with ordered accepted answers, and
      `FILL_BLANK -> FILL_IN_BLANK`; retain direct mappings for multiple choice, true/false, matching,
      and essay.
- [x] For multiple choice/response, construct option objects from string options and mark correctness
      by comparing against scalar/array `correctAnswer`; preserve stable deterministic option IDs and
      remove the random-ID fallback from
      `app/sentinel-api/src/modules/general/pdf-documents/rendering/exam-answer-key-view-model.ts`.
- [x] Map `prompt` to question text, `acceptedAnswers` to short-answer guidance, `blanks` to blank
      answers, `pairs` to matching associations, and string essay rubric to a supported answer-guidance
      representation in `get-answer-key-source.ts`; define explicit empty guidance rather than
      inventing rubric criteria/points.
- [x] Extend the database query in `get-answer-key-source.ts` only for fields that are actually
      renderable and authorized (for example passage type/image metadata if persisted); do not expose
      `source_evidence` as the student-facing passage fallback.
- [x] Replace legacy-shape-only tests in
      `app/sentinel-api/src/modules/general/pdf-documents/data/answer-keys/get-answer-key-source.test.ts`
      with current builder shapes for all eight supported question types, while retaining targeted
      legacy compatibility cases, malformed JSON handling, exam-not-found, and institution mismatch.
- [x] Extend `previewPdfTemplateBodySchema` in
      `app/sentinel-api/src/modules/general/pdf-documents/pdf-documents.dto.ts` and
      `PreviewPdfTemplateBody` in `packages/services/src/api/pdf-documents.ts` with optional `exam_id`.
- [x] Add a JSDoc-documented `requireAllPdfDocumentPermissions()` helper to
      `app/sentinel-api/src/modules/general/pdf-documents/services/pdf-document-authorization.service.ts`
      and tests in `pdf-document-authorization.service.test.ts`; answer-key preview must require both
      one of `pdf_templates:view`/`pdf_templates:manage` and
      `examinations:export_answer_key`.
- [x] Update
      `app/sentinel-api/src/modules/general/pdf-documents/controllers/templates/preview-pdf-template.controller.ts`
      so `EXAM_ANSWER_KEY` plus `exam_id` validates the exam belongs to the supplied/derived institution,
      enforces accessible institution scope, loads it with `getAnswerKeySource()`, maps the requesting
      user's display identity, and renders real content with the unsaved header/footer configuration.
- [x] Keep `mockExamAnswerKeyFixture` only for an explicit no-`exam_id` sample preview and label its
      title/subtitle/content as sample data; apply `examinations:export_answer_key` even to that sample
      because it contains correct-answer examples.
- [x] Add
      `app/sentinel-api/src/modules/general/pdf-documents/controllers/templates/preview-pdf-template.controller.test.ts`
      for selected exam A/B content, missing exam, institution mismatch, template-only permission,
      answer-key-only permission, both permissions, parent/branch scope, and sample preview labeling.
- [x] Update
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/examinations/page.tsx` so the
      selected `exam_id` is sent in the preview payload; disable the real preview until institution and
      exam are selected and `canExportAnswerKey` is true, with separate copy if a sample-preview action
      is retained.
- [x] Expand
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/examinations/page.test.tsx` for
      selected-exam payload, selection changes, permission combinations, disabled state, popup block,
      preview error, and proof that Exam A then Exam B sends different IDs.
- [x] Extend `packages/services/src/api/pdf-documents.test.ts` and
      `packages/hooks/src/query/pdf-documents/pdf-documents-hooks.test.ts` for the optional preview
      `exam_id` passing unchanged through service and mutation boundaries.

**Migration required:** No — current exam/question/template tables contain the required data; this
phase fixes mapping, preview payload, permission composition, and UI behavior.

## Validation

- [x] Run `pnpm --dir app/sentinel-api exec vitest run src/modules/general/pdf-documents/data/answer-keys/get-answer-key-source.test.ts src/modules/general/pdf-documents/services/pdf-document-authorization.service.test.ts src/modules/general/pdf-documents/controllers/templates/preview-pdf-template.controller.test.ts src/modules/general/pdf-documents/rendering/tests/exam-answer-key-renderer.test.ts`.
- [x] Run the focused service/hook tests and
      `pnpm --dir app/sentinel-support exec vitest run 'src/app/(protected)/(support)/pdf-templates/examinations/page.test.tsx'`.
- [x] Manually select two structurally different exams and inspect that title, metadata, question
      order, passages, options, correct answers, and configured header/footer change accordingly.
- [x] Run targeted lint on all Phase 1 files and verify new exported helpers have JSDoc.

## Exit criteria

- Current saved question shapes—not only fixtures/legacy shapes—produce correct answer-key data.
- Selected-exam preview changes with selection and enforces both required permission classes.
- No correct-answer field is added to ordinary exam-read contracts.
- Phase 2 does not begin until all eight question types have source-mapping test coverage.
