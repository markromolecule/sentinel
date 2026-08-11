# Implementation Plan - Replicate Builder Passage

## Task Summary

Port the finished question-builder, passage, and route-based edit experience from
`sentinel-web` into `sentinel-core` with strict behavior parity and without
modifying `sentinel-web`.

## Pre-Planning

- [x] Read and summarize the task input in one sentence
- [x] Scan relevant source files to understand existing patterns
- [x] Identify all files, services, and DB tables the task will touch
- [x] Determine if a Prisma migration is needed

## Codebase Findings

- `sentinel-web` already contains the reference builder routes at
  `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/[questionId]/builder/page.tsx`,
  `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/collections/[collectionId]/builder/page.tsx`,
  and
  `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/import/preview/[editingIndex]/builder/page.tsx`.
- Matching routes already exist in `sentinel-core`, so this is a parity and
  cleanup port, not a greenfield route build.
- Collection-page edit actions already redirect to the builder route in both apps
  via `collections/[collectionId]/page.tsx`.
- Import-preview edit actions already redirect to the builder route in both apps
  via `import/preview/_hooks/use-preview-manager/index.ts`.
- The current `sentinel-web` question-bank create flow still opens the modal
  builder in
  `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/views/question-bank-page-content.tsx`;
  only edit flows redirect to builder pages. Because the task requires strict
  parity with `sentinel-web`, the implementation must confirm whether product
  wants parity or a deliberate divergence before changing create behavior.
- DB tables relied on by the feature already exist from prior passage work:
  `question_bank_questions` and `exam_questions`. This plan does not add or alter
  schema.
- **Prisma migration required:** No — this is a frontend parity/route-cleanup
  task against already-existing builder and passage infrastructure.

## Options (1-3-1 Rule)

### Option 1: Literal File Copy

- [ ] Copy every relevant `sentinel-web` builder, question-bank, collection, and
      import-preview file into `sentinel-core`, then fix imports and tests.
- [ ] Tradeoff: Fastest path to parity, but highest risk of overwriting
      `sentinel-core`-specific route wiring or keeping dead code that the web app
      still uses for create flows.

### Option 2: Targeted Parity Port (Recommended)

- [x] Diff each `sentinel-core` surface against the matching `sentinel-web`
      source-of-truth file, copy only the parity gaps, and keep route behavior
      aligned with the actual current `sentinel-web` implementation.
- [x] Tradeoff: Slightly slower than wholesale copying, but it minimizes
      unnecessary churn and produces a reviewable parity-focused change set.

### Option 3: Shared-Module Refactor

- [ ] Extract the builder-page, question-bank, and import-preview behavior into
      cross-app shared modules under `packages/` before applying the port.
- [ ] Tradeoff: Best long-term reuse, but it expands scope beyond the task and
      violates the requirement to replicate the current `sentinel-web` feature
      without reinterpretation.

## Best Option

- [x] Choose **Option 2: Targeted Parity Port**.
- [x] Why: It matches the task's "web wins" rule, avoids unnecessary refactors,
      preserves existing shared passage infrastructure, and keeps the work focused on
      the concrete parity gaps that remain in `sentinel-core`.

## Concrete Next Steps

1. Compare the `sentinel-core` builder shell, builder form, question-bank, and
   import-preview files against their `sentinel-web` counterparts and record the
   remaining behavioral differences.
2. Resolve the create-flow ambiguity by following current `sentinel-web`
   behavior unless product explicitly requires a new create-route divergence.
3. Port the remaining UI, passage, and redirect differences into
   `sentinel-core`, then remove only the dead code made obsolete by the final
   parity behavior.
4. Add or update co-located Vitest coverage for builder pages, redirect hooks,
   and preview/edit flows, then run `sentinel-core` tests and build checks.

## Impacted Files, Services, and Tables

- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/exam-builder-screen.tsx`
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/exam-builder-sidebar.tsx`
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/exam-builder-workspace.tsx`
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/layout/exam-builder-workspace-shell.tsx`
- `app/sentinel-core/src/features/exams/builder/_components/question-builder-form.tsx`
- `app/sentinel-core/src/features/exams/builder/_components/_types.ts`
- `app/sentinel-core/src/app/(protected)/question/bank/_components/views/question-bank-page-content.tsx`
- `app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/question-preview-sheet.tsx`
- `app/sentinel-core/src/app/(protected)/question/bank/_hooks/use-question-bank-page/_hooks/use-question-bank-builder.ts`
- `app/sentinel-core/src/app/(protected)/question/bank/[questionId]/builder/page.tsx`
- `app/sentinel-core/src/app/(protected)/question/bank/collections/[collectionId]/page.tsx`
- `app/sentinel-core/src/app/(protected)/question/bank/collections/[collectionId]/builder/page.tsx`
- `app/sentinel-core/src/app/(protected)/question/bank/import/preview/page.tsx`
- `app/sentinel-core/src/app/(protected)/question/bank/import/preview/_hooks/use-preview-manager/index.ts`
- `app/sentinel-core/src/app/(protected)/question/bank/import/preview/_components/views/edit-question-view.tsx`
- `app/sentinel-core/src/app/(protected)/question/bank/import/preview/[editingIndex]/builder/page.tsx`
- Existing shared passage dependencies used but not redesigned in this plan:
  `packages/ui/src/components/passage-editor.tsx` and
  `packages/shared/src/utils/passage-rendering.ts`
- DB tables used by existing flows only: `question_bank_questions`,
  `exam_questions`

## Implementation Phases

### Phase 1: Lock the Parity Contract

**Goal:** Resolve the web-vs-context ambiguities and capture the exact
`sentinel-web` behavior `sentinel-core` must mirror.

- [x] Compare
      `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/views/question-bank-page-content.tsx`
      against
      `app/sentinel-core/src/app/(protected)/question/bank/_components/views/question-bank-page-content.tsx`
      and document whether create stays modal or becomes route-based in the final
      port.
- [x] Compare
      `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_hooks/use-question-bank-page/_hooks/use-question-bank-builder.ts`
      against
      `app/sentinel-core/src/app/(protected)/question/bank/_hooks/use-question-bank-page/_hooks/use-question-bank-builder.ts`
      and list any remaining edit/create parity gaps.
- [x] Compare the existing builder routes in
      `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/[questionId]/builder/page.tsx`,
      `collections/[collectionId]/builder/page.tsx`, and
      `import/preview/[editingIndex]/builder/page.tsx` with their `sentinel-core`
      counterparts to confirm these remain the target route contracts.
- [x] Write or update
      `app/sentinel-core/src/app/(protected)/question/bank/[questionId]/builder/page.test.tsx`
      and
      `app/sentinel-core/src/app/(protected)/question/bank/collections/[collectionId]/builder/page.test.tsx`
      so the expected load/back/update behavior is captured before the rest of the
      port.
      **Migration required:** No — this phase audits existing frontend behavior
      and locks route expectations only.

### Phase 2: Port Builder and Passage Surface Parity

**Goal:** Make the `sentinel-core` builder shell and passage-enabled question form
match `sentinel-web` exactly.

- [x] Diff and literal-copy any remaining `sentinel-web` changes into
      `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/exam-builder-screen.tsx`.
- [x] Diff and literal-copy any remaining `sentinel-web` changes into
      `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/exam-builder-sidebar.tsx`.
- [x] Diff and literal-copy any remaining `sentinel-web` changes into
      `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/exam-builder-workspace.tsx`.
- [x] Diff and literal-copy any remaining `sentinel-web` changes into
      `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/layout/exam-builder-workspace-shell.tsx`.
- [x] Diff and literal-copy any remaining `sentinel-web` changes into
      `app/sentinel-core/src/features/exams/builder/_components/question-builder-form.tsx`
      so passage editing, builder mode, save/cancel, and duplicate behavior stay in
      lockstep with the web app.
- [x] Diff and literal-copy any remaining `sentinel-web` changes into
      `app/sentinel-core/src/features/exams/builder/_components/_types.ts` so the
      builder payload and passage fields stay aligned.
- [x] Verify the core builder pages
      `app/sentinel-core/src/app/(protected)/question/bank/[questionId]/builder/page.tsx`,
      `collections/[collectionId]/builder/page.tsx`, and
      `import/preview/[editingIndex]/builder/page.tsx` pass the same
      `passageContent`/`passageType` payload shape used in `sentinel-web`.
- [x] Add or update
      `app/sentinel-core/src/features/exams/builder/_components/question-builder-form.test.tsx`
      and
      `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/layout/exam-builder-workspace-shell.test.tsx`
      to cover passage visibility, builder mode, and sidebar/header parity.
      **Migration required:** No — this phase ports existing frontend builder
      behavior onto already-existing routes and types.

### Phase 3: Align Question-Bank and Collection Navigation

**Goal:** Ensure question-bank and collection editing in `sentinel-core` routes
through the same builder experience and obsolete edit UI is disconnected only
where parity allows.

- [x] Update
      `app/sentinel-core/src/app/(protected)/question/bank/_hooks/use-question-bank-page/_hooks/use-question-bank-builder.ts`
      to exactly match the final parity decision from Phase 1 for create, edit, and
      duplicate flows.
- [x] Update
      `app/sentinel-core/src/app/(protected)/question/bank/_components/views/question-bank-page-content.tsx`
      to remove or retain the modal builder strictly according to the confirmed
      `sentinel-web` behavior, not the earlier context assumption.
- [x] Update
      `app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/question-preview-sheet.tsx`
      so edit actions close the sheet and hand off to the builder route exactly as in
      `sentinel-web`, while preserving rendered passage preview parity.
- [x] Update
      `app/sentinel-core/src/app/(protected)/question/bank/collections/[collectionId]/page.tsx`
      so collection edit actions, empty states, and back navigation stay aligned with
      `sentinel-web`.
- [x] Remove only the now-dead `sentinel-core` question-bank edit dialog wiring
    after the route or modal parity behavior is proven by tests.
  <!-- NOTE: No obsolete question-bank edit wiring remained to delete; the current
  modal-create and route-edit behavior already matched `sentinel-web`. -->
- [x] Write or update
      `app/sentinel-core/src/app/(protected)/question/bank/collections/[collectionId]/page.test.tsx`
      and a new co-located test file for
      `app/sentinel-core/src/app/(protected)/question/bank/_hooks/use-question-bank-page/_hooks/use-question-bank-builder.ts`
      covering create/edit route decisions.
      **Migration required:** No — navigation and dialog cleanup only.

### Phase 4: Align Import-Preview Builder Redirects

**Goal:** Keep AI import preview editing in `sentinel-core` behaviorally identical
to `sentinel-web`, including passage editing through the dedicated builder page.

- [x] Diff and literal-copy any remaining `sentinel-web` changes into
      `app/sentinel-core/src/app/(protected)/question/bank/import/preview/page.tsx`.
- [x] Diff and literal-copy any remaining `sentinel-web` changes into
      `app/sentinel-core/src/app/(protected)/question/bank/import/preview/_hooks/use-preview-manager/index.ts`
      so edit redirects, guard rails, and save/discard transitions stay identical.
- [x] Diff and literal-copy any remaining `sentinel-web` changes into
      `app/sentinel-core/src/app/(protected)/question/bank/import/preview/_components/views/edit-question-view.tsx`.
- [x] Verify
      `app/sentinel-core/src/app/(protected)/question/bank/import/preview/[editingIndex]/builder/page.tsx`
      receives the same transformed question payload as the `sentinel-web` version,
      including passage fields.
- [x] Remove any leftover inline edit branching in `sentinel-core` import-preview
      surfaces only if the web reference no longer depends on it.
- [x] Write or update
      `app/sentinel-core/src/app/(protected)/question/bank/import/preview/[editingIndex]/builder/page.test.tsx`
      and add a co-located test for
      `app/sentinel-core/src/app/(protected)/question/bank/import/preview/_hooks/use-preview-manager/index.ts`
      covering redirect, back, and missing-preview-data behavior.
      <!-- NOTE: No inline edit branching remained to delete; the preview flow already
                                                                                      used the dedicated builder route and matched the web reference. -->
      **Migration required:** No — frontend route parity only.

### Phase 5: Verification and Cleanup

**Goal:** Prove `sentinel-core` matches the current `sentinel-web` behavior on all
builder and passage-related surfaces without introducing drift.

- [x] Re-run a file-by-file diff for every `sentinel-core` file touched in Phases 2
      through 4 against its `sentinel-web` counterpart and resolve any remaining
      behavioral differences before merge.
- [x] Ensure every exported function added or changed in the touched
      `sentinel-core` files keeps JSDoc consistent with the existing project rule.
- [x] Run `pnpm --dir app/sentinel-core test` and fix any parity-regression test
      failures in the co-located builder, question-bank, collection, and import-preview
      test files.
- [x] Run `pnpm --dir app/sentinel-core build` to confirm the builder routes,
      passage editor usage, and redirect flows compile cleanly.
- [ ] Perform manual verification on the `sentinel-core` builder page, collection
      page, question-bank page, and import-preview page using the exact acceptance
      criteria from `docs/context/June/June 19/replicate-builder-passage.md`.
- [x] Add or update one final test assertion in the highest-level affected route
      tests to cover the final accepted create/edit behavior for the question bank.
      **Migration required:** No — verification, test, and dead-code cleanup only.

## Done Criteria

- [ ] Every task references a concrete file or function
- [ ] Each phase has at least one test task
- [ ] Migration decision is explicit
- [ ] No task is vague
- [ ] `sentinel-core` builder pages, question-bank flows, collection flows, and
      import-preview flows match the actual current `sentinel-web` behavior
- [ ] `sentinel-web` has zero diffs

## Additional Considerations

- [x] **Breaking API changes:** None expected; this should remain a frontend-only
      parity port on top of existing passage/question APIs.
- [x] **New `.env` variables:** None expected; reuse the already-landed passage
      editor and passage image infrastructure.
- [x] **Rollback note:** No schema migration is involved; rollback is a standard
      frontend revert of the touched `sentinel-core` files.
- [x] **Important parity note:** If the product decision is to redirect question-bank
      create flows to a route, that is a deliberate divergence from the current
      `sentinel-web` code and should be treated as a separate approval point rather
      than assumed parity work.
