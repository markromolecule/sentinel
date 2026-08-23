---
title: "Phase 2: Prompt Engineering & First-Pass Negative Leakage Rules"
type: phase
parent: "fix-005-gemini-passage-quality-and-batch-resilience"
phase: "2"
status: completed
created: "2026-08-23"
tags: [task, phase, ai, gemini, prompt-builder, leakage-prevention]
---

# Phase 2: Prompt Engineering & First-Pass Negative Leakage Rules

## Objective

Enhance `buildPrompt` in `prompt-builder.service.ts` and `buildPassageRepairBatchPrompt` in `passage-quality-prompts.ts` with explicit negative-leakage rules and descriptive framing techniques specifically for `IDENTIFICATION` and `ENUMERATION` questions.

## Dependencies & Prerequisites

- Phase 1: Question Replacement & Replenishment on Persistent Passage Leaks

## Impacted Files & Components

- `app/sentinel-api/src/lib/gemini/services/prompt-builder/prompt-builder.service.ts`:
  - Strengthen the `passageContent` instructions with concrete guidance for factual formats (`IDENTIFICATION`, `ENUMERATION`):
    - Describe the role, mechanism, function, scenario, or contextual clues *without* using the target noun or verbatim list items.
    - Explicitly state: "For IDENTIFICATION and ENUMERATION, the passage must describe the scenario, application, or function—do not include a definition sentence that contains the exact answer term or keyword."
- `app/sentinel-api/src/lib/gemini/services/prompt-builder/passage-quality-prompts.ts`:
  - Strengthen `buildPassageRepairBatchPrompt` and `buildPassageRepairPrompt` with the same framing guidance for repair rounds.

## Implementation Tasks

- [x] **Task 2.1:** Update `buildPrompt` in `prompt-builder.service.ts` with explicit negative constraints on `passageContent` for `IDENTIFICATION` and `ENUMERATION`.
- [x] **Task 2.2:** Update `buildPassageRepairBatchPrompt` in `passage-quality-prompts.ts` with explicit guidance on replacing leaked terms with functional/scenario descriptions.
- [x] **Task 2.3:** Update unit tests in `prompt-builder.service.test.ts` and `passage-quality-prompts.test.ts`.

## Verification & Testing

- `pnpm --dir app/sentinel-api test prompt-builder.service.test.ts passage-quality-prompts.test.ts` (PASS: 7/7 tests)

## Risks & Rollback

- **Risk:** LLM may make the passage too vague.
- **Mitigation:** The instruction explicitly requires enough scenario and functional clues to derive the answer when combined with the question prompt.

