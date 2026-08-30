---
title: "Task: Exam Builder, PDF Report Score, and Attempt Summary Enhancements"
type: task
status: completed
created: "2026-08-30"
tags: [task, master, builder, pdf, reports, sentinel-web, sentinel-core, sentinel-api]
---

# Task: Exam Builder, PDF Report Score, and Attempt Summary Enhancements

## Outcome

Deliver four coordinated enhancements across `sentinel-web`, `sentinel-core`, `sentinel-api`, and `packages/hooks`:
1. Remove the premature `Publish` button in the exam builder header and replace it with a `Back to Exams` navigation button while retaining `Save Draft`.
2. Prioritize question type selection on untyped/blank sections on the right side of the section header, suppressing question addition/import buttons until a type is selected.
3. Fix student score formatting in the generated Examination Results Report PDF to display Format A (`score / totalScore` e.g., `14 / 30`) and evaluate pass/fail criteria against percentage.
4. Eliminate full-page re-rendering when searching the Attempt Summary report using React Query placeholder data, and move repetitive action badges (`Review`, `Retake`, `Makeup`) from the Student column to the Status column.

## Pre-planning record

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| D-01 | How should PDF student score be displayed? | Format A: `score / totalScore` (e.g. `14 / 30`) | Confirmed by user; cleanly reflects raw points vs total possible points. | Format B (`14 / 30 (46.7%)`) rejected for cleaner table width. | `docs/context/August/30/builder-pdf-and-report-improvements.md` |
| D-02 | Where should builder Back button navigate? | `/exams` via Next Link / Button | Standard instructor exams index path. | Browser back rejected (could lead to login or intermediate states). | Phase 1 |
| D-03 | How should search loading be handled? | React Query `placeholderData: (prev) => prev` + `DataTable isLoading={isFetching}` | Prevents unmounting search bar and keeps focus. | Full page `<ReportLoading />` on every keystroke rejected. | Phase 4 |

## Context Document

- Context Specification: `docs/context/August/30/builder-pdf-and-report-improvements.md`

## Architecture Decisions

- ADR: `docs/decisions/2026-08-30-builder-pdf-and-report-improvements.md`

## Impacted Applications & Packages

- `app/sentinel-web`
- `app/sentinel-core`
- `app/sentinel-api`
- `packages/hooks`
- `packages/shared`

## Phases

- [x] `phase-01-exam-builder-header-back-button.md` — Phase 1: Exam Builder Header Back Button & Publish Removal
- [x] `phase-02-question-type-selection-priority.md` — Phase 2: Blank Section Question Type Priority & Action Suppression
- [x] `phase-03-pdf-results-report-score-formatting.md` — Phase 3: PDF Examination Results Report Score Formatting (Format A)
- [x] `phase-04-attempt-summary-search-and-status-column.md` — Phase 4: Attempt Summary Smooth Search & Status Column Consolidation
