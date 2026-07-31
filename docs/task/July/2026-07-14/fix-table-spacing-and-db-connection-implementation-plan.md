# Table Spacing & Database Connection Fix Implementation Plan

## 1. The Context

This plan outlines the steps required to resolve two specific issues in the development environment:

1. **Excessive Spacing in Students Table**: The gap between the select checkboxes and the student initials/avatars is visually too wide (currently 24px). Removing the `pl-4` padding from the name/avatar cell container will shift the avatar to the left, aligning it correctly with the "Student" column header text and reducing the visual gap to a clean, standard spacing.
2. **Database Connectivity Error in Hono API**: The running API dev server process throws a `DatabaseNotReachable (P1001)` error because of transient connection pool/DNS caching issues with the remote Supabase database. Standard checks confirm the remote database is fully online. Restarting the dev server process will refresh the DNS resolution cache and database pool connections.

---

## 2. Proposed Changes

### Sentinel Web (`sentinel-web`)

#### [MODIFY] [columns.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/app/(protected)/(instructor)/students/_components/tables/columns.tsx>)

- Remove `pl-4` from the outer `div` layout of the student name cell at line 59:
    ```tsx
    // Before:
    <div className="flex items-center gap-3 pl-4">

    // After:
    <div className="flex items-center gap-3">
    ```

---

### Sentinel API (`sentinel-api`)

#### [RESTART] Dev Server (Process ID 2868)

- Terminate and restart the local dev process (`pnpm dev`) to refresh Node.js native DNS lookups and reset connection pools in `packages/db/src/db.ts`.

---

## 3. Verification Plan

### Automated Tests

- Verify that standard formatting and linting rules are met on the modified file:
    ```bash
    pnpm --dir app/sentinel-web run lint
    ```

### Manual Verification

- **Table Spacing Visual Check**:
    - Run `pnpm dev`.
    - Go to `http://localhost:3000/students` (or the instructor students dashboard).
    - Verify that the initials avatar ("AI", "ML", etc.) starts directly aligned with the "Student" header text and maintains a clean spacing from the checkbox.
- **Database Connection Check**:
    - Verify that `sentinel-api` boots up cleanly and can resolve database queries (e.g. by logging in or accessing any api endpoint).
