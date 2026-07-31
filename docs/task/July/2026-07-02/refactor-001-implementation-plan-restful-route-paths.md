# Refactor 001 Implementation Plan: RESTful Route Paths

## Pre-Planning

- [x] Task summary: replace entity-identifying query-string routes such as `/student/history/details?attemptId=...` with RESTful path routes such as `/student/history/attempts/...`, and identify similar route candidates across the apps.
- [x] Relevant source files scanned:
    - `docs/context/July/improve-path.md`
    - `.agents/rules/implementation-plan.md`
    - `.agents/rules/global/1-3-1-rule.md`
    - `.agents/workflows/to-do-workflow.md`
    - `app/sentinel-web/src/app/(protected)/student/history/details/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/history/details/_hooks/use-exam-details/index.ts`
    - `app/sentinel-web/src/app/(protected)/student/history/_components/history-card.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/_components/exam-card.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session/index.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx`
    - `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/assignment-content.tsx`
    - `app/sentinel-web/src/features/exams/_components/cards/exam-card/exam-card-header.tsx`
    - `app/sentinel-web/src/features/exams/_components/tables/exam-action-cell.tsx`
    - `app/sentinel-core/src/app/(protected)/exams/logs/_hooks/use-exam-incident-logs.ts`
- [x] Files, services, and DB tables likely touched:
    - `app/sentinel-web/src/app/(protected)/student/history/attempts/[attemptId]/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/history/exams/[examId]/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/history/details/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/history/details/page.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/history/details/_hooks/use-exam-details/index.ts`
    - `app/sentinel-web/src/app/(protected)/student/history/details/_hooks/use-exam-details/index.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/history/_components/history-card.tsx`
    - `app/sentinel-web/src/app/(protected)/student/history/_components/history-card.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/_components/exam-card.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/_components/exam-card.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session/index.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session/index.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.test.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx`
    - `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.test.tsx`
    - `app/sentinel-web/src/lib/routes/student-history-routes.ts`
    - `app/sentinel-web/src/lib/routes/student-history-routes.test.ts`
    - `app/sentinel-web/src/lib/routes/route-audit.ts`
    - DB tables: none.
- [x] Prisma migration decision: no migration needed because the change is limited to Next.js route structure, navigation helpers, redirects, and tests.

## Three Viable Options

### Option 1: Student History Route Only

- [ ] Add `/student/history/attempts/[attemptId]` and update only links that currently point to `/student/history/details?attemptId=...`.
- [ ] Leave `/student/history/details?examId=...`, exam feedback return links, exam logs, and assignment selection unchanged.
- [ ] Keep `/student/history/details` as a compatibility page for old links.

Tradeoff: fastest and directly fixes the example, but it does not satisfy the broader “identify all paths” goal and leaves related query-id routes inconsistent.

### Option 2: Canonical Route Helpers With Compatibility Redirects

- [ ] Add route helper functions for canonical student history paths.
- [ ] Add `/student/history/attempts/[attemptId]` and `/student/history/exams/[examId]` as the canonical detail pages.
- [ ] Keep `/student/history/details` as a redirect-only compatibility route for `attemptId`, `examId`, and legacy `id` query params.
- [ ] Update all student-web links and redirects that use history detail query params to call the route helpers.
- [ ] Add a route audit document/helper that lists other query-id candidates, then convert only the high-confidence entity-detail routes in follow-up phases.

Tradeoff: best balance of maintainability and safety because the new route shape is centralized while old links continue to work during rollout.

### Option 3: Broad Cross-App Route Refactor

- [ ] Convert all query-param identity routes in `sentinel-web`, `sentinel-core`, and `sentinel-support` in one change set.
- [ ] Replace `/exams/assign?examId=...` with `/exams/[examId]/assign`.
- [ ] Replace `/exams/logs?examId=...` with `/exams/[examId]/logs`.
- [ ] Replace student history, feedback, messages, and dashboard query uses wherever a query key references an entity id.

Tradeoff: produces the cleanest URL system quickly, but has high regression risk because several query params are UI filters or selected-state values rather than true resource identity.

## Best Option

Choose Option 2.

Why: it fixes the reported student history URL with a canonical RESTful path, centralizes URL construction so future code stops reintroducing query-id paths, and preserves compatibility for existing bookmarks, redirect flows, and tests. It also respects the scan result that some query params are legitimate UI state, so the implementation can distinguish entity identity routes from filters before converting more surfaces.

Concrete next steps:

1. Add route helper functions for student history attempt and exam detail URLs.
2. Split the student history detail surface into RESTful dynamic pages.
3. Convert the old query-based `/student/history/details` page into a compatibility redirect page.
4. Update all student-web links and redirects that build `/student/history/details?attemptId=...` or `/student/history/details?examId=...`.
5. Add tests for helpers, dynamic route params, old-link redirects, and updated navigation call sites.
6. Add an explicit audit list for other query-id route candidates and defer ambiguous selector/filter params.

## Phase 1: Route Candidate Audit and Helper Contract

**Goal:** Define which query-param paths are resource identity URLs and centralize the canonical student history URL format before moving pages.

- [x] Add `app/sentinel-web/src/lib/routes/student-history-routes.ts`.
- [x] In `app/sentinel-web/src/lib/routes/student-history-routes.ts`, export `buildStudentHistoryAttemptHref(attemptId: string)` returning `/student/history/attempts/${attemptId}`.
- [x] In `app/sentinel-web/src/lib/routes/student-history-routes.ts`, export `buildStudentHistoryExamHref(examId: string)` returning `/student/history/exams/${examId}`.
- [x] In `app/sentinel-web/src/lib/routes/student-history-routes.ts`, export `buildStudentHistoryFallbackHref(args: { attemptId?: string | null; examId?: string | null })` that prefers `attemptId`, falls back to `examId`, and finally returns `/student/history`.
- [x] Add `app/sentinel-web/src/lib/routes/student-history-routes.test.ts`.
- [x] Write tests for `buildStudentHistoryAttemptHref()` with a UUID-like attempt id.
- [x] Write tests for `buildStudentHistoryExamHref()` with a UUID-like exam id.
- [x] Write tests for `buildStudentHistoryFallbackHref()` when both ids exist, only `examId` exists, and neither id exists.
- [x] Add `app/sentinel-web/src/lib/routes/route-audit.ts`.
- [x] In `app/sentinel-web/src/lib/routes/route-audit.ts`, export a `RESTFUL_ROUTE_AUDIT` array documenting high-confidence conversions: `/student/history/details?attemptId=...` to `/student/history/attempts/[attemptId]`, `/student/history/details?examId=...` to `/student/history/exams/[examId]`, `/exams/logs?examId=...` to `/exams/[examId]/logs`, and `/exams/assign?examId=...` to `/exams/[examId]/assign`.
- [x] In `app/sentinel-web/src/lib/routes/route-audit.ts`, mark UI/filter query params such as search, tab/view, and selected dashboard state as `defer` rather than `convert`.
- [x] Add `app/sentinel-web/src/lib/routes/route-audit.test.ts`.
- [x] Write a route audit test that asserts student history attempt and exam routes are marked `convert`.
- [x] Write a route audit test that asserts selector/filter query params are marked `defer`.

**Migration required:** No — this phase adds frontend route helpers and audit metadata only.
**Breaking changes:** No — no runtime route behavior changes yet.
**New environment variables:** None.

<!-- NOTE: Phase 1 validation passed with `./node_modules/.bin/vitest run src/lib/routes/student-history-routes.test.ts src/lib/routes/route-audit.test.ts` and `./node_modules/.bin/eslint src/lib/routes/student-history-routes.ts src/lib/routes/student-history-routes.test.ts src/lib/routes/route-audit.ts src/lib/routes/route-audit.test.ts`. -->

## Phase 2: RESTful Student History Detail Pages

**Goal:** Make `/student/history/attempts/[attemptId]` and `/student/history/exams/[examId]` the canonical pages for student exam history details.

- [x] Add `app/sentinel-web/src/app/(protected)/student/history/_components/history-details-content.tsx`.
- [x] Move the current render logic from `app/sentinel-web/src/app/(protected)/student/history/details/page.tsx` into `HistoryDetailsContent` in `app/sentinel-web/src/app/(protected)/student/history/_components/history-details-content.tsx`.
- [x] In `app/sentinel-web/src/app/(protected)/student/history/_components/history-details-content.tsx`, accept props `{ attemptId?: string | null; examId?: string | null }` instead of reading route identity only from query params.
- [x] Update `app/sentinel-web/src/app/(protected)/student/history/details/_hooks/use-exam-details/index.ts` to accept optional `{ attemptId, examId }` arguments and use `useSearchParams()` only as a legacy fallback.
- [x] Update `app/sentinel-web/src/app/(protected)/student/history/details/_hooks/use-exam-details/_types.ts` if the hook return or argument type needs to expose route-derived ids.
- [x] Add `app/sentinel-web/src/app/(protected)/student/history/attempts/[attemptId]/page.tsx`.
- [x] In `app/sentinel-web/src/app/(protected)/student/history/attempts/[attemptId]/page.tsx`, read `params.attemptId` and render `HistoryDetailsContent` with `attemptId`.
- [x] Add `app/sentinel-web/src/app/(protected)/student/history/exams/[examId]/page.tsx`.
- [x] In `app/sentinel-web/src/app/(protected)/student/history/exams/[examId]/page.tsx`, read `params.examId` and render `HistoryDetailsContent` with `examId`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/history/details/page.tsx` to remain as a legacy compatibility page only.
- [x] In `app/sentinel-web/src/app/(protected)/student/history/details/page.tsx`, redirect `?attemptId=...` to `buildStudentHistoryAttemptHref(attemptId)`.
- [x] In `app/sentinel-web/src/app/(protected)/student/history/details/page.tsx`, redirect `?examId=...` or `?id=...` to `buildStudentHistoryExamHref(examId)`.
- [x] In `app/sentinel-web/src/app/(protected)/student/history/details/page.tsx`, redirect missing ids to `/student/history`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/history/details/page.test.tsx`.
- [x] Write a test that renders the shared details content with an `attemptId` prop and verifies `useExamHistoryDetailQuery(attemptId)` receives the route param.
- [x] Write a test that renders the shared details content with an `examId` prop and verifies `useExamQuery(examId)` receives the route param.
- [x] Add `app/sentinel-web/src/app/(protected)/student/history/attempts/[attemptId]/page.test.tsx`.
- [x] Write a route page test that supplies `params.attemptId` and verifies the shared details content receives the attempt id.
- [x] Add `app/sentinel-web/src/app/(protected)/student/history/exams/[examId]/page.test.tsx`.
- [x] Write a route page test that supplies `params.examId` and verifies the shared details content receives the exam id.
- [x] Add or update a legacy details page test that verifies `?attemptId=...`, `?examId=...`, and empty query params redirect to the expected canonical or fallback URL.

**Migration required:** No — Next.js route files and client hook behavior change only.
**Breaking changes:** No — the legacy `/student/history/details` URL remains supported as a redirect.
**New environment variables:** None.

<!-- NOTE: Phase 2 validation passed with `./node_modules/.bin/vitest run 'src/app/(protected)/student/history/details/page.test.tsx' 'src/app/(protected)/student/history/details/_hooks/use-exam-details/index.test.tsx' 'src/app/(protected)/student/history/attempts/[attemptId]/page.test.tsx' 'src/app/(protected)/student/history/exams/[examId]/page.test.tsx'` and `./node_modules/.bin/eslint 'src/app/(protected)/student/history/_components/history-details-content.tsx' 'src/app/(protected)/student/history/details/page.tsx' 'src/app/(protected)/student/history/details/page.test.tsx' 'src/app/(protected)/student/history/details/_hooks/use-exam-details/index.ts' 'src/app/(protected)/student/history/details/_hooks/use-exam-details/_types.ts' 'src/app/(protected)/student/history/details/_hooks/use-exam-details/index.test.tsx' 'src/app/(protected)/student/history/attempts/[attemptId]/page.tsx' 'src/app/(protected)/student/history/attempts/[attemptId]/page.test.tsx' 'src/app/(protected)/student/history/exams/[examId]/page.tsx' 'src/app/(protected)/student/history/exams/[examId]/page.test.tsx'`. -->

## Phase 3: Student Navigation and Redirect Call Sites

**Goal:** Stop generating legacy student history query URLs from cards, post-exam redirects, feedback pages, and already-turned-in recovery flows.

- [x] Update `app/sentinel-web/src/app/(protected)/student/history/_components/history-card.tsx` to use `buildStudentHistoryAttemptHref(item.attemptId)` when `item.attemptId` exists.
- [x] Update `app/sentinel-web/src/app/(protected)/student/history/_components/history-card.tsx` to use `buildStudentHistoryExamHref(item.examId)` when a completed/past item has no `attemptId`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/_components/exam-card.tsx` to use `buildStudentHistoryFallbackHref({ attemptId: exam.attemptId, examId: exam.id })` for completed exams.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect.ts` to redirect already turned-in attempts to `buildStudentHistoryAttemptHref(attemptId)`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session/index.ts` to redirect already turned-in attempts to `buildStudentHistoryAttemptHref(attemptId)`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.ts` to redirect already turned-in attempts to `buildStudentHistoryAttemptHref(attemptId)`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts` to redirect already turned-in attempts to `buildStudentHistoryAttemptHref(attemptId)`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.tsx` so `Skip for now` links to `buildStudentHistoryFallbackHref({ attemptId })`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.tsx` so `View Exam Result` links to `buildStudentHistoryAttemptHref(attemptId)` when present and `/student/history` otherwise.
- [x] Keep `app/sentinel-web/src/app/(protected)/student/exam/[id]/result/page.tsx` redirecting to `/student/exam/${examId}/feedback?attemptId=${result.attemptId}` in this phase because that page needs feedback context, not history detail context.
- [x] Update `app/sentinel-web/src/app/(protected)/student/history/_components/history-card.test.tsx`.
- [x] Write tests that a completed history item with an attempt id links to `/student/history/attempts/[attemptId]`.
- [x] Write tests that a completed history item without an attempt id links to `/student/history/exams/[examId]`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/_components/exam-card.test.tsx`.
- [x] Write tests that a turned-in exam card with an attempt id links to `/student/history/attempts/[attemptId]`.
- [x] Write tests that a turned-in exam card without an attempt id links to `/student/history/exams/[examId]`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect.test.tsx`.
- [x] Write a redirect test expecting `/student/history/attempts/[attemptId]`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/_hooks/use-exam-session/index.test.tsx`.
- [x] Write or update the already-turned-in error test to expect `/student/history/attempts/[attemptId]`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/lobby/page.test.tsx` or the nearest `use-lobby-actions` test to expect `/student/history/attempts/[attemptId]`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/page.test.tsx`.
- [x] Write a skip-link test expecting `/student/history/attempts/[attemptId]`.
- [x] Update `app/sentinel-web/src/app/(protected)/student/exam/[id]/feedback/thank-you/page.test.tsx`.
- [x] Write a result-link test expecting `/student/history/attempts/[attemptId]` and a missing-attempt fallback test expecting `/student/history`.

**Migration required:** No — frontend navigation and tests only.
**Breaking changes:** No — canonical links change, but old links still redirect through Phase 2 compatibility.
**New environment variables:** None.

<!-- NOTE: Phase 3 validation passed with `./node_modules/.bin/vitest run 'src/app/(protected)/student/history/_components/history-card.test.tsx' 'src/app/(protected)/student/exam/_components/exam-card.test.tsx' 'src/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect.test.tsx' 'src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.test.tsx' 'src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.test.tsx' 'src/app/(protected)/student/exam/[id]/feedback/page.test.tsx' 'src/app/(protected)/student/exam/[id]/feedback/thank-you/page.test.tsx'` and `./node_modules/.bin/eslint 'src/app/(protected)/student/history/_components/history-card.tsx' 'src/app/(protected)/student/history/_components/history-card.test.tsx' 'src/app/(protected)/student/exam/_components/exam-card.tsx' 'src/app/(protected)/student/exam/_components/exam-card.test.tsx' 'src/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect.ts' 'src/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect.test.tsx' 'src/app/(protected)/student/exam/[id]/_hooks/use-exam-session/index.ts' 'src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.ts' 'src/app/(protected)/student/exam/[id]/_hooks/use-exam-session.test.tsx' 'src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.ts' 'src/app/(protected)/student/exam/[id]/lobby/_hooks/use-lobby-actions.test.tsx' 'src/app/(protected)/student/exam/[id]/feedback/page.tsx' 'src/app/(protected)/student/exam/[id]/feedback/page.test.tsx' 'src/app/(protected)/student/exam/[id]/feedback/thank-you/page.tsx' 'src/app/(protected)/student/exam/[id]/feedback/thank-you/page.test.tsx'`. -->

## Phase 4: High-Confidence Instructor/Core Route Candidates

**Goal:** Plan the next RESTful conversions for non-student entity pages while avoiding query params that are only UI state.

- [x] Add `app/sentinel-web/src/lib/routes/exam-management-routes.ts`.
- [x] In `app/sentinel-web/src/lib/routes/exam-management-routes.ts`, export `buildInstructorExamLogsHref(examId: string)` returning `/exams/${examId}/logs`.
- [x] In `app/sentinel-web/src/lib/routes/exam-management-routes.ts`, export `buildInstructorExamAssignHref(examId: string)` returning `/exams/${examId}/assign`.
- [x] Add `app/sentinel-core/src/lib/routes/exam-management-routes.ts`.
- [x] In `app/sentinel-core/src/lib/routes/exam-management-routes.ts`, export `buildCoreExamLogsHref(examId: string)` returning `/exams/${examId}/logs`.
- [x] In `app/sentinel-core/src/lib/routes/exam-management-routes.ts`, export `buildCoreExamAssignHref(examId: string)` returning `/exams/${examId}/assign`.
- [x] Add `app/sentinel-web/src/app/(protected)/(instructor)/exams/[examId]/logs/page.tsx`.
- [x] Move or wrap the current instructor logs view so `/exams/[examId]/logs` passes `examId` from route params instead of `searchParams.get('examId')`.
- [x] Keep `app/sentinel-web/src/app/(protected)/(instructor)/exams/logs/page.tsx` as a compatibility redirect from `?examId=...` to `/exams/[examId]/logs`, and keep the no-id behavior as the all-logs view if the current UX supports it.
- [x] Add `app/sentinel-core/src/app/(protected)/exams/[examId]/logs/page.tsx`.
- [x] Move or wrap the current core logs view so `/exams/[examId]/logs` passes `examId` from route params instead of `searchParams.get('examId')`.
- [x] Keep `app/sentinel-core/src/app/(protected)/exams/logs/page.tsx` as a compatibility redirect from `?examId=...` to `/exams/[examId]/logs`, and keep the no-id behavior as the all-logs view if the current UX supports it.
- [x] Defer `/exams/assign?examId=...` conversion unless the implementation can preserve the current selector UX; if converted, add `/exams/[examId]/assign` while leaving `/exams/assign` as the unselected assignment dashboard.
- [x] Update `app/sentinel-web/src/features/exams/_components/cards/exam-card/exam-card-header.tsx` to use `buildInstructorExamAssignHref(exam.id)` only after `/exams/[examId]/assign` exists.
- [x] Update `app/sentinel-web/src/features/exams/_components/tables/exam-action-cell.tsx` to use `buildInstructorExamLogsHref(exam.id)` after `/exams/[examId]/logs` exists.
- [x] Mirror the same card/list/table route helper updates in `app/sentinel-core/src/features/exams/_components/cards/exam-card/exam-card-header.tsx`, `app/sentinel-core/src/features/exams/_components/cards/exam-list-item.tsx`, and `app/sentinel-core/src/features/exams/_components/tables/exam-action-cell.tsx` after the matching routes exist.
- [x] Add `app/sentinel-web/src/lib/routes/exam-management-routes.test.ts`.
- [x] Write tests for instructor exam logs and assignment helper outputs.
- [x] Add `app/sentinel-core/src/lib/routes/exam-management-routes.test.ts`.
- [x] Write tests for core exam logs and assignment helper outputs.
- [x] Add or update instructor web logs route tests to verify `/exams/logs?examId=...` redirects to `/exams/[examId]/logs`.
- [x] Add or update core logs route tests to verify `/exams/logs?examId=...` redirects to `/exams/[examId]/logs`.
- [x] Update card/list/action-cell tests that currently expect `/exams/assign?examId=...` or `/exams/logs?examId=...`.

**Migration required:** No — frontend routing only.
**Breaking changes:** No if compatibility routes remain; possible visual routing change for logs/assign pages must be verified.
**New environment variables:** None.

<!-- NOTE: Phase 4 validation passed with `./node_modules/.bin/vitest run 'src/lib/routes/exam-management-routes.test.ts' 'src/features/exams/_components/cards/exam-card/exam-card-header.test.tsx' 'src/features/exams/_components/cards/exam-list-item.test.tsx' 'src/app/(protected)/(instructor)/exams/logs/page.test.tsx'` and `./node_modules/.bin/eslint 'src/lib/routes/exam-management-routes.ts' 'src/lib/routes/exam-management-routes.test.ts' 'src/features/exams/_components/cards/exam-card/exam-card-header.tsx' 'src/features/exams/_components/cards/exam-card/exam-card-header.test.tsx' 'src/features/exams/_components/cards/exam-list-item.tsx' 'src/features/exams/_components/cards/exam-list-item.test.tsx' 'src/features/exams/_components/tables/exam-action-cell.tsx' 'src/app/(protected)/(instructor)/exams/assign/page.tsx' 'src/app/(protected)/(instructor)/exams/assign/_components/assignment-content.tsx' 'src/app/(protected)/(instructor)/exams/[examId]/assign/page.tsx' 'src/app/(protected)/(instructor)/exams/logs/page.tsx' 'src/app/(protected)/(instructor)/exams/logs/page.test.tsx' 'src/app/(protected)/(instructor)/exams/[examId]/logs/page.tsx'` in `app/sentinel-web`, plus `./node_modules/.bin/vitest run 'src/lib/routes/exam-management-routes.test.ts' 'src/features/exams/_components/cards/exam-card/exam-card-header.test.tsx' 'src/features/exams/_components/cards/exam-list-item.test.tsx' 'src/app/(protected)/exams/logs/_hooks/use-exam-incident-logs.test.ts' 'src/app/(protected)/exams/logs/page.test.tsx'` and `./node_modules/.bin/eslint 'src/lib/routes/exam-management-routes.ts' 'src/lib/routes/exam-management-routes.test.ts' 'src/features/exams/_components/cards/exam-card/exam-card-header.tsx' 'src/features/exams/_components/cards/exam-card/exam-card-header.test.tsx' 'src/features/exams/_components/cards/exam-list-item.tsx' 'src/features/exams/_components/cards/exam-list-item.test.tsx' 'src/features/exams/_components/tables/exam-action-cell.tsx' 'src/app/(protected)/exams/assign/page.tsx' 'src/app/(protected)/exams/assign/_components/assignment-content.tsx' 'src/app/(protected)/exams/[examId]/assign/page.tsx' 'src/app/(protected)/exams/logs/page.tsx' 'src/app/(protected)/exams/logs/page.test.tsx' 'src/app/(protected)/exams/logs/_components/exam-incident-logs-content.tsx' 'src/app/(protected)/exams/logs/_hooks/use-exam-incident-logs.ts' 'src/app/(protected)/exams/logs/_hooks/use-exam-incident-logs.test.ts' 'src/app/(protected)/exams/[examId]/logs/page.tsx'` in `app/sentinel-core`. -->

## Phase 5: Validation and Backward Compatibility

**Goal:** Verify the canonical routes, legacy redirects, and updated links without changing API contracts.

- [ ] Run `pnpm --dir app/sentinel-web exec vitest run src/lib/routes/student-history-routes.test.ts src/lib/routes/route-audit.test.ts`.
- [ ] Run `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/student/history/details/page.test.tsx' 'src/app/(protected)/student/history/details/_hooks/use-exam-details/index.test.tsx'`.
- [ ] Run `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/student/history/_components/history-card.test.tsx' 'src/app/(protected)/student/exam/_components/exam-card.test.tsx'`.
- [ ] Run `pnpm --dir app/sentinel-web exec vitest run 'src/app/(protected)/student/exam/[id]/_hooks/use-turned-in-exam-redirect.test.tsx' 'src/app/(protected)/student/exam/[id]/feedback/page.test.tsx' 'src/app/(protected)/student/exam/[id]/feedback/thank-you/page.test.tsx'`.
- [ ] Run focused instructor/core route-helper and logs tests added in Phase 4.
- [ ] Run targeted ESLint for all touched `app/sentinel-web/src` files.
- [ ] Run targeted ESLint for all touched `app/sentinel-core/src` files if Phase 4 is implemented.
- [ ] Manually verify `/student/history/attempts/f8af70a2-d9ed-4645-91f4-e5361dae473a` opens the same result page that `/student/history/details?attemptId=f8af70a2-d9ed-4645-91f4-e5361dae473a` opens today.
- [ ] Manually verify `/student/history/details?attemptId=f8af70a2-d9ed-4645-91f4-e5361dae473a` redirects to `/student/history/attempts/f8af70a2-d9ed-4645-91f4-e5361dae473a`.
- [ ] Manually verify `/student/history/exams/[examId]` opens the no-attempt fallback detail page.
- [ ] Manually verify feedback skip and thank-you result links route to `/student/history/attempts/[attemptId]`.
- [ ] Manually verify already-turned-in exam recovery and lobby recovery redirect to `/student/history/attempts/[attemptId]`.
- [ ] Manually verify any converted `/exams/[examId]/logs` and `/exams/[examId]/assign` routes preserve the same data and permissions as the old query routes.

**Migration required:** No — validation only.
**Breaking changes:** No — compatibility redirects must remain until consumers and bookmarks have migrated.
**New environment variables:** None.

## Public API and Compatibility Notes

- [ ] No backend API paths or payload schemas are changed by this plan.
- [ ] No Prisma migration is required.
- [ ] No new `.env` variables are required.
- [ ] Keep legacy `/student/history/details?attemptId=...`, `/student/history/details?examId=...`, and `/student/history/details?id=...` working through redirects.
- [ ] Do not convert query params that represent filters, searches, tab state, or temporary UI selections unless they are promoted to first-class resource routes.
- [ ] Do not add new dependencies.

## Done Criteria

- [ ] `/student/history/attempts/[attemptId]` is the canonical student attempt history detail URL.
- [ ] `/student/history/exams/[examId]` is the canonical student no-attempt exam history detail URL.
- [ ] `/student/history/details?attemptId=...` redirects to `/student/history/attempts/[attemptId]`.
- [ ] `/student/history/details?examId=...` and `/student/history/details?id=...` redirect to `/student/history/exams/[examId]`.
- [ ] Student history cards, exam cards, feedback links, thank-you links, already-turned-in redirects, and lobby recovery redirects no longer generate `/student/history/details?...` URLs.
- [ ] Other query-id route candidates are documented with a `convert` or `defer` decision.
- [ ] Each implemented phase has focused Vitest coverage.
- [ ] Targeted ESLint passes for touched frontend files.
