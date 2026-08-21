---
title: "Expand Add Student Modal Width in sentinel-web and sentinel-core"
type: task
status: completed
created: "2026-08-21"
tags: [task, ui, dialog, modal, tailwind, sentinel-web, sentinel-core, responsive]
---

# Expand Add Student Modal Width in sentinel-web and sentinel-core

## Outcome

Make the "Add Students" enrollment dialogs significantly wider across both `sentinel-web` and `sentinel-core` (upgrading from `max-w-3xl` / 768px to responsive `w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl` / 1024px) so instructors and administrators can preview classlist imports, multi-column student lists, badges, and validation messages with comfortable whitespace and zero horizontal cramping.

## Pre-planning record

### Actors and goals

- **Instructor (sentinel-web)**: Wants a spacious, readable modal view when uploading section classlists or manually entering student numbers so preview tables, tags, and claim breakdown stats do not feel squished.
- **Administrator / Support (sentinel-core)**: Wants identical ergonomic modal sizing when enrolling students into classrooms.

### Domain language

- **Classroom Student Enrollment Modal**: The primary dialog (`ClassroomStudentEnrollmentDialog`) accessible from `/classrooms/[id]` and student management views.
- **Responsive Dialog Width**: Using Tailwind CSS container queries/breakpoints (`w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl`) to ensure optimal width across 1080p+, laptop screens, and tablet displays.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Instructor clicks "Add Students" on Classroom Detail Page (`sentinel-web`) | On `/classrooms/[id]` | Modal opens with `max-w-5xl` (1024px) width, giving ample room for the classlist preview table. | Mobile viewport scales gracefully with `w-[calc(100vw-2rem)]`. | Completed |
| SC-02 | Instructor clicks "Add Students" on Students Page (`sentinel-web`) | On `/students` | Modal opens with `max-w-5xl` width consistent with classroom dialog. | Preserves existing focus trapping and scroll containers. | Completed |
| SC-03 | Administrator clicks "Add Students" in Core Classroom Management (`sentinel-core`) | On `/classrooms/[id]` in `sentinel-core` | Modal opens with `max-w-5xl` width matching `sentinel-web`. | Responsive fallback on smaller viewports. | Completed |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | What max-width value is ideal for the Add Students modal? | `w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl` (1024px) | 1024px comfortably fits a 5-column table (`min-w-[42rem]`) plus sidebar/tab padding while fitting standard desktop/laptop viewports without screen overflow. | `max-w-3xl` (too narrow, caused table column wrapping), `max-w-7xl` (too wide for a dialog modal). | `classroom-student-enrollment-dialog.tsx` |

### Unknowns and blockers

- None. Both applications use Tailwind CSS v4 and the shared Radix UI `@sentinel/ui` Dialog primitives.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01 | `ClassroomStudentEnrollmentDialog` in `sentinel-web` renders with `w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl` | Update `DialogContent` className in `classroom-student-enrollment-dialog.tsx` | Code inspection & build | Completed |
| AC-02 | SC-02 | `StudentEnrollmentDialog` in `sentinel-web` renders with `w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl` | Update `DialogContent` className in `student-enrollment-dialog.tsx` | Code inspection & build | Completed |
| AC-03 | SC-03 | `ClassroomStudentEnrollmentDialog` in `sentinel-core` renders with `w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl` | Update `DialogContent` className in `sentinel-core` | Code inspection & build | Completed |
| AC-04 | DEC-01 | Monorepo builds cleanly with zero layout regressions | Run Next.js and Turborepo builds | `pnpm build` | Completed |

## Scope

- Modifying the dialog container width classes in `sentinel-web` (`ClassroomStudentEnrollmentDialog`, `StudentEnrollmentDialog`).
- Modifying the dialog container width classes in `sentinel-core` (`ClassroomStudentEnrollmentDialog`).
- Ensuring inner preview table layouts and tabs stretch naturally to utilize the expanded width.

## Non-goals

- Refactoring the API business logic or parsing backend (already completed and verified in prior task).
- Modifying non-student modal dialogs (e.g. edit course, add room, institution settings).

## Constraints and decisions

- Keep `max-h-[90vh]` and `overflow-y-auto` to preserve smooth vertical scrolling on smaller screens.
- Use mobile-safe width `w-[calc(100vw-2rem)]` with responsive breakpoints `sm:max-w-4xl lg:max-w-5xl`.

## Phases

- [x] `phase-01-expand-dialog-widths-web-and-core.md` — Phase 1: Expand Add Student Modal Widths in sentinel-web and sentinel-core

## Verification

Checklist of verification commands:
- `pnpm --filter sentinel-web build` (58/58 routes generated, 0 errors)
- `pnpm --filter sentinel-core build` (49/49 routes generated, 0 errors)

## Deviations

None.

## Result

Completed and verified.
