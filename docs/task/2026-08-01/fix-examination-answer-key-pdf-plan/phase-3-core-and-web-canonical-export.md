# Phase 3: Canonical Answer-Key Export in Core and Web

### Phase 3: Canonical Answer-Key Export in Core and Web

**Goal:** Repurpose the existing Core/Web exam export routes for the centralized queued answer-key
lifecycle and remove the unconfirmed duplicate examination-copy renderer.

## Prerequisite

- [ ] Confirm Phase 2 dedicated authorization, service, hook, and Support lifecycle tests pass.

## Tasks

- [x] Create or extend the shared controlled component at
      `packages/ui/src/components/pdf-export-lifecycle-panel.tsx` with accessible create/pending/
      generating/ready/failed/retry/download states and no domain/API imports; export it from
      `packages/ui/src/index.ts`. If the feature plan was implemented first, extend that exact component
      without creating a second lifecycle component.
- [x] Add/extend `packages/ui/src/components/pdf-export-lifecycle-panel.test.tsx` for terminal
      states, permission-denied copy, accessible live status, retry only on `FAILED`, download only on
      `READY`, and popup-safe actions.
- [x] Replace the body of
      `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/export/page.tsx` with an explicit
      **Examination Answer Key PDF** page using exam ID, answer-key list/create/status/retry/download
      hooks, and `examinations:export_answer_key`; do not call `useExamQuery()` to obtain correct-answer
      content.
- [x] Replace the body of
      `app/sentinel-core/src/app/(protected)/exams/[id]/export/page.tsx` with the same lifecycle and
      permission behavior using shared services/hooks/presentation.
- [x] Update both `app/sentinel-web/src/features/exams/_hooks/use-exam-card/index.ts` and
      `app/sentinel-core/src/features/exams/_hooks/use-exam-card/index.ts` so the action is labelled
      **Export Answer Key PDF**, remains linked to `/exams/${exam.id}/export`, appears only with
      `examinations:export_answer_key`, and no longer displays a premature “Preparing” success toast.
- [x] Extend both `use-exam-card/index.test.tsx` files for granted/revoked permission across draft,
      published/active, archived, and fallback statuses, plus exact label/href.
- [x] Add or replace route tests beside both `export/page.tsx` files for permission denied, explicit
      create (no duplicate auto-create on remount), polling, ready download, failed retry, delete,
      stale-permission 403, missing exam, and API errors.
- [x] Open signed downloads with `noopener,noreferrer`, request them only after a user click, and do
      not persist URLs in local/session storage or toasts in either route.
- [x] After both new route suites pass, delete
      `app/sentinel-web/src/features/exams/export/exam-print-export.tsx`,
      `exam-export-utils.ts`, and their tests, and delete the equivalent four files from
      `app/sentinel-core/src/features/exams/export/`.
- [x] Remove obsolete export-folder barrel imports if present and run
      `rg -n "ExamPrintExport|buildExamExportSections|exam-export-utils" app/sentinel-web/src app/sentinel-core/src`
      to prove no production or test caller remains.
- [x] Preserve correct-answer confidentiality by asserting in both route tests that page data comes
      only from answer-key export record/status endpoints and never renders `exam.questions` from
      `useExamQuery()`.

**Migration required:** No — this phase replaces frontend consumers of the existing lifecycle.

## Validation

- [x] Run focused Web exam-card and `/exams/[id]/export` route tests.
- [x] Run focused Core exam-card and `/exams/[id]/export` route tests.
- [x] Run the `packages/ui` lifecycle component test and targeted `packages/hooks` answer-key tests.
- [x] Run targeted lint/build validation in `sentinel-web` and `sentinel-core`.
- [ ] Manually verify no answer-free print UI remains, and an authorized user can generate, observe
      status, retry a failure, and download the server-rendered answer key in both apps.

## Phase 3 implementation notes

- Completed canonical Web/Core answer-key export pages, permission-gated exam-card actions, focused
  route/card/UI tests, duplicate print renderer deletion, no-caller scans, targeted ESLint, and
  escalated production builds on 2026-08-02.
- Left the Phase 2 prerequisite unchecked because Support lifecycle tests were not run during this
  phase.
- Left manual verification unchecked because no browser/API session was used to generate, retry, and
  download a real answer-key export in both apps.

## Exit criteria

- Both cards use the unambiguous answer-key label and permission.
- Both routes consume the canonical server-side lifecycle and never receive correct answers as
  ordinary page/query data.
- Duplicate print renderers/utilities have zero callers and are removed.
- No automatic generation occurs merely from route remount/refresh.

## Rollback note

If a separately approved printable examination-copy requirement is discovered before deletion,
stop this phase and split it into a distinct **Print Examination Copy** feature with its own label,
route, tests, and permission. Do not restore the ambiguous **Export PDF** label or mix it with the
answer-key lifecycle.
