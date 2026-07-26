# Groq Question Generation Provider Implementation Plan

**Status:** Planned  
**Date:** 2026-07-26  
**Type:** Feature / Provider Migration  
**Affected workspace:** `app/sentinel-api`  
**Existing public endpoint:** `POST /ai/generate-preview`  
**Rules:** `.agents/rules/implementation-plan.md`,
`.agents/rules/global/1-3-1-rule.md`, `.agents/workflows/to-do-workflow.md`

## Pre-Planning Checklist

- [x] Read and summarize the request in one sentence.
- [x] Inspect the current question-generation route, controller, Gemini provider, orchestration
      steps, prompts, response schemas, normalization, tests, API client callers, and environment
      examples.
- [x] Identify the files, services, external APIs, and configuration the implementation will
      touch.
- [x] Determine whether a Prisma migration is needed: **No**. Provider selection, PDF text
      extraction, structured generation, and telemetry do not change persisted entities.
- [x] Inspect the current working tree and identify pre-existing edits in the Gemini generation
      pipeline that must not be overwritten.

## Task Summary

Add Groq as an opt-in question-generation provider for text-based PDFs while keeping the current
Gemini-native PDF pipeline as the unchanged default, preserving the existing HTTP request/response
contract and providing an environment-only rollback path.

## 1. The Context

Question generation is structurally coupled to Gemini because the current orchestrator uploads
PDFs to the Gemini File API, attaches Gemini file URIs, asks Gemini for page counts, and cleans up
Gemini files. Groq can produce schema-shaped JSON, but its general Files API is not a replacement
for Gemini's native PDF attachment flow, so the migration must introduce local page-preserving PDF
text extraction without destabilizing the established Gemini behavior.

The public `/ai/generate-preview` contract, shared Gemini-named schemas, frontend callers,
normalization behavior, and existing Gemini tests must remain compatible. Provider selection must
be controlled by server configuration, default to Gemini, require no database migration, and allow
rollback by changing one environment value and restarting the API.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Modify `QuestionGeneratorLlmProvider` so a `GroqProvider` imitates Gemini's
  `uploadFile()`, `generateStructuredJson()`, and `deleteFile()` methods, storing extracted PDF text
  in provider-specific pseudo-file records.
- **Tradeoff:** This minimizes orchestration changes but gives Groq misleading file lifecycle
  semantics, increases conditional behavior inside Gemini-oriented steps, and makes future provider
  debugging difficult.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Keep `QuestionGeneratorService` and `GeminiProvider` intact, add a provider-neutral
  facade at the controller boundary, and implement a separate Groq orchestrator that reuses only
  stable prompt, schema, batching, normalization, and response-building utilities.
- **Tradeoff:** This introduces a small amount of orchestration duplication, but it isolates
  provider-specific document ingestion and gives Gemini a zero-change compatibility path.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Convert every PDF page to an image and send page images to a Groq vision model,
  splitting and merging requests around Groq's image-per-request limits.
- **Tradeoff:** This preserves visual document understanding but adds rendering, request
  partitioning, citation reconciliation, larger payloads, and substantially more failure modes than
  the requested provider migration warrants.

## 1. The Execution

**The Recommendation:** Choose **Option B: The Strategic Path**.

**The Justification:** An additive facade and isolated Groq pipeline provide the smallest blast
radius for a service already deeply aligned to Gemini. The existing Gemini upload, generation,
page-count, cleanup, error, and test paths remain callable exactly as they are, while Groq receives
the different ingestion model it requires. The only new runtime dependency is a local PDF parser;
the Groq HTTP call can follow the repository's existing native `fetch` pattern without adding an
SDK.

**Next Steps:**

1. Add tested provider configuration and a facade whose absent configuration delegates to the
   existing Gemini service.
2. Add local page-preserving PDF extraction, the Groq HTTP provider, and a Groq-specific
   orchestrator that returns the existing preview schema.
3. Switch only the controller's internal service call to the facade, add provider-aware telemetry,
   run Gemini/Groq regression suites, and enable Groq through staging configuration before
   production.

## Existing Findings

- `app/sentinel-api/src/modules/integrations/gemini/gemini.controller.ts` owns
  `/generate-preview` and `/generate-review`, permission checks, the 25 MB per-PDF limit, service
  invocation, and Gemini-specific telemetry.
- `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts` defaults directly to
  `GeminiProvider` and performs upload, generation, page-count resolution, normalization, response
  construction, and cleanup.
- `QuestionGeneratorLlmProvider` is not provider-neutral in practice because it requires
  `resolveFlashModel()`, `uploadFile()`, file URIs, and `deleteFile()`.
- `buildPrompt()` already accepts page-preserving `sourceDocuments`; when pages contain extracted
  text, it embeds filename, page number, and page text into the prompt instead of requesting Gemini
  native PDF understanding.
- `pdf-page-extractor.ts` currently defines only `ExtractedPdfPage` and `ExtractedPdfDocument`; it
  does not implement PDF parsing.
- `buildResponseJsonSchema()` can be sent through Groq's best-effort `json_schema` response format,
  while existing Zod parsing and question normalization remain the final validation boundary.
- Groq strict structured output is not selected initially because the current schema does not make
  every object closed with `additionalProperties: false` and contains fields that are optional in
  normalization.
- Groq's general Files API documents `batch` and `batch_output` purposes; it is not treated as a
  native chat PDF-attachment equivalent.
- Both `sentinel-web` and `sentinel-core` already call `/ai/generate-preview`, so no frontend route
  or request change is required.
- The current working tree contains uncommitted edits in Gemini throttling, orchestration,
  generation concurrency, evidence matching, and tests; implementation must preserve those edits
  and avoid whole-file rewrites.

## Fixed Compatibility Decisions

- `AI_QUESTION_PROVIDER` is optional and resolves to `gemini` when absent or blank.
- `GROQ_API_KEY` alone never activates Groq.
- Allowed provider values are exactly `gemini` and `groq`; an unknown non-empty value produces a
  configuration error before any external request.
- Provider selection is environment-controlled and is not accepted from multipart form data,
  query parameters, headers, or user-controlled configuration.
- `/ai/generate-preview`, `/ai/generate-review`, multipart field names, permissions, status codes,
  and the `GenerateQuestionPreviewResponse` shape remain unchanged.
- The existing `QuestionGeneratorService`, `GeminiProvider`, upload/page-count/cleanup steps, shared
  Gemini-named schemas, and frontend callers are not renamed or moved in this feature.
- Gemini remains capable of native PDF understanding, including document structure, tables, and
  embedded images.
- Groq version 1 supports text-based PDFs only. A PDF with no extractable text returns a specific
  client-facing `422` error; it does not silently generate from filenames or switch providers.
- Groq source text is never silently truncated. Requests exceeding the configured source-character
  budget return `413` before an external call.
- Groq obtains page counts from local extraction and never asks the model to infer document length.
- Groq uses best-effort JSON Schema output plus the existing Zod/normalization checks; strict mode
  is deferred until a provider-specific schema transformer is separately designed and tested.
- Partial Groq batch success follows the existing generation behavior: fulfilled batches are
  retained, but zero fulfilled questions produces the existing all-batches-failed error contract.
- Gemini retains `integration.gemini_scan_completed`; Groq emits
  `integration.groq_generation_completed`. Existing telemetry identifiers are not renamed.
- No automatic Gemini fallback occurs after a Groq error because it can consume Gemini quota
  unexpectedly and mask provider failures.

## Files and Services in Scope

### Existing files to modify

- `app/sentinel-api/.env.example`
- `app/sentinel-api/package.json`
- `pnpm-lock.yaml`
- `app/sentinel-api/src/modules/integrations/gemini/gemini.controller.ts`
- `app/sentinel-api/src/tests/gemini/gemini-route.test.ts`

### Provider-neutral facade to add

- `app/sentinel-api/src/lib/ai/question-generator/provider-config.ts`
- `app/sentinel-api/src/lib/ai/question-generator/provider-config.test.ts`
- `app/sentinel-api/src/lib/ai/question-generator/question-generator.facade.ts`
- `app/sentinel-api/src/lib/ai/question-generator/question-generator.facade.test.ts`
- `app/sentinel-api/src/lib/ai/question-generator/index.ts`

### Groq implementation to add

- `app/sentinel-api/src/lib/groq/groq.provider.ts`
- `app/sentinel-api/src/lib/groq/groq.provider.test.ts`
- `app/sentinel-api/src/lib/groq/services/pdf-text-extractor.ts`
- `app/sentinel-api/src/lib/groq/services/pdf-text-extractor.test.ts`
- `app/sentinel-api/src/lib/groq/services/question-generator/generate-batches.ts`
- `app/sentinel-api/src/lib/groq/services/question-generator/generate-batches.test.ts`
- `app/sentinel-api/src/lib/groq/services/question-generator/orchestrator.ts`
- `app/sentinel-api/src/lib/groq/services/question-generator/orchestrator.test.ts`
- `app/sentinel-api/src/lib/groq/services/question-generator/index.ts`
- `app/sentinel-api/src/lib/groq/tests/fixtures/text-one-page.pdf`
- `app/sentinel-api/src/lib/groq/tests/fixtures/text-multiple-pages.pdf`
- `app/sentinel-api/src/lib/groq/tests/fixtures/image-only.pdf`

### Existing reusable files to import without modifying

- `app/sentinel-api/src/lib/gemini/gemini.provider.ts`
- `app/sentinel-api/src/lib/gemini/services/prompt-builder/prompt-builder.service.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/build-response.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/normalize-questions.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/utils/concurrency.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/utils/create-batches.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/pdf-page-extractor.ts`
- `app/sentinel-api/src/lib/gemini/services/question-normalizer/index.ts`
- `packages/shared/src/schema/gemini/gemini-schema.ts`

### External services and data

- Groq Chat Completions API: `https://api.groq.com/openai/v1/chat/completions`
- Gemini API: unchanged
- Database tables: none added or structurally changed

## Phase 1: Establish Provider Configuration and the Compatibility Facade

**Goal:** Add an opt-in provider boundary that proves Gemini remains the default and unchanged.

- [ ] In `app/sentinel-api/src/lib/ai/question-generator/provider-config.ts`, export the documented
      `QUESTION_GENERATION_PROVIDERS`, `QuestionGenerationProvider`, and
      `resolveQuestionGenerationProvider()` APIs; normalize whitespace/case, return `gemini` for an
      absent or blank value, accept only `gemini` or `groq`, and throw `HTTPException(500)` for an
      unsupported configured value.
- [ ] In
      `app/sentinel-api/src/lib/ai/question-generator/question-generator.facade.ts`, export the
      documented `AiQuestionGeneratorService.generatePreviewFromPdf()` method with the same
      `files`, `config`, and `GenerateQuestionPreviewResponse` contract as the existing service;
      accept an optional internal `provider` override for deterministic tests, delegate `gemini`
      directly to `QuestionGeneratorService.generatePreviewFromPdf()`, and make the temporary
      `groq` branch throw a tested `HTTPException(501)` until Phase 4 replaces that branch with the
      Groq orchestrator.
- [ ] In `app/sentinel-api/src/lib/ai/question-generator/index.ts`, export only the facade,
      provider resolver, and provider type required by the controller; do not re-export provider
      API keys or internal Groq request types.
- [ ] Add
      `app/sentinel-api/src/lib/ai/question-generator/provider-config.test.ts` covering absent,
      blank, mixed-case Gemini, mixed-case Groq, surrounding whitespace, and unsupported provider
      configuration.
- [ ] Add
      `app/sentinel-api/src/lib/ai/question-generator/question-generator.facade.test.ts` using
      service spies to prove omitted configuration and explicit `gemini` call the existing
      `QuestionGeneratorService` once with the original arguments, while the temporary `groq`
      branch returns `501` and does not call Gemini.
- [ ] Run the existing
      `app/sentinel-api/src/tests/gemini/question-generator.test.ts`,
      `app/sentinel-api/src/tests/gemini/gemini-route.test.ts`, and feature-local Gemini step tests
      before and after the facade addition; record any pre-existing failure without modifying
      unrelated behavior.

**Migration required:** No — this phase adds an internal dispatch boundary and retains Gemini as
the default.

## Phase 2: Implement Page-Preserving PDF Text Extraction

**Goal:** Convert text-based PDFs into deterministic source documents that preserve filenames and
1-based page citations for Groq.

- [ ] Add `pdfjs-dist` to `app/sentinel-api/package.json` and update `pnpm-lock.yaml`; use the
      Node-compatible legacy PDF.js entry point with workers disabled instead of adding a separate
      service, binary, or OCR dependency.
- [ ] In `app/sentinel-api/src/lib/groq/services/pdf-text-extractor.ts`, export the documented
      `extractPdfTextDocument(file)` and `extractPdfTextDocuments(files)` functions; load each
      `File` as `Uint8Array`, iterate all PDF.js pages in ascending order, join string text items
      with normalized single spaces, and return the existing `ExtractedPdfDocument` shape with
      original filenames and exact 1-based page numbers.
- [ ] In the same extractor, map invalid/encrypted PDFs to `HTTPException(422)` with a stable
      actionable message, reject a document whose combined trimmed page text is empty with a
      text-based-PDF requirement message, and close/destroy PDF.js resources in `finally`.
- [ ] In the same extractor, export the documented
      `assertGroqSourceCharacterBudget(documents, maximumCharacters)` helper; count page text plus
      rendered filename/page labels and throw `HTTPException(413)` before Groq invocation when the
      configured limit is exceeded.
- [ ] Add
      `app/sentinel-api/src/lib/groq/services/pdf-text-extractor.test.ts` using the committed
      fixtures to verify one-page extraction, multi-page ordering, original filenames, exact
      `pageCount`, 1-based page numbers, Unicode/whitespace normalization, multi-file ordering,
      image-only rejection, malformed input rejection, and source-budget rejection.
- [ ] Keep
      `app/sentinel-api/src/lib/gemini/services/question-generator/pdf-page-extractor.ts` unchanged;
      tests must prove the Groq extractor returns its existing public type rather than replacing
      that shared type.

**Migration required:** No — a runtime dependency and new in-memory extraction path are added; no
database or persisted-file change occurs.

## Phase 3: Implement the Groq Structured-Generation Provider

**Goal:** Add a tested Groq HTTP adapter that returns parsed JSON without introducing Groq concerns
into Gemini code.

- [ ] In `app/sentinel-api/src/lib/groq/groq.provider.ts`, export the documented
      `GroqProvider.resolveModel()` method; resolve an explicit argument, then `GROQ_MODEL`, then
      the documented default `openai/gpt-oss-20b`.
- [ ] In the same provider, export the documented
      `GroqProvider.generateStructuredJson<T>()` method accepting `prompt`,
      `responseJsonSchema`, and optional `model`; call
      `https://api.groq.com/openai/v1/chat/completions` with bearer authentication, a JSON-only
      system instruction, the user prompt, and `response_format.type = "json_schema"` with
      `strict: false`.
- [ ] In the same provider, read and trim `GROQ_API_KEY` only when a Groq call is made; throw
      `HTTPException(500)` for a missing key without logging the key or request authorization
      header.
- [ ] In the same provider, apply a 120-second abort signal, parse
      `choices[0].message.content`, throw `502` for an empty or non-string response, and throw `502`
      for invalid JSON while logging only bounded response diagnostics.
- [ ] In the same provider, map upstream `400`, `401`, `403`, `404`, `409`, `413`, `415`, `422`,
      and `429` statuses directly and map other upstream failures to `502`; extract Groq's
      `error.message` when present without exposing secrets.
- [ ] Add `app/sentinel-api/src/lib/groq/groq.provider.test.ts` with mocked `globalThis.fetch`
      coverage for model precedence, endpoint, authorization, request messages, best-effort JSON
      Schema body, valid parsing, missing key, upstream error mapping, empty content, invalid JSON,
      timeout/abort propagation, and proof that logged diagnostics exclude the API key.
- [ ] Keep `app/sentinel-api/src/lib/gemini/gemini.provider.ts` and
      `app/sentinel-api/src/lib/gemini/middleware/gemini-request-throttler.ts` unchanged in this
      phase; rerun their existing tests or the nearest question-generator contract suite.

**Migration required:** No — this phase adds an external provider adapter without persistence
changes.

## Phase 4: Implement the Isolated Groq Question-Generation Pipeline

**Goal:** Generate the existing preview response from extracted source pages without invoking any
Gemini upload, metadata, or cleanup operation.

- [ ] In
      `app/sentinel-api/src/lib/groq/services/question-generator/generate-batches.ts`, export the
      documented `generateGroqBatchesStep()` function; accept existing
      `GenerateQuestionPreviewConfig` batches and extracted documents, call `buildPrompt()` with
      `sourceDocuments`, call `buildResponseJsonSchema()` for each batch, and invoke
      `GroqProvider.generateStructuredJson()` without file URI arguments.
- [ ] In the same batch step, parse each returned question group with the same raw-item Zod fields
      used by the current Gemini batch step, attach the group key as `type`, execute tasks through
      the existing `runWithConcurrencyLimit()` helper with a Groq-specific default concurrency of
      `1`, retain fulfilled batches, and throw the existing all-batches-failed `502` message when
      no generated questions remain.
- [ ] In
      `app/sentinel-api/src/lib/groq/services/question-generator/orchestrator.ts`, export the
      documented `GroqQuestionGeneratorService.generatePreviewFromPdf()` method with the same input
      and return types as `QuestionGeneratorService`; extract source documents, enforce
      `GROQ_MAX_SOURCE_CHARACTERS` with a validated default of `300000`, create batches with the
      current `25`-question size, and resolve the Groq model once per request.
- [ ] In the same orchestrator, pass raw questions and extracted documents through the existing
      `normalizeQuestionsStep()` and `buildResponseStep()` functions so `model`, `fileName`,
      `fileSizeBytes`, `pageCount`, source attribution, and question output remain contract
      compatible.
- [ ] In the same orchestrator, translate Zod and `QuestionNormalizationError` failures to a
      provider-neutral `502` response, preserve upstream HTTP exceptions, and perform no Gemini
      upload, page-count, or cleanup calls. Use this exact response text: “Groq returned data that
      did not match the required question schema.”
- [ ] In
      `app/sentinel-api/src/lib/groq/services/question-generator/index.ts`, export only
      `GroqQuestionGeneratorService` and the types required by the facade.
- [ ] Add
      `app/sentinel-api/src/lib/groq/services/question-generator/generate-batches.test.ts`
      covering extracted source text/page labels in prompts, schema forwarding, configured model,
      question type attachment, concurrency-one execution, partial batch success, malformed batch
      output, and total batch failure.
- [ ] Add
      `app/sentinel-api/src/lib/groq/services/question-generator/orchestrator.test.ts` covering
      extraction-to-preview flow, multiple PDFs, exact page-count sum, file-size sum, model
      reporting, evidence/page normalization, selected question distribution, source-budget
      rejection before provider invocation, image-only rejection, normalization failure mapping,
      and proof that `GeminiProvider.uploadFile()`, `generateStructuredJson()`, and `deleteFile()`
      are never called.
- [ ] Complete the `groq` branch in
      `app/sentinel-api/src/lib/ai/question-generator/question-generator.facade.ts` and extend its
      colocated test to prove exact argument/response forwarding to
      `GroqQuestionGeneratorService`.

**Migration required:** No — the Groq pipeline operates on request-local memory and returns the
existing shared response type.

## Phase 5: Integrate the Facade Without Changing the HTTP Contract

**Goal:** Route existing AI requests through the selected provider while preserving all frontend
and Gemini behavior.

- [ ] In
      `app/sentinel-api/src/modules/integrations/gemini/gemini.controller.ts`, replace the direct
      `QuestionGeneratorService` import/call with `AiQuestionGeneratorService`; resolve the
      provider once before generation and pass it as the facade's internal override so service
      dispatch and telemetry cannot disagree.
- [ ] In the same controller, keep request parsing, PDF size validation, permissions, institution
      resolution, response message, response data, and both route paths unchanged.
- [ ] In the same controller, preserve the existing `integration.gemini_scan_completed`,
      `gemini` resource type, and `gemini-scan` resource ID when Gemini is selected; emit
      `integration.groq_generation_completed`, the `groq` resource type, and the
      `groq-question-generation` resource ID when Groq is selected, with provider, model, file
      count, page count, prompt type, and latency in non-secret details.
- [ ] In `app/sentinel-api/src/tests/gemini/gemini-route.test.ts`, retain existing route,
      permission, multipart, response, and Gemini service expectations; add facade/provider mocks
      proving default Gemini behavior and Groq dispatch produce the same public `200` response
      structure.
- [ ] In the same route test, verify Gemini and Groq emit their respective telemetry identifiers,
      a telemetry write failure does not fail generation, and no API key appears in log details.
- [ ] Confirm
      `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/query/use-generate-questions-mutation.ts`
      and
      `app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal/_hooks/query/use-generate-questions-mutation.ts`
      remain unmodified and continue calling `/ai/generate-preview`.

**Migration required:** No — the public route and response contract remain stable; only internal
service dispatch and provider-specific telemetry are added.

## Phase 6: Document Configuration, Validate, and Roll Out Safely

**Goal:** Prove provider isolation and enable Groq with an environment-only rollback.

- [ ] In `app/sentinel-api/.env.example`, document `AI_QUESTION_PROVIDER=gemini`,
      `GROQ_API_KEY=[GROQ-API-KEY]`, `GROQ_MODEL=openai/gpt-oss-20b`, and
      `GROQ_MAX_SOURCE_CHARACTERS=300000`; state that Gemini is the default and never include the
      real key from `app/sentinel-api/.env`.
- [ ] Run `pnpm --dir app/sentinel-api test src/lib/ai` and
      `pnpm --dir app/sentinel-api test src/lib/groq` for provider configuration, extraction,
      adapter, batching, and orchestration coverage.
- [ ] Run `pnpm --dir app/sentinel-api test src/tests/gemini` plus the feature-local tests under
      `src/lib/gemini/services/question-generator` to verify the unchanged Gemini path.
- [ ] Run `pnpm --dir app/sentinel-api typecheck`,
      `pnpm --dir app/sentinel-api test`, `pnpm lint`, and `pnpm format:check`; fix only failures
      caused by files listed in this plan and record unrelated pre-existing failures.
- [ ] In local development with `AI_QUESTION_PROVIDER=groq`, manually verify a one-page text PDF,
      multi-page text PDF, multiple PDFs, mixed question types, an image-only PDF, a malformed PDF,
      and a source-budget overflow without printing the real API key.
- [ ] In local development with `AI_QUESTION_PROVIDER` omitted, manually verify a PDF still follows
      Gemini upload, native generation, page-count resolution, and cleanup behavior.
- [ ] Deploy with `AI_QUESTION_PROVIDER` omitted or explicitly `gemini`; verify the release changes
      no production generation behavior before enabling Groq in staging.
- [ ] Enable `AI_QUESTION_PROVIDER=groq` in staging, compare response validity, citation accuracy,
      latency, `429`/`5xx` rates, and empty-text rejection against Gemini, then enable production
      only after the acceptance checklist passes.
- [ ] Verify rollback by restoring `AI_QUESTION_PROVIDER=gemini` and restarting the API; confirm no
      code rollback, database action, frontend deployment, or key removal is required.

**Migration required:** No — rollout is controlled entirely by API environment configuration.

## Acceptance Criteria

- [ ] With `AI_QUESTION_PROVIDER` absent or blank, every request delegates to the existing Gemini
      service and retains native PDF upload, generation, page-count, and cleanup behavior.
- [ ] With `AI_QUESTION_PROVIDER=groq`, text-based PDFs generate questions through Groq without
      calling any Gemini API method.
- [ ] An unsupported provider value fails before PDF processing or an external request.
- [ ] Existing `/ai/generate-preview` and `/ai/generate-review` request/response contracts,
      permissions, frontend callers, and shared schemas remain unchanged.
- [ ] Groq output passes the existing Zod parsing, normalization, source-attribution, and preview
      response construction.
- [ ] Extracted filenames, page counts, page numbers, and page text remain correctly associated for
      one or multiple PDFs.
- [ ] Image-only, encrypted, and malformed PDFs fail on the Groq path with stable actionable
      messages and do not affect Gemini support.
- [ ] Source content exceeding `GROQ_MAX_SOURCE_CHARACTERS` is rejected before the Groq request and
      is never silently truncated.
- [ ] Groq uses best-effort JSON Schema output and returns controlled errors for invalid, empty,
      refused, rate-limited, timed-out, or upstream-failed responses.
- [ ] Gemini and Groq emit distinct telemetry identifiers without recording provider secrets.
- [ ] The real `GROQ_API_KEY` is read only at runtime, is never committed, and never appears in
      tests, logs, errors, telemetry, or documentation.
- [ ] Focused Groq tests, Gemini regression tests, API tests, typecheck, lint, and formatting checks
      pass, excluding documented pre-existing failures.
- [ ] Switching back to Gemini requires only an environment change and API restart.

## Compatibility, Configuration, Security, and Rollback Notes

- **Breaking API changes:** None. Existing HTTP paths, multipart fields, status/response shape, and
  frontend contracts remain stable.
- **Database migration:** No. No Prisma schema, migration, seed, or persisted record changes are
  required.
- **New environment variables:** `AI_QUESTION_PROVIDER`, `GROQ_MODEL`, and
  `GROQ_MAX_SOURCE_CHARACTERS`, `GROQ_MAX_COMPLETION_TOKENS`, and
  `GROQ_REASONING_EFFORT`; `GROQ_API_KEY` already exists locally but must be added to the
  deployment secret store before Groq is enabled.
- **New dependency:** `pdfjs-dist` in `app/sentinel-api` for request-local, page-preserving PDF text
  extraction.
- **Secret handling:** Never read, print, copy, validate by echoing, or commit the value in
  `app/sentinel-api/.env`. Tests must use placeholder values and mocked HTTP.
- **Provider fallback:** No automatic cross-provider fallback. Operator-controlled selection avoids
  surprise Gemini quota consumption.
- **Known version-1 limitation:** Groq supports text-based PDFs only in this implementation.
  OCR/vision fallback and large-document chunking require separate plans.
- **Rollback:** Set `AI_QUESTION_PROVIDER=gemini` and restart the API. Because Gemini remains the
  default implementation and no schema/data migration occurs, rollback requires no application
  code revert, database rollback, or frontend deployment.
- **Reference documentation:** [Groq Structured Outputs](https://console.groq.com/docs/structured-outputs),
  [Groq API Reference](https://console.groq.com/docs/api-reference), and
  [Groq Vision](https://console.groq.com/docs/vision).
