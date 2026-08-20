---
title: "Phase 3: SSR Hydration and Layout Animation Fixes"
type: phase
parent: "Fix High-Priority React Doctor Errors Across Sentinel Monorepo"
phase: "03"
status: completed
created: "2026-08-20"
tags: [task, phase, react-doctor, ssr, hydration, animation]
---

# Phase 3: SSR Hydration and Layout Animation Fixes

## Objective

Fix `no-hydration-branch-on-browser-global`, `no-layout-property-animation`, and `require-reduced-motion` errors across `sentinel-web` and `sentinel-core`.

## Dependencies & Prerequisites

- Phase 1 & Phase 2 in progress or completed.

## Impacted Files & Components

- `app/sentinel-core/src/components/common/header/index.tsx`: Replace `typeof window !== 'undefined'` hostname branching with environment-based URL resolution (e.g. `process.env.NEXT_PUBLIC_CORE_URL`) or consistent relative links.
- `app/sentinel-support/src/components/common/header/index.tsx`: Same header URL hydration fix.
- `app/sentinel-web/src/components/common/layout/header/index.tsx`: Same header URL hydration fix.
- `app/sentinel-web/src/app/(public)/landing/hero-section/page.tsx`: Fix window-dependent conditional rendering.
- `app/sentinel-core/src/app/(protected)/exams/assign/_components/assignment-builder-row.tsx`: Switch framer-motion layout property animations (like direct height/width) to performant transform/opacity or Framer Motion `layout` prop.
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/assign/_components/new-assignments-builder.tsx`: Same animation optimization.
- `app/sentinel-core/package.json`: Address `require-reduced-motion` requirement.

## Implementation Tasks

- [ ] Refactor Header components in `sentinel-core`, `sentinel-support`, and `sentinel-web` to use build-time environment URLs instead of client window inspection.
- [ ] Ensure `hero-section/page.tsx` renders identical DOM structure during SSR and client hydration.
- [ ] Optimize animation properties in assignment builder components to avoid layout thrashing.

## Verification & Testing

- `pnpm exec react-doctor ./app/sentinel-core --no-warnings -y` — verify `no-hydration-branch-on-browser-global` and `no-layout-property-animation` drop to 0.
- `pnpm exec react-doctor ./app/sentinel-web --no-warnings -y` — verify hydration errors drop to 0.

## Risks & Rollback

- **Risk**: Header link URLs in production environments must point to correct subdomains.
- **Mitigation**: Verify environment variable fallback hierarchy for local vs staging vs production.
