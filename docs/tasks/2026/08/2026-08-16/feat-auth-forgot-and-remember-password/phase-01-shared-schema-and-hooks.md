---
title: "Phase 1: Shared Schemas, Mutation Hooks, and Test Contracts"
type: phase
parent: "feat-auth-forgot-and-remember-password"
phase: "01"
status: planned
created: "2026-08-16"
tags: [task, phase, shared, schema, hooks]
---

# Phase 1: Shared Schemas, Mutation Hooks, and Test Contracts

## Objective

Establish the shared validation schemas (`ForgotPasswordSchema`) and TanStack Query mutation hooks (`useForgotPasswordMutation`) that provide type-safe client-side Supabase password reset interactions across the Sentinel monorepo.

## Dependencies & Prerequisites

- `@sentinel/shared` package initialized with Zod validation.
- `@sentinel/hooks` package with initialized `useAuth` provider context.

## Impacted Files & Components

- `packages/shared/src/schema/auth/forgot-password-schema.ts` (NEW): Defines Zod schema requiring valid email format.
- `packages/shared/src/schema/auth/forgot-password-schema.test.ts` (NEW): Unit tests verifying valid/invalid email validation.
- `packages/shared/src/schema/index.ts` (MODIFY): Export `ForgotPasswordSchema` and `ForgotPasswordSchemaType`.
- `packages/hooks/src/query/auth/use-forgot-password-mutation.ts` (NEW): TanStack Query mutation calling `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
- `packages/hooks/src/query/auth/use-forgot-password-mutation.test.ts` (NEW): Unit tests mocking Supabase `resetPasswordForEmail` success/failure.
- `packages/hooks/src/query/index.ts` (MODIFY): Export `useForgotPasswordMutation`.

## Implementation Tasks

- [ ] Create `packages/shared/src/schema/auth/forgot-password-schema.ts` containing:
  ```ts
  import * as z from 'zod';

  export const ForgotPasswordSchema = z.object({
      email: z.string().min(1, 'Email is required').email('Invalid email address'),
  });

  export type ForgotPasswordSchemaType = z.infer<typeof ForgotPasswordSchema>;
  ```
- [ ] Create unit tests in `packages/shared/src/schema/auth/forgot-password-schema.test.ts` testing empty strings, malformed emails, and valid addresses.
- [ ] Export schema and type in `packages/shared/src/schema/index.ts`.
- [ ] Create `packages/hooks/src/query/auth/use-forgot-password-mutation.ts` utilizing `useAuth()` and returning `useMutation` that executes `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
- [ ] Create unit tests in `packages/hooks/src/query/auth/use-forgot-password-mutation.test.ts` covering missing client error, API failure, and successful payload response.
- [ ] Export `useForgotPasswordMutation` from `packages/hooks/src/query/index.ts`.

## Verification & Testing

- `pnpm --filter @sentinel/shared test` (Verify schema tests pass)
- `pnpm --filter @sentinel/hooks test` (Verify mutation hook tests pass)
- `pnpm --filter @sentinel/shared build && pnpm --filter @sentinel/hooks build` (Ensure TypeScript compilation succeeds)

## Risks & Rollback

- **Risk:** Missing `redirectTo` URL could cause Supabase to default to project Site URL.
  - *Mitigation:* Explicitly configure `redirectTo` with origin-aware `/auth/callback?next=/auth/update-password` fallbacks.
- **Rollback:** Revert modifications to `packages/shared` and `packages/hooks` without impacting runtime services.
