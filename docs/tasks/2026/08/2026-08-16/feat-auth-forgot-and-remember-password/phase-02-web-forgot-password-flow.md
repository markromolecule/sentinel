---
title: "Phase 2: Web Forgot Password Flow & Recovery Integration"
type: phase
parent: "feat-auth-forgot-and-remember-password"
phase: "02"
status: planned
created: "2026-08-16"
tags: [task, phase, web, auth, sentinel-web]
---

# Phase 2: Web Forgot Password Flow & Recovery Integration

## Objective

Build the complete `/auth/forgot-password` route and UI in `sentinel-web` adhering directly to the visual design, card layout, and 3D glassmorphism of `/auth/update-password`, and update the login page link to direct users to password recovery.

## Dependencies & Prerequisites

- Phase 1 completed (`ForgotPasswordSchema` and `useForgotPasswordMutation` available).
- `@sentinel/ui` components (`Card`, `CardContent`, `CardHeader`, `Input`, `Label`, `Button`).

## Impacted Files & Components

- `app/sentinel-web/src/app/auth/forgot-password/page.tsx` (NEW): Main page component with background glow, container card, and view switching (form vs confirmation).
- `app/sentinel-web/src/app/auth/forgot-password/_components/forgot-password-header.tsx` (NEW): Header component with `KeyRound` icon in blue aura badge and localized subtitle.
- `app/sentinel-web/src/app/auth/forgot-password/_components/forgot-password-form.tsx` (NEW): Form component with email input, loading states, 3D button, and "Back to sign in" navigation.
- `app/sentinel-web/src/app/auth/forgot-password/_components/forgot-password-confirmation.tsx` (NEW): Success message display when recovery email is sent with resend & back links.
- `app/sentinel-web/src/app/auth/forgot-password/_hooks/use-forgot-password-form.ts` (NEW): Form controller connecting React Hook Form, Zod resolver, mutation hook, and feedback toasts.
- `app/sentinel-web/src/app/auth/forgot-password/_components/forgot-password-form.test.tsx` (NEW): Unit tests verifying submission, error handling, and confirmation view.
- `app/sentinel-web/src/app/auth/login/_components/login-form.tsx` (MODIFY): Update "Forgot password?" link `href` from `'#'` to `'/auth/forgot-password'`.
- `app/sentinel-web/src/app/auth/login/_components/login-form.test.tsx` (MODIFY): Update test assertions to verify correct href.
- `app/sentinel-web/src/proxy.ts` (MODIFY/VERIFY): Ensure `/auth/forgot-password` behaves consistently as an open public authentication route.

## Implementation Tasks

- [ ] Create `app/sentinel-web/src/app/auth/forgot-password/_components/forgot-password-header.tsx` matching `UpdatePasswordHeader` styling:
  - Icon: Lucide `KeyRound` in `bg-blue-500/10 p-4 ring-1 ring-blue-500/20` container.
  - Title: "Forgot Password"
  - Subtitle: "Enter your registered email address and we'll send you a password reset link."
- [ ] Create `app/sentinel-web/src/app/auth/forgot-password/_hooks/use-forgot-password-form.ts`:
  - Initialize React Hook Form with `ForgotPasswordSchema`.
  - Handle submit with `useForgotPasswordMutation`.
  - Pass `redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password``.
  - Manage `isSubmitted` state for confirmation card transition and error handling via `toast.error()`.
- [ ] Create `app/sentinel-web/src/app/auth/forgot-password/_components/forgot-password-form.tsx`:
  - Email input with error validation feedback.
  - Submit button with `variant="premium-3d"` and `ArrowRight` hover animation.
  - Back to sign in link `<Link href="/auth/login">` with left arrow.
- [ ] Create `app/sentinel-web/src/app/auth/forgot-password/_components/forgot-password-confirmation.tsx`:
  - Display email sent notification (`MailCheck` icon), target email summary, resend button, and return to sign in link.
- [ ] Create `app/sentinel-web/src/app/auth/forgot-password/page.tsx`:
  - Wrap in matching `Card` with top border gradient `bg-gradient-to-r from-transparent via-blue-500/50 to-transparent` and bottom-right blur circle `bg-blue-600/10`.
- [ ] Update `app/sentinel-web/src/app/auth/login/_components/login-form.tsx`:
  - Change line 99: `<Link href="/auth/forgot-password" className="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300">Forgot password?</Link>`.
- [ ] Add unit tests in `app/sentinel-web/src/app/auth/forgot-password/_components/forgot-password-form.test.tsx`.

## Verification & Testing

- `pnpm --filter sentinel-web test` (Run unit and component tests)
- Navigate to `http://localhost:3000/auth/login` → verify clicking "Forgot password?" navigates to `/auth/forgot-password`.
- Submit invalid email on `/auth/forgot-password` → verify field error appears.
- Submit valid email → verify mutation triggers with toast and confirmation panel renders.

## Risks & Rollback

- **Risk:** User requests reset for non-existent email address.
  - *Mitigation:* Supabase handles user enumeration defenses by returning successful responses or rate limit errors; client reflects friendly generic confirmation.
- **Rollback:** Revert `/auth/forgot-password` directory and restore `login-form.tsx` link to `'#'`.
