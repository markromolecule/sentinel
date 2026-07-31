# Examination Report PDF and Answer-Key PDF Context

## Purpose of this document

This document prepares the context for a later implementation plan. It describes the desired
outcomes, current gaps, scope boundaries, and acceptance expectations without prescribing the
final technical design.

> **Important: this request consists of two major goals.** They are related because both should
> use Sentinel's centralized PDF-template and generation infrastructure, but they solve different
> user problems and must be planned, implemented, authorized, and tested as two distinct
> workstreams.

1. **Create an examination-results report PDF export.**
2. **Fix and consolidate the examination answer-key PDF flow.**

---

## Major Goal 1 — Create an examination-results report PDF export

### Objective

Allow an authorized user to generate and download a PDF representation of a specific
examination's results from its report page. The PDF must summarize the examination, list the
students and their results, clearly explain integrity flags and review states, and include useful
reporting details that are currently available in the examination report experience.

### Entry points and user workflow

- Add a clear PDF export action to the detailed examination report page in `sentinel-web`:
  `/exams/reports/[examId]`.
- The action must operate on the examination identified by the route, not on mock or unrelated
  data.
- The later implementation plan must determine whether the equivalent detailed report in
  `sentinel-core` (`/exams/[id]/report`) also exposes the same action. Both applications should use
  one backend PDF-generation contract if both surfaces are included.
- The UI must communicate generation states such as submitting, pending/processing, ready to
  download, failed, and retryable where the selected generation mode requires them.

### Required PDF content

The PDF is an **examination-results report**, not an examination paper and not an answer key. Its
minimum content is:

1. **Report and examination identity**
   - Examination title.
   - Subject/course and section or assigned scope when available.
   - Scheduled examination window, duration, passing score, and report-generation timestamp.
   - Institution identity and the authorized user who generated the report when appropriate.

2. **Overall examination summary**
   - Assigned, started, submitted, and absent student counts.
   - Average score and pass rate.
   - Total flagged students and the number of students requiring action.
   - Incident breakdowns by type and severity.
   - Action-queue totals, including review, makeup, and retake counts when available.

3. **Detailed student-results section**
   - One row or grouped block per assigned student, including identity, section, attempt state,
     score/percentage, time spent, and relevant attempt/finalization information.
   - A visible indication of whether the student was flagged.
   - Flag totals and the highest incident type/severity when present.
   - A breakdown of flag-review state, at minimum distinguishing incidents that still need review
     from those already reviewed or confirmed. Include dismissed/pending/open counts when the
     report data supports them.
   - Relevant remediation or action state, such as review required, makeup, retake, reopened,
     finalized, or superseded attempt, when available.

4. **Additional report details on subsequent pages**
   - After the primary student-results section, begin a deliberate new page for other useful
     examination insights that can be derived from the existing report data.
   - Candidate content includes incident distributions, severity summaries, outcome/performance
     summaries, section-level breakdowns, action-queue summaries, and examination-window details.
   - The implementation plan must confirm which of these values already exist in the reporting
     response and which require a new server-side aggregation. Do not fabricate unavailable data.

### Layout and presentation expectations

- Use a readable multi-page layout designed for common PDF page sizes.
- Apply a consistent header and footer on every applicable page.
- Support page numbers, confidentiality text, institution/Sentinel branding, report title, and
  generation metadata through the centralized PDF template system where configurable.
- Keep tables readable across page breaks. Do not clip student rows, headings, headers, footers,
  or long values.
- Define sensible empty states in the document for examinations with no attempts, no incidents,
  or incomplete grading.
- Preserve accessibility fundamentals: meaningful text, logical heading order, readable contrast,
  and no screenshot-only report content.

### Support template requirement

- Extend the `sentinel-support` PDF Templates workspace so Support can customize and preview the
  examination-results report PDF independently of the existing overall analytics report and
  examination answer-key templates.
- The later plan must decide whether this requires a dedicated document kind (recommended because
  its content and policy differ from `ANALYTICS_OVERALL` and `EXAM_ANSWER_KEY`) and define its
  global/institution override behavior.
- Preserve the existing draft, preview, publish, active-template resolution, branding, and
  header/footer customization conventions rather than creating a parallel template mechanism.
- A Support template preview may use clearly labelled representative sample report data; an export
  initiated for a real examination must always use that examination's authorized report data.

### Authorization and privacy requirements

- Introduce or confirm a dedicated permission for exporting examination-results reports. Register
  it in the shared permission catalog, include the intended default role blueprints, and expose it
  in the Support Permission Registry and Role Matrix.
- Hiding the button is not sufficient. The API that creates, checks, retries, downloads, or deletes
  an export must enforce the permission and the user's institution/course/examination scope.
- Report artifacts must remain private and be downloaded through short-lived signed URLs or the
  repository's equivalent protected mechanism.
- Do not expose a report for an examination outside the actor's authorized scope. Do not log PDF
  body content, student-sensitive data, signed URLs, or storage credentials.
- The plan must define retention and deletion behavior for examination-results report artifacts.

### Goal 1 acceptance expectations

- An authorized, in-scope user can start a PDF export from a specific examination report and
  download the completed document.
- The generated document is based on the selected examination and reflects its current authorized
  reporting data.
- The PDF contains examination identity, summary metrics, detailed student outcomes, and explicit
  flag/review-state breakdowns.
- Additional insights begin on a deliberate subsequent page, and the document has consistent
  headers, footers, and page numbering.
- Support can configure, preview, save, and publish the examination-report template according to
  the agreed scope/fallback rules.
- Users without the export permission, or users outside the examination scope, cannot generate or
  download the report even if they call the API directly.
- Empty, partial, large, and failed-generation cases are handled and tested.

---

## Major Goal 2 — Fix and consolidate the examination answer-key PDF flow

### Objective

Make the examination answer-key preview/export use the selected examination's real questions and
correct answers, then replace the redundant Core/Web browser-print export flow with the centralized
answer-key PDF generation pipeline where the action is intended to export an answer key.

### Current gap

- In `sentinel-support`, selecting an examination does not make the template preview render that
  examination. The preview endpoint currently uses the `mockExamAnswerKeyFixture`, so the preview
  continues to show sample content regardless of the selected examination.
- The actual queued answer-key export pipeline already has a real-data source loader and renderer,
  but the template preview does not use that selected-examination path.
- In both `sentinel-core` and `sentinel-web`, the existing exam-card **Export PDF** action opens a
  separate `ExamPrintExport` browser-print view. That view produces an examination copy with answer
  spaces and intentionally does not expose correct answers, so it is not an answer-key export.
- These separate paths create inconsistent output and duplicate examination-to-document rendering
  logic.

### Expected behavior

1. **Selected-examination preview in Support**
   - When Support selects an institution and examination in the Examination Answer Key template
     area, generating the preview must render that selected examination's title, metadata,
     questions, passages, options, and correct-answer details.
   - Previewing real answer-key data must require the answer-key export permission in addition to
     the appropriate PDF-template viewing/managing permission.
   - Mock data may remain only for an explicit, clearly labelled template-only sample preview when
     no examination is selected. It must never be presented as the selected examination.

2. **One canonical answer-key generator**
   - Reuse the centralized server-side answer-key source mapper, renderer, template resolver,
     private storage, status, retry, and download flow.
   - Core and Web must not maintain a second answer-key renderer or reconstruct correct answers
     from their normal exam-read responses.
   - Correct answers must be obtained only through the protected server-side answer-key pipeline;
     they must never be added to student-facing or ordinary sanitized exam endpoints.

3. **Core/Web export action alignment**
   - Where the current **Export PDF** action is intended to mean **Export Answer Key**, route it to
     the centralized answer-key generation workflow and label it unambiguously (for example,
     **Export Answer Key PDF**).
   - Remove the redundant `ExamPrintExport` implementation from Core/Web only after all remaining
     callers and use cases are audited.
   - If an answer-free printable examination paper is still a real product requirement, retain it
     as a separately named feature (for example, **Print Examination Copy**) rather than silently
     replacing or conflating it with the answer-key export. The later plan must resolve this product
     decision before deleting the current print view.
   - `sentinel-core` and `sentinel-web` should consume shared hooks/services and present consistent
     pending, completed, failed, retry, and download behavior.

### Answer-key content expectations

- Render the selected examination's identity and metadata.
- Preserve examination question order and section/grouping semantics where available.
- Render all supported question types with the correct answer representation, including multiple
  choice/response, true/false, identification or short answer, fill-in-the-blank, matching,
  ordering, and essay rubric/answer guidance where available.
- Preserve safe passage content and supported question images without exposing unrelated source
  evidence.
- Use the published institution-specific answer-key template, falling back according to the
  existing template-resolution rules.
- Apply configured branding, header, footer, confidentiality label, and page numbering.

### Authorization and privacy requirements

- Continue to use the existing `examinations:export_answer_key` permission and make it assignable
  through the Support Role Matrix.
- Enforce permission and institution/examination scope at preview, export creation, status, retry,
  download, and deletion boundaries.
- Never make answer-key artifacts public or expose correct answers through ordinary exam detail
  responses, client-side print data, logs, or error messages.
- Maintain private artifact storage and short-lived signed downloads.

### Goal 2 acceptance expectations

- Selecting Exam A and generating an answer-key preview/export produces Exam A's metadata,
  questions, and correct answers—not fixture data and not another examination's content.
- Selecting a different examination changes the rendered content accordingly.
- Authorized users in Core/Web can use the canonical answer-key export flow with consistent
  template output and lifecycle feedback.
- Unauthorized or out-of-scope users cannot preview, generate, inspect, retry, download, or delete
  an answer key.
- No answer key is exposed to student-facing or sanitized examination endpoints.
- The obsolete duplicate print/export implementation is removed only if no distinct
  answer-free examination-copy requirement remains.
- Representative examinations covering every supported question type render without missing
  answers, broken passages, clipping, or page-layout regressions.

---

## Shared planning considerations for both goals

The implementation plan should investigate and explicitly address:

- Whether examination-results reports need a new PDF document kind, export persistence model,
  renderer, processor, API contract, hooks, and Support template screen.
- How report snapshots behave if scores, incident review states, or attempts change after an export
  is requested. The generated artifact should be internally consistent and record its generation
  time.
- Whether exports run synchronously or through the existing PDF queue in each environment, while
  preserving clear status and retry behavior.
- Template fallback precedence, institution branding, private storage, signed download expiry,
  artifact retention, deletion, cleanup, and audit metadata.
- Large-examination behavior, including pagination/page breaks, render duration, file-size limits,
  queue timeouts, retries, and worker memory.
- Focused backend, renderer, authorization, hook, and UI tests, plus visual inspection of generated
  PDFs for mixed question types and large student cohorts.

## Relevant existing areas to inspect during planning

- Examination reporting API: `app/sentinel-api/src/modules/examination/reporting/`
- PDF template/export API: `app/sentinel-api/src/modules/general/pdf-documents/`
- Answer-key real-data loader:
  `app/sentinel-api/src/modules/general/pdf-documents/data/answer-keys/get-answer-key-source.ts`
- Answer-key renderer and fixture:
  `app/sentinel-api/src/modules/general/pdf-documents/rendering/`
- Support PDF Templates workspace:
  `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/`
- Instructor examination report:
  `app/sentinel-web/src/app/(protected)/(instructor)/exams/reports/[examId]/`
- Core examination report: `app/sentinel-core/src/app/(protected)/exams/[id]/report/`
- Current Core/Web browser-print export: `app/sentinel-core/src/features/exams/export/` and
  `app/sentinel-web/src/features/exams/export/`
- Shared permissions: `packages/shared/src/constants/permissions.ts`
- Existing PDF operational constraints: `docs/operations/pdf-generation.md`
