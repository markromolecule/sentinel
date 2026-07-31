# LiveKit Work Package 05: Shared Cross-App Viewer

## 1. The Context

`sentinel-core` and `sentinel-web` both contain matching monitoring detail pages and false-live placeholder components. The viewer must be implemented once at the behavior/presentation boundaries so administrators and instructors receive identical authorization, lifecycle, cleanup, accessibility, and cost behavior without duplicating provider state machines.

## 2. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Copy a LiveKit viewer implementation into each app's existing `live-feed-monitor.tsx`.
- **Tradeoff:** Fixes and safety behavior would drift across portals and double the regression surface.

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Put the viewer controller in `@sentinel/hooks`, a prop-driven accessible monitor in `@sentinel/ui`, and keep thin route-aware wrappers in both apps.
- **Tradeoff:** Requires careful package boundaries and parity tests across three workspaces.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Redirect all `sentinel-core` monitoring links to the instructor portal for live viewing.
- **Tradeoff:** Avoids duplication but breaks portal ownership, authentication expectations, and administrator workflow continuity.

## 3. The Execution

**Recommendation:** Option B — the Strategic Path.

**Justification:** The two portals already duplicate the same monitoring surface. A shared controller and presentational component centralize the sensitive connect/subscribe/stop state machine while thin wrappers retain app routing and permission context.

### Entry Gate

- [x] Confirm work-package-04 tests prove safe student publication and MediaPipe continuity.
- [x] Confirm no portal displays a start control before shared viewer tests exist.

## Pre-Planning Checklist

- [x] Inspected both monitoring list/detail routes, duplicated `StudentMonitoringDetail` and `LiveFeedMonitor` components, shared service/query layers, and package boundaries.
- [x] Identified the shared viewer hook, prop-driven UI component, thin portal wrappers, route props, and parity tests.
- [x] Confirmed cross-app viewer integration requires no Prisma migration.

## Scope and Affected Files

- `packages/hooks/src/live-inspection/use-live-inspection-viewer.ts` **[NEW]**
- `packages/hooks/src/live-inspection/use-live-inspection-viewer.test.tsx` **[NEW]**
- `packages/hooks/src/index.ts`
- `packages/ui/src/components/live-video-monitor.tsx` **[NEW]**
- `packages/ui/src/components/live-video-monitor.test.tsx` **[NEW]**
- `packages/ui/src/index.ts`
- `app/sentinel-core/src/features/exams/monitoring/_components/live-feed-monitor.tsx`
- `app/sentinel-core/src/features/exams/monitoring/_components/student-monitoring-detail.tsx`
- `app/sentinel-core/src/app/(protected)/exams/[id]/monitoring/[studentId]/page.tsx`
- `app/sentinel-web/src/features/exams/monitoring/_components/live-feed-monitor.tsx`
- `app/sentinel-web/src/features/exams/monitoring/_components/student-monitoring-detail.tsx`
- `app/sentinel-web/src/app/(protected)/(instructor)/exams/[id]/monitoring/[studentId]/page.tsx`
- `app/sentinel-core/src/features/exams/monitoring/_components/live-feed-monitor.test.tsx` **[NEW]**
- `app/sentinel-web/src/features/exams/monitoring/_components/live-feed-monitor.test.tsx` **[NEW]**

## Phase 1: Build the Shared Viewer State Machine

**Goal:** Own request, readiness, credential, subscription, stop, and cleanup behavior in one tested hook.

- [x] Implement exported `useLiveInspectionViewer()` with JSDoc and inputs `examId`, `studentId`, `attemptId`, `enabled`, plus a video-element ref callback; expose only safe UI state/actions and never return the raw token.
- [x] Model `idle`, `requesting`, `waiting_for_student`, `connecting`, `live`, `reconnecting`, `stopping`, `ended`, and `failed` states with bounded UI reason codes.
- [x] Start explicitly from user action, poll only the active lease, request viewer credentials only in `PUBLISHER_READY`, create one room with `adaptiveStream:true`, and connect with `autoSubscribe:false`.
- [x] Subscribe only to the expected publisher identity's camera/video publication; detach and reject unexpected participants, audio, data, screen-share, or duplicate video publications.
- [x] Transition to `live` only after the expected remote video track attaches and the video element emits playable/playing evidence; a connected room alone must not show `LIVE`.
- [x] Send best-effort stop on explicit action/unmount/navigation, always perform local detach/disconnect cleanup, and rely on server expiry when the request cannot be delivered.
- [x] Add hook tests for readiness ordering, no early connect, expected-track filtering, false-live prevention, reconnect, conflict/cap/permission/offline/timeout errors, stop idempotency, unmount cleanup, and token non-persistence.

**Migration required:** No — shared frontend controller only.

## Phase 2: Build an Accessible Prop-Driven Monitor

**Goal:** Replace the false-live placeholder with one reusable UI contract independent of app routing and API clients.

- [x] Create `packages/ui/src/components/live-video-monitor.tsx` with props for state, reason, connection quality, video ref, start/stop/retry callbacks, and disabled explanation; add JSDoc to exported props/component.
- [x] Render **Start live view** only when eligible and idle; render `LIVE` only for the actual `live` state; provide distinct waiting, reconnecting, unavailable, denied, capacity, ended, and retry states.
- [x] Render a muted `video` element with `autoPlay` and `playsInline`, no audio/volume/record/download control, and no provider room/token identifiers.
- [x] Add `role="status"`/`aria-live` announcements without repeating high-frequency connection-quality changes; ensure keyboard-visible controls and reduced-motion-safe status styling.
- [x] Add component tests for every visible state, false-live prevention, video attributes, callbacks, keyboard focus, accessible names, and absence of recording/audio controls.

**Migration required:** No — shared presentation only.

## Phase 3: Integrate `sentinel-core`

**Goal:** Give authorized administrators the shared viewer without changing core monitoring navigation or lifecycle actions.

- [x] Update the core monitoring detail page to pass canonical `student.attemptId`, exam ID, and safe live-inspection eligibility/capability into `StudentMonitoringDetail`.
- [x] Refactor core `live-feed-monitor.tsx` into a thin wrapper that invokes `useLiveInspectionViewer()` and renders `LiveVideoMonitor`; remove the static animated `LIVE` badge/noise background.
- [x] Update core `student-monitoring-detail.tsx` props and rendering without changing identity/timeline scroll behavior.
- [x] Ensure a core admin without `examinations:monitor_live_video`, outside the active institution, or denied by API capability sees a non-actionable explanation and never calls start.
- [x] Add/update core page, detail, and live-feed tests for enabled/disabled capability, start-to-live, stop, errors, no false badge, route unmount cleanup, and preservation of lifecycle controls.

**Migration required:** No — `sentinel-core` UI only.

## Phase 4: Integrate `sentinel-web` with Exact Parity

**Goal:** Give assigned instructors the same viewer contract while preserving instructor-specific exam access.

- [x] Apply the same canonical attempt/capability props to the instructor monitoring detail route and `StudentMonitoringDetail`.
- [x] Refactor web `live-feed-monitor.tsx` into the same thin shared-hook/shared-UI wrapper and remove the static placeholder behavior.
- [x] Ensure instructors denied by creator/proctor/section/classroom relationship or dedicated permission never invoke the start endpoint even if they can read non-video monitoring metadata.
- [x] Add/update web page, detail, and live-feed tests matching the core contract plus instructor relationship-denial behavior.
- [x] Add a parity test or shared fixture used by both app test suites that enumerates identical labels, states, bounded errors, and controls.

**Migration required:** No — `sentinel-web` instructor UI only.

## Phase 5: Cross-App Verification

**Goal:** Prove both portals consume one behavior contract and do not create parallel viewers.

- [x] Run `pnpm --dir packages/hooks test`, `pnpm --dir packages/ui test`, focused `sentinel-core`/`sentinel-web` live-feed and monitoring-page tests, and record results in the execution log.
- [x] Run both Next.js builds to catch client/server boundary or transitive LiveKit dependency issues.
- [x] Add a mocked cross-app race test proving simultaneous core/web starts for the same attempt produce one successful lease and one safe conflict state.
- [x] Manually inspect responsive light/dark layouts and keyboard focus in both portals without enabling a production institution.

**Migration required:** No — verification only.

## Exit Gate

- [x] Core and web render the same shared states and controls.
- [x] `LIVE` is impossible before the expected camera track is playing.
- [x] One viewer/attempt and one attempt/viewer conflicts are handled without token or viewer-identity leakage.
- [x] Unmount/stop/reconnect cleanup tests pass in both portals.
- [x] Shared hooks/UI and both app tests/builds pass.
- [x] Commit this package before beginning work package 06.

## Compatibility, Configuration, and Rollback Notes

- **Breaking API changes:** None; consumes additive API capability/status fields.
- **Database migration:** No.
- **Environment variables:** None in the portals.
- **Rollback:** Disable the global feature, revert both thin wrappers together, remove shared viewer/UI exports, and restore an honest unavailable placeholder rather than the old false `LIVE` state.

## Execution Log

- `pnpm --dir packages/hooks build && pnpm --dir packages/hooks test` — passed.
- `pnpm --dir packages/ui build && pnpm --dir packages/ui test` — passed.
- `pnpm --dir app/sentinel-core exec vitest run src/features/exams/monitoring/_components/live-feed-monitor.test.tsx src/app/'(protected)'/exams/'[id]'/monitoring/page.test.tsx` — passed.
- `pnpm --dir app/sentinel-web exec vitest run src/features/exams/monitoring/_components/live-feed-monitor.test.tsx src/app/'(protected)'/'(instructor)'/exams/'[id]'/monitoring/page.test.tsx` — passed.
- `pnpm --dir app/sentinel-core build` — passed with sandbox escalation for Turbopack process binding.
- `pnpm --dir app/sentinel-web build` — passed with sandbox escalation for Google Fonts network access.
