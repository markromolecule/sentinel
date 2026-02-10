---
description: Production Guidelines for React Native Expo Architecture
globs: **/*.ts, **/*.tsx, **/*.js, **/*.jsx, **/*.json
alwaysApply: true
---

# Project Structure & Code Organization

## 1. Package Manager & Environment

- **Manager:** `pnpm` (Strictly enforced)
- **Runtime:** Node.js LTS
- **Strict Mode:** TypeScript `strict: true` must be enabled in `tsconfig.json`

## 2. Core Stack & Versions

- **Framework:** React Native (Expo SDK 50+)
- **Language:** TypeScript ^5.x.x
- **Routing:** Expo Router (File-based routing)
- **State (Server):** TanStack Query (v5) – used for all async data
- **State (Client):** Zustand – used for global app state (theme, session)
- **Forms:** React Hook Form + Zod (validation)
- **Styling:** NativeWind (Tailwind) or Unistyles

## 3. Naming Conventions

- **Directories:** `kebab-case` (e.g., `user-profile`)
- **Files:** `kebab-case` (e.g., `user-avatar.tsx`)
- **Route Groups:** `(kebab-case)` (e.g., `(auth)`, `(tabs)`)
- **Private Routes/Files:** `_kebab-case` (ONLY inside `src/app/`)
- **Components:** `PascalCase` (e.g., `SubmitButton.tsx`)
- **Functions / Hooks:** `camelCase` (e.g., `useAuth`, `formatDate`)
- **Types / Interfaces:** `PascalCase` (e.g., `UserResponse`, `AuthPayload`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)

## 4. Top-Level Directory Structure

The root directory structure is strictly defined as follows:

root  
├── .expo/ # Expo config (git ignored)  
├── assets/ # Static assets (images, fonts)  
├── docs/ # Documentation & workflows  
├── src/ # Main source code  
│ ├── app/ # Expo Router (navigation layer)  
│ ├── components/ # Shared dumb UI components  
│ ├── config/ # Env vars & app configuration  
│ ├── constants/ # App-wide constants  
│ ├── features/ # Feature-based modules (core business logic)  
│ ├── hooks/ # Shared global hooks  
│ ├── lib/ # 3rd-party library configs (Axios, Firebase)  
│ ├── stores/ # Global client state (Zustand)  
│ ├── types/ # Global types (DTOs, enums)  
│ └── utils/ # Shared utility functions (pure functions)  
├── tsconfig.json  
└── package.json

## 5. Feature-First Architecture (`src/features`)

We use a **feature-based architecture**. Logic is co-located with the feature it belongs to.

### Feature Rules

1. **No underscores** inside feature folders.
2. **Encapsulation:** Each feature must expose a public API via `index.ts`.
3. **Cross-feature imports:**
   - ✅ `import { login } from '@/features/auth'`
   - ❌ `import { login } from '@/features/auth/api/login-user'`

### Feature Structure Example

`src/features/auth/`

src/features/auth/  
├── api/ # API fetchers for React Query  
│ ├── login-user.ts  
│ └── register-user.ts  
├── components/ # Feature-only UI components  
│ ├── login-form.tsx  
│ └── auth-header.tsx  
├── hooks/ # Feature-specific hooks  
│ └── use-auth-token.ts  
├── stores/ # Feature-specific state (optional)  
├── types/ # Feature-specific types  
│ └── auth.types.ts  
└── index.ts # Public API (barrel file)

## 6. Routing Layer (`src/app`)

The `app` directory is strictly for **navigation**.

### Route Rules

1. Route files must contain **minimal logic**.
2. Routes should import and render screens from `src/features`.
3. Use `_layout.tsx` for providers and `index.tsx` for pages.

### Example

src/app/  
├── \_layout.tsx # Root providers (QueryClient, Auth)  
├── index.tsx # Entry route  
├── +not-found.tsx # 404  
├── (auth)/  
│ ├── \_layout.tsx  
│ ├── login.tsx # Renders LoginScreen from features/auth  
│ └── register.tsx  
└── (tabs)/  
 ├── \_layout.tsx  
 └── home.tsx

## 7. Shared Modules

### `src/components/` (Design System)

Only reusable, domain-agnostic UI components belong here.

- `components/ui/` → Primitives (Button, Input, Card, Text)
- `components/layout/` → Layout wrappers (ScreenWrapper, SafeArea)

### `src/lib/` vs `src/utils/`

- **lib/** → External library configuration (with side effects)  
  Examples: `axios.ts`, `query-client.ts`, `storage.ts`

- **utils/** → Pure helper functions (no side effects)  
  Examples: `format-date.ts`, `currency-formatter.ts`, `validation-helpers.ts`

## 8. Data Fetching (TanStack Query)

- All API calls live in `src/features/<feature>/api`
- Components must NOT call `useQuery` directly
- Always wrap queries in custom hooks

Example:

```ts
export const useUserQuery = () =>
  useQuery({
    queryKey: userKeys.detail(),
    queryFn: fetchUser,
  });
```
