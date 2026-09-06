---
title: "Phase 2: Conditional Action Button Rendering in Exam Lobby (Option A)"
type: phase
parent: "fix-lobby-reentry-result-score-student-progress"
phase: "02"
status: completed
created: "2026-09-06"
tags: [task, phase, lobby, ui, reentry, instructor]
---

# Phase 2: Conditional Action Button Rendering in Exam Lobby (Option A)

## Objective

Update the instructor exam lobby waiting queue cards so that reconnecting students display exclusively the "Authorize Re-entry" action button, while first-time entry students display "Admit" and "Reject".

## Dependencies & Prerequisites

- Phase 1 completed or independent.
- Context Specification decision ledger: Option A chosen.

## Impacted Files & Components

- [`app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/lobby/_components/instructor-lobby-admission-panel.tsx): Condition action button group on `needsReentry`.
- [`app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/lobby/_components/instructor-lobby-admission-panel.test.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/%28protected%29/%28instructor%29/exams/%5Bid%5D/lobby/_components/instructor-lobby-admission-panel.test.tsx): Update unit tests to reflect mutually exclusive action buttons.

## Implementation Tasks

- [x] **Task 2.1 (Gate Button Rendering by `needsReentry`):**
  - In `instructor-lobby-admission-panel.tsx`:
  - Locate the `Waiting` queue section row renderer (around line 250).
  - Wrap the actions conditionally:

    ```tsx
    if (needsReentry && onAuthorizeReentry) {
        return (
            <Button
                size="sm"
                className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
                disabled={isRowUpdating || isAuthorizingThisStudent}
                onClick={() => void onAuthorizeReentry(student.studentId)}
            >
                {isAuthorizingThisStudent ? 'Authorizing...' : 'Authorize Re-entry'}
            </Button>
        );
    }

    return (
        <div className="flex gap-1">
            <Button
                size="sm"
                className="flex-1 text-xs"
                disabled={isRowUpdating || isAuthorizingThisStudent}
                onClick={() => void onUpdateLobbyAdmissions([student.studentId], 'APPROVED')}
            >
                Admit
            </Button>
            <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                disabled={isRowUpdating || isAuthorizingThisStudent}
                onClick={() => void onUpdateLobbyAdmissions([student.studentId], 'REJECTED')}
            >
                Reject
            </Button>
        </div>
    );
    ```

- [x] **Task 2.2 (Update Lobby Panel Tests):**
  - In `instructor-lobby-admission-panel.test.tsx`:
  - Update `it('shows Authorize Re-entry for students with active attempt requiring re-entry')`:
    - For `student-8` (`hasActiveAttempt: true`), assert `Authorize Re-entry` is rendered and `Admit`/`Reject` are NOT rendered.
    - For `student-9` (`hasActiveAttempt: false`), assert `Admit` and `Reject` are rendered and `Authorize Re-entry` is NOT rendered.
    - Verify `screen.getAllByRole('button', { name: 'Admit' })` has length 1 (only for `student-9`).

## Verification & Testing

- Run test suite:

  ```bash
  pnpm --dir app/sentinel-web test src/app/\(protected\)/\(instructor\)/exams/\[id\]/lobby/_components/instructor-lobby-admission-panel.test.tsx
  ```

## Risks & Rollback

- **Risk:** None; purely presentation logic in the admission panel.
- **Rollback:** Restore unconditional rendering of Admit and Reject.
