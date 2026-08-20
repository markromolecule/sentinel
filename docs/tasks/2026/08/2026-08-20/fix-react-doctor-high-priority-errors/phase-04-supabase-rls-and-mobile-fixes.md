---
title: "Phase 4: Supabase RLS Migrations and Mobile Falsy Renders"
type: phase
parent: "Fix High-Priority React Doctor Errors Across Sentinel Monorepo"
phase: "04"
status: completed
created: "2026-08-20"
tags: [task, phase, react-doctor, supabase, rls, react-native]
---

# Phase 4: Supabase RLS Migrations and Mobile Falsy Renders

## Objective

Fix database security findings (`supabase-rls-policy-risk`, `supabase-table-missing-rls`) in `app/sentinel-web/supabase/migrations/` and React Native zero-rendering bug (`rn-no-falsy-and-render`) in `app/sentinel-mobile`.

## Dependencies & Prerequisites

- Phases 1, 2, 3 completed or executed in parallel.

## Impacted Files & Components

- `app/sentinel-mobile/features/exam/components/session/question-card.tsx`: Replace `{maxLength && <Text>}` with `{Boolean(maxLength) && <Text>}` or `{maxLength != null && maxLength > 0 && <Text>}` to avoid bare `0` unparented node crashes in React Native.
- `app/sentinel-web/supabase/migrations/04_room_table.sql`: Fix permissive RLS policy at line 24 to bind to authenticated roles / tenancy checks.
- `app/sentinel-web/supabase/migrations/20260224080923_remote_schema.sql`: Ensure tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` defined.
- `app/sentinel-web/supabase/migrations/20260503120000_add_institution_hierarchy_inheritance.sql`: Ensure tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` defined.

## Implementation Tasks

- [ ] Wrap `maxLength` in boolean check in mobile `question-card.tsx`.
- [ ] Update migration scripts to enable RLS on all newly created tables and replace open wildcard policies.
- [ ] Run full project verification.

## Verification & Testing

- `pnpm exec react-doctor ./app/sentinel-mobile --no-warnings -y` — verify 0 errors.
- `pnpm exec react-doctor ./app/sentinel-web --no-warnings -y` — verify 0 errors.
- `pnpm doctor --no-warnings -y` across entire monorepo — verify all 7 workspace projects report 0 errors!

## Risks & Rollback

- **Risk**: Changing historical migration files might differ from production DB state if not applied via standard migration tooling.
- **Mitigation**: Ensure changes align with current PostgreSQL schema in `packages/db`.
