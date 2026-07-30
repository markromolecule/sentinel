# Fix AI-Generated Passages That Reveal Their Answers

## Purpose

Prepare a code-backed problem statement and delivery boundary for a separate
implementation plan. This document describes the defect, the current data flow,
the desired content contract, the likely change surface, and the decisions that
must be settled before implementation begins.

## Problem Statement

Questions generated from PDF lessons can show students a passage that contains
the correct answer verbatim or states the same conclusion as the question. The
student can then copy or keyword-match the answer instead of interpreting the
passage.

This is not only a prompt-quality problem. The current application conflates two
different kinds of content:

- `sourceEvidence`: an instructor-facing provenance excerpt that proves where
  the answer came from; it is intentionally copied verbatim from the source PDF.
- `passageContent`: student-facing context intended to support the question
  without giving away the response.

When `passageContent` is absent, several compatibility paths substitute
`sourceEvidence`. For newly generated AI questions, that substitution turns the
answer-bearing provenance excerpt into the student passage.

## User and Product Impact

- Generated questions can be technically valid but pedagogically invalid.
- Reported difficulty and Bloom's level no longer reflect the effort required
  to answer the item.
- Instructors must inspect and rewrite generated content manually.
- The same leaky content can be copied into question-bank records and exam
  snapshots, allowing the defect to persist after the generation preview.
- Existing backfilled questions may already contain `sourceEvidence` copied
  into `passageContent`, so fixing only new generations will not correct all
  stored content.

## Verified Current Behavior

The following findings are based on the current repository rather than the
original suspected root cause.

### Generation contract

`app/sentinel-api/src/lib/gemini/services/prompt-builder/prompt-builder.service.ts`
currently:

- requires `sourceFileName`, `sourcePageNumber`, and `sourceEvidence`;
- explicitly tells Gemini to make `sourceEvidence` a short **verbatim** excerpt
  from the source page;
- does not request `passageContent` or `passageType` in the prompt or structured
  response schema.

The raw generation and normalization pipeline also omits passage fields:

- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/types.ts`
- `app/sentinel-api/src/lib/gemini/services/question-normalizer/normalizer.ts`

Consequently, a new AI question normally has provenance metadata but no
dedicated student-facing passage.

### Persistence

`questionInputSchema` already supports nullable `passageContent` and a closed
`passageType` of `plain | html`. Question-bank and exam persistence paths also
already store these fields. No new database column appears necessary for this
fix.

When the AI preview is saved,
`create-question-bank-questions.service.ts` persists the generated
`sourceEvidence` but writes `passage_content` as `null` unless the instructor
edited the preview and added one.

### Student rendering

`packages/shared/src/utils/passage-rendering.ts` prefers `passageContent`, but
falls back to `sourceEvidence` whenever passage content is empty.

`app/sentinel-web/src/features/exams/_components/engine/utils.ts` calls that
shared fallback for the live student attempt. The same shared helper is used by
other preview, report, and export surfaces.

This means the verbatim answer-support excerpt can become the displayed
passage even though it was generated as provenance rather than student
material.

### Editing and legacy compatibility

Both question builders initialize their passage editor from
`initialData.passageContent ?? initialData.sourceEvidence`. Editing and saving
an AI-generated question can therefore promote provenance text into authored
passage content:

- `app/sentinel-web/src/features/exams/builder/_components/question-builder-form.tsx`
- `app/sentinel-core/src/features/exams/builder/_components/question-builder-form.tsx`

The existing `app/sentinel-api/scripts/backfill-passage-content.ts` copies every
non-empty `source_evidence` into an empty `passage_content` field. This was a
valid compatibility decision for the earlier passage migration, but it cannot
distinguish a true legacy passage from answer-bearing AI provenance. Running it
against affected AI rows can make the leak explicit and persistent.

## Root Cause

The primary root cause is a broken semantic boundary:

1. The generator produces answer-bearing provenance, but no student passage.
2. Generic legacy fallback treats that provenance as a passage.
3. Builder initialization and the backfill script can persist the fallback as
   canonical passage content.
4. There is no generation-time leakage validator before a question reaches the
   instructor preview.

Prompt wording contributes to output quality, but a prompt-only change will not
fix the fallback, builder, backfill, or historical-data paths.

## Target Content Contract

### Source evidence

- Remains a short, source-grounded excerpt for provenance and instructor review.
- May contain the correct answer because its purpose is to prove answer support.
- Must never be automatically displayed as a student passage for a newly
  generated AI question.
- Must not be silently loaded into the passage editor as authored content.

### Student passage

- Is stored only in `passageContent`, with `passageType` set explicitly.
- Is grounded in the uploaded source.
- Contains enough information to answer the question through interpretation,
  comparison, calculation, application, or synthesis.
- Does not state an answer-bearing value verbatim when that value is the
  response being assessed.
- Does not repeat a true/false proposition in a form that directly signals its
  truth value.
- Is sanitized and rendered through the existing shared passage contract.

### Answerability constraint

“Do not reveal the answer” must not mean “remove the information needed to
answer.” For pure recall items, withholding the fact can make the item
unanswerable. Generation must either:

- reframe the item so the answer is derived from the passage; or
- omit the student passage if the product permits passage-free recall items.

The implementation plan must choose one policy and apply it consistently.
Reframing toward evidence-based reasoning is the recommended default.

## Leakage Definition

A generated item is invalid when its student-facing passage makes the keyed
response recoverable by direct copying or trivial lexical matching.

### Deterministic hard failures

Before comparison, convert passage HTML to text, normalize Unicode and case,
collapse whitespace, and ignore punctuation-only differences.

| Question type     | Answer-bearing values to inspect                 | Minimum hard-failure rule                                                                                                                                                           |
| ----------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multiple choice   | `correctAnswer`                                  | Reject when a meaningful correct option appears verbatim in the passage.                                                                                                            |
| Multiple response | every value in `correctAnswer`                   | Reject when any meaningful correct option appears verbatim.                                                                                                                         |
| Identification    | every `acceptedAnswers` value                    | Reject exact normalized phrase matches, including names, dates, and numeric values.                                                                                                 |
| Fill in the blank | every value in `blanks`                          | Reject exact normalized phrase matches.                                                                                                                                             |
| Enumeration       | every `acceptedAnswers` value                    | Reject when the passage directly lists the expected response set or its meaningful members.                                                                                         |
| Matching          | the generated `pairs`                            | Do not apply a naive substring ban to every pair value; matching inherently presents both sides. Validate that the passage does not reproduce the final pairings as an answer list. |
| True/false        | the proposition in `prompt` plus `correctAnswer` | Boolean text comparison is insufficient. Reject near-verbatim restatement of the proposition or explicit confirmation/negation that gives away the truth value.                     |
| Essay             | no single answer key                             | Do not apply atomic-answer matching. Check that the passage provides evidence without supplying a complete model response or conclusion.                                            |

“Meaningful” must be implemented with documented rules so that short function
words, single letters, and common tokens do not cause false positives. Exact
handling of short answers, numbers, and dates must have dedicated fixtures.

### Semantic leakage

Close paraphrases and synonyms cannot be reliably rejected with a substring
check alone. The implementation plan should distinguish:

- deterministic validation, which is required and testable; and
- an optional model-based critic/repair pass for semantic leakage and
  answerability.

Do not introduce embeddings solely for this fix unless evaluation demonstrates
that a deterministic validator plus a bounded Gemini critic is insufficient.
Embeddings add a new threshold, cost, and false-positive surface without
eliminating the need for question-type-aware rules.

## Recommended Solution Direction

Use layered prevention and validation:

1. **Separate the output fields.** Extend the Gemini prompt, response JSON
   schema, raw generated type, and normalizer to produce `passageContent`
   independently from `sourceEvidence`. Generate plain text initially and set
   `passageType: "plain"`; AI-generated HTML is unnecessary for this defect.
2. **Strengthen generation instructions.** Define provenance and student
   passage separately. Tell the model to derive the question first, identify
   its keyed answer internally, and write a source-grounded passage that
   supports reasoning without stating that keyed answer.
3. **Validate normalized output.** Extract answer-bearing values from the
   already normalized question content and apply the question-type rules above
   before building the preview response.
4. **Retry narrowly and with a bound.** Regenerate or repair only invalid
   questions, include the validator reason in the repair instruction, preserve
   the requested type distribution, and enforce a small maximum retry count.
   Never return fewer questions silently.
5. **Stop provenance fallback in student-authoring paths.** Student runtime and
   passage editors must not treat `sourceEvidence` as passage content for new
   AI questions. Instructor metadata views may continue to display it under an
   explicit “Source evidence” label.
6. **Handle legacy data deliberately.** Audit affected AI rows before changing
   or rerunning the existing backfill. Do not assume all copied evidence is a
   legitimate passage.

This preserves the existing single generation request where possible. A
mandatory two-call “question first, passage second” pipeline should be adopted
only if evaluation shows that structured co-generation plus validation and
bounded repair cannot meet the quality threshold.

## Expected Change Surface for the Implementation Plan

### API generation pipeline

- `app/sentinel-api/src/lib/gemini/services/prompt-builder/prompt-builder.service.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/types.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/generate-batches.ts`
- `app/sentinel-api/src/lib/gemini/services/question-generator/steps/normalize-questions.ts`
- `app/sentinel-api/src/lib/gemini/services/question-normalizer/normalizer.ts`
- New focused passage-leak validator and tests beside the question normalizer
  or generator validation step

### Shared contracts and rendering

- Confirm whether `passageContent` should be required only in the raw AI
  response while remaining optional in the general shared question schema.
- `packages/shared/src/utils/passage-rendering.ts`
- Student-specific callers in `sentinel-web` and preview-specific callers in
  `sentinel-core`

Avoid removing the generic legacy fallback from every report/export surface
without first completing the historical-data audit. Prefer an explicit
student-facing rendering policy or provenance-aware helper over changing a
shared compatibility function blindly.

### Builder behavior

- `app/sentinel-web/src/features/exams/builder/_components/question-builder-form.tsx`
- `app/sentinel-core/src/features/exams/builder/_components/question-builder-form.tsx`

The plan must preserve an instructor’s explicitly authored `passageContent`
while removing implicit initialization from `sourceEvidence`.

### Legacy data and scripts

- `app/sentinel-api/scripts/backfill-passage-content.ts`
- Question-bank rows where `source_origin = 'AI_PDF'`
- Exam snapshots derived from affected question-bank rows

The implementation plan should include a dry-run audit/report before proposing
any destructive cleanup. Existing instructor edits must not be overwritten.

## Scope

### In scope

- New AI PDF question generation.
- Distinct generation and normalization of provenance and student passage.
- Question-type-aware leakage validation.
- Bounded repair/regeneration behavior and failure handling.
- Student runtime and builder fallback behavior.
- Audit and remediation strategy for affected AI-generated records.
- Focused backend, shared, and frontend regression coverage.

### Out of scope

- Redesigning the passage editor or passage layout.
- Changing passage HTML sanitization or image upload behavior.
- Replacing Gemini or adding a general-purpose content moderation platform.
- Reworking unrelated manual questions.
- Automatically rewriting historical instructor-authored passages without an
  auditable review mechanism.

## Required Test Strategy

### Prompt and schema tests

- The structured response requires distinct `sourceEvidence` and
  `passageContent` fields for the selected generation policy.
- Prompt text states that source evidence is provenance and passage content is
  student-facing.
- Generated passage type is explicitly `plain`.

### Validator unit tests

Include positive and negative fixtures for all eight question types, with
special coverage for:

- names, dates, decimals, percentages, formulas, and multi-word answers;
- case, punctuation, whitespace, Unicode, and HTML normalization;
- answer text that is a substring of an unrelated longer word;
- very short or common answers;
- multiple accepted answers and multiple correct options;
- true/false paraphrase cases;
- enumeration lists and matching-pair answer tables;
- essay evidence versus a supplied conclusion.

### Pipeline tests

- Valid questions pass without retry.
- Invalid questions produce a specific validator reason.
- Repair preserves question type, requested count, source metadata, difficulty,
  points, tags, and Bloom metadata.
- Retry exhaustion returns an explicit generation error; it does not save or
  return a partial set.
- Partial batch failure does not reorder or duplicate accepted questions.

### Rendering and builder tests

- A new AI question with empty `passageContent` does not display
  `sourceEvidence` to a student.
- Explicit `passageContent` renders normally.
- Instructor source metadata still shows `sourceEvidence` where intended.
- Opening an AI question in either builder does not copy source evidence into
  the passage editor.
- An instructor-authored passage remains unchanged after edit and save.

### Evaluation set

Create a stable, non-production fixture set containing known leak-prone
questions across several PDFs and question types. Record:

- exact-answer leak rate;
- semantic-leak review rate;
- answerability rate;
- generation success after retries;
- added Gemini calls and latency.

The fixture corpus can be synthetic or licensed/internal test content and must
not require live secrets for normal unit tests.

## Acceptance Criteria

- New AI-generated questions keep `sourceEvidence` and `passageContent`
  semantically separate end to end.
- Student-facing surfaces never show `sourceEvidence` merely because
  `passageContent` is empty on a newly generated AI question.
- Both builders stop promoting source evidence into passage content.
- Every new generated passage passes the documented deterministic
  question-type validator before appearing in the preview.
- Known names, dates, numeric values, and multi-word keyed answers are rejected
  when copied directly into the passage.
- The passage remains source-grounded and answerable through reasoning under
  the chosen product policy.
- Generation preserves the requested question count and type distribution or
  fails explicitly after bounded retries.
- Source file, page, and evidence metadata remain available for instructor
  verification.
- Historical AI-generated rows are audited before the legacy backfill or any
  automated remediation is applied.
- Focused tests cover prompt/schema changes, all validator branches, retry
  behavior, student rendering, and both builders.

## Decisions Required Before Writing the Implementation Plan

1. **Passage policy:** Must every AI-generated item have a passage, or may pure
   recall items be passage-free? Recommended: generate a passage for each item
   and reframe pure recall questions into derived/evidence-based questions.
2. **Semantic validation:** Is a bounded Gemini critic/repair pass acceptable
   for paraphrase leakage and answerability, including its latency and cost?
   Recommended: yes, behind deterministic validation and with measured retry
   limits.
3. **Exhaustion behavior:** Should one unrepaired item fail the whole preview or
   return the valid subset with a warning? Recommended: fail explicitly rather
   than violate the requested count.
4. **Legacy policy:** Should affected historical AI questions be flagged for
   instructor review, regenerated, or have their passages hidden?
   Recommended: audit and flag; do not overwrite instructor-edited passages.
5. **Fallback retirement:** Can the generic `sourceEvidence` fallback be
   removed after the audit, or must it remain for identified legacy manual
   content? The answer determines whether the change belongs in the shared
   renderer or in provenance-aware student callers.

## Risks and Guardrails

- A blanket “no synonyms” prompt is neither testable nor sufficient.
- Exact-match rejection alone will miss semantic paraphrases.
- Over-aggressive matching can reject valid passages containing common or
  domain-essential terms.
- Removing evidence without enforcing answerability can create impossible
  questions.
- Retrying full batches can increase cost, change already-valid questions, and
  disturb type counts; retry only invalid items where practical.
- The current backfill can preserve the defect in historical data. Do not run
  it indiscriminately as part of this fix.
- `sourceEvidence` is still required for traceability and should not be deleted
  or weakened to solve a presentation problem.

## Implementation-Plan Readiness

An implementation plan can be created once the five product decisions above
are confirmed. The plan should then break work into:

1. contract and prompt changes;
2. normalized answer extraction and leakage validation;
3. bounded repair and orchestration;
4. student/builder provenance separation;
5. legacy audit and remediation;
6. automated evaluation and rollout verification.
