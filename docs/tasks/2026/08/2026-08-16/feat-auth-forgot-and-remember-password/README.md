---
title: "Authentication: Forgot Password Flow and Remember Me Persistence"
type: task
status: planned
created: "2026-08-16"
tags: [task, auth, supabase, sentinel-web, sentinel-core, sentinel-support]
---

# Authentication: Forgot Password Flow and Remember Me Persistence

## Outcome

Deliver an end-to-end password recovery experience on `sentinel-web` via Supabase password reset emails redirecting to `/auth/update-password`, and standardize the "Remember Me" authentication checkbox across `sentinel-web`, `sentinel-core`, and `sentinel-support` with secure client-side storage persistence.

## Pre-planning record

### Actors and goals

- **Student / Instructor (`sentinel-web`)**: Recover forgotten account password through an email recovery link matching the aesthetic of the update-password page, and have their email remembered on trusted devices across login attempts.
- **Admin / Superadmin (`sentinel-core`)**: Have their email remembered on the login screen for faster sign-in without credential leakage.
- **Support Staff (`sentinel-support`)**: Have their email remembered on the login screen for faster support access.

### Domain language

- **Password Reset Request (`/auth/forgot-password`)**: Publicly accessible page accepting user email to request a Supabase recovery email.
- **Password Recovery Token (`recovery`)**: Supabase OTP/token hash verified via `/auth/callback?type=recovery&next=/auth/update-password`.
- **Password Update (`/auth/update-password`)**: Session-authenticated password change page invoking `supabase.auth.updateUser({ password })`.
- **Remember Me (`remember`)**: Boolean state on login form determining whether the user's email address is retained in browser local storage (`localStorage`) for subsequent visits.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| S1 | User clicks "Forgot password?" on `sentinel-web` login | User is on `/auth/login` | Redirected to `/auth/forgot-password` with email field and clean 3D styling | Link is broken / missing → resolved | covered |
| S2 | User submits valid email on `/auth/forgot-password` | Supabase auth initialized | `supabase.auth.resetPasswordForEmail` is called with redirect to `/auth/callback?next=/auth/update-password`; confirmation state shown | API rate limit / invalid email → display friendly toast/error | covered |
| S3 | User clicks recovery link in email | Received Supabase reset email | Lands on `/auth/callback`, verifies `recovery` token, redirects to `/auth/update-password` with valid session | Expired link → redirect to `/auth/login?error=Invalid+or+expired+access` | covered |
| S4 | User checks "Remember me" and logs in | On login screen (web, core, support) | Email is saved to scoped `localStorage`; next visit auto-fills email and checks "Remember me" | Checkbox unchecked on subsequent login → removes saved email from storage | covered |
| S5 | User accesses `/auth/forgot-password` | Any visitor | Route is publicly accessible without middleware redirect loops | Inauthenticated redirect loop prevented | covered |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| D1 | How should forgot password dispatch emails? | Direct client SDK call via `supabase.auth.resetPasswordForEmail` | Matches existing auth patterns (`useUpdatePasswordMutation`, `useLoginMutation`) without requiring custom SMTP backends in `sentinel-api` | Custom API proxy route (unnecessary overhead for standard Supabase auth) | ADR Auth-01 |
| D2 | What should "Remember Me" persist? | Email address only in `localStorage` | Industry best practice (OWASP) to avoid storing raw passwords or indefinite plaintext credentials in web storage; Supabase already handles refresh tokens in secure cookies | Persisting passwords (security vulnerability), modifying JWT expiry (breaks cookie policy) | ADR Auth-02 |
| D3 | Where does the user land after clicking the reset email link? | `/auth/callback?next=/auth/update-password` | `/auth/callback` already supports `type=recovery` in `EMAIL_OTP_TYPES` and handles cookie hydration seamlessly | Direct link to update-password without callback (causes missing SSR cookie session) | ADR Auth-03 |

### Unknowns and blockers

None. Supabase email templates and `/auth/callback` handlers are already compatible with `type=recovery` and `/auth/update-password`.

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC1 | S1, S2, D1 | `/auth/forgot-password` route exists on `sentinel-web` with `ForgotPasswordHeader`, `ForgotPasswordForm`, and confirmation states | `app/sentinel-web/src/app/auth/forgot-password/page.tsx` | Vitest + Visual Inspection | planned |
| AC2 | S2, D1 | `useForgotPasswordMutation` calls `supabase.auth.resetPasswordForEmail` with redirect URL pointing to callback | `packages/hooks/src/query/auth/use-forgot-password-mutation.ts` | Vitest unit test | planned |
| AC3 | S1, D1 | `ForgotPasswordSchema` enforces email presence and format | `packages/shared/src/schema/auth/forgot-password-schema.ts` | Vitest unit test | planned |
| AC4 | S1 | Login page "Forgot password?" links point to `/auth/forgot-password` | `app/sentinel-web/src/app/auth/login/_components/login-form.tsx` | Vitest + Component test | planned |
| AC5 | S4, D2 | "Remember me" checkbox is rendered and functional in `sentinel-web`, `sentinel-core`, and `sentinel-support` | `login-form.tsx` & `use-login-form/index.ts` across web, core, and support | Vitest form tests | planned |
| AC6 | S4, D2 | Checking "Remember me" persists email to local storage; unchecking removes it | `useLoginForm` hook storage helpers | Vitest mock tests | planned |

## Scope

- Shared Zod schema: `ForgotPasswordSchema` in `@sentinel/shared/schema`.
- Shared mutation hook: `useForgotPasswordMutation` in `@sentinel/hooks`.
- `sentinel-web`: Forgot password route (`/auth/forgot-password`), header, form, confirmation view, and login link wiring.
- `sentinel-core` & `sentinel-support`: Add "Remember Me" checkbox and connect localStorage email persistence to login forms.
- `sentinel-web`: Connect localStorage email persistence to existing "Remember Me" checkbox in login form.

## Non-goals

- Custom password reset emails through third-party mailing APIs (uses Supabase default Auth mailer).
- Storing password credentials in `localStorage` (strictly disallowed for security).
- Modifying `sentinel-mobile` auth flows (already contains independent remember-me toggle).

## Constraints and decisions

- UI must strictly mirror the glassmorphism and 3D design tokens from `/auth/update-password` (`Card`, `CardContent`, blue glow aura, premium-3d button).
- Prettier standards (4-space indent, single quotes, trailing commas) and Vitest co-located tests (`*.test.ts`, `*.test.tsx`).

## Phases

- [x] `phase-01-shared-schema-and-hooks.md` — Phase 1: Shared Zod schema, TanStack Query mutation hook, and exports
- [x] `phase-02-web-forgot-password-flow.md` — Phase 2: `sentinel-web` forgot-password page, components, hooks, and login link
- [x] `phase-03-remember-me-authentication-core-web-support.md` — Phase 3: "Remember me" checkbox UI and localStorage persistence across `sentinel-web`, `sentinel-core`, and `sentinel-support`

## Verification

Record the command or inspection, outcome, and the acceptance criterion it supports:
- `pnpm --filter @sentinel/shared test` (AC3)
- `pnpm --filter @sentinel/hooks test` (AC2)
- `pnpm --filter sentinel-web test` (AC1, AC4, AC5, AC6)
- `pnpm --filter sentinel-core test` (AC5, AC6)
- `pnpm --filter sentinel-support test` (AC5, AC6)

## Deviations

None.

## Result

Pending execution approval.
