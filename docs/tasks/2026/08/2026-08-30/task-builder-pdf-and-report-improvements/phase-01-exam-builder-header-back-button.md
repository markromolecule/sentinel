---
title: "Phase 1: Exam Builder Header Back Button & Publish Removal"
type: phase
parent: "docs/tasks/2026/08/2026-08-30/task-builder-pdf-and-report-improvements/README.md"
phase: "01"
status: completed
created: "2026-08-30"
tags: [task, phase, builder, navigation]
---

# Phase 1: Exam Builder Header Back Button & Publish Removal

## Objective

Remove the premature `Publish` button from the exam builder workspace header in both `sentinel-web` and `sentinel-core`. Replace it with a `Back to Exams` navigation button linking to `/exams` while preserving the `Save Draft` action button.

## Dependencies & Prerequisites

- Context specification `docs/context/August/30/builder-pdf-and-report-improvements.md` marked as ready.

## Impacted Files & Components

- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/_components/exam-builder-header.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/_components/exam-builder-screen.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/hooks/use-exam-builder/use-builder-workspace-actions.ts`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/builder/hooks/use-exam-builder/_types.ts`
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/exam-builder-header.tsx`
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/_components/exam-builder-screen.tsx`
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/hooks/use-exam-builder/use-builder-workspace-actions.ts`
- `app/sentinel-core/src/app/(protected)/exams/[id]/builder/hooks/use-exam-builder/_types.ts`

## Implementation Tasks

- [x] Task 1: Update `ExamBuilderHeader` in `sentinel-web` to remove `isPublishing` and `handlePublish` props; replace the `Publish` button with `<Button variant="outline" size="sm" asChild><Link href="/exams"><ArrowLeft className="h-4 w-4 mr-2" />Back to Exams</Link></Button>`.
- [x] Task 2: Mirror the `ExamBuilderHeader` update in `sentinel-core`.
- [x] Task 3: Clean up `isPublishing` and `handlePublish` in `use-builder-workspace-actions.ts`, `_types.ts`, and `exam-builder-screen.tsx` across `sentinel-web` and `sentinel-core`.

## Verification & Testing

- `npm run test -- src/app/(protected)/(instructor)/exams/[id]/builder` in `app/sentinel-web` (PASS: 6/6 test files, 22/22 tests).
- `npm run test -- src/app/(protected)/exams/[id]/builder` in `app/sentinel-core` (PASS: 5/5 test files, 20/20 tests).
- Verified: Header renders `[Save Draft]` and `[Back to Exams]`, with no `Publish` button in the header.

## Risks & Rollback

- Low risk: The publishing API itself is unaffected and remains available through the exam catalog/cards.
