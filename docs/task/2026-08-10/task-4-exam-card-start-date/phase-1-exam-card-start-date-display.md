# Phase 1: Exam Card Scheduled Start Date Display

**Goal:** Format and display the scheduled examination start date and time on `ExamCard`.

## Tasks

- [x] Update `MobileExamDisplay` type in [features/exam/lib/mobile-exam-adapter.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/lib/mobile-exam-adapter.ts) to map `exam.startDate` / `exam.scheduledStartDate`
- [x] Update metadata row in [components/exam/exam-card.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/components/exam/exam-card.tsx) to render formatted start date with calendar icon alongside duration
- [x] Handle null/undefined start date graceful fallback formatting
- [x] Write unit test for exam start date formatter in `app/sentinel-mobile/features/exam/lib/exam-start-date-format.test.ts`

**Migration required:** No
