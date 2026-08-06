# Issue

- [Gemini] and the system fails to generate a question which is crucial for our system

:3001/ai/generate-preview:1 Failed to load resource: net::ERR_EMPTY_RESPONSE
installHook.js:1 AI Generation Error: TypeError: Failed to fetch
at api-client.ts:110:32
at async useGenerateQuestionsMutation.useMutation [as mutationFn] (use-generate-questions-mutation.ts:42:30)
overrideMethod @ installHook.js:1
error @ intercept-console-error.ts:42
(anonymous) @ use-import-handler.ts:51
execute @ mutation.ts:288

# Reason

- This is related on the [passage] creation where the system [repairs] it

---

# Investigation

The leak happens because of two compounding issues in this prompt/schema, not because your instructions are wrong — they're just fighting the generation order and doing all the work in one shot with no verification step.

## Root cause

1. **Field order primes the leak.** In `buildResponseJsonSchema`, `sourceEvidence` (explicitly _allowed_ to contain the answer) is generated immediately before `passageContent` (which must _not_). Structured-output decoding fills JSON properties in schema order, so the model's most recent context when writing `passageContent` is a verbatim answer-bearing excerpt — it naturally echoes that phrasing forward.
2. **No self-check, no verification pass.** You're asking the model to simultaneously invent the question, the answer, and a passage that avoids the answer, in one linear pass, with no instruction to double-check its own output before finalizing, and nothing downstream that catches it when it fails.

Prompt wording alone rarely gets this to 100% — you need to fix the ordering, sharpen the instruction, _and_ add a programmatic safety net.

## Fix 1 — reorder the schema so passage comes before the spoiler field

```ts
// in buildResponseJsonSchema, inside properties[type].items.properties
sourceFileName: { type: 'string' },
sourcePageNumber: { type: 'integer', minimum: 1 },
passageContent: { type: 'string' },   // moved up
sourceEvidence: { type: 'string' },   // moved down
difficulty: { type: 'string', enum: allowedDifficulties },
// ...unchanged from here
```

## Fix 2 — reorder + sharpen the prompt instructions to match

```ts
// swap these two lines and strengthen the passageContent one
'Set "passageContent" to a non-empty plain-text student-facing passage that gives enough surrounding context to reason toward the answer, without stating it. First privately identify the exact word(s), number(s), name(s), or fact this question is testing, then write passageContent so those specific tokens — and close paraphrases or synonyms of them — never appear in it. The student must use interpretation, comparison, calculation, application, or synthesis rather than pure recall. Example: for "What year did the treaty end the war?", a BAD passage states the year directly; a GOOD passage describes surrounding events so the year can be reasoned out. Write in plain text; do not generate HTML.',
'Set "sourceEvidence" to a short verbatim excerpt copied from that exact page text, for private instructor provenance only — it is never shown to students and is allowed to contain the correct answer. Do not let its wording bleed into passageContent.',
```

And add one line right before `'Return only JSON...'`:

```ts
'Before finalizing each question, re-check its passageContent against its own content/answer fields. If the exact answer text or an obvious paraphrase of it appears, rewrite the passage so it doesn\'t.',
```

## Fix 3 — the actual safety net: detect + repair after generation

Prompting reduces the _rate_ of leakage; it won't eliminate it. Since you mentioned "the system repairs the passage," here's a self-contained module that audits every generated question for leakage and, if found, sends a narrow follow-up call to fix just that passage:Wire it in like this:

1. After the Gemini call returns and is parsed against your JSON schema, run `auditGeneratedQuestions(response)`.
2. For each flagged question, call Gemini again with `buildPassageRepairPrompt(...)` — a tiny, cheap call that only returns `{ passageContent }`, not the whole question.
3. Re-run `findLeakedAnswers` on the repaired text; retry once or twice.
4. If it still leaks after retries, don't ship it silently — mark it `needsManualReview` so an instructor sees it, rather than trusting the model's word a third time.

The `extractAnswerSurfaceForms` switch statement is my best guess at your per-type shapes based on field names visible in `prompt.ts` (`content.options[].isCorrect`, `content.blanks[].acceptedAnswers`, etc.) — if you can share `definitions.ts`/`helpers.ts` I can tighten that up to match your real types exactly.
