# Implementation Plan: Fix and Consolidate Examination Answer-Key PDFs

**Task summary:** Make answer-key previews and exports use the selected examination's real canonical
question data, enforce one permission throughout the lifecycle, and replace duplicate Core/Web
browser-print exports with the centralized queued answer-key pipeline.

## 1. The Context (1 Unified Definition)

The queued answer-key processor already loads server-side examination data, but Support preview
always renders a fixture and the loader expects legacy question field names that do not match the
current builder contract. Core and Web independently render an answer-free examination copy under
the ambiguous “Export PDF” label, while answer-key lifecycle endpoints use inconsistent generic
permissions that can expose export metadata or downloads beyond the dedicated answer-key policy.

## 3. The Triad (3 Distinct Options)

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Pass `exam_id` to Support preview and leave queued exports, permissions, and the
  existing Core/Web print routes unchanged.
- **Tradeoff:** This fixes the visible mock preview but preserves incorrect real-data mappings,
  duplicate rendering, ambiguous product labels, and authorization gaps.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Normalize the real answer-key source against current question contracts, make the
  existing queued pipeline canonical, require `examinations:export_answer_key` across preview and
  lifecycle endpoints, share client hooks, and repurpose Core/Web export routes for that flow.
- **Tradeoff:** This touches backend and both frontends and intentionally removes access from users
  who held only generic report/template permissions.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Replace queued exports with a synchronous server-streamed answer-key endpoint and
  make every UI open the stream directly.
- **Tradeoff:** This discards working private-storage, retry, audit, template-snapshot, and worker
  capabilities and increases timeout risk for large mixed-question examinations.

## 1. The Execution (1 Chosen Path)

**The Recommendation:** Choose **Option B: The Strategic Path**.

- **The Justification:** It repairs the root data-contract mismatch and consolidates on working
  repository infrastructure without adding dependencies or a new table. The current print-export
  caller audit found only the two exam-card routes and no documented independent examination-paper
  workflow, so retaining duplicate renderers would add maintenance cost without a confirmed user.
- **Next Steps:**
    1. Execute [Phase 1](phase-1-answer-key-source-and-selected-preview.md) to normalize current
       question data and render the selected examination in Support preview.
    2. Execute [Phase 2](phase-2-lifecycle-authorization-and-shared-clients.md) to align endpoint
       authorization, payloads, role defaults, services, and hooks.
    3. Execute [Phase 3](phase-3-core-and-web-canonical-export.md) to repurpose Core/Web export
       routes and remove duplicate browser-print code.
    4. Execute [Phase 4](phase-4-regression-security-and-release-validation.md) to cover every
       supported question type and complete security, visual, and operational verification.

## Pre-planning findings

- `preview-pdf-template.controller.ts` imports `mockExamAnswerKeyFixture` and never accepts the
  selected `exam_id` from Support.
- `getAnswerKeySource()` is private to the server-side answer-key pipeline, which is the correct
  security boundary, but it reads legacy keys such as `text`, object options, `blankAnswers`, and
  `matchingPairs`. Current saved questions use `prompt`, string `options`, `correctAnswer`,
  `acceptedAnswers`, `blanks`, and `pairs`.
- Current product question types are `MULTIPLE_CHOICE`, `MULTIPLE_RESPONSE`, `TRUE_FALSE`,
  `IDENTIFICATION`, `ENUMERATION`, `MATCHING`, `FILL_BLANK`, and `ESSAY`; the PDF view-model names
  differ and need an explicit mapping rather than a type cast.
- Answer-key creation correctly requires `examinations:export_answer_key`, but list/status/retry/
  download/delete currently accept combinations of `pdf_templates:*` or `reports:*` permissions.
- `ExamPrintExport` has one route caller in each frontend and deliberately renders answer spaces,
  not correct answers. No other non-test caller was found.
- The answer-key export service and hooks already implement create/list/status/retry/download/delete
  operations and polling; they can be extended rather than replaced.

## Chosen product and policy decisions

- The exam-card action becomes **Export Answer Key PDF** and remains at `/exams/[id]/export` to
  avoid unnecessary route churn.
- The old answer-free `ExamPrintExport` pages, components, utilities, and focused tests are removed
  after the new route tests pass. A future printable examination paper is a separate feature and
  must use a distinct label and authorization contract.
- `examinations:export_answer_key` is required for previewing real/sample answer-key content and
  for create/list/status/retry/download/delete lifecycle operations.
- Add the existing permission to instructor, admin, and superadmin default blueprints; Support
  already has it. Exam assignment/read scope and institution scope are still enforced separately.
- Creation derives the owning institution from `exam_id`. `institution_id` becomes optional for
  backward compatibility and, when supplied, must match the database record.
- Correct answers remain exclusive to the private server-side loader and PDF artifact; ordinary
  exam-read responses are not expanded.

## Phase map and stop rule

| Phase | Outcome                                                    | Migration | Required stop gate                              |
| ----- | ---------------------------------------------------------- | --------- | ----------------------------------------------- |
| 1     | Current question mapping and selected-exam Support preview | No        | Loader/preview/Support tests pass               |
| 2     | Uniform authorization, role defaults, services, and hooks  | No        | Controller/RBAC/service/hook tests pass         |
| 3     | Canonical Core/Web route and duplicate code removal        | No        | Both frontend suites pass and no callers remain |
| 4     | Mixed-question, security, visual, and release regression   | No        | Full targeted suite and manual checklist pass   |

Do not begin a later phase until the current phase's validation commands and exit criteria pass or
the failure is recorded and explicitly accepted.

## Files, services, and tables in scope

- Source/renderer: `app/sentinel-api/src/modules/general/pdf-documents/data/answer-keys/` and
  `app/sentinel-api/src/modules/general/pdf-documents/rendering/`.
- Preview/lifecycle API: `app/sentinel-api/src/modules/general/pdf-documents/controllers/`,
  `pdf-documents.dto.ts`, and `services/pdf-document-authorization.service.ts`.
- Shared RBAC/contracts: `packages/shared/src/constants/permissions.ts` and
  `packages/shared/src/schema/pdf-documents/`.
- Shared clients: `packages/services/src/api/pdf-documents.ts` and
  `packages/hooks/src/query/pdf-documents/`.
- Support: `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/examinations/` and
  `_components/answer-key-exports-panel.tsx`.
- Core/Web: both `features/exams/_hooks/use-exam-card/`, both
  `app/(protected)/exams/[id]/export/page.tsx` routes, and both `features/exams/export/` folders.
- Existing tables only: `exam_answer_key_exports`, `pdf_templates`, `exam_questions`, `exams`,
  `institutions`, `subjects`, `question_bank_questions`, `rbac_permissions`, and
  `rbac_role_permissions`.

## Migration, API, environment, and rollback decisions

- **Migration required:** No. Existing tables and string document kind are sufficient; permission
  catalog synchronization uses the established bootstrap/upsert path.
- **API compatibility:** `exam_id` is added as an optional preview field and `institution_id`
  becomes optional on create, which is additive for current clients. Authorization is intentionally
  tightened: generic report/template permissions no longer grant answer-key artifact access.
- **Environment variables:** None. Reuse current queue, bucket, signed URL, retry, and worker
  configuration.
- **Rollback:** Restore the old Core/Web route files only if a separately approved answer-free
  examination-copy requirement emerges. Backend rollback can stop sending `exam_id` to preview,
  but must not reintroduce weaker permissions or expose correct answers through normal exam APIs.
- **Dependencies:** No new runtime dependency.

## Overall done criteria

- Support preview changes when a different examination is selected and never labels fixture data
  as the selected examination.
- Current persisted question shapes map correctly to all answer-key view-model types.
- All answer-key lifecycle endpoints require the dedicated permission plus resource scope.
- Core and Web use one queued export lifecycle with unambiguous labels and no duplicate renderer.
- Student/sanitized exam endpoints never expose correct-answer fields.
- Mixed question types, passages, long content, empty rubrics, failure/retry, and private downloads
  pass automated and visual validation.
