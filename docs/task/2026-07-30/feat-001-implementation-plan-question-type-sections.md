# Question-Type Exam Sections and Generated Instructions — Implementation Plan

> **Task summary:** replace free-text exam section titles with a question-type dropdown and automatically generate each section's student-facing instruction from its selected question type.

**Source:** instructor exam-builder screenshot and feature direction provided on 2026-07-30  
**Status:** Ready for implementation  
**Delivery boundary:** exam-section contracts and persistence, question-type metadata, Sentinel Web instructor builder, Sentinel Core builder parity, and focused validation  
**Migration required:** Yes — `exam_sections` needs a nullable `question_type` column so the selected semantic value is persisted independently from its generated display title and instruction.

## 1. The Context

The builder currently stores a section as a free-text `title` plus an optional manually edited `description`, even though the workspace already loads the canonical question-type catalog and every question has a typed `type` field. Using the generated label as the only stored type would make behavior depend on mutable display text, while immediately making the new field required would break empty and historically mixed-type sections. The implementation therefore needs a stable section-level type, deterministic generated copy, compatibility for legacy sections, and safeguards that prevent a typed section from containing incompatible questions.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Replace the title input with a dropdown, write the selected question type's label into the existing `title`, write a hard-coded instruction into `description`, and infer the selection from the title when the builder reloads.
- **Tradeoff:** No migration is needed, but labels become database identifiers; copy changes, localization, or duplicate labels can make saved sections impossible to resolve reliably.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Add nullable `question_type` to `exam_sections`, extend the shared/API contracts and question-type catalog with an `instruction`, use that semantic value to generate the persisted title and description, route new questions directly to the section's type, and reject incompatible questions on both client and server while retaining a legacy-untyped state.
- **Tradeoff:** This touches the database, shared contracts, API normalization, and both builder clients, but it keeps display copy separate from identity and establishes enforceable section invariants.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Store no section selection and continuously derive each section's title and combined instruction from the question types currently present in it, including multi-type instructions for mixed sections.
- **Tradeoff:** This avoids a migration but conflicts with the requested explicit dropdown, causes headings to change as questions move, and cannot define a type before the first question is created.

## 1. The Execution

**The Recommendation:** Option B — the Strategic Path.

**The Justification:** The section type is business state, not presentation text, and the existing PostgreSQL `question_type` enum already provides the correct stable identifier without a new dependency. A nullable rollout preserves existing empty and mixed sections, while shared contracts and server validation prevent the Web and Core clients from drifting or saving mismatched content. Persisting the generated title and description also keeps current student, preview, report, and print consumers working without teaching every downstream surface how to generate section copy.

**Next Steps:**

1. Add the nullable section type and extend the shared question-type and exam-section contracts.
2. Persist, return, and validate the section type and its question membership in the examination API.
3. Update both builder stores and UIs to select a type, generate copy, and constrain creation/import flows.

---

## Approved Decisions and Fixed Defaults

- Each newly typed section owns exactly one `QuestionType`.
- The dropdown contains the eight values returned by the builder workspace's `questionTypes` catalog; labels are display-only.
- `QuestionTypeDefinition` gains an `instruction` field containing the canonical student-facing instruction for that type.
- Selecting a type atomically sets `section.questionType`, `section.title` to the catalog label, and `section.description` to the catalog instruction.
- The generated instruction is displayed as read-only text in the section header. The pencil button and manual instruction editor are removed for typed sections.
- An untyped legacy section keeps its stored title and description until the instructor selects a type.
- Newly added sections start untyped with the dropdown placeholder `Select question type`; adding or importing questions remains unavailable until a type is selected.
- A section's type can be changed only while the section contains no questions. Non-empty sections render a disabled selector with helper text explaining that questions must be removed first.
- `Add Question` on a typed section opens the builder directly with that section's type; it does not reopen the generic question-type selector.
- `Import from Bank` receives the target section type and allows selection/import of matching questions only. The import operation also revalidates the type before mutating the store.
- The API rejects a submitted question whose `type` differs from its referenced typed section, even if a client bypasses UI checks.
- Legacy sections with `question_type = NULL` remain readable and savable. Existing mixed-type sections are not split, renamed, or deleted automatically.
- The migration backfills `question_type` only for sections whose existing questions all share one type. Empty and mixed-type sections remain `NULL`.
- Existing student runtime, preview, export, and report components continue consuming the persisted section `title` and `description`; they require regression tests, not new generation logic.
- Sentinel Web and Sentinel Core receive the same behavior in this delivery because both contain parallel exam-builder implementations over the shared contracts.

## Canonical Generated Instructions

The final copy must live in the question-type catalog and be returned with each `QuestionTypeDefinition`:

| Question type | Generated section title | Generated instruction |
| --- | --- | --- |
| `MULTIPLE_CHOICE` | Multiple Choice | Select the best answer from the choices provided. |
| `MULTIPLE_RESPONSE` | Multiple Response | Select all answers that apply for each question. |
| `TRUE_FALSE` | True or False | Determine whether each statement is true or false. |
| `IDENTIFICATION` | Identification | Write the correct term, concept, or short answer. |
| `MATCHING` | Matching Type | Match each item with its correct corresponding answer. |
| `ESSAY` | Essay | Answer each question clearly and completely. |
| `FILL_BLANK` | Fill in the Blank | Complete each statement with the correct word or phrase. |
| `ENUMERATION` | Enumeration | List all required answers for each question. |

Copy changes after release affect newly selected or reselected sections only; previously saved exams retain their stored title and instruction snapshot.

## Confirmed Baseline

- `QuestionSectionCard` in both builders renders an uncontrolled semantic model: a native text input updates `section.title`, and a pencil button reveals a `Textarea` that updates `section.description`.
- `ExamQuestionSection` currently contains `id`, `title`, optional `description`, `orderIndex`, and UI-only `isCollapsed`; it does not contain a question type.
- `examSectionSchema`, `examSectionInputSchema`, `UpdateExamQuestionSectionPayload`, and builder payload mapping carry title and description but no section type.
- `exam_sections` persists title, description, and order only; `exam_questions.question_type` already uses the PostgreSQL `question_type` enum.
- `QuestionTypeService.getQuestionTypes()` returns the same eight types already used by the builder, with label, description, and default question content.
- `buildBuilderWorkspace()` already includes the question-type definitions in the initial workspace response, so the dropdown needs no new endpoint or client query.
- `normalizeExamStructureInput()` validates each question's content and section ID but does not compare a question's type with the referenced section.
- `useExamStore` in both apps generates numbered section titles, saves free-text descriptions, and permits any question type in any section.
- `ExamBuilderWorkspace` tracks a target section, then opens `QuestionTypeSelectorDialog` for every new question regardless of section state.
- The question-bank import modal accepts a target section only at the final import callback and does not constrain results by a section-level type.
- Student, preview, print, and report surfaces already render persisted section titles/descriptions, so generated copy will flow through existing exam-detail responses.

## Target Contracts

### Section contract

```ts
type ExamQuestionSection = {
    id: string;
    questionType?: QuestionType | null;
    title: string;
    description?: string | null;
    orderIndex: number;
    isCollapsed?: boolean;
};
```

- API response schemas expose `questionType` as nullable for legacy compatibility.
- Create/update section input schemas accept `questionType` as nullable during the transition.
- A non-null `questionType` requires every submitted question referencing that section to have the same `type`.
- `title` and `description` remain required persistence/display fields for downstream compatibility; builder clients derive them from the selected definition rather than accepting free text.

### Question-type definition contract

```ts
type QuestionTypeDefinition = {
    value: QuestionType;
    label: string;
    description: string;
    instruction: string;
    defaultContent: ExamQuestionContent;
};
```

- `description` continues explaining the authoring type in type selectors.
- `instruction` is concise student-facing copy for an exam section and must not be repurposed as the authoring description.

### Legacy compatibility contract

- The migration assigns a type only when a section has at least one question and `COUNT(DISTINCT question_type) = 1`.
- Empty and mixed sections remain untyped and retain their current title/description.
- Hydration must not infer or overwrite an untyped section on the client; persisted `questionType` is authoritative after migration.
- A legacy untyped section may continue to save unchanged, but selecting a type opts it into the one-type invariant.

## Scope and Affected Files

### Database and generated database types

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/[timestamp]_add_exam_section_question_type/migration.sql` **[NEW]**
- `packages/db/prisma/migrations/[timestamp]_add_exam_section_question_type/rollback.sql` **[NEW]**
- `packages/db/src/generated/types.ts`
- `packages/db/src/tests/exam-section-question-type-schema.test.ts` **[NEW]**

### Shared schemas and service contracts

- `packages/shared/src/schema/exams/question-type-schema.ts`
- `packages/shared/src/schema/exams/exam-schema.ts`
- `packages/shared/src/schema/exams/exam-schema.test.ts`
- `packages/shared/src/types/exams/exam.ts`
- `packages/services/src/api/question-types.ts`
- `packages/services/src/api/exams/types.ts`
- `packages/services/src/api/exams/mappers.ts`
- `packages/services/src/api/exams/mappers.test.ts`

### Examination API

- `app/sentinel-api/src/modules/content/question-type/question-type.service.ts`
- `app/sentinel-api/src/modules/content/question-type/question-type.service.test.ts` **[NEW]**
- `app/sentinel-api/src/modules/examination/exams/services/normalize-exam-structure-input.service.ts`
- `app/sentinel-api/src/modules/examination/exams/services/normalize-exam-structure-input.test.ts`
- `app/sentinel-api/src/modules/examination/exams/services/sync-exam-structure.service.ts`
- `app/sentinel-api/src/modules/examination/exams/services/get-exam-detail.service.ts`
- `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.test.ts`
- `app/sentinel-api/src/modules/examination/builder/services/builder-services.test.ts`

### Sentinel Web builder

- `app/sentinel-web/src/features/exams/builder/_stores/use-exam-store/constants.ts`
- `app/sentinel-web/src/features/exams/builder/_stores/use-exam-store/helpers.ts`
- `app/sentinel-web/src/features/exams/builder/_stores/use-exam-store/index.ts`
- `app/sentinel-web/src/features/exams/builder/_stores/use-exam-store/types.ts`
- `app/sentinel-web/src/features/exams/builder/_stores/use-exam-store.test.ts`
- `app/sentinel-web/src/features/exams/builder/_components/_types.ts`
- `app/sentinel-web/src/features/exams/builder/_components/question-bucket-table/question-section-card.tsx`
- `app/sentinel-web/src/features/exams/builder/_components/question-bucket-table/question-section-card.test.tsx`
- `app/sentinel-web/src/features/exams/builder/_components/question-bucket-table/sectioned-question-bucket-table.tsx`
- `app/sentinel-web/src/features/exams/builder/_components/question-bank-import-modal/types.ts`
- `app/sentinel-web/src/features/exams/builder/_components/question-bank-import-modal/utils.ts`
- `app/sentinel-web/src/features/exams/builder/_components/question-bank-import-modal/utils.test.ts`
- `app/sentinel-web/src/features/exams/builder/_components/question-bank-import-modal/_components/questions-panel.tsx`
- `app/sentinel-web/src/features/exams/builder/_components/question-bank-import-modal/_components/questions-panel.test.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/hooks/use-exam-builder/_types.ts`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/hooks/use-exam-builder/use-question-management.ts`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/hooks/use-exam-builder/use-question-management.test.ts` **[NEW]**
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/hooks/use-exam-builder/use-section-management.ts`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/hooks/use-exam-builder/use-section-management.test.ts` **[NEW]**
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/_components/exam-builder-workspace.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/_components/exam-builder-workspace.test.tsx` **[NEW]**

### Sentinel Core parity

- `app/sentinel-core/src/features/exams/builder/_stores/use-exam-store.ts`
- `app/sentinel-core/src/features/exams/builder/_stores/use-exam-store.test.ts`
- `app/sentinel-core/src/features/exams/builder/_components/_types.ts`
- `app/sentinel-core/src/features/exams/builder/_components/question-bucket-table/question-section-card.tsx`
- `app/sentinel-core/src/features/exams/builder/_components/question-bucket-table/question-section-card.test.tsx`
- `app/sentinel-core/src/features/exams/builder/_components/question-bucket-table/sectioned-question-bucket-table.tsx`
- `app/sentinel-core/src/features/exams/builder/_components/question-bank-import-modal/types.ts`
- `app/sentinel-core/src/features/exams/builder/_components/question-bank-import-modal/utils.ts`
- `app/sentinel-core/src/features/exams/builder/_components/question-bank-import-modal/utils.test.ts`
- `app/sentinel-core/src/features/exams/builder/_components/question-bank-import-modal/_components/questions-panel.tsx`
- `app/sentinel-core/src/features/exams/builder/_components/question-bank-import-modal/_components/questions-panel.test.tsx`
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/hooks/use-exam-builder/_types.ts`
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/hooks/use-exam-builder/use-question-management.ts`
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/hooks/use-exam-builder/use-question-management.test.ts` **[NEW]**
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/hooks/use-exam-builder/use-section-management.ts`
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/hooks/use-exam-builder/use-section-management.test.ts` **[NEW]**
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/exam-builder-workspace.tsx`
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/exam-builder-workspace.test.tsx` **[NEW]**

## Phase 0: Lock the Current and Target Contracts

**Goal:** Capture the expected typed-section behavior and legacy compatibility before changing persistence or UI code.

- [x] Extend `packages/shared/src/schema/exams/exam-schema.test.ts` with response/input fixtures for a typed section and an untyped legacy section, asserting the target `questionType` contract.
- [x] Extend `app/sentinel-api/src/modules/examination/exams/services/normalize-exam-structure-input.test.ts` with a typed section containing matching questions and a typed section containing an incompatible question; keep the latter as the expected failing regression until Phase 2.
- [x] Extend both `app/sentinel-web/src/features/exams/builder/_stores/use-exam-store.test.ts` and `app/sentinel-core/src/features/exams/builder/_stores/use-exam-store.test.ts` with fixtures proving selection generates title/instruction and an untyped hydrated section preserves legacy copy.
- [x] Replace the manual-instruction expectations in both `question-section-card.test.tsx` files with target assertions for the dropdown, generated read-only instruction, placeholder state, and disabled non-empty state.
- [x] Run the focused shared, API, Web, and Core test files and record which target assertions fail before implementation.
- [x] Write JSDoc for every new exported fixture/helper introduced by this phase.

**Migration required:** No — this phase adds regression contracts and test fixtures only.

## Phase 1: Add the Section Type and Canonical Instruction Metadata

**Goal:** Establish a stable persisted section type and one canonical question-type definition contract.

- [x] Add nullable `question_type question_type?` to `exam_sections` in `packages/db/prisma/schema.prisma`; keep it nullable for empty and mixed legacy sections.
- [x] Create `packages/db/prisma/migrations/[timestamp]_add_exam_section_question_type/migration.sql` to add the enum column, backfill only homogeneous non-empty sections using grouped `exam_questions`, and add an index on `exam_sections(question_type)` only if the query plan or repository conventions justify it.
- [x] Create `packages/db/prisma/migrations/[timestamp]_add_exam_section_question_type/rollback.sql` that drops the optional index and column without touching `title`, `description`, questions, or the existing shared enum.
- [x] Regenerate `packages/db/src/generated/types.ts` through the repository's database type-generation command; do not hand-edit the generated interface.
- [x] Add `packages/db/src/tests/exam-section-question-type-schema.test.ts` to inspect the migration for nullable enum reuse, homogeneous-only backfill, mixed/empty preservation, and rollback statements.
- [x] Add `instruction` to `questionTypeDefinitionSchema` in `packages/shared/src/schema/exams/question-type-schema.ts` and to `QuestionTypeDefinition` in `packages/services/src/api/question-types.ts`.
- [x] Add nullable `questionType` to `ExamQuestionSection`, `examSectionSchema`, `examSectionInputSchema`, `UpdateExamQuestionSectionPayload`, and the exam service mapper in `packages/shared/src/types/exams/exam.ts`, `packages/shared/src/schema/exams/exam-schema.ts`, `packages/services/src/api/exams/types.ts`, and `packages/services/src/api/exams/mappers.ts`.
- [x] Add the approved instruction string for all eight types to `QUESTION_TYPE_META` in `app/sentinel-api/src/modules/content/question-type/question-type.service.ts`, return it from `buildQuestionTypeDefinition()`, and add JSDoc if the metadata builder becomes exported.
- [x] Add `app/sentinel-api/src/modules/content/question-type/question-type.service.test.ts` to assert the complete ordered catalog, unique values, non-empty labels/descriptions/instructions, and the exact approved instruction for each type.
- [x] Extend `packages/services/src/api/exams/mappers.test.ts` and `packages/shared/src/schema/exams/exam-schema.test.ts` for typed and null section mappings.

**Migration required:** Yes — this phase adds and safely backfills `exam_sections.question_type`; rollback drops only that column/index and cannot reconstruct later typed selections after rollback.

## Phase 2: Persist and Enforce Typed Section Invariants in the API

**Goal:** Round-trip section types and reject mismatched section/question structures at the trust boundary.

- [x] Update `normalizeExamStructureInput()` in `app/sentinel-api/src/modules/examination/exams/services/normalize-exam-structure-input.service.ts` to write `question_type` for every section and build a section-ID-to-type map before normalizing questions.
- [x] In the same function, throw an HTTP 400 with a stable, non-content-bearing message when a question references a typed section whose `questionType` differs from `question.type`; preserve current behavior for null legacy sections.
- [x] Update the current-section fallback mapping in `syncExamStructure()` at `app/sentinel-api/src/modules/examination/exams/services/sync-exam-structure.service.ts` so partial question-only saves retain `section.question_type`.
- [x] Update `getExamDetailService()` at `app/sentinel-api/src/modules/examination/exams/services/get-exam-detail.service.ts` to expose `questionType: section.question_type` and preserve `null` instead of inferring from questions at read time.
- [x] Extend `normalize-exam-structure-input.test.ts` for all eight matching types, a mismatched manual question, a mismatched imported question, a null legacy section with mixed questions, an unknown section ID, and normalized database rows retaining the type.
- [x] Extend `app/sentinel-api/src/modules/examination/exams/services/map-exam-response.test.ts` to verify typed and null sections survive detail response mapping with their stored title and instruction.
- [x] Extend `app/sentinel-api/src/modules/examination/builder/services/builder-services.test.ts` to verify get/save builder workspaces return `questionType` and the `instruction`-enriched question-type definitions.
- [x] Add or update JSDoc on every exported normalization/helper function changed in this phase, documenting the typed-section invariant.

**Migration required:** No — this phase consumes the schema added in Phase 1 and changes API validation/mapping only.

## Phase 3: Make Builder State Generate Copy and Guard Mutations

**Goal:** Make section selection the single client-side operation that controls type, title, instruction, and compatible questions.

- [x] Replace numbered-section defaults in the Web store's `constants.ts`/`helpers.ts` and the Core `use-exam-store.ts` with an untyped section factory whose title remains a safe internal fallback and whose visible control uses `Select question type`.
- [x] Add a JSDoc-documented `buildQuestionSectionCopy(definition)` helper in each app's builder store module, returning `{ questionType, title, description }` from one `QuestionTypeDefinition`.
- [x] Change `addQuestionSection` and `updateQuestionSection` store actions/types in both apps so selecting a definition updates the three generated fields atomically rather than accepting arbitrary title/description edits from the UI.
- [x] Keep `normalizeExamStructure()` in both stores lossless for `questionType`, including hydration, section reorder, question reorder, deletion, and dirty-state preservation.
- [x] Extend `buildBuilderWorkspacePayload()` in both stores to send `questionType` and the trimmed generated title/description for every section, including `null` for legacy-untyped sections.
- [x] Add a pure JSDoc-documented compatibility guard in each store or section-management hook that returns a stable result when a selected type conflicts with existing section questions.
- [x] Update both `use-section-management.ts` files to accept the loaded question-type definitions, resolve a dropdown value to its definition, block type changes for non-empty sections with a specific toast, and call the atomic store action for empty sections.
- [x] Update both `use-question-management.ts` files so create, duplicate, and import operations verify the target section type before calling `addQuestion`; reject mismatches without partially adding questions.
- [x] Extend both store test files for atomic generated copy, null legacy preservation, payload mapping, dirty state, reordering, empty-section type changes, and protection against stale arbitrary updates.
- [x] Add both `use-section-management.test.ts` files for valid selection, unknown catalog values, blocked non-empty changes, and exact toast behavior.
- [x] Add both `use-question-management.test.ts` files for matching creation, matching duplication, compatible batch import, mixed import rejection, and no partial mutation after a mismatch.

**Migration required:** No — this phase updates Zustand state and hook behavior against the Phase 1 contract.

## Phase 4: Replace Manual Section Editing in Sentinel Web

**Goal:** Deliver the screenshot-directed dropdown and generated instruction experience in the instructor builder.

- [x] Replace the native title `<input>` and instruction pencil/`Textarea` in `app/sentinel-web/src/features/exams/builder/_components/question-bucket-table/question-section-card.tsx` with the shared `Select`, using `QuestionTypeDefinition.value` as the control value and label as visible text.
- [x] Add `questionTypes`, `onSectionQuestionTypeChange`, and a computed `canChangeQuestionType` to `QuestionSectionCardProps`; remove `onSectionTitleChange` and `onSectionDescriptionChange`.
- [x] Render the stored generated instruction beneath the header as read-only text for typed sections; render the preserved legacy description for untyped sections without exposing a manual editor.
- [x] Add accessible labels and states: `Question type for {section title}`, `Select question type`, disabled helper text for a non-empty section, and loading/empty catalog feedback.
- [x] Update `sectioned-question-bucket-table.tsx`, the table prop types in `_components/_types.ts`, `ExamStructureSection`, and `ExamBuilderWorkspace` to pass the workspace question types and the semantic selection handler down to every section card.
- [x] Change `ExamBuilderWorkspace` so `onAddQuestion(sectionId)` resolves the typed section and calls `handleSelectQuestionType(section.questionType)` directly; keep `QuestionTypeSelectorDialog` only for any remaining flat/unsectioned path and show a toast/focus the dropdown when the section is untyped.
- [x] Extend the import modal `types.ts`, `utils.ts`, and `questions-panel.tsx` to accept `allowedQuestionType`, filter or disable incompatible bank questions, clear incompatible stale selections when the target changes, and show the active type in the modal context.
- [x] Extend `question-section-card.test.tsx` for all selector states, one generated instruction, no title textbox, no instruction editor, and the non-empty disabled behavior.
- [x] Add `exam-builder-workspace.test.tsx` for direct typed question creation, untyped blocking, target-section cleanup on close/back, and typed import-modal propagation.
- [x] Extend `utils.test.ts` and `questions-panel.test.tsx` for allowed-type filtering, stale selection removal, empty compatible results, and matching selection/import.

**Migration required:** No — this phase changes Sentinel Web presentation and client orchestration only.

## Phase 5: Apply Sentinel Core Parity

**Goal:** Prevent the admin builder from reintroducing free-text or incompatible section state through the shared API.

- [x] Mirror the typed selector, generated read-only instruction, accessible labels, and removed manual editors in `app/sentinel-core/src/features/exams/builder/_components/question-bucket-table/question-section-card.tsx`.
- [x] Mirror question-type props and semantic callbacks through Core's `sectioned-question-bucket-table.tsx`, `_components/_types.ts`, and `ExamBuilderWorkspace`.
- [x] Mirror direct typed question creation and untyped blocking in Core's `exam-builder-workspace.tsx` and builder hooks.
- [x] Mirror `allowedQuestionType` filtering and stale-selection cleanup in Core's question-bank import modal types, utilities, and questions panel.
- [x] Extend Core's `question-section-card.test.tsx` for selector/generated instruction behavior and add `exam-builder-workspace.test.tsx` for direct creation and untyped blocking.
- [x] Extend Core's import-modal `utils.test.ts` and `questions-panel.test.tsx` for matching-only results, stale selection cleanup, and empty compatible results.
- [x] Compare the Web and Core implementations during review and extract only genuinely reusable pure contracts/helpers into `packages/shared`; do not create a new cross-app component package in this feature.

**Migration required:** No — this phase maintains client parity over the same shared/API contracts.

## Phase 6: Integrated Verification and Rollout

**Goal:** Prove typed sections persist, legacy exams remain operable, and every builder/runtime consumer receives stable generated copy.

- [x] Add an API contract case to `app/sentinel-api/src/tests/exams/exam-contracts.test.ts` that saves and reloads a typed section, verifies its generated title/instruction and `questionType`, and verifies a mismatch returns HTTP 400 without replacing the existing exam structure.
- [x] Extend `app/sentinel-web/src/features/exams/export/exam-print-export.test.tsx` and the corresponding Core test to verify generated section instructions appear once and manual editor controls never leak into printable output.
- [x] Add or extend the instructor preview test under `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/preview/[sessionId]` to verify the persisted generated instruction is visible before the typed questions.
- [x] Run `pnpm --dir packages/db test`, `pnpm --dir packages/shared test`, `pnpm --dir packages/services test`, `pnpm --dir app/sentinel-api test`, `pnpm --dir app/sentinel-web test`, and `pnpm --dir app/sentinel-core test`.
- [x] Run focused lint/type-check/build commands exposed by each touched workspace and resolve all new errors without suppressions.
- [x] Manually verify in both builders: new untyped section, each of the eight dropdown values, generated copy, direct add-question type, matching-only import, disabled type change after adding a question, save/reload, reorder, preview, publish, and print.
- [x] Manually verify one empty legacy section, one homogeneous backfilled section, and one mixed legacy section against a migration snapshot; confirm no questions move or disappear.
- [x] Run `rg` for `onSectionTitleChange`, `Section instruction (optional)`, and the section instruction pencil path across both builder trees; remove obsolete manual-edit wiring and document any intentional remaining non-builder occurrence.

**Migration required:** No — this phase verifies the migrated contract and rollout behavior without further schema changes.

## Done Criteria

- Every exam-builder section exposes a question-type dropdown instead of a free-text title field.
- Every selected type produces the approved title and instruction and persists all three fields through save/reload.
- Typed sections contain only matching question types in client state and at the API boundary.
- Add Question bypasses the generic selector for typed sections, and bank import cannot add incompatible questions.
- Non-empty typed sections cannot change type without first removing their questions.
- Empty and mixed legacy sections remain intact and editable through the explicit opt-in selection path.
- Sentinel Web and Sentinel Core behave consistently.
- Student, preview, print, and report surfaces continue to receive the persisted generated copy.
- All exported functions added or changed by the implementation have JSDoc; inline comments exist only for the homogeneous backfill and non-obvious compatibility logic.
- Focused and workspace-level tests, lint, type checks, and builds pass.

## Breaking Changes, Environment, and Rollback

- **API contract:** Additive — `questionType` is added as nullable on exam sections and `instruction` is added to question-type definitions. Coordinated monorepo deployment is required because the updated shared response schema expects the new instruction field.
- **Behavioral contract:** Typed sections become homogeneous by question type. Legacy sections remain exempt until explicitly typed.
- **Environment variables:** None.
- **Dependencies:** None; use the existing PostgreSQL enum, Zod contracts, Radix-based `Select`, Zustand stores, and Vitest setup.
- **Migration rollback:** Run the new `rollback.sql` to drop the optional section-type index and `exam_sections.question_type`. Existing generated `title` and `description` snapshots remain usable after rollback, but selected semantic types are lost and cannot be reconstructed for empty sections; deploy the previous API and clients in the same rollback window.
- **Data safety:** The forward migration must never split sections, move questions, rewrite existing titles/descriptions, or assign a type to mixed/empty sections.
