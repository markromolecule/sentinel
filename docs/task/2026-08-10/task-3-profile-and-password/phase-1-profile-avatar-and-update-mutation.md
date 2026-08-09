# Phase 1: Profile Avatar & Password Update Mutation

**Goal:** Render user avatar image/initials on profile screen and connect password update form to `useUpdatePasswordMutation`.

## Tasks

- [ ] Update profile hero header in [features/profile/components/profile-screen.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/profile/components/profile-screen.tsx) to render profile avatar URL if present
- [ ] Connect `handleUpdatePassword` in [features/profile/components/profile-screen.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/profile/components/profile-screen.tsx) to execute `useUpdatePasswordMutation` with loading states and error alerts
- [ ] Reset password input fields upon successful mutation completion
- [ ] Write unit test for update password mutation handler in `app/sentinel-mobile/features/profile/lib/password-update-handler.test.ts`

**Migration required:** No
