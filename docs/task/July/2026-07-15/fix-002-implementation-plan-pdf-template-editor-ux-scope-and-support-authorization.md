# Implementation Plan — PDF Template Editor UX, Scope, and Support Authorization

> **Task summary:** simplify the Support report-template editor, make Sentinel’s global template the
> default while offering only parent institutions as overrides, and correct PDF preview/API role
> checks so authenticated Support staff can use the workflow.

## 1. The Context

The report-template page presents scope, header, footer, status, branding, reset, and preview as a
long stack of visually equal cards, which obscures the primary editing flow and makes configuration
feel heavier than it is. The preview request also checks `c.get('user').role`, which represents the
Supabase auth-table role and may be `authenticated`, even though `authMiddleware` already exposes
the application role through `c.get('role')`; meanwhile the institution client does not forward the
API's existing `institutionKind` filter, so the selector cannot request parent institutions only.

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Keep the current card layout, reduce borders and spacing, filter institutions in the
  browser, relabel the existing global option, and change only the preview controller to read
  `c.get('role')`.
- **Tradeoff:** This is fast, but it still downloads irrelevant institutions, leaves the dense page
  hierarchy mostly intact, and preserves the same incorrect role check in adjacent PDF endpoints.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Recast the report editor as one settings workspace with a compact scope/status
  toolbar, tabbed Header/Footer/Branding controls, a persistent preview panel, and secondary reset
  action; extend the institution service/hook contract to request `PARENT` records; and centralize
  Support-role plus permission checks for the PDF document module using the middleware role context.
- **Tradeoff:** This requires coordinated frontend component refactoring and focused API/service
  tests, though it does not require schema or infrastructure changes.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Replace the form with a full-screen visual document builder where users manipulate
  header and footer elements directly on a canvas and preview updates continuously.
- **Tradeoff:** A canvas editor adds substantial accessibility, responsive-layout, validation, and
  state-synchronization complexity for a feature whose body layout intentionally remains fixed.

## 1. The Execution

**The Recommendation:** Option B — The Strategic Path.

**The Justification:** Sentinel Support already uses horizontal tabs and sticky actions for dense
settings screens, so a tabbed editor fits the current product language and reduces visual weight
without a new dependency. Server-side parent filtering avoids over-fetching, while a shared PDF
authorization helper fixes the production role mismatch consistently instead of allowing the next
save, publish, branding, download, or retry request to fail for the same reason.

**Next Steps:**

1. Extend and test the institution query contract so the report editor requests only `PARENT`
   institutions and represents Sentinel global scope locally.
2. Replace PDF controllers' auth-table role checks with one tested application-role authorization
   path and enforce valid overall-report template scopes.
3. Refactor and test the report editor into a compact, accessible settings-and-preview workspace.

---

## Approved UX and Scope Decisions

- The initial report-template scope is the synthetic global value `__global__`, displayed as
  **Global (Sentinel)**; it is not stored as an institution row and continues to submit
  `institution_id: null`.
- The institution selector requests and displays only records whose `institutionKind` is `PARENT`.
  Child and standalone institutions are not report-template override choices.
- Global remains selected after first render and after the institution query resolves; asynchronously
  loaded institutions must not replace it.
- The page uses one editor workspace rather than a grid of independent cards:
    - a compact top toolbar contains scope, status/version, and unsaved-change state;
    - Header, Footer, and Branding are progressive-disclosure tabs;
    - preview remains visible in a right-side panel on desktop and follows the settings on smaller
      screens;
    - Save draft and Publish remain the primary page actions;
    - Reset to global is a secondary/destructive override action shown only for a parent scope.
- Branding is unavailable in global scope and shows a short explanatory empty state instead of a
  disabled file-input card.
- Generating a preview uses the current unsaved form values and does not require saving a draft.
- The overall-report template body and section order remain fixed; this plan changes only the editor
  hierarchy and existing header/footer/branding controls.

## Root-Cause Notes

- `authMiddleware` stores the application role in `c.get('role')` from JWT metadata, but PDF
  controllers compare `c.get('user').role` against `support`. The latter is the Supabase `auth.users`
  role and is not the correct application RBAC source.
- `packages/services/src/api/institutions.ts` currently accepts only search and pagination even
  though `GET /institutions` already validates and applies `institutionKind`; the hook therefore
  cannot make a server-filtered parent-only request.
- Existing PDF route tests put `support` directly on the mocked database user, masking the production
  mismatch. Tests must model `user.role: 'authenticated'` and `c.get('role'): 'support'` separately.

## Impacted Workspaces, Modules, and Data

### Support frontend

- `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/reports/page.tsx`
- `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/reports/page.test.tsx`
- `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/template-header-footer-fields.tsx`
- `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/template-preview-card.tsx`
- `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/template-status-card.tsx`
- `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/branding-upload-card.tsx`
- `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/report-template-editor.tsx` (new)
- `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/report-template-editor.test.tsx` (new)
- `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/index.ts`

### Shared clients and hooks

- `packages/services/src/api/institutions.ts`
- `packages/services/src/api/institutions.test.ts` (new)
- `packages/hooks/src/query/institutions/use-institutions-query.ts`
- `packages/hooks/src/query/institutions/use-institutions-query.test.tsx` (new)

### API authorization and scope validation

- `app/sentinel-api/src/modules/general/pdf-documents/services/pdf-document-authorization.service.ts` (new)
- `app/sentinel-api/src/modules/general/pdf-documents/services/pdf-document-authorization.service.test.ts` (new)
- `app/sentinel-api/src/modules/general/pdf-documents/controllers/templates/get-pdf-templates.controller.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/controllers/templates/upsert-pdf-template-draft.controller.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/controllers/templates/publish-pdf-template.controller.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/controllers/templates/delete-pdf-template-override.controller.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/controllers/templates/preview-pdf-template.controller.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/controllers/branding/get-institution-branding.controller.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/controllers/branding/upload-institution-branding.controller.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/controllers/branding/delete-institution-branding.controller.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/controllers/get-pdf-export-download.controller.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/controllers/post-pdf-export-retry.controller.ts`
- `app/sentinel-api/src/modules/general/pdf-documents/tests/pdf-document-scope-authorization.test.ts`

### Existing data read or written

- `institutions`: read to return `PARENT` choices and validate an override target.
- `pdf_templates`: existing global (`institution_id = null`) and parent-specific rows only.
- `institution_pdf_branding`: existing parent-specific logo metadata only.
- No columns, constraints, indexes, enums, or storage policies change.

---

## Phase 1: Parent-Only Institution Query Contract

**Goal:** Allow the report editor to fetch parent institutions directly from the API while retaining
the existing query API for other consumers.

- [x] Extend the `getInstitutions()` parameter overloads and URL serialization in
      `packages/services/src/api/institutions.ts` with optional `parentInstitutionId` and
      `institutionKind: 'STANDALONE' | 'PARENT' | 'CHILD'` values matching
      `getInstitutionsSchema.request.query`.
- [x] Extend `UseInstitutionsQueryArgs` and the React Query key in
      `packages/hooks/src/query/institutions/use-institutions-query.ts` so filter changes create
      distinct cache entries and are forwarded to `getInstitutions()`.
- [x] Add `packages/services/src/api/institutions.test.ts` coverage proving
      `institutionKind=PARENT` is URL encoded, response rows are mapped, and the legacy unfiltered
      call remains unchanged.
- [x] Add `packages/hooks/src/query/institutions/use-institutions-query.test.tsx` coverage proving
      the hook forwards `institutionKind: 'PARENT'`, includes it in the query key, and respects
      `enabled: false`.

**Migration required:** No — the API and `institutions.institution_kind` column already support this
filter; only the client contract is incomplete.

## Phase 2: PDF Support Authorization and Overall-Report Scope Enforcement

**Goal:** Make every PDF administration endpoint use the authenticated application role and prevent
invalid overall-report override scopes.

- [x] Add exported `requirePdfDocumentAccess()` and `assertOverallReportTemplateScope()` functions
      with JSDoc in
      `app/sentinel-api/src/modules/general/pdf-documents/services/pdf-document-authorization.service.ts`;
      the first must read the caller-supplied `role` from `c.get('role')` and required permission
      alternatives, and the second must accept global `null` or verify that a supplied institution
      exists with `institution_kind = 'PARENT'`.
- [x] Replace direct `user.role !== 'support'` checks in the template, branding, export-download,
      and export-retry controllers listed under **API authorization and scope validation** with
      `requirePdfDocumentAccess({ role: c.get('role'), activePermissionKeys, ... })`, while retaining
      `c.get('user').id` and email only for audit/generation metadata.
- [x] Remove the profile-institution equality restriction for application-role `support` in the
      affected PDF controllers; authorize global and cross-institution operations through the
      Support role plus active permissions, then validate the requested target record rather than
      inferring ownership from `c.get('institutionId')`.
- [x] Call `assertOverallReportTemplateScope()` from list, draft, publish, delete/reset, preview, and
      branding flows when `document_kind` is `ANALYTICS_OVERALL`; preserve the existing answer-key
      institution/exam ownership rules.
- [x] Add
      `app/sentinel-api/src/modules/general/pdf-documents/services/pdf-document-authorization.service.test.ts`
      for Support allow, non-Support deny, missing-permission deny, global allow, parent allow,
      child/standalone deny, and nonexistent-institution deny cases.
- [x] Update
      `app/sentinel-api/src/modules/general/pdf-documents/tests/pdf-document-scope-authorization.test.ts`
      so its request context models `user.role = 'authenticated'` separately from
      `c.set('role', 'support')`, proves preview succeeds for authorized Support, proves a
      non-Support application role is rejected, and proves invalid overall-report institution kinds
      are rejected even when requested directly outside the UI.

**Migration required:** No — authorization context, permission catalogs, and institution-kind data
already exist.

## Phase 3: Compact Report Template Editor Components

**Goal:** Replace the equal-weight card stack with a single, progressively disclosed settings
workspace and persistent preview.

- [x] Create `ReportTemplateEditor` in
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/report-template-editor.tsx`
      with a compact scope/status toolbar, `Tabs` for Header, Footer, and Branding, a responsive
      two-column settings/preview layout, and a sticky desktop preview region.
- [x] Refactor `TemplateHeaderFooterFields` in
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/template-header-footer-fields.tsx`
      to expose focused Header and Footer content without outer card-like borders; render boolean
      settings as separator-divided rows rather than individually bordered mini-cards.
- [x] Refactor `TemplatePreviewCard` in
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/template-preview-card.tsx`
      into a preview panel that preserves object-URL cleanup, PDF download, loading state, iframe
      title, and empty state without nesting another full Card.
- [x] Refactor `TemplateStatusCard` in
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/template-status-card.tsx`
      into compact status metadata suitable for the toolbar, including scope, version, publication
      state, last update, and unsaved-change indicator.
- [x] Refactor `BrandingUploadCard` in
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/branding-upload-card.tsx`
      into tab content with an explanatory global-scope state, selected-file validation feedback,
      current-logo metadata, and replace/remove actions.
- [x] Export the new editor from
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/index.ts` while
      keeping shared component props compatible with the examination answer-key page until that
      page is intentionally migrated.
- [x] Add
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/_components/report-template-editor.test.tsx`
      covering tab keyboard semantics, scope changes, compact status output, global branding state,
      parent branding controls, preview generation/loading/download states, and small-screen DOM
      order.

**Migration required:** No — this phase changes React composition and styling only.

## Phase 4: Report Page Integration and State Safety

**Goal:** Connect the redesigned editor to the existing mutations with Global (Sentinel) as a stable
default and parent institutions as the only selectable overrides.

- [x] Change `useInstitutionsQuery()` usage in
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/reports/page.tsx` to
      `{ institutionKind: 'PARENT', enabled: canView }` and render the synthetic first option as
      `Global (Sentinel)` with value `__global__`.
- [x] Keep `selectedScope` initialized to `__global__`, derive `selectedInstitutionId = null` for
      global requests, and prevent loading/error/empty institution query transitions from changing
      the selected scope.
- [x] Replace the page's Scope Card, Header/Footer card grid, status card, branding card, reset card,
      and preview card composition with `ReportTemplateEditor`, while preserving draft/published
      template resolution, unsaved-change calculation, preview blob reset, upload/remove behavior,
      and permission-based action disabling.
- [x] Show institution loading, failure, and no-parent-results states adjacent to the scope control;
      keep Global (Sentinel) usable when the parent query fails because global editing does not
      depend on that list.
- [x] Move Reset to global into the parent-scope secondary action area, require an explicit
      confirmation before deletion, and hide it for Global (Sentinel) rather than rendering a
      disabled card.
- [x] Preserve accessible labels for scope, tabs, color inputs, switches, file upload, preview
      iframe, and actions; ensure focus moves to the selected settings panel and mutation failures
      remain announced through existing toasts.
- [x] Expand
      `app/sentinel-support/src/app/(protected)/(support)/pdf-templates/reports/page.test.tsx` to
      cover default Global (Sentinel), parent-only query arguments, stable default after async data,
      parent selection payloads, global `institution_id: null` preview payload, authorized preview
      success, mutation errors, permission-disabled actions, and reset visibility/confirmation.

**Migration required:** No — global and institution-specific template persistence already uses a
nullable `pdf_templates.institution_id`.

## Phase 5: Cross-Layer Regression Verification and Handoff

**Goal:** Confirm the new editor, parent-only scope, and corrected Support authorization work
together without regressing the examination template workflow.

- [x] Run focused Support tests for
      `reports/page.test.tsx`, `report-template-editor.test.tsx`,
      `pdf-template-nav.test.tsx`, and `examinations/page.test.tsx`; resolve shared-component
      regressions without changing answer-key scope semantics.
- [x] Run focused shared-package tests for
      `packages/services/src/api/institutions.test.ts` and
      `packages/hooks/src/query/institutions/use-institutions-query.test.tsx`, followed by each
      workspace's typecheck command where available.
- [x] Run focused API tests for
      `pdf-document-authorization.service.test.ts` and
      `pdf-document-scope-authorization.test.ts`, then run the complete PDF document module test
      set to detect authorization regressions in preview, template CRUD, branding, download, and
      retry routes.
- [ ] Manually verify in Sentinel Support with a real Support session that the page opens on
      Global (Sentinel), the dropdown contains only parent institutions, global and parent previews
      render, Save draft/Publish use the chosen scope, branding is available only for a parent, the
      preview URL is revoked after replacement/unmount, and the layout remains usable at desktop,
      tablet, and mobile widths.
- [x] Record executed commands, screenshots, any environment-only blockers, and final acceptance
      results in a completion note appended to this plan before marking the work complete.

**Migration required:** No — verification exercises existing data and endpoints without changing
database structure.

---

## Acceptance Criteria

- [ ] `/pdf-templates/reports` initially displays **Global (Sentinel)** and submits `null` as its
      institution scope.
- [ ] The scope request includes `institutionKind=PARENT`; child and standalone institutions do not
      appear in the selector and are rejected for overall-report overrides at the API boundary.
- [ ] A signed-in user whose auth-table role is `authenticated` but application context role is
      `support` can preview, save, publish, manage branding, download, and retry when granted the
      corresponding active permission.
- [ ] Non-Support application roles and Support users missing required permissions receive 403
      responses.
- [ ] The report editor no longer presents scope, header, footer, status, branding, reset, and
      preview as separate equal-weight cards; settings are grouped by tabs and preview remains easy
      to inspect while editing.
- [ ] Existing header/footer fields, Sentinel-logo constraint, draft/publish behavior, institution
      branding behavior, and PDF object-URL cleanup remain functional.
- [ ] The examination answer-key page retains its current institution/exam workflow and passes its
      focused regression tests.

## Breaking Changes, Environment, and Rollback

- **Breaking API changes:** None. `institutionKind` is an additive client query parameter for an
  already-supported API filter, and response bodies remain unchanged.
- **New environment variables:** None.
- **New dependencies:** None; use existing `Tabs`, `Separator`, form controls, and responsive utility
  classes from `@sentinel/ui`.
- **Database migration:** Not required.
- **Rollback:** Revert the report editor composition and shared institution filter forwarding, then
  restore individual controller checks if necessary. No data rollback is needed because the plan
  does not alter persisted schemas or transform existing rows.

## Completion Note

- Date: 2026-07-15
- Implemented:
    - parent-only institution filtering in the shared institutions API and hook;
    - centralized PDF Support-role and permission enforcement using `c.get('role')`;
    - overall-report parent/global scope validation in template and branding flows;
    - compact report template editor with tabbed settings, sticky preview, global branding empty
      state, and confirmed reset action;
    - report page integration with stable `Global (Sentinel)` default and parent-only overrides.
- Executed commands:
    - `pnpm exec prettier --write ...touched files...`
    - `pnpm --dir packages/services exec vitest run src/api/institutions.test.ts`
    - `pnpm --dir packages/hooks exec vitest run src/query/institutions/use-institutions-query.test.tsx`
    - `pnpm --dir app/sentinel-api exec vitest run src/modules/general/pdf-documents/services/pdf-document-authorization.service.test.ts src/modules/general/pdf-documents/tests/pdf-document-scope-authorization.test.ts`
    - `pnpm --dir app/sentinel-support exec vitest run 'src/app/(protected)/(support)/pdf-templates/_components/report-template-editor.test.tsx' 'src/app/(protected)/(support)/pdf-templates/reports/page.test.tsx' 'src/app/(protected)/(support)/pdf-templates/_components/pdf-template-nav.test.tsx' 'src/app/(protected)/(support)/pdf-templates/examinations/page.test.tsx'`
    - `pnpm --dir app/sentinel-api exec vitest run src/modules/general/pdf-documents`
    - `pnpm --dir app/sentinel-api exec tsc --noEmit`
    - `pnpm --dir app/sentinel-support exec tsc --noEmit`
    - `git diff --check`
- Results:
    - focused service, hook, API, and support tests passed;
    - `git diff --check` passed.
- Environment-only blockers:
    - full `app/sentinel-api` PDF integration suite failed because Prisma could not reach
      `aws-1-ap-northeast-1.pooler.supabase.com`;
    - `pnpm --dir app/sentinel-support exec tsc --noEmit` failed on pre-existing unrelated test
      typing errors in courses, institutions, rooms, semesters, and notification-dropdown tests;
    - `pnpm --dir app/sentinel-api exec tsc --noEmit` aborted with Node heap OOM before finishing.
- Manual verification:
    - not completed in this turn.
