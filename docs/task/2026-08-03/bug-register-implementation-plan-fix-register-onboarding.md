# Fix Student Registration & Automatic Onboarding Redirect

This plan updates student registration to bypass email confirmation (which acts like a staff invite) for student self-registration, logs them in automatically, and redirects them directly to the onboarding page.

## Technical Approach

1. **Auto-Confirm Student Accounts on the Backend:**
    - In `AuthService.register(body)` in `auth.service.ts`, we will use the admin client (`supabaseAdmin.auth.admin.createUser`) to create the student account with `email_confirm: true`.
    - After creation, we will immediately sign them in using `supabaseAnon.auth.signInWithPassword` to generate a valid user session.
    - We will return this session and user data to the client.

2. **Save Session on the Frontend:**
    - In `useSignUpMutation` in `use-sign-up-mutation.ts`, if `response.session` is returned from the API, we will call `await supabase.auth.setSession(...)` to update the client's session state.

3. **Redirect to Onboarding:**
    - In `useRegisterForm` (Web) and `RegisterScreen` (Mobile), we will handle the returned session in the `onSuccess` callback of the signUp mutation and redirect the user directly to `/onboarding`.

## Proposed Changes

### Backend API Auth

#### [MODIFY] [auth.service.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/identity/auth/auth.service.ts)

- Import `supabaseAdmin` from `../../../lib/supabase-admin`.
- Update `register(body)` to:
    1. Call `supabaseAdmin.auth.admin.createUser` with `email_confirm: true` and metadata.
    2. Call `supabaseAnon.auth.signInWithPassword` with the user credentials to authenticate and return a valid session.

---

### Shared Query Hooks

#### [MODIFY] [use-sign-up-mutation.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/auth/use-sign-up-mutation.ts)

- If the proxy response contains a `session`, call `await supabase.auth.setSession(...)` to authenticate the user client-side.

---

### Web Frontend Registration Hook

#### [MODIFY] [index.ts (use-register-form)](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/auth/register/_hooks/use-register-form/index.ts)

- Import `useRouter` from `next/navigation` and initialize it.
- Modify the `useSignUpMutation` `onSuccess` handler: if a session is present, redirect the user to `/onboarding` and refresh the page.

---

### Mobile Frontend Registration Screen

#### [MODIFY] [register.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/app/(auth)/register.tsx>)

- Modify the `signUpMutation` `onSuccess` handler: if a session is present, redirect to `/(onboarding)`.

---

## Verification Plan

### Automated Tests

- Run `pnpm --dir app/sentinel-api test` to verify onboarding tests still pass.

### Manual Verification

- Register a new student through the registration page.
- Verify that no confirmation email is sent, and the browser immediately redirects to `/onboarding`.
