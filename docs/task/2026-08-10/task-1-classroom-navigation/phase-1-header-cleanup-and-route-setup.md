# Phase 1: Header Cleanup & Route Setup

**Goal:** Remove unnecessary header action buttons in classroom detail view and set up sub-route navigation.

## Tasks

- [x] Remove 3-dots header button (`ellipsis-horizontal`) from [app/(tabs)/classroom/[id]/index.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/(tabs)/classroom/[id]/index.tsx>)
- [x] Register `classroom/[id]/exams` and `classroom/[id]/classmates` as hidden sub-routes in [app/(tabs)/_layout.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/(tabs)/_layout.tsx>)
- [x] Add route navigation handlers for "Exams & Assessments" (`/classroom/${id}/exams`) and "Classmates" (`/classroom/${id}/classmates`) buttons in [app/(tabs)/classroom/[id]/index.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/(tabs)/classroom/[id]/index.tsx>)
- [x] Write unit test for classroom navigation path builder in `app/sentinel-mobile/features/classroom/classroom-navigation.test.ts`

**Migration required:** No
