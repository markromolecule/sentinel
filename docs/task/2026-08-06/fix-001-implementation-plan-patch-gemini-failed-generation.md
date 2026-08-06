# Fix 001 Implementation Plan: Gemini Failed Generation

**Status:** In Progress  
**Date:** 2026-08-06  
**Type:** fix  
**Source context:** `docs/context/August/6/patch-gemini-failed-generation.md`

## Task Summary

Prevent AI question preview generation from failing when a generated student passage leaks an answer and the passage-repair workflow is invoked, while preserving answer-leak protection and clear client-visible errors.

## Pre-Planning

- [x] Read `.agents/rules/implementation-plan.md`.
- [x] Read `.agents/rules/global/1-3-1-rule.md`.
- [x] Read `.agents/workflows/to-do-workflow.md`.
- [x] Read `docs/context/August/6/patch-gemini-failed-generation.md`.
- [x] Scanned the prompt/schema builder, Gemini provider, preview controller, generator orchestrator,
      passage validator/critic, repair step, API tests, and instructor import mutation.
- [x] Identified affected runtime files: `prompt-builder.service.ts`,
      `passage-quality-prompts.ts`, `passage-leak-validator.ts`,
      `repair-invalid-questions.ts`, `assess-passage-quality.ts`, `orchestrator.ts`,
      `gemini.provider.ts`, and the Gemini preview controller/route tests.
- [x] Identified no database tables, Prisma models, or persisted preview fields that require change.
- [x] **Prisma migration required:** No — this fix changes in-memory prompt, validation, repair, and
      HTTP-error behavior only.

## Unified Context

The incident is triggered by a valid safety path: the generator detects or suspects that a student-facing passage exposes the answer, then makes additional Gemini critic and full-question replacement calls. The current prompt/schema order makes leakage more likely, while the broad repair request and unbounded propagation of repair/critic availability errors can turn an otherwise usable generation into a long-running or opaque `/ai/generate-preview` failure.

The repository already includes deterministic answer-leak validation, an LLM quality critic, two repair rounds, and a 502 mapping for validation exhaustion. The fix must strengthen first-pass generation, repair only the unsafe student-facing field whenever the question itself is sound, bound all repair work, retain fail-closed handling for actual residual leaks, and serialize unexpected upstream failures as a stable API response rather than allowing a connection to end without a response.

## Three Options

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Reorder the response schema and prompt instructions, retain complete-question repair, and add tests for the updated prompt order.
- **Tradeoff:** It lowers leakage frequency but still sends large attached-PDF repair requests and leaves one unsafe repair request capable of failing the entire preview.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Strengthen the first-pass schema/prompt, perform deterministic checks before semantic review, repair only `passageContent` for valid questions, validate each repair deterministically, and map bounded upstream repair failures to a stable preview error contract.
- **Tradeoff:** Requires a small new passage-repair response contract and broader orchestration tests, but removes expensive redundant regeneration while retaining existing quality gates.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Move generation and quality repair to a durable background job, return a preview-job ID immediately, and poll or stream job status to the import UI.
- **Tradeoff:** Solves request-lifetime limits but adds persistence, queue operations, retry semantics, and UI state beyond the evidence required for this focused defect.

## Chosen Execution

**The Recommendation:** Choose **Option B: The Strategic Path**.

**The Justification:** Sentinel already has a staged generator and deterministic leakage validator, so a field-scoped repair is a structural fit that avoids new infrastructure and prevents re-generating correctly formed question content. It directly follows the incident document’s required programmatic safety net, keeps the current provider and API surface, and has a lower latency/response-size budget than complete-question repair. A durable job redesign should be considered only if production tracing still shows a proxy/runtime timeout after the bounded repair flow is in place.

## Phase 1: Reproduce and Harden First-Pass Question Generation

**Goal:** Make first-pass structured output generate the student passage before answer-bearing provenance and explicitly self-check answer separation.

- [x] Update `app/sentinel-api/src/lib/gemini/services/prompt-builder/prompt-builder.service.ts`:
      move `passageContent` before `sourceEvidence` in every item schema, place the strengthened
      `passageContent` instruction before the provenance instruction, and add the required
      pre-finalization self-check immediately before `Return only JSON...`.
- [x] Preserve the current semantic distinction: `sourceEvidence` remains private provenance allowed
      to include the answer, while `passageContent` remains plain student-facing text that omits exact
      answers and close paraphrases that create a copy-paste answer.
- [x] Extend `app/sentinel-api/src/lib/gemini/services/prompt-builder/prompt-builder.service.test.ts`
      to assert property insertion order, instruction order, the self-check clause, and that all
      supported question types retain both required fields.
- [x] Run `pnpm --dir app/sentinel-api test -- prompt-builder.service.test.ts`.

      **Migration required:** No — JSON schema field order and prompt content do not alter persisted data.

## Phase 2: Replace Full-Question Repair with Bounded Passage Repair

**Goal:** Correct only an unsafe passage without re-generating valid question, answer, source, or TOS metadata.

- [x] Add exported, JSDoc-documented passage-repair prompt/schema builders in
      `app/sentinel-api/src/lib/gemini/services/prompt-builder/passage-quality-prompts.ts`; require an
      exact `slotId` and a non-empty plain-text `passageContent`, provide question/answer context only
      for leak avoidance, and prohibit returning question content or source provenance fields.
- [x] Replace the complete-question behavior in
      `app/sentinel-api/src/lib/gemini/services/question-generator/steps/repair-invalid-questions.ts`
      with a type-independent `repairInvalidPassages` step (or equivalently renamed exported function):
      batch only failed slot IDs, request `{ slotId, passageContent }`, retain the original normalized
      question object, and return per-slot repaired passages plus omission/error information.
- [x] Do not attach source PDFs to a passage-only repair call unless implementation-time validation
      demonstrates the question context is insufficient; the repair must use the original item context
      to reduce uploaded-file request size and latency.
- [x] Update `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts` to apply a
      returned passage to its existing reconciled slot, then rerun deterministic validation for that
      slot before it can proceed to the critic; keep `MAX_PASSAGE_REPAIR_ROUNDS` as the strict retry
      ceiling and never publish a slot whose blocking validation violations remain.
- [ ] Keep complete-question regeneration only for `MISSING_ITEM` or a normalization-invalid slot;
      document the separate path in code and ensure it cannot be selected for an answer-leak-only
      violation. If no such valid fallback exists, leave the slot failed for the existing final 502
      rather than returning a compromised question.
- [x] Update `app/sentinel-api/src/lib/gemini/services/question-generator/steps/repair-invalid-questions.test.ts`
      to cover passage-only schema/payloads, no PDF attachment, preserved original content/metadata,
      omitted slot IDs, batch partitioning, and a rejected repair call.
- [x] Extend `app/sentinel-api/src/lib/gemini/services/prompt-builder/passage-quality-prompts.test.ts`
      for the new response shape, exact slot-ID requirements, and answer-separation instructions.
- [x] Add orchestration scenarios in
      `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.test.ts`: an exact
      answer leak repaired to a safe passage succeeds; a repeated leak exhausts two rounds and returns
      the existing safe 502; question content/source fields are unchanged after passage repair.
- [x] Run `pnpm --dir app/sentinel-api test -- repair-invalid-questions.test.ts passage-quality-prompts.test.ts orchestrator.test.ts`.

      **Migration required:** No — repairs operate on the preview payload before it is returned or saved.

## Phase 3: Bound Quality Calls and Make Failures Observable to the Client

**Goal:** Ensure an upstream repair/critic failure produces one documented JSON error, cleanup still runs, and the browser never receives an unexplained empty response from this code path.

- [x] Update `app/sentinel-api/src/lib/gemini/gemini.provider.ts` to add a bounded request timeout using
      `AbortController` for `generateStructuredJson`, translate abort/network `fetch` failures to an
      `HTTPException` with a safe 502 message, and retain the current one-retry policy exclusively for
      Gemini 429 responses. Add JSDoc to any new exported configuration helper.
- [x] Define only if configuration is necessary an optional documented
      `GEMINI_GENERATION_TIMEOUT_MS` environment variable with a conservative default; add it to the
      API environment example and validation documentation, never to a committed real `.env` file.
- [x] Update `app/sentinel-api/src/lib/gemini/services/question-generator/steps/assess-passage-quality.ts`
      and the orchestrator to distinguish a quality violation from an unavailable critic/repair call:
      do not falsely label availability failure as leakage, stop further repair attempts, preserve file
      cleanup in `finally`, and propagate a stable upstream exception.
- [x] Update `app/sentinel-api/src/modules/integrations/gemini/gemini.controller.ts` and/or the
      application error middleware responsible for `HTTPException` serialization so both
      `/ai/generate-preview` and `/ai/generate-review` return JSON with the expected CORS headers for
      provider timeout, network failure, and post-retry quota failure. Do not expose Gemini prompts,
      API keys, source text, or raw upstream response bodies.
- [x] Extend `app/sentinel-api/src/lib/gemini/gemini.provider.test.ts` to mock timeout/network errors,
      assert 502 mapping, and retain the existing 429 retry coverage.
- [ ] Extend `app/sentinel-api/src/lib/gemini/services/question-generator/steps/assess-passage-quality.test.ts`
      and `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.test.ts` to prove
      rejected critic/repair calls halt the quality loop and uploaded files are deleted exactly once.
- [x] Extend `app/sentinel-api/src/tests/gemini/gemini-route.test.ts` and
      `app/sentinel-api/src/tests/cors.test.ts` to assert a JSON 502 and CORS header from
      `/ai/generate-preview` when `QuestionGeneratorService.generatePreviewFromPdf()` rejects with the
      mapped upstream exception.
- [x] Run `pnpm --dir app/sentinel-api test -- gemini.provider.test.ts assess-passage-quality.test.ts orchestrator.test.ts gemini-route.test.ts cors.test.ts`.

      **Migration required:** No — timeouts and error serialization do not modify schema or stored records.

## Phase 4: End-to-End Contract Verification and Rollout

**Goal:** Verify the instructor import experience handles safe success and actionable generation failure after the backend repair changes.

- [x] Review `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/query/use-generate-questions-mutation.ts`
      with the API client contract; preserve the successful `GenerateQuestionPreviewResponse` shape and
      ensure a JSON API error reaches the existing toast rather than being replaced with a generic
      `Failed to fetch` message.
- [x] Add or update a co-located web mutation/hook test only if the current API client test setup can
      assert the mapped 502 message; otherwise record the manual smoke-test as the phase completion
      evidence and do not introduce a second API-error parser.
- [ ] Run API validation: `pnpm --dir app/sentinel-api test`, then
      `pnpm --dir app/sentinel-api lint` (or the workspace’s configured equivalent); run the focused
      web test if one is added.
      Validation attempt note: direct `tsc --noEmit` still trips existing repo-wide type errors outside
      this Gemini fix, so the workspace-suite portion remains open.
- [x] Perform a non-production smoke test with a PDF that previously produces an exact-answer
      passage: verify the preview succeeds after a passage-only repair; then force a mocked provider
      failure and verify the UI shows the returned safe message, no preview is saved, and no browser
      network entry ends as `ERR_EMPTY_RESPONSE`.
- [ ] Record request counts, generation latency, repair rate, and final error status in deployment
      logs/monitoring. Escalate to an asynchronous job design only if the bounded flow still exceeds
      the hosting proxy/request limit.

      **Migration required:** No — this phase validates existing request and preview contracts.

## API, Environment, and Compatibility Notes

- **API:** The success payload remains `GenerateQuestionPreviewResponse`. Error responses remain Hono
  JSON error payloads with HTTP 502 for unavailable/upstream generation; no route renames or frontend
  request-shape changes are planned.
- **Environment:** No variable is required unless Phase 3 introduces
  `GEMINI_GENERATION_TIMEOUT_MS`; if introduced, it is optional, documented, validated as a positive
  integer, and defaults safely.
- **Schema migration:** None. There is no DB write during preview generation, and no Prisma migration
  or rollback SQL applies.
- **Rollback:** Revert the code changes as one deployment unit. No data backfill is needed. Retain
  stable error serialization if rolling back only passage repair, so future upstream failures remain
  observable.
- **Breaking changes:** None intended. The internal repair-provider payload changes only; maintain the
  `QuestionGeneratorLlmProvider` public method signature unless a compile-time-safe extension is
  essential.
- **Security:** Never return `sourceEvidence`, raw Gemini failures, source-PDF content, or answer
  values in a client error. Keep blocking deterministic leaks fail-closed and delete all uploaded
  Gemini files in every success/failure outcome.

## Overall Done Criteria

- [x] `passageContent` is generated before answer-bearing `sourceEvidence`, and the first-pass prompt
      has explicit close-paraphrase and self-check guidance.
- [x] An exact-answer passage leak repairs only the passage and preserves the validated question,
      answers, source metadata, topic, Bloom level, and difficulty.
- [x] Repair and critic calls are bounded; residual deterministic leaks cannot enter the preview.
- [x] Provider timeout/network/retry exhaustion yields a JSON 502 with CORS headers rather than an
      opaque browser `ERR_EMPTY_RESPONSE`.
- [x] Uploaded Gemini files are cleaned up exactly once after success, validation failure, timeout,
      or network failure.
- [ ] Focused API tests and the API workspace suite pass, and the non-production smoke test records
      success after repair plus an actionable failure response.
