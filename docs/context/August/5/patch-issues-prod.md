# Production Patch Issues — Implementation Context

## Purpose

This is the source context for the production-patch implementation plan. It records the reported defects, their affected surfaces, and the required outcomes. It intentionally does not prescribe implementation details.

## Scope

| ID  | Area                | Affected surface                                    | Required outcome                                                         |
| --- | ------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| P1  | Header              | Student web app, mobile                             | Header controls remain usable and search uses the intended mobile width. |
| P2  | Calendar            | Student web app                                     | Personal notes are private to their creator.                             |
| P3  | Examination history | Student web app                                     | Cards show the correct time and do not open upcoming examinations.       |
| P4  | Grading             | `sentinel-core`, `sentinel-web`, and grading export | Student section is available in every grading output.                    |
| P5  | Examination attempt | Student web app, mobile                             | Attempt controls occupy no more than two rows.                           |

## Issue Details

### P1 — Mobile header: profile control and global search

**Observed**

- On mobile, the profile avatar is positioned flush with the right screen edge. The header needs a stable right-side inset so the control is fully visible and tappable.
- Opening global search shows a search panel that stops before the profile-avatar area instead of using the full intended mobile width. This is visible in `IMG_3513.PNG`.

**Required outcome**

- The profile avatar retains appropriate spacing from the right viewport edge at mobile widths.
- The expanded global-search panel uses the full intended mobile width when activated.

### P2 — Calendar: personal-note visibility

**Observed**

- Calendar notes created by one student are visible in another student's calendar.
- `IMG_3514.PNG` shows note entries rendered in the student calendar; these entries must not expose another student's personal reminder.

**Required outcome**

- A personal calendar note is visible only to the student who created it.
- This privacy rule applies when loading calendar entries, including after changing the displayed month.

### P3 — Examination history: time and upcoming-card access

**Observed**

- The history card displays the examination end time where the start time should be shown.
- An examination marked `UPCOMING` appears as a navigable card, indicated by the right-facing chevron in `IMG_3513.PNG`.

**Required outcome**

- The card displays the examination start date and time.
- A student cannot open an `UPCOMING` examination from examination history. The card must not provide a navigation path to the attempt or result view before the examination is available.

### P4 — Grading: student section data

**Observed**

- Instructor grading views in `sentinel-core` and `sentinel-web` do not load or display the student's section.
- The grading Excel export also omits the student's section.

**Required outcome**

- The student's section is available and displayed in both instructor grading applications.
- The same section value is included in the grading Excel export.

### P5 — Examination attempt: mobile control layout

**Observed**

- On mobile, the timer is on its own row; answered/flagged counts and **Show passage** occupy a second row; and **Turn In** occupies a third row. `IMG_3515.PNG` shows the resulting three-row control area.
- The extra row takes space away from the question content and creates a poor small-screen experience.

**Required outcome**

- At mobile and small-screen widths, the timer, answered count, flagged count, passage control, and turn-in action fit within a maximum of two rows.
- All controls remain visible, clearly understandable, and usable during an attempt.

## Reference Screenshots

- `IMG_3512.PNG` — mobile header/profile-menu state.
- `IMG_3513.PNG` — expanded global search and an upcoming examination card in history.
- `IMG_3514.PNG` — student calendar with note entries.
- `IMG_3515.PNG` — three-row mobile attempt control area.
