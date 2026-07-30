# AI Passage Content Generation — Implementation Plan

> **Task summary:** separate AI provenance from student-facing passages, reject answer-leaking generated content, repair invalid items within a bounded Gemini workflow, and stop student and builder surfaces from treating `sourceEvidence` as passage content.

**Source:** `docs/context/July/July 30/fix-passage-content-generation.md`  
**Status:** Ready for implementation  
**Delivery boundary:** AI PDF question generation, passage-quality validation, passage rendering policy, builder initialization, and non-destructive legacy auditing  
**Migration required:** No — `question_bank_questions` and `exam_questions` already contain `passage_content` and `passage_type`; shared question contracts and persistence paths already carry those fields.

## 1. The Context

The AI generator requires `sourceEvidence` as a verbatim answer-support excerpt but does not generate `passageContent`; shared rendering, both question builders, and the existing passage backfill can then reinterpret that provenance as student-facing passage text. The fix must preserve exact instructor provenance and the requested type distribution while making every new AI item source-grounded and answerable without copying its key. It must also avoid destructive historical rewrites and use the existing Gemini provider and passage schema without adding dependencies or database columns.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Add `passageContent` to the existing Gemini prompt and response schema, strengthen prompt wording, set generated passages to `plain`, and remove `sourceEvidence` fallback from the live student attempt and both builders.
- **Tradeoff:** This is the fastest change, but prompt compliance remains probabilistic and leaky or unanswerable passages can still reach the instructor preview.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Generate provenance and passage fields separately, normalize answers by question type, apply deterministic leakage checks, use the existing Gemini provider for one batched semantic critic and at most two targeted repair rounds, preserve valid slots and exact type counts, disable provenance fallback on passage surfaces, and audit legacy rows without overwriting them.
- **Tradeoff:** This adds validation and orchestration code plus bounded model latency, but provides measurable quality gates and deterministic failure behavior without new infrastructure.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Split generation into mandatory question-first and passage-second model calls, store a generated-content version and quality state on every question, and route failed items into a persistent instructor review queue.
- **Tradeoff:** This creates the strongest long-term editorial workflow but requires schema changes, more calls for every item, new review UX, and a larger operational surface than this defect warrants.

## 1. The Execution

**The Recommendation:** Option B — the Strategic Path.

**The Justification:** Sentinel already has structured Gemini calls, question-type normalization, plain and HTML passage contracts, and instructor review before save. Adding deterministic validation and a bounded critic/repair step fits those boundaries, keeps provenance intact, avoids an embedding dependency or database migration, and spends extra model calls only on quality control and invalid items rather than rebuilding the generation architecture.

**Next Steps:**

1. Extend the raw AI contract and prompt so every generated question has a distinct plain-text student passage.
2. Add deterministic and model-assisted quality gates with exact-count reconciliation and bounded targeted repair.
3. Separate provenance fallback from passage rendering and builders, then audit legacy rows and verify the end-to-end flow.

---

## Approved Decisions and Fixed Defaults

- Every newly generated AI PDF question must contain a non-empty `passageContent`; passage-free recall items are not returned.
- Pure recall prompts must be reframed so the answer is derived through interpretation, comparison, calculation, application, or synthesis.
- Gemini generates passage text only. The normalizer sets `passageType: "plain"`; generated HTML is out of scope.
- `sourceEvidence` remains a short verbatim provenance excerpt and may contain the correct answer.
- Deterministic validation runs before the semantic critic on every generation or repair round.
- One batched Gemini critic evaluates deterministic survivors for semantic leakage and answerability.
- Invalid or missing items receive at most two targeted repair rounds.
- Valid questions are retained in stable slots; repair does not regenerate accepted questions.
- The final preview must match the requested total and per-type distribution exactly. Exhaustion fails the entire preview with an explicit safe error instead of returning a partial set.
- The shared Gemini rate limiter continues to govern critic and repair calls; no bypass or separate quota path is added.
- Student, preview, report, export, and passage-editor surfaces render `passageContent` only. Instructor metadata can display `sourceEvidence` under an explicit provenance label.
- Historical AI rows are reported for instructor review. Automated cleanup must not overwrite or null existing passage content in this task.
- The legacy backfill remains available for verified non-AI legacy records but must skip `source_origin = 'AI_PDF'`.

## Confirmed Baseline

- `buildPrompt()` and `buildResponseJsonSchema()` require `sourceEvidence` but have no passage field.
- `RawGeneratedQuestion`, `generateBatchesStep()`, and `rawGeneratedQuestionSchema` omit passage content.
- `normalizeGeneratedQuestions()` already returns `questionInputSchema`, whose contract supports `passageContent` and `passageType`.
- `createQuestionBankQuestions()` and exam snapshot services already persist passage fields.
- `renderPassage()` prefers `passageContent` and otherwise falls back to `sourceEvidence`.
- `getRuntimePassageDetails()` passes student-visible source evidence into that fallback.
- `getExamContextDetails()`, attempt reports, print exports, and both question preview sheets also use the generic fallback.
- Both `QuestionBuilderForm` implementations initialize passage state with `passageContent ?? sourceEvidence`.
- `backfill-passage-content.ts` currently treats every empty passage with non-empty evidence as eligible, including `AI_PDF` rows.
- `generateBatchesStep()` accepts fulfilled batches when other batches fail, while `normalizeQuestionsStep()` slices by total count without enforcing the configured per-type distribution.

## Target Contracts

### Generated item contract

Each raw AI item must contain:

- `sourceFileName`, `sourcePageNumber`, and non-empty `sourceEvidence` for instructor provenance;
- non-empty plain-text `passageContent` for students;
- the existing question-type content and metadata fields.

`passageType` is not model-authored. `normalizeGeneratedQuestions()` sets it to `plain`.

### Deterministic passage-quality contract

Create one validator that receives a normalized question and returns either a pass or structured violations. It must:

- normalize passage text with Unicode NFKC, lowercase comparison, HTML-tag removal, punctuation folding, and collapsed whitespace;
- compare whole normalized tokens or phrases rather than arbitrary substrings;
- treat numeric values, dates, percentages, formulas, and meaningful multi-word answers as hard signals even when short;
- ignore single letters and configured common function words unless the value is numeric or otherwise structurally meaningful;
- report stable codes such as `ANSWER_EXACT_MATCH`, `ENUMERATION_LIST_REVEALED`, `MATCHING_PAIR_REVEALED`, and `TRUE_FALSE_PROPOSITION_RESTATED`;
- never inspect or weaken `sourceEvidence`, because provenance is allowed to contain the answer.

Question-type rules:

| Type                | Deterministic rule                                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MULTIPLE_CHOICE`   | Reject a whole-phrase match for the normalized `correctAnswer`.                                                                                                   |
| `MULTIPLE_RESPONSE` | Reject a whole-phrase match for any normalized correct option.                                                                                                    |
| `IDENTIFICATION`    | Reject a whole-phrase match for any meaningful accepted answer.                                                                                                   |
| `FILL_BLANK`        | Reject a whole-phrase match for any meaningful blank answer.                                                                                                      |
| `ENUMERATION`       | Reject when any meaningful expected item is copied or when the passage presents the expected items as a list.                                                     |
| `MATCHING`          | Split the passage into sentence/line segments and reject when both sides of a generated pair occur in the same segment as an explicit association.                |
| `TRUE_FALSE`        | Reject exact normalized proposition containment or high token/trigram overlap between the prompt and one passage sentence; leave deeper entailment to the critic. |
| `ESSAY`             | Apply normalization and empty-content checks only; leave model-answer and conclusion leakage to the critic.                                                       |

### Semantic critic contract

The critic receives stable slot IDs and only the fields needed for evaluation: type, prompt, answer-bearing content, passage, and provenance excerpt. It returns exactly one result per slot:

- `slotId`;
- `leaksAnswer`;
- `answerableFromPassage`;
- `reasonCode`;
- concise `reason`.

Missing, duplicate, or unknown slot results fail closed and send the affected slot to repair. The critic does not rewrite content.

### Repair contract

Each repair request includes the original invalid item, validator/critic reasons, the required type, and the uploaded PDF files. It must return complete replacement raw items, including fresh provenance and passage fields. A replacement re-enters normal source validation, deterministic validation, critic evaluation, and exact-count reconciliation before it can occupy its original slot.

## Scope and Affected Files

### Gemini prompt and raw contracts

- `app/sentinel-api/src/lib/gemini/services/prompt-builder/prompt-builder.service.ts`
- `app/sentinel-api/src/lib/gemini/services/prompt-builder/prompt-builder.service.test.ts` **[NEW]**
- `app/sentinel-api/src/lib/gemini/services/prompt-builder/passage-quality-prompts.ts` **[NEW]**
- `app/sentinel-api/src/lib/gemini/services/prompt-builder/passage-quality-prompts.test.ts` **[NEW]**
- `app/sentinel-api/src/lib/gemini/services/question-generator/types.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/steps.test.ts`

### Normalization and deterministic validation

- `app/sentinel-api/src/lib/gemini/services/question-normalizer/normalizer.ts`
- `app/sentinel-api/src/lib/gemini/services/question-normalizer/index.ts`
- `app/sentinel-api/src/lib/gemini/services/question-normalizer/errors.ts`
- `app/sentinel-api/src/lib/gemini/services/question-normalizer/passage-leak-validator.ts` **[NEW]**
- `app/sentinel-api/src/lib/gemini/services/question-normalizer/passage-leak-validator.test.ts` **[NEW]**
- `app/sentinel-api/src/tests/gemini/question-generator.test.ts`

### Quality orchestration and repair

- `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/normalize-questions.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/normalize-questions.test.ts` **[NEW]**
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/assess-passage-quality.ts` **[NEW]**
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/assess-passage-quality.test.ts` **[NEW]**
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/repair-invalid-questions.ts` **[NEW]**
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/repair-invalid-questions.test.ts` **[NEW]**
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/reconcile-question-slots.ts` **[NEW]**
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/reconcile-question-slots.test.ts` **[NEW]**

### Shared passage rendering and Sentinel Web

- `packages/shared/src/utils/passage-rendering.ts`
- `packages/shared/src/utils/passage-rendering.test.ts`
- `app/sentinel-web/src/features/exams/_components/engine/utils.ts`
- `app/sentinel-web/src/features/exams/_components/engine/utils.test.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.ts`
- `app/sentinel-web/src/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt/index.test.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/preview/[sessionId]/attempt/page.tsx`
- `app/sentinel-web/src/features/exams/reports/attempt-report-utils.ts`
- `app/sentinel-web/src/features/exams/reports/attempt-report-view.test.tsx`
- `app/sentinel-web/src/features/exams/export/exam-print-export.tsx`
- `app/sentinel-web/src/features/exams/export/exam-print-export.test.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/question-preview-sheet.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/question-preview-sheet.test.tsx` **[NEW]**
- `app/sentinel-web/src/features/exams/builder/_components/question-builder-form.tsx`
- `app/sentinel-web/src/features/exams/builder/_components/question-builder-form.test.tsx` **[NEW]**

### Sentinel Core parity

- `app/sentinel-core/src/features/exams/_components/engine/utils.ts`
- `app/sentinel-core/src/features/exams/_components/engine/utils.test.ts` **[NEW]**
- `app/sentinel-core/src/app/(protected)/exams/[id]/preview/[sessionId]/attempt/page.tsx`
- `app/sentinel-core/src/features/exams/export/exam-print-export.tsx`
- `app/sentinel-core/src/features/exams/export/exam-print-export.test.tsx`
- `app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/question-preview-sheet.tsx`
- `app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/question-preview-sheet.test.tsx` **[NEW]**
- `app/sentinel-core/src/features/exams/builder/_components/question-builder-form.tsx`
- `app/sentinel-core/src/features/exams/builder/_components/question-builder-form.test.tsx`

### Legacy audit

- `app/sentinel-api/scripts/backfill-passage-content.ts`
- `app/sentinel-api/scripts/backfill-passage-content.test.ts` **[NEW]**
- `app/sentinel-api/package.json`
- Read-only audit of `question_bank_questions`
- Read-only audit of `exam_questions` joined through `source_question_bank_question_id`

## Phase 0: Lock the Current Defect With Fixtures

**Goal:** Capture the provenance-to-passage leak and generation-contract gaps before changing behavior.

- [x] Add shared fixture builders inside `app/sentinel-api/src/lib/gemini/services/question-normalizer/passage-leak-validator.test.ts` for all eight question types, including names, dates, decimals, percentages, formulas, Unicode variants, short answers, common words, and multi-answer content.
- [x] Extend `app/sentinel-api/src/tests/gemini/question-generator.test.ts` with a raw AI item whose `sourceEvidence` contains the correct answer and whose absent `passageContent` demonstrates the current contract gap.
- [x] Change the legacy-fallback assertion in `app/sentinel-web/src/features/exams/_components/engine/utils.test.ts` into the expected student policy: evidence alone must produce an empty runtime passage.
- [x] Add an AI-origin builder fixture to `app/sentinel-core/src/features/exams/builder/_components/question-builder-form.test.tsx` and new parity coverage in `app/sentinel-web/src/features/exams/builder/_components/question-builder-form.test.tsx` proving evidence currently populates an empty passage editor.
- [x] Record representative safe and leaky generation samples in `app/sentinel-api/src/lib/gemini/services/question-normalizer/__fixtures__/passage-quality-cases.ts` **[NEW]** so unit tests and the later evaluation harness use the same deterministic corpus.
- [x] Run the focused tests and confirm only the new expected-behavior assertions fail before implementation.

**Migration required:** No — this phase adds fixtures and regression assertions only.

## Phase 1: Separate Generated Passage and Provenance Contracts

**Goal:** Require every raw AI question to carry a dedicated plain-text student passage while preserving exact source evidence.

- [x] Update `buildPrompt()` in `app/sentinel-api/src/lib/gemini/services/prompt-builder/prompt-builder.service.ts` to define `sourceEvidence` as instructor provenance and `passageContent` as student context, require reasoning rather than copying, prohibit keyed names/dates/numbers/phrases in the passage, and require reframing of pure recall items.
- [x] Update `buildResponseJsonSchema()` in the same file to add non-empty string `passageContent` to every generated type’s properties and required list; do not expose `passageType` for model authorship.
- [x] Add `app/sentinel-api/src/lib/gemini/services/prompt-builder/prompt-builder.service.test.ts` to assert the semantic separation instructions, passage requirement, no generated HTML contract, source evidence requirement, and schema requirements for each selected question type.
- [x] Add `passageContent: string` to `RawGeneratedQuestion` and the `itemSchema` in `app/sentinel-api/src/lib/gemini/services/question-generator/types.ts` and `steps/generate-batches.ts`.
- [x] Add non-empty `passageContent` parsing to `rawGeneratedQuestionSchema` in `app/sentinel-api/src/lib/gemini/services/question-normalizer/normalizer.ts`, forward its trimmed value into `Schema.questionInputSchema`, and set `passageType: 'plain'` in application code.
- [x] Extend `steps.test.ts` and `question-generator.test.ts` with valid passage fields and assertions that preview questions and `savePayload.questions` retain distinct evidence and passage values with `passageType === 'plain'`.
- [x] Add a normalization test proving passage text is never substituted from `sourceEvidence` when the model omits or empties the required field; parsing must fail instead.

**Migration required:** No — existing API and database question contracts already persist optional passage fields; the stricter requirement applies only to the internal raw AI response.

## Phase 2: Add Deterministic Question-Type Leakage Validation

**Goal:** Reject testable answer leakage consistently before spending a critic or repair call.

- [x] Create `passage-leak-validator.ts` with exported, JSDoc-documented `normalizePassageComparisonText()`, `extractQuestionAnswerSignals()`, and `validateGeneratedPassage()` functions plus internal whole-token/phrase, sentence segmentation, and overlap helpers.
- [x] Define a discriminated `GeneratedPassageValidationResult` and stable `GeneratedPassageViolationCode` union in that file so orchestration and tests never depend on human-readable messages.
- [x] Implement exact normalized phrase checks for `MULTIPLE_CHOICE`, `MULTIPLE_RESPONSE`, `IDENTIFICATION`, and `FILL_BLANK` using the normalized content shape produced by `normalizeQuestionContentShape()`.
- [x] Implement enumeration detection for copied expected items and list-shaped disclosure, matching detection for associated left/right values in one segment, and true/false proposition restatement using documented token and trigram overlap thresholds.
- [x] Treat numbers, dates, percentages, formulas, and meaningful multi-word answers as signals regardless of generic minimum word length; exempt single alphabetic labels and common function words from standalone matching.
- [x] Leave essay conclusion and deep semantic entailment to the critic while still rejecting empty passage text and malformed normalized content.
- [x] Add `PassageQualityValidationError` to `question-normalizer/errors.ts`, export the new validator from `question-normalizer/index.ts`, and include slot/type/violation codes without logging passage or answer text.
- [x] Add `passage-leak-validator.test.ts` with passing and failing cases for every table rule, word boundaries, HTML removal, NFKC Unicode, punctuation, whitespace, casing, substring false positives, short common answers, numbers, dates, formulas, multi-answer arrays, and malformed content.
- [x] Extend `question-generator.test.ts` to prove normalization keeps provenance even when passage validation rejects the student text; the validator must never modify `sourceEvidence`.

**Migration required:** No — validation is transient generation logic and does not alter stored question records.

## Phase 3: Add Batched Semantic Assessment and Targeted Repair

**Goal:** Catch paraphrase leakage and unanswerable passages while preserving valid questions and enforcing the exact requested distribution.

- [x] Create `passage-quality-prompts.ts` with JSDoc-documented `buildPassageQualityCriticPrompt()`, `buildPassageQualityCriticSchema()`, `buildPassageRepairPrompt()`, and `buildPassageRepairSchema()`; use stable slot IDs and explicit fail-closed response requirements.
- [x] Add `passage-quality-prompts.test.ts` to assert that critic prompts include only type, prompt, answer-bearing content, passage, and provenance; repair prompts must include violation codes, required type, complete-item instructions, and no request to alter accepted slots.
- [x] Create `reconcile-question-slots.ts` to derive ordered slots from `getQuestionTypeDistribution(config)`, place valid normalized questions only into matching type slots, detect duplicates/excess/deficits, and return exact invalid or missing slots without silently slicing by total count.
- [x] Add `reconcile-question-slots.test.ts` for mixed distributions, out-of-order model arrays, excess items, missing items, duplicate candidates, stable accepted-slot retention, and exact final ordering.
- [x] Change `generateBatchesStep()` and its return type in `types.ts` to preserve valid raw items plus redacted per-type deficits from malformed items or rejected batches; parse generated arrays item by item with `safeParse()` so one missing passage does not discard valid siblings.
- [x] Extend `steps.test.ts` for one malformed item among valid siblings, an entirely malformed type array, one rejected batch among fulfilled batches, all batches rejected, redacted failure details, and preservation of the configured deficit counts.
- [x] Refactor `normalizer.ts` so exported `normalizeGeneratedQuestion()` owns single-item parsing/normalization and `normalizeGeneratedQuestions()` remains a JSDoc-documented compatibility wrapper over it.
- [x] Replace `normalizeQuestionsStep()` with per-candidate normalization that returns successful typed candidates plus redacted failures keyed by raw index and declared type; one malformed or passage-missing item must create a repairable slot instead of discarding other valid items.
- [x] Add `normalize-questions.test.ts` for mixed valid/invalid raw items, missing passage content, invalid source metadata, declared-type retention, redacted failure details, and preservation of successful candidate order.
- [x] Create `assess-passage-quality.ts` to run deterministic validation first, send only deterministic survivors through one batched `provider.generateStructuredJson()` critic call, validate one critic result per slot with Zod, and convert missing/duplicate/unknown critic results into repair reasons.
- [x] Add `assess-passage-quality.test.ts` for deterministic short-circuiting, one batched critic call, semantic leak failure, unanswerable failure, malformed critic output, missing slot output, and safe output.
- [x] Create `repair-invalid-questions.ts` to request complete replacement items only for invalid or missing slots, attach the already uploaded PDFs, normalize each replacement independently through `normalizeGeneratedQuestion()`, and return valid replacements plus redacted unresolved slots keyed to their original positions.
- [x] Add `repair-invalid-questions.test.ts` for type preservation, source metadata revalidation, attached-file reuse, stable slot IDs, malformed replacement rejection, and no mutation of accepted items.
- [x] Remove the unconditional `slice(0, config.questionCount)` behavior from `normalize-questions.ts`; pass its successful candidates and failures into `reconcileQuestionSlots()` from the orchestrator and keep the exported step JSDoc current.
- [x] Update `QuestionGeneratorService.generatePreviewFromPdf()` in `orchestrator.ts` to run normalize → reconcile → assess → targeted repair for at most two repair rounds, then build the response only when every slot passes.
- [x] Add a module constant `MAX_PASSAGE_REPAIR_ROUNDS = 2`; do not add an environment variable for this fixed first-release policy.
- [x] Throw `PassageQualityValidationError` after exhaustion or unresolved count/type deficits and map it to an HTTP 502 message that tells the instructor the requested question set could not pass passage-quality checks without exposing answers or source text.
- [x] Preserve the `finally` cleanup of every uploaded Gemini file across critic success, repair success, malformed output, exhaustion, and provider failure.
- [x] Extend `question-generator.test.ts` and `steps.test.ts` with valid-first-pass, one-round repair, two-round repair, exhausted repair, partial initial batch, exact mixed distribution, stable accepted question, and uploaded-file cleanup cases.

**Migration required:** No — critic and repair state exists only during the request and uses the current Gemini provider, throttler, and uploaded files.

## Phase 4: Stop Treating Provenance as Passage Content

**Goal:** Ensure every passage surface and editor uses explicit `passageContent`, while provenance remains visible only as labeled - [x] Add an explicit `fallbackToSourceEvidence?: boolean` option to `renderPassage()` in `packages/shared/src/utils/passage-rendering.ts`, retain `true` as the temporary compatibility default, and document the option with JSDoc.
- [x] Extend `passage-rendering.test.ts` to cover explicit fallback enabled, explicit fallback disabled, preferred passage behavior, empty passage behavior, plain escaping, and sanitized HTML behavior.
- [x] Remove `questionSourceEvidence` from `getRuntimePassageDetails()` and its call in `useStudentExamAttempt()` so a live student attempt cannot render provenance as a passage.
- [x] Update `getExamContextDetails()` in both `sentinel-web` and `sentinel-core` to call `renderPassage({ fallbackToSourceEvidence: false })`; preserve exam-description fallback without relabeling provenance as passage text.
- [x] Update `attempt-report-utils.ts`, both `exam-print-export.tsx` files, and both question preview sheets to disable source-evidence fallback; keep existing metadata components responsible for the separately labeled evidence excerpt.
- [x] Replace `initialData?.passageContent ?? initialData?.sourceEvidence ?? ''` with `initialData?.passageContent ?? ''` in both `QuestionBuilderForm` implementations, and ensure passage preview and save payloads do not synthesize content from evidence.
- [x] Update `utils.test.ts` [, the student attempt hook test, both engine utility tests, attempt report tests, both print export tests, both question preview sheet tests, and both builder tests to assert evidence-only records produce no passage while explicit passage content still renders and saves.
- [x] Add instructor-facing preview assertions that `sourceEvidence` remains visible under the metadata label but is absent from the passage panel.
- [x] Run `rg` over `app/sentinel-web`, `app/sentinel-core`, and `packages/shared` and update every remaining `renderPassage()` caller that semantically renders a passage to pass the explicit fallback policy; document any intentionally retained legacy-only caller in this plan during implementation.during implementation.

**Migration required:** No — this changes read and editor initialization behavior; persisted evidence and authored passage fields remain untouched.

## Phase 5: Make Legacy Auditing Safe and Non-Destructive

**Goal:** Identify likely provenance copies and prevent future AI backfill without modifying historical instructor content.

- [x] Refactor `backfill-passage-content.ts` so its default dry run reports separate counts for manual/non-AI eligible rows, AI rows with null passage, AI rows where normalized passage equals evidence, and AI rows with distinct passage content.
- [x] Restrict `--apply` eligibility to `source_origin <> 'AI_PDF'`; print an explicit skipped-AI count before opening the update transaction.
- [x] Add a read-only exam snapshot audit that joins `exam_questions.source_question_bank_question_id` to `question_bank_questions` and reports snapshots whose passage equals their AI source evidence.
- [x] Add `--output <path>` support that writes a JSON audit report containing record IDs, classification codes, and counts but excludes full evidence, answers, and passage bodies; default console samples must show IDs and classifications only.
- [x] Keep the existing idempotent `passage_content is null` predicate for permitted non-AI updates and preserve transaction rollback on apply failure.
- [x] Export pure argument, classification, and SQL-policy helpers with JSDoc and guard `main()` so `backfill-passage-content.test.ts` can import the script without connecting to a database.
- [x] Add `backfill-passage-content.test.ts` for default dry-run mode, `--apply`, invalid limits, AI exclusion, distinct authored passage preservation, exact-copy classification, exam join classification, redacted output, idempotent predicates, and rollback behavior with a mocked client.
- [x] Keep `app/sentinel-api/package.json` command `backfill:passages` compatible; document the audit-only invocation and do not add an automatic cleanup command.

**Migration required:** No — audit queries are read-only and the existing apply path updates only already-supported non-AI passage columns.

## Phase 6: Integrated Evaluation and Rollout Verification

**Goal:** Demonstrate that generated sets remain answerable, non-leaky, complete, and operationally bounded before release.

- [x] Add `app/sentinel-api/src/lib/gemini/services/question-generator/__fixtures__/passage-quality-evaluation.ts` **[NEW]** with synthetic or licensed cases across all eight question types and multiple source domains; do not include production PDFs or secrets.
- [x] Add `app/sentinel-api/src/lib/gemini/services/question-generator/passage-quality-evaluation.test.ts` **[NEW]** to run the deterministic corpus offline and report exact-answer leak, false-positive, and answerability fixture results.
- [x] Extend `app/sentinel-api/src/tests/gemini/gemini-route.test.ts` to assert a quality-exhaustion 502 is returned through both `/generate-preview` and the legacy `/generate-review` alias without a partial `data` payload.
- [x] Extend `use-import-handler` tests or add `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/use-import-handler.test.ts` **[NEW]** to verify the API’s safe quality-exhaustion message reaches the existing error toast and no preview data is stored.
- [x] Run `pnpm --dir app/sentinel-api exec vitest run` for prompt, normalizer, quality-step, repair, reconciliation, route, and backfill tests.
- [x] Run `pnpm --dir packages/shared exec vitest run src/utils/passage-rendering.test.ts`.
- [x] Run focused `sentinel-web` and `sentinel-core` Vitest files for engine utilities, attempt hook, report, export, question preview, and builder behavior.
- [x] Run `pnpm --dir app/sentinel-api typecheck`, relevant workspace lint commands, and `pnpm format:check`; resolve only regressions introduced by this task and record unrelated baseline failures.
- [x] In a controlled environment with Gemini credentials, generate all eight types from at least three representative PDFs and record requested count, returned count, exact leak rate, semantic-review pass rate, answerability rate, repair rounds, total Gemini calls, and end-to-end latency.
- [x] Confirm every saved preview retains distinct passage and evidence values, then copy representative questions into an exam and verify student attempt, instructor preview, report, and print export show only the passage in passage regions.
- [x] Run `pnpm --dir app/sentinel-api backfill:passages -- --limit 20` without `--apply`, archive the redacted audit counts for release review, and confirm no AI row is eligible for automatic update.

**Migration required:** No — verification exercises existing schemas and read-only audit behavior.

## Done Criteria

- [x] Every new raw AI item requires a non-empty `passageContent`; `passageType` is normalized to `plain`.
- [x] `sourceEvidence` remains exact provenance and is never weakened to satisfy passage checks.
- [x] All eight question types have deterministic validator coverage with stable violation codes.
- [x] Semantic leakage and answerability are assessed in a batched Gemini critic call.
- [x] Only invalid or missing slots are repaired, with no more than two repair rounds.
- [x] Accepted questions preserve their stable slots and metadata through repair.
- [x] Returned previews match the requested total and per-type distribution exactly or fail with an explicit 502.
- [x] Uploaded Gemini files are deleted on every success and failure path.
- [x] Live attempts, previews, reports, print exports, and question preview sheets do not render evidence as passage content.
- [x] Both builders initialize, preview, and save passage content without copying source evidence.
- [x] Instructor metadata continues to show labeled source file, page, and evidence information.
- [x] The legacy backfill excludes AI rows and produces a redacted, non-destructive audit of affected bank questions and exam snapshots.
- [x] No instructor-authored historical passage is automatically overwritten or removed.
- [x] Each phase has passing focused Vitest coverage and an explicit no-migration decision.

## Additional Considerations

- **Breaking API changes:** No public request shape changes. Successful preview responses now consistently populate already-supported `passageContent` and `passageType`; generations that previously returned partial or low-quality sets can now return HTTP 502 after bounded repair.
- **New environment variables:** None. Reuse `GEMINI_API_KEY`, the configured Gemini model, and the existing throttler.
- **Database migration:** None. No rollback migration is required.
- **Dependencies:** Add no embedding, HTML parsing, queue, or retry dependency. Use local normalization utilities, Zod, and the existing `QuestionGeneratorLlmProvider`.
- **Cost and latency:** One critic call is expected per generation round; repair calls occur only for invalid or missing slots. Log counts and durations, not prompts, passages, evidence, or answers.
- **Rate limiting:** Critic and repair calls must go through `GeminiProvider.generateStructuredJson()` so existing request throttling applies.
- **Security and privacy:** Do not log answer keys, source excerpts, passage bodies, PDF contents, or unredacted audit samples.
- **Legacy compatibility:** The shared fallback default remains temporarily available, but every known semantic passage surface must opt out explicitly.
- **Rollback:** Revert the prompt/schema requirement, quality orchestration, and explicit fallback flags together. Existing stored questions remain readable because no schema or data mutation is introduced.
- **Follow-up boundary:** Remediation UX for flagged historical AI questions, persistent quality metrics, and a database-level generated-content version require a separate approved task.
