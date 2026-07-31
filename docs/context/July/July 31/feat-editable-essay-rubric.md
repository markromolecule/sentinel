# Goal

Make the [essay] rubric on the guide page (under the Essay Rubric section) editable and customizable, so it can be dynamically applied when grading [examination]s.

# Background

Currently the essay rubric is static. We want to make it dynamic: something that can be edited and then used directly as the grading standard for essay questions in exams.

# Proposed Flow

1. **Baseline rubric** — [Support] defines the default/baseline essay rubric.
2. **Override** — Administrators or instructors can customize this baseline to fit their own course or exam needs.
3. **Application** — The resulting rubric (baseline or overridden) is used as the [grading] criteria for essay questions, either:
    - at the general/course level, or
    - scoped to a specific [exam] set up by the [instructor]/[proctor].

# Key Consideration: Exam Integrity

Editing or overriding a rubric must **not retroactively affect exams students have already taken**. If an instructor updates their rubric after students have completed an exam, previously submitted/graded exams should continue to be scored against the rubric version that was active at the time they were taken.

In other words: rubric changes should apply forward only, not rewrite the grading basis for past attempts.

# Open Questions

- Should overrides be scoped per-exam, per-instructor (applies to all their exams), or global?

Answer:
I prefer it will be scoped per exam.

- Do we need rubric versioning/history (e.g., "Rubric v1 used for Exam A on [date]") to support the integrity requirement above?

Answer:

- If its not add a complexity to the system. Yes! but if its just a add-ons to the current flow its fine.

- What happens to in-progress exams (started but not yet submitted) if the rubric changes mid-attempt?

Answer:

- For the in-progress exam it will be using the baseline rubric.

- Who has permission to override: instructors only, or also proctors/admins?

Answer:

- Instructors can override, admins / superadmin can override.
