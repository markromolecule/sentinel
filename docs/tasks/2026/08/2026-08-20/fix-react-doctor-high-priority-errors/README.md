---
title: "Fix High-Priority React Doctor Errors Across Sentinel Monorepo"
type: task
status: completed
created: "2026-08-20"
tags: [task, react-doctor, linter, bugfix, performance, security]
---

# Fix High-Priority React Doctor Errors Across Sentinel Monorepo

## Outcome

Eliminate all 45 high-priority/blocking errors surfaced by `react-doctor` across all apps (`sentinel-web`, `sentinel-core`, `sentinel-support`, `sentinel-mobile`) and shared packages (`@sentinel/hooks`, `@sentinel/ui`), raising overall codebase health scores to 100/100, eliminating runtime bugs (Rules of Hooks violations, memory leaks from missing effect cleanups, render ref mutations, impure state updaters, SSR hydration mismatches, and falsy React Native renders), and tightening database security policies.

---

## Pre-planning record

### Actors and goals

- **Developer / CI Pipeline**: Requires clean linter runs with zero blocking errors when executing `pnpm doctor` / `react-doctor`.
- **End Users (Students, Instructors, Admins)**: Expect glitch-free, leak-free, and accessible application rendering without hydration flashes, memory degradation during long exam sessions, or unexpected component state resets.
- **Security & Platform Engineers**: Require all database tables in migrations to enforce Row Level Security (RLS) policies without permissive wildcards.

### Domain language

- **Rules of Hooks**: React invariant requiring hooks (`useState`, `useEffect`, `useMemo`, custom hooks) to execute in the exact same order on every render without conditional branching or early returns preceding them.
- **Impure State Updater**: Mutating external state or triggering nested state setters inside the updater function passed to `setState(prev => ...)`.
- **Render Ref Mutation**: Directly reading/writing `ref.current` during the component rendering phase instead of inside lifecycle effects (`useEffect` / `useLayoutEffect`) or event handlers.
- **Hydration Branching**: Conditional rendering logic branch dependent on `typeof window !== 'undefined'` that causes SSR output to diverge from initial client hydration markup.
- **Effect Cleanup**: Returning an unsubscription or teardown function from `useEffect` to prevent zombie listeners and timer leaks upon unmount or dependency change.

### Scenario coverage

| ID | Actor and situation | Preconditions | Expected outcome | Failure/recovery | Status |
|---|---|---|---|---|---|
| SC-01 | Support admin opens announcement or event dialog | User may or may not have create permissions | Dialog component renders hooks unconditionally; permission checks guard UI display rather than breaking hook execution order | If permission denied, component safely returns without hook mismatch exception | Completed |
| SC-02 | Student takes proctored exam | Exam monitoring hook tracks visibility and focus | `monitoringPhaseRef` and `isMonitoringSuspendedRef` are synchronized via `useEffect` without mutating `ref.current` during render | Telemetry and lockdown listeners receive up-to-date ref values reliably | Completed |
| SC-03 | Instructor imports questions from question bank | Multiple questions or collections selected/toggled | State updaters compute next state immutably without nested setter invocations or side effects | Single-pass state update without double-render or inconsistent selection state | Completed |
| SC-04 | User navigates across marketing/landing and app headers | Server-side rendering (SSR) generates initial HTML | Header logo/links resolve auth URLs consistently across SSR and CSR without hydration mismatch error | Clean hydration without React Error #418 / #423 | Completed |
| SC-05 | Mobile student views question card with character count | `maxLength` prop is provided or undefined | Character count only renders when `maxLength` is a positive number, avoiding bare `0` unparented node crashes in React Native | Safe boolean rendering | Completed |
| SC-06 | User opens realtime channels (lobby, messaging, notifications) | WebSocket connection established | Realtime subscriptions cleanly call `.unsubscribe()` and `removeChannel()` on unmount | Zero channel leaks or duplicate broadcast listeners | Completed |

### Decision ledger

| ID | Question | Decision | Evidence or rationale | Alternatives rejected | Artifact |
|---|---|---|---|---|---|
| DEC-01 | How to fix Rules of Hooks in dialogs with permission gates? | Move permission check after all hooks or into conditional component invocation at caller/render level | React requires stable hook invocation order across renders | Returning null before calling `useCreateAnnouncementMutation` causes hooks order mismatch | Phase 1 |
| DEC-02 | How to handle `ref.current` synchronization in `useExamMonitoring`? | Synchronize refs inside `useEffect` / `useLayoutEffect` and remove render-body direct assignment | React Compiler and Concurrent Mode prohibit render-phase ref mutations | Render-phase ref mutation causes nondeterministic race conditions | Phase 1 |
| DEC-03 | How to resolve `no-hydration-branch-on-browser-global` in Header links? | Use `process.env.NEXT_PUBLIC_*` environment variables or client-only mounting state for window-dependent URLs | Environment variables are known at both build/SSR time and CSR time, guaranteeing identical markup | Direct `typeof window !== 'undefined'` evaluation creates SSR/CSR DOM disparity | Phase 3 |
| DEC-04 | How to handle Supabase migration RLS warnings? | Update migration SQL scripts to explicitly enable RLS and replace permissive `USING (true)` with role-bounded policies | Tables without RLS exposed to public API bypass security models | Disabling linter check for database files | Phase 4 |

### Unknowns and blockers

- *None.* All 45 error locations have been resolved and verified.

---

## Acceptance criteria

| ID | Source goal/scenario/decision | Criterion | Implementation | Verification | Status |
|---|---|---|---|---|---|
| AC-01 | SC-01 / DEC-01 | Zero Rules of Hooks errors in `sentinel-support` | Reorder hooks above permission guards in `add-announcement-dialog.tsx` and `event-dialog.tsx` | `pnpm exec react-doctor ./app/sentinel-support --no-warnings -y` exits 0 (Score: 100/100) | Completed |
| AC-02 | SC-02 / DEC-02 | Zero Ref render mutation errors in `sentinel-web` | Remove lines 50-51 direct ref assignments in `use-exam-monitoring/index.ts` | `pnpm exec react-doctor ./app/sentinel-web --no-warnings -y` shows 0 ref errors | Completed |
| AC-03 | SC-03 | Zero impure state updaters in `sentinel-web`, `sentinel-core`, `sentinel-mobile` | Refactor `use-question-bank-import-selection.ts`, `use-exam-checkup.ts`, and `use-exam-session.ts` to compute state cleanly | `pnpm exec react-doctor -y` shows 0 `no-impure-state-updater` errors | Completed |
| AC-04 | SC-06 | Zero uncleaned effect subscriptions across all apps and `@sentinel/hooks`, `@sentinel/ui` | Add cleanup return functions with `unsubscribe()` / `removeChannel()` and event teardown | `pnpm exec react-doctor -y` shows 0 `effect-needs-cleanup` errors | Completed |
| AC-05 | SC-04 / DEC-03 | Zero SSR hydration branching errors | Standardize header auth URLs using environment variables | `pnpm exec react-doctor -y` shows 0 `no-hydration-branch-on-browser-global` | Completed |
| AC-06 | SC-05 | Zero React Native falsy render errors | Use explicit boolean coercion for `maxLength` rendering in `question-card.tsx` | `pnpm exec react-doctor ./app/sentinel-mobile --no-warnings -y` shows 0 errors (Score: 100/100) | Completed |
| AC-07 | DEC-04 | Zero Supabase RLS policy & missing RLS errors | Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` and scoped policies | `pnpm exec react-doctor ./app/sentinel-web --no-warnings -y` shows 0 security errors (Score: 100/100) | Completed |
| AC-08 | Overall Goal | Full monorepo pass for `react-doctor` blocking errors | All 4 phases completed and verified | `pnpm exec react-doctor . -y --no-warnings` passes with 100/100 Great across all 3,444 files | Completed |

---

## Scope

- Fixing all 45 high-priority errors across:
  - `app/sentinel-support` (Rules of hooks, uncleaned effects, SSR hydration)
  - `app/sentinel-web` (Ref render mutation, layout property animation, effect cleanups, impure state updaters, SSR hydration, Supabase RLS)
  - `app/sentinel-core` (Reduced motion config, layout property animations, effect cleanups, impure state updaters, SSR hydration)
  - `app/sentinel-mobile` (RN falsy render, impure state updaters, effect cleanups)
  - `packages/hooks` (Live inspection and realtime channel subscription effect cleanups)
  - `packages/ui` (Carousel embla event unsubscription cleanup)

## Non-goals

- Refactoring non-blocking warnings (such as Zod 4 migration notices or unused file notices) that are not flagged as errors.
- Modifying UI design tokens or changing runtime behavioral logic outside of fixing identified bugs.

---

## Constraints and decisions

- Edits must be strictly surgical and preserve existing business logic, types, and testing interfaces.
- Next.js SSR hydration safety must be maintained without disabling React hydration warnings.
- TypeScript compilation (`pnpm build` or `pnpm test`) must continue to pass cleanly.

---

## Phases

- [x] [`phase-01-rules-of-hooks-and-ref-render-fixes.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-20/fix-react-doctor-high-priority-errors/phase-01-rules-of-hooks-and-ref-render-fixes.md) — Phase 1: Rules of Hooks and Ref Render Mutations
- [x] [`phase-02-effect-cleanup-and-state-updater-purity.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-20/fix-react-doctor-high-priority-errors/phase-02-effect-cleanup-and-state-updater-purity.md) — Phase 2: Missing Effect Cleanups & Impure State Updaters
- [x] [`phase-03-ssr-hydration-and-animation-fixes.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-20/fix-react-doctor-high-priority-errors/phase-03-ssr-hydration-and-animation-fixes.md) — Phase 3: SSR Hydration Mismatches & Layout Animations
- [x] [`phase-04-supabase-rls-and-mobile-fixes.md`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/docs/tasks/2026/08/2026-08-20/fix-react-doctor-high-priority-errors/phase-04-supabase-rls-and-mobile-fixes.md) — Phase 4: Supabase RLS Migrations & Mobile Falsy Renders

---

## Verification

- `pnpm exec react-doctor ./app/sentinel-support --no-warnings -y` → **100 / 100 Great** (0 issues)
- `pnpm exec react-doctor ./app/sentinel-mobile --no-warnings -y` → **100 / 100 Great** (0 issues)
- `pnpm exec react-doctor ./app/sentinel-core --no-warnings -y` → **100 / 100 Great** (0 issues)
- `pnpm exec react-doctor ./app/sentinel-web --no-warnings -y` → **100 / 100 Great** (0 issues)
- `pnpm exec react-doctor . -y --no-warnings` → **100 / 100 Great** (3,444 files scanned, 0 issues)

## Deviations

- *None.*

## Result

- All 45 high-priority issues completely fixed and verified across all monorepo apps and packages. Codebase health score is 100/100 Great.
