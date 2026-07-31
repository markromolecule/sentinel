# Eligibility Service Modularization Implementation Plan

## Goal

Refactor the monolith eligibility evaluation engine `evaluate-student-exam-eligibility.service.ts` into clean, testable sub-modules. This refactoring will isolate distinct domain concerns (Remediation, Enrollments, Overrides, and Lifecycle state blocks) into independent helper files, while preserving 100% of the existing functional contract and test coverage.

---

## Phase 1: Remediation and Enrollment Validators

**Goal:** Extract remediation and enrollment validation logic into independent modular functions.

- [ ] Create [`validate-remediation-access.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/access/services/validate-remediation-access.ts) containing `validateRemediationAccess` logic.
- [ ] Create [`validate-student-enrollment.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/access/services/validate-student-enrollment.ts) containing `validateStudentEnrollment` logic.

**Migration required:** No

---

## Phase 2: Override and Lifecycle Resolver

**Goal:** Extract attempt-lifecycle checking and student override logic (REOPEN, MAKEUP, RETAKE) into a dedicated solver.

- [ ] Create [`resolve-student-override-access.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/access/services/resolve-student-override-access.ts) containing `resolveStudentOverrideAccess` logic.

**Migration required:** No

---

## Phase 3: Orchestrator Integration

**Goal:** Integrate the extracted modular helpers back into the main orchestrator, preserving JSDoc and full compatibility.

- [ ] Refactor [`evaluate-student-exam-eligibility.service.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/examination/access/services/evaluate-student-exam-eligibility.service.ts) to call the extracted modules.
- [ ] Run `pnpm --dir app/sentinel-api test access` to verify zero regression.

**Migration required:** No

---

## Done Criteria

- [ ] Mon monolith `evaluate-student-exam-eligibility.service.ts` is under 150 lines, focused solely on fetching data and orchestrating validators.
- [ ] All 105 tests in `access.test.ts` pass successfully.
- [ ] All exported functions contain proper JSDoc.
