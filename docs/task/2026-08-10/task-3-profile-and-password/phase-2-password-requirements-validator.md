# Phase 2: Password Requirements Validator & Schema Matching

**Goal:** Implement password requirement UI indicator enforcing the 5 Zod regex rules matching `sentinel-web` registration schema.

## Tasks

- [ ] Create `[NEW]` [features/profile/components/password-requirements.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/profile/components/password-requirements.tsx) evaluating 5 regex rules (length >= 8, lowercase, uppercase, digit, special character) matching web `PASSWORD_REQUIREMENTS`
- [ ] Update [features/profile/components/password-input.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/profile/components/password-input.tsx) to render `PasswordRequirements` when focused on the new password field
- [ ] Disable password save action button until all 5 password requirement rules are satisfied
- [ ] Write unit test for 5-rule password regex validator in `app/sentinel-mobile/features/profile/lib/password-requirements-validator.test.ts`

**Migration required:** No
