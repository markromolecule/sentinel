# Question Bank Import Modal UX Improvements — Implementation Plan

## 1. The Context

The question-bank import modal in `sentinel-web` and `sentinel-core` currently uses infinite scrolling and a global question-type dropdown, which makes navigation opaque and prevents filters from reflecting the questions available under the active collection, search, institution, subject, and status context. The implementation must add an authorized type-count aggregation endpoint, move both portals to 20-item offset pagination and dynamic facet chips, and preserve selected questions across page and filter changes without changing the database schema.

**Task summary:** Replace infinite-scroll question importing in both exam builders with persistent-selection offset pagination, context-aware type facets, and polished loading/layout states backed by a new filtered type-count API.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Add the endpoint as a separate query that duplicates the existing question-list filters, then update the two existing modal copies independently to use `useQuestionsQuery`, local page state, and pagination/facet markup.
- **Tradeoff:** Duplicated backend filter logic and duplicated portal changes can drift, causing facet counts to disagree with visible questions over time.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Extract the existing visibility and non-type question filters into reusable data-layer helpers, use them for both list and aggregation queries, define shared request/response contracts and query keys, and apply matching state/UI behavior with focused tests in both portals.
- **Tradeoff:** Requires a broader but controlled refactor of the question data layer and more contract/state tests than a direct endpoint addition.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Extend `GET /questions` so each paginated response also includes type facets, eliminating a second client request and keeping items plus metadata in one transport response.
- **Tradeoff:** Changes the established list response contract for every consumer and couples facet aggregation cost to callers that do not need it.

## 1. The Execution

**The Recommendation:** Choose **Option B: The Strategic Path**.

**The Justification:** The new counts are trustworthy only if they use exactly the same institution, status, collection, search, archive, and per-user visibility constraints as the question list while intentionally omitting only the type constraint. Reusing data-layer filtering fits the current Hono/service/Kysely architecture, avoids a breaking change to `GET /questions`, adds no dependency, and keeps the complexity budget focused on one endpoint plus two intentionally parallel UI integrations.

**Next Steps:**

1. Define and test the shared type-count contract, query key, and API client/query-hook surface.
2. Implement and test the authorized aggregation through the question data, service, controller, and route layers using shared visibility/filter logic.
3. Replace infinite-scroll state and UI in both portals, add focused hook/component/utility tests, and validate workspace tests, linting, type checks, and responsive interaction behavior.

## Impacted Surface

- Shared contract and cache identity: `packages/shared/src/schema/exams/question-schema.ts`, `packages/shared/src/schema/exams/question-schema.test.ts`, `packages/shared/src/constants/exams/exam-constants.ts`.
- API data flow: `app/sentinel-api/src/modules/content/question/data/get-questions.ts`, `app/sentinel-api/src/modules/content/question/data/get-questions.test.ts`, new type-count data/service/controller files and tests, `question.dto.ts`, and `question.route.ts`.
- Client data flow: `packages/services/src/api/questions.ts`, a co-located service test, new `packages/hooks/src/query/questions/use-question-type-counts-query.ts` and test, and `packages/hooks/src/query/questions/index.ts`.
- Portal state/UI: the root modal, `types.ts`, `constants.ts`, selection/data/bridge hooks, `questions-panel.tsx`, `question-panel-empty-state.tsx`, and focused tests beneath both `sentinel-web` and `sentinel-core` question-bank import modal directories.
- Database tables read by the feature: `question_bank_questions`, `question_bank_collection_questions`, `question_bank_collections`, `question_bank_collection_shares`, and the visibility-related user context already applied by `applyQuestionVisibility()`.
- Existing UI primitive reused without modification: `packages/ui/src/components/ui/pagination.tsx`.

## Phase 1: Shared Contracts and Client API Surface

**Goal:** Establish a validated, typed contract and stable cache identity for filtered question-type counts.

- [x] Add `getQuestionTypeCountsQuerySchema` to `packages/shared/src/schema/exams/question-schema.ts` with optional `collectionId`, `search`, `subjectId`, `institutionId`, and `status` fields, deliberately excluding `type`, `page`, and `pageSize` so facets describe all available types under the other active filters.
- [x] Add a type-count item/response schema to `packages/shared/src/schema/exams/question-schema.ts` using `questionTypeSchema`, a non-negative integer `count`, and a non-negative integer `total`; export inferred DTO types through the existing `Schema` namespace usage.
- [x] Extend `packages/shared/src/schema/exams/question-schema.test.ts` with valid coercion/optional-filter cases and rejection cases for invalid UUIDs, status values, question types, and negative/non-integer counts.
- [x] Add `QUESTION_QUERY_KEYS.typeCounts(params)` to `packages/shared/src/constants/exams/exam-constants.ts`, keeping list and facet caches distinct and parameter-sensitive.
- [x] Add `GetQuestionTypeCountsParams`, response record types, and exported `getQuestionTypeCounts()` to `packages/services/src/api/questions.ts`; reuse or generalize the query-string builder so only defined facet filters are sent to `/questions/type-counts`.
- [x] Create `packages/services/src/api/questions.test.ts` to verify the endpoint path, encoded filters, omission of undefined filters, and response-data unwrapping for `getQuestionTypeCounts()` while retaining list-query coverage.
- [x] Create `packages/hooks/src/query/questions/use-question-type-counts-query.ts` with JSDoc, `useApi()`, authenticated-query gating, `QUESTION_QUERY_KEYS.typeCounts()`, and `getQuestionTypeCounts()`.
- [x] Create `packages/hooks/src/query/questions/use-question-type-counts-query.test.ts` to verify query-key composition, parameter forwarding, and authenticated enablement using the package’s existing hook-test provider pattern.
- [x] Export the hook from `packages/hooks/src/query/questions/index.ts` and confirm the package root barrel continues to expose it through `@sentinel/hooks`.

**Migration required:** No — this phase adds request/response schemas, TypeScript types, and query cache keys only.

## Phase 2: Authorized Type-Count Aggregation API

**Goal:** Return type counts that exactly match the visible question universe for every supported non-type filter.

- [x] Refactor `applyQuestionFilters()` in `app/sentinel-api/src/modules/content/question/data/get-questions.ts` into an exported, typed reusable helper (or a new `data/question-filters.ts`) that applies archive, resolved institution, subject, status/default-active, collection membership, user visibility, search, and optional type/difficulty filters without changing current list behavior; add JSDoc to the exported helper.
- [x] Extend `app/sentinel-api/src/modules/content/question/data/get-questions.test.ts` to lock down collection, search, institution, subject, status/default-active, type, archive, and visibility predicates after the extraction, in addition to the current visibility cases.
- [x] Create `app/sentinel-api/src/modules/content/question/data/get-question-type-counts.ts` with an exported `getQuestionTypeCountsData()` that applies the shared filters while omitting question type, groups by `qbq.question_type`, converts database counts to numbers, and derives `total` from the grouped results.
- [x] Create `app/sentinel-api/src/modules/content/question/data/get-question-type-counts.test.ts` to assert generated SQL includes every supported non-type filter and visibility predicate, excludes a question-type predicate, groups by type, and maps empty/string-count rows to `{ items: [], total: 0 }` or numeric results.
- [x] Add `getQuestionTypeCountsSchema` and `GetQuestionTypeCountsQuery`/response types to `app/sentinel-api/src/modules/content/question/question.dto.ts` using the shared schemas and the standard `{ message, data }` envelope.
- [x] Create `app/sentinel-api/src/modules/content/question/services/get-question-type-counts.service.ts` with JSDoc and `getQuestionTypeCountsService()` forwarding the resolved institution, authenticated user ID, and validated filters to the data layer.
- [x] Create `app/sentinel-api/src/modules/content/question/services/get-question-type-counts.service.test.ts` to verify argument forwarding and unchanged aggregation mapping, including the empty result.
- [x] Create `app/sentinel-api/src/modules/content/question/controllers/get-question-type-counts.controller.ts` defining `GET /type-counts` and a handler that calls `assertAssessmentAccess()`, resolves institution scope with `resolveAssessmentInstitutionId()`, and returns the standard success envelope.
- [x] Create `app/sentinel-api/src/modules/content/question/controllers/get-question-type-counts.controller.test.ts` to cover unauthorized/forbidden access, institution resolution for supported roles, validated query forwarding, authenticated user forwarding, and the 200 response contract.
- [x] Register `.openapi(getQuestionTypeCountsRoute, getQuestionTypeCountsRouteHandler)` in `app/sentinel-api/src/modules/content/question/question.route.ts` before the `/:id` route so the literal `type-counts` path cannot be interpreted as a question ID.
- [x] Add or extend a route-contract test beside `app/sentinel-api/src/modules/content/question/question.route.ts` to verify `GET /questions/type-counts` resolves to the new handler and remains protected by `authMiddleware`.

**Migration required:** No — aggregation reads existing indexed relations and introduces no Prisma model, column, constraint, or seed-data change.

## Phase 3: Portal Pagination and Selection State

**Goal:** Give both portals deterministic 20-item pages while preserving selections across navigation and resetting page position when filters change.

- [x] Add `QUESTION_IMPORT_PAGE_SIZE = 20` to both portal `question-bank-import-modal/constants.ts` files and use the constant instead of inline page-size literals.
- [x] Update both portal `question-bank-import-modal/types.ts` files to replace infinite-scroll fields with `currentPage`, `totalPages`, `setCurrentPage`, type-count facet data/loading fields, and page-scoped selection callbacks; remove `QuestionTypeDefinition`, `hasMoreQuestions`, `isFetchingMoreQuestions`, `fetchNextQuestionsPage`, and load-more signatures that are no longer used.
- [x] Update both `use-question-bank-import-selection.ts` hooks to own `currentPage`, expose filter setter wrappers that synchronously reset it to `1` when search, collection, or question type changes, reset it in `resetState()`, and leave `selectedIds`/`selectedQuestionsById` untouched during page/filter transitions.
- [x] Add `use-question-bank-import-selection.test.ts` beside each portal hook to verify page reset for all three filters, selection persistence across those resets and explicit page changes, already-added exclusion, current-page select/deselect behavior, and full modal reset behavior.
- [x] Update both `use-question-bank-import-data.ts` hooks to retain trimmed `useDeferredValue(searchQuery)`, call `useQuestionsQuery({ page: currentPage, pageSize: QUESTION_IMPORT_PAGE_SIZE, ...filters })`, call `useQuestionTypeCountsQuery()` with identical non-type filters, return only the active page’s items, and expose page metadata plus facet loading state.
- [x] Add `use-question-bank-import-data.test.ts` beside each portal hook to verify deferred backend search, all-collection omission, selected-type inclusion only in the list query, selected-type omission from the facet query, fixed page size, current-page forwarding, and total/page metadata mapping.
- [x] Update both `use-question-bank-import-modal.ts` bridge hooks to pass `currentPage` into the data hook, expose page/facet state, and make “Select Page” operate only on the active `questionRecords` while preserving previously selected records stored by ID.
- [x] Add `use-question-bank-import-modal.test.ts` beside each portal hook to verify selections survive page/search/type/collection changes, imported questions include off-page selections, already-added questions remain non-importable, and page selection affects only the current response page.

**Migration required:** No — this phase changes React/query state only.

**Migration required:** No — this phase changes React/query state only.

## Phase 4: Facets, Pagination, Loading, and Responsive Layout

**Goal:** Deliver accessible, responsive facet navigation and polished fixed-height loading/list states in both import modals.

- [x] Rework both `question-bank-import-modal/_components/questions-panel.tsx` files to remove `IntersectionObserver`, `loadMoreRef`, `Select`, question-type definition fetching, and scroll-to-load copy; place the search control and wrapping facet-chip row side-by-side at larger breakpoints.
- [x] Render an accessible “All (total)” chip plus one chip per non-zero type count in both `questions-panel.tsx` files, map enum values to labels with `QUESTION_TYPE_OPTIONS`, indicate the active facet with design-system button/toggle styling and `aria-pressed`, and retain the selected type in a disabled/zero state if a refetch temporarily makes it unavailable so filter state never becomes invisible.
- [x] Add a pagination footer to both `questions-panel.tsx` files using `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, and `PaginationEllipsis` from `@sentinel/ui`; show `Page X of Y`, generate bounded numbered links with ellipses, disable previous/next at limits, prevent anchor navigation, and call `setCurrentPage()` only for valid target pages.
- [x] Add a pure `getPaginationItems(currentPage, totalPages)` helper to each portal `question-bank-import-modal/utils.ts` (or a shared UI helper only if both existing app import boundaries permit it cleanly), document it with JSDoc, and use it to keep numbered/ellipsis behavior deterministic and testable.
- [x] Extend each portal `question-bank-import-modal/utils.test.ts` with first/middle/last page, small-page-set, ellipsis-boundary, and invalid/zero-total cases, while retaining selection utility coverage.
- [x] Update both `question-panel-empty-state.tsx` components with an explicit loading variant using `Loader2` and `animate-spin` (or the existing `@sentinel/ui` spinner), a stable minimum content height, and accessible loading text so loading-to-list transitions do not collapse the panel.
- [x] Update both root `question-bank-import-modal.tsx` files to remove scroll-container refs and infinite-scroll props, pass facet/page state to `QuestionsPanel`, and refine modal/sidebar/panel borders, spacing, overflow, and mobile stacking without changing import/cancel behavior.
- [x] Add `questions-panel.test.tsx` and `question-panel-empty-state.test.tsx` beside the components in both portals to verify facet labels/counts and zero-count hiding, active/keyboard behavior, select-page checked state, numbered/ellipsis pagination, disabled boundaries, page callbacks, loading spinner semantics, empty state, and stable layout classes.
- [x] Add or extend a root `question-bank-import-modal.test.tsx` in both portals to exercise the integrated flow: select on page 1, navigate to page 2, change search/type/collection, return to page 1, and confirm selections and import count persist while page resets occur.

**Migration required:** No — this phase changes component composition and styling only.

## Phase 5: Cross-Workspace Verification and Documentation

**Goal:** Prove the API contract and both portal experiences behave consistently without regressions.

- [x] Run `pnpm --dir packages/shared test`, `pnpm --dir packages/services test`, and `pnpm --dir packages/hooks test`; resolve only failures introduced by the shared contract, service client, or query hook changes.
- [x] Run `pnpm --dir app/sentinel-api test` and `pnpm --dir app/sentinel-api typecheck`; verify aggregation filters, authorization, route precedence, and OpenAPI typing.
- [x] Run `pnpm --dir app/sentinel-web test` and `pnpm --dir app/sentinel-core test`; verify the matched pagination, facet, loading, selection, and import flows in both implementations.
- [x] Run targeted lint checks with `pnpm --dir app/sentinel-web lint`, `pnpm --dir app/sentinel-core lint`, and the repository-supported lint/build checks for touched packages; run `pnpm format:check` to confirm Prettier and Tailwind class ordering.
- [x] Manually verify both portals at desktop and mobile widths using collections with multiple pages/types: confirm search reaches `/questions`, facets reach `/questions/type-counts`, page resets occur, pagination scroll position remains usable, zero-result/loading states retain height, and import includes selections made on other pages.
- [x] Record executed commands and screenshots/manual outcomes in the implementing pull request, explicitly noting that the API addition is backward-compatible and requires no migration, rollback, seed, or environment action.

**Migration required:** No — verification and documentation do not alter persisted schema.

## Compatibility, Configuration, and Rollback Notes

- **Breaking API changes:** None expected. `GET /questions/type-counts` is additive, and `GET /questions` retains its existing response contract; the removed infinite-query fields are internal modal state contracts only.
- **New environment variables:** None.
- **Prisma migration:** Not required because all counts are computed from existing tables and relations.
- **Migration rollback:** Not applicable. If the feature must be rolled back, remove the new route/controller/service/data path and client hook, then restore the two modal implementations to `useInfiniteQuestionsQuery`; no database rollback is needed.
- **Performance checkpoint:** Use one grouped count query scoped by existing predicates. During implementation, inspect the generated SQL/query plan against representative collection/search data; add an index only through a separately reviewed Prisma migration if evidence shows an existing-index gap, rather than speculatively changing schema in this task.
- **Security checkpoint:** The count endpoint must use the same assessment-access assertion, institution resolution, archived/status defaults, and `applyQuestionVisibility()` constraints as the question list so counts cannot reveal hidden questions.

## Done Criteria

- [x] Every new exported function has JSDoc, and inline comments exist only for non-obvious pagination or SQL behavior.
- [x] Facet counts and list totals agree for the same non-type filters and authenticated visibility context.
- [x] Both portals show 20-item offset pages, `Page X of Y`, bounded numbered links/ellipses, and disabled previous/next controls at limits.
- [x] Search, collection, and type changes reset to page 1 without clearing selected or already-added question state.
- [x] “Select Page” changes only importable questions on the active page, and imports include selections retained from other pages and filters.
- [x] Loading, empty, responsive, keyboard, and screen-reader states are covered by tests and manual verification in both portals.
- [x] Shared, services, hooks, API, web, and core focused tests pass; lint, typecheck, and formatting checks pass for the touched workspaces.
