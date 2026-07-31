# Logs Page Improvements Implementation Plan

## 1. The Context

The logs pages in `sentinel-core` and `sentinel-support` show a default pagination size of 10 instead of 20, render redundant icons on their sidebar navigations, and lack background process auditing for critical jobs like the telemetry flush cron. The system logs page is currently empty because cron executions from GitHub Actions are anonymous (having no active institution scope) and the API strictly scopes all logs queries to the user's active tenant institution.

---

## 3. The Triad

### Option A: The Pragmatic Path (Speed & Simplicity)

- **Approach:** Hardcode the default `pageSize: 20` directly in all page states, strip icons manually from the sidebar components, insert a simple global log on telemetry flush, and replace the loading state wrapper with a raw spinner element.
- **Tradeoff:** It does not address the underlying security model that prevents superadmins/support users from querying global logs (where institution ID is null).

### Option B: The Strategic Path (Robustness & Scalability)

- **Approach:** Pass pagination defaults through `useServerPagination` / standard states, remove icons from logs navigations, adjust backend query scoping to allow superadmins/support (cross-tenant permission) to view global and system-wide logs, log telemetry flush outcomes transactional-safely, and clean up loading wrappers to use the standard `@sentinel/ui` `Spinner`.
- **Tradeoff:** Requires minor adjustments to the backend logs repository, query builders, and controllers to allow cross-tenant query bypass.

### Option C: The Pivot Path (Creative & Out-of-the-Box)

- **Approach:** Build a dynamic settings/middleware configuration on the logs endpoints to configure page sizes dynamically, write cron reports to a separate system metrics dashboard, and introduce layout templates to toggle sidebar icons.
- **Tradeoff:** Unnecessarily increases cognitive overhead, configuration complexity, and development time for simple layout and auditing requirements.

---

## 1. The Execution

**The Recommendation:** Choose **Option B: The Strategic Path**.

- **The Justification:** It establishes proper backend scoping rules so that system logs actually function for superadmins and support, logs the telemetry flush cron execution robustly, and maintains design system cohesion by reusing existing `@sentinel/ui` exports.
- **Next Steps:** Follow the detailed phases to update the backend API, apply core and support app layout fixes, and verify the changes.

---

## Phases of Execution

### Phase 1: Backend Scoping & Telemetry Flush Logging

**Goal:** Enable system logs to audit anonymous cron jobs and allow superadmins/support to query cross-tenant logs.

- [ ] In [get-logs.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/logs/data/get-logs.ts), update `GetLogsDataArgs` to make `scopingInstitutionId` optional. Only apply the `al.institution_id` filter when it is provided.
- [ ] In [get-auth-logs.controller.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/logs/controllers/get-auth-logs.controller.ts), check if the user role is `superadmin` or `support`, or has the `institutions:cross-tenant-view` permission. If so, pass `query.institutionId || undefined` as the scoping institution ID.
- [ ] In [get-activity-logs.controller.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/logs/controllers/get-activity-logs.controller.ts), apply the same cross-tenant scoping resolution logic.
- [ ] In [get-system-logs.controller.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/logs/controllers/get-system-logs.controller.ts), apply the same cross-tenant scoping resolution logic.
- [ ] In [flush-telemetry.controller.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/telemetry/ingestion/controllers/flush-telemetry.controller.ts), import `SystemLogsService` and invoke `logSystemEvent` to record `telemetry.flush_success` (with count and stats details) and `telemetry.flush_failure` (with error details) during cron runs.
- [ ] In [flush-telemetry.controller.test.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/telemetry/ingestion/controllers/flush-telemetry.controller.test.ts), mock `SystemLogsService.logSystemEvent` to avoid database connections in unit tests.
- [ ] Run focused Vitest suites for logs and telemetry:
    ```bash
    pnpm --dir app/sentinel-api test modules/general/logs
    pnpm --dir app/sentinel-api test modules/telemetry/ingestion
    ```

---

### Phase 2: Frontend Layout and Defaults (`sentinel-core` & `sentinel-support`)

**Goal:** Apply page size changes, remove sidebar navigation icons, and simplify the loading UI.

- [ ] In core's [auth-log-table.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/app/(protected)/logs/_components/auth-log-table.tsx>), pass `{ pageIndex: 0, pageSize: 20 }` to `useServerPagination`.
- [ ] In core's [activity-log-table.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/app/(protected)/logs/_components/activity-log-table.tsx>), pass `{ pageIndex: 0, pageSize: 20 }` to `useServerPagination`.
- [ ] In core's [system-log-table.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/app/(protected)/logs/_components/system-log-table.tsx>), pass `{ pageIndex: 0, pageSize: 20 }` to `useServerPagination`.
- [ ] In support's [auth-log-table.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/logs/_components/auth-log-table.tsx>), set `pageSize: 20` in the initial state of `useState`.
- [ ] In support's [activity-log-table.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/logs/_components/activity-log-table.tsx>), set `pageSize: 20` in the initial state of `useState`.
- [ ] In support's [system-log-table.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/logs/_components/system-log-table.tsx>), set `pageSize: 20` in the initial state of `useState`.
- [ ] In core's [logs-nav.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/app/(protected)/logs/_components/layout/logs-nav.tsx>), remove the `icon` and `iconColor` fields, remove `<Icon />` from the Link render, and clean up Lucide imports.
- [ ] In support's [logs-nav.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/logs/_components/layout/logs-nav.tsx>), apply the same sidebar layout updates to remove icons.
- [ ] In core's [audit-log-table.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/app/(protected)/logs/_components/audit-log-table.tsx>), import `Spinner` from `@sentinel/ui` and replace the loading wrapper with:
    ```typescript
    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner className="size-8 text-[#323d8f]" />
            </div>
        );
    }
    ```
- [ ] In support's [audit-log-table.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/logs/_components/audit-log-table.tsx>), apply the same loading spinner simplification.

---

### Phase 3: Verification & Validation

**Goal:** Ensure all styling, pagination, and logging changes function correctly in the local dev environment.

- [ ] Run the Turborepo dev server:
    ```bash
    pnpm dev
    ```
- [ ] Verify logs sidebar has no icons and default page size is 20 for auth, activity, and system logs in both apps.
- [ ] Check loading state in the browser and verify the clean primary-blue spinner layout.
- [ ] Manually run telemetry flush endpoint with curl:
    ```bash
    curl -X GET "http://localhost:3001/telemetry/internal/flush"
    ```
- [ ] Check system logs in the Core Admin UI to verify that the flush operations (e.g. `telemetry.flush_success`) are recorded.
