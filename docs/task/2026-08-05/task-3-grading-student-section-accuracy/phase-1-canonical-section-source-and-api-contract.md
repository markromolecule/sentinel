# Task 3 — Phase 1: Canonical Section Source and API Contract

**Goal:** Return each grading student’s enrolled section, including when one examination is assigned to multiple sections.

- [ ] Update `app/sentinel-api/src/modules/examination/grading/data/get-grading-students.ts` so `sectionId` and `sectionName` are selected from the student’s enrolled `class_groups.section_id` relationship, joined to `sections`, rather than from `exam_assigned_sections`. Retain `exam_assigned_sections` only for exam-assignment filtering and visibility.
- [ ] Update the query grouping in `app/sentinel-api/src/modules/examination/grading/data/get-grading-students.ts` to group by the enrolled section fields selected for each student, preventing duplicate or assignment-derived section values.
- [ ] Preserve the response shape in `app/sentinel-api/src/modules/examination/grading/grading.dto.ts` and `packages/shared/src/schema` so `sectionId` and `sectionName` remain nullable only for genuinely unassigned records; this is a data correction, not a breaking API change.
- [ ] Extend `app/sentinel-api/src/modules/examination/grading/services/get-grading-students.test.ts` with a multi-section examination fixture where the assignment section differs from the student's `class_groups.section_id`; assert the service returns the enrolled section in both `students` and grouped `sections`.
- [ ] Create `app/sentinel-api/src/modules/examination/grading/data/get-grading-students.test.ts` to verify the query joins/selects the class-group section and maintains the `sectionId` filter for assigned exam sections.
- [ ] Create `app/sentinel-api/src/modules/examination/grading/controllers/get-grading-students.controller.test.ts` to assert the live response contains the canonical `sectionId` and `sectionName` fields.

**Migration required:** No — the canonical relationship already exists through `enrollments → class_groups.section_id → sections`.
