---
title: "Phase 3: Remember Me Authentication across Web, Core, and Support"
type: phase
parent: "feat-auth-forgot-and-remember-password"
phase: "03"
status: planned
created: "2026-08-16"
tags: [task, phase, auth, sentinel-web, sentinel-core, sentinel-support]
---

# Phase 3: Remember Me Authentication across Web, Core, and Support

## Objective

Standardize the "Remember Me" authentication checkbox and local persistence logic across `sentinel-web`, `sentinel-core`, and `sentinel-support`, allowing users on all three web portals to retain their email on trusted devices.

## Dependencies & Prerequisites

- Phase 1 & 2 completed.
- `@sentinel/ui` (`Checkbox`, `Label`) component library.

## Impacted Files & Components

- `packages/shared/src/constants/auth.ts` (NEW): Storage keys for portal-specific remember me storage (e.g. `AUTH_STORAGE_KEYS = { REMEMBER_EMAIL_WEB, REMEMBER_EMAIL_CORE, REMEMBER_EMAIL_SUPPORT }`).
- `packages/shared/src/constants/index.ts` (MODIFY): Export auth storage constants.
- `app/sentinel-web/src/app/auth/login/_hooks/use-login-form/index.ts` (MODIFY): Hydrate stored email on mount; save or remove email in `localStorage` on login submission.
- `app/sentinel-core/src/app/auth/login/_components/login-form.tsx` (MODIFY): Add Checkbox + Label for "Remember me" alongside "Forgot password?".
- `app/sentinel-core/src/app/auth/login/_hooks/use-login-form/index.ts` (MODIFY): Hydrate stored email on mount; save or remove email on login submission.
- `app/sentinel-core/src/app/auth/login/_components/login-form.test.tsx` (NEW/MODIFY): Test checkbox rendering and interaction.
- `app/sentinel-support/src/app/auth/login/_components/login-form.tsx` (MODIFY): Add Checkbox + Label for "Remember me" alongside "Forgot password?".
- `app/sentinel-support/src/app/auth/login/_hooks/use-login-form/index.ts` (MODIFY): Hydrate stored email on mount; save or remove email on login submission.
- `app/sentinel-support/src/app/auth/login/_components/login-form.test.tsx` (NEW/MODIFY): Test checkbox rendering and interaction.

## Implementation Tasks

- [ ] Create `packages/shared/src/constants/auth.ts` defining scoped localStorage keys:
  ```ts
  export const REMEMBERED_EMAIL_KEYS = {
      WEB: 'sentinel_remembered_email_web',
      CORE: 'sentinel_remembered_email_core',
      SUPPORT: 'sentinel_remembered_email_support',
  } as const;
  ```
- [ ] Export `REMEMBERED_EMAIL_KEYS` in `packages/shared/src/constants/index.ts`.
- [ ] Update `app/sentinel-web/src/app/auth/login/_hooks/use-login-form/index.ts`:
  - `useEffect`: Read `REMEMBERED_EMAIL_KEYS.WEB` from `localStorage`. If found, execute `form.setValue('email', savedEmail)` and `form.setValue('remember', true)`.
  - On submit / login success: If `data.remember` is true, write `localStorage.setItem(REMEMBERED_EMAIL_KEYS.WEB, data.email)`. If false, execute `localStorage.removeItem(REMEMBERED_EMAIL_KEYS.WEB)`.
- [ ] Update `app/sentinel-core/src/app/auth/login/_components/login-form.tsx`:
  - Add Checkbox with `id="remember"` and Label for "Remember me", styled consistently with `sentinel-web`.
- [ ] Update `app/sentinel-core/src/app/auth/login/_hooks/use-login-form/index.ts`:
  - Wire `REMEMBERED_EMAIL_KEYS.CORE` reading and persistence.
- [ ] Update `app/sentinel-support/src/app/auth/login/_components/login-form.tsx`:
  - Add Checkbox with `id="remember"` and Label for "Remember me".
- [ ] Update `app/sentinel-support/src/app/auth/login/_hooks/use-login-form/index.ts`:
  - Wire `REMEMBERED_EMAIL_KEYS.SUPPORT` reading and persistence.
- [ ] Add and update unit tests in `login-form.test.tsx` across `sentinel-web`, `sentinel-core`, and `sentinel-support`.

## Verification & Testing

- `pnpm --filter sentinel-web test`
- `pnpm --filter sentinel-core test`
- `pnpm --filter sentinel-support test`
- Manual check:
  1. Open `http://localhost:3000/auth/login`, enter email, check "Remember me", log in.
  2. Log out and reload `/auth/login` → verify email input is pre-populated and checkbox is checked.
  3. Uncheck "Remember me" and log in → verify stored item is removed.
  4. Repeat on `http://localhost:3002/auth/login` (core) and `http://localhost:3003/auth/login` (support).

## Risks & Rollback

- **Risk:** SSR hydration mismatch with `localStorage`.
  - *Mitigation:* Perform `localStorage` retrieval inside `useEffect` or client-side lifecycle hook only.
- **Rollback:** Revert form hooks to default un-persisted values.
