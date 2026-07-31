# Role Matrix Autosave and Dark Mode Implementation Plan

## Task Summary

Fix the Support Portal's Role Matrix so that unchecking or checking multiple permission checkboxes in quick succession does not result in visual toggling loops or lost updates, and style the category rows to support dark mode.

## Pre-Planning

- [x] **Read and summarize the task input in one sentence:** Fix the Role Matrix autosave race condition by preventing in-flight mutations from overwriting newer local changes, and update the category rows' styles to support dark mode.
- [x] **Scan relevant source files to understand existing patterns:**
    - [use-role-matrix.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.ts>)
    - [use-role-matrix.test.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.test.ts>)
    - [role-matrix-category-row.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_components/table/role-matrix-category-row.tsx>)
    - [role-matrix-module-row.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_components/table/role-matrix-module-row.tsx>)
- [x] **Identify all files, services, and DB tables the task will touch:**
    - Frontend hook: `app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.ts`
    - Frontend components: `role-matrix-category-row.tsx`, `role-matrix-module-row.tsx`
    - Test files: `use-role-matrix.test.ts`
    - DB tables: None.
- [x] **Determine if a Prisma migration is needed:** No.

---

## 1-3-1 Options

### Option 1: Complete Draft Locking/Blocking During In-Flight Mutate

Disable or freeze the checkbox matrix for a role while its save mutation is in-flight.
**Tradeoff:** Simple to implement and completely avoids race conditions, but degrades user experience since the user has to wait for each network request to complete before checking another permission for that role.

### Option 2: Sent-Payload Comparison and Sequential Queueing (Recommended)

Keep local state optimistic. When a mutation completes, only overwrite `draftPermissionIdsByRoleId[roleId]` with the server response if the current draft equals the sent permissions payload. If the user made newer changes in the meantime, preserve them and let the effect trigger a new save automatically since the draft remains dirty.
**Tradeoff:** Offers the smoothest, non-blocking user experience while preventing state overwrites, but requires precise state comparison inside the React hook.

### Option 3: Manual Save Button Model (Non-Autosave)

Remove the autosave model completely. Add a manual "Save Changes" floating bar or button. User checks/unchecks everything and explicitly hits Save.
**Tradeoff:** Eliminates all race conditions and debounce complexity, but goes against the product design decision of having an "Auto-Save" matrix.

### Best Option

Choose **Option 2: Sent-Payload Comparison and Sequential Queueing**. It is the best fit because it preserves the intended UX design ("Auto-Save") while robustly resolving the race condition using standard optimistic reconciliation.

---

## Concrete Next Steps

1. Modify `useRoleMatrix.ts` to compare current draft permission IDs against the sent payload before overwriting local state with mutation output.
2. Add a new unit test in `use-role-matrix.test.ts` covering concurrent toggles.
3. Update `role-matrix-category-row.tsx` and `role-matrix-module-row.tsx` class names for dark mode and sticky cell inheritance.
4. Run tests and verify the visual styling in dark mode.

---

## Phase 1: Reconcile Autosave State and Fix Race Condition

**Goal:** Prevent in-flight save requests from overwriting newer draft changes made by the user, ensuring that all sequential toggles save successfully.

- [x] Modify `saveRolePermissions` in [use-role-matrix.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.ts>) to compare `current[roleId]` to `permissionIds` (the sent payload) inside the `setDraftPermissionIdsByRoleId` updater function. If they are not equal (meaning the user has changed the checkbox state again since the request was sent), preserve `current` instead of overwriting it with `updatedRole.permissionIds`.
- [x] Add a unit test in [use-role-matrix.test.ts](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.test.ts>) that renders the hook, triggers a permission toggle, triggers another permission toggle before the first mutation resolves, and asserts that the second toggle state is preserved when the first mutation resolves.
- [x] Run `pnpm --dir app/sentinel-support exec vitest run src/app/(protected)/(support)/control/roles/_hooks/use-role-matrix.test.ts` to verify the hook logic.

**Migration required:** No — purely frontend state reconciliation.

---

## Phase 2: Fix Category and Module Row Dark Mode Styling

**Goal:** Ensure the table category rows and sticky columns conform to dark mode guidelines without showing white backgrounds.

- [x] Modify [role-matrix-category-row.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_components/table/role-matrix-category-row.tsx>) to add `dark:bg-slate-900/60 dark:hover:bg-slate-800/80` to the `TableRow` component and add `bg-inherit` to the `TableCell`.
- [x] Modify [role-matrix-module-row.tsx](<file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/app/(protected)/(support)/control/roles/_components/table/role-matrix-module-row.tsx>) to add `bg-inherit` to the first `TableCell` component to prevent transparent backgrounds during horizontal scrolling.
- [x] Verify the table's appearance in dark mode via manual review.

**Migration required:** No — CSS styling changes only.

---

## Done Criteria

- [x] Multiple permission checkbox toggles in a single role can be unchecked/checked in rapid succession without visual loops or lost changes.
- [x] Category rows in the Role Matrix table render with dark backgrounds in dark mode.
- [x] All tests in `use-role-matrix.test.ts` pass successfully.
