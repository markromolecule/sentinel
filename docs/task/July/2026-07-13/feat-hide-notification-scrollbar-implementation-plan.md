# Hide Notification Scrollbar Implementation Plan

## 1. The Context

The notifications dropdown in `sentinel-core`, `sentinel-web`, and `sentinel-support` renders a standard scrollbar when there is overflow in the notifications list. To improve aesthetics and provide a sleeker, more premium look (while maintaining full touch/mouse scrolling functionality), we want to hide the scrollbar.

This can be elegantly achieved using standard Tailwind CSS arbitrary utilities:

- `[scrollbar-width:none]` (for Firefox)
- `[\u0026::-webkit-scrollbar]:hidden` (for Chrome, Safari, and Opera)
- `[-ms-overflow-style:none]` (for IE and Edge)

---

## 2. Proposed Changes

We will modify the scrollable list container in the notification dropdown component for each of the three workspace portals.

### Sentinel Core (`sentinel-core`)

#### [MODIFY] [core-notification-dropdown.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/components/sidebar/common/core-notification-dropdown.tsx)

- Add Tailwind scrollbar-hiding utilities to the scroll container at line 131:
    ```tsx
    <div className="max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
    ```

---

### Sentinel Web (`sentinel-web`)

#### [MODIFY] [instructor-notification-dropdown.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/components/sidebar/instructor/instructor-notification-dropdown.tsx)

- Add Tailwind scrollbar-hiding utilities to the scroll container at line 131:
    ```tsx
    <div className="max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
    ```

---

### Sentinel Support (`sentinel-support`)

#### [MODIFY] [support-notification-dropdown.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/components/sidebar/common/support-notification-dropdown.tsx)

- Add Tailwind scrollbar-hiding utilities to the scroll container at line 131:
    ```tsx
    <div className="max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
    ```

---

## 3. Verification Plan

### Automated Tests

- Run Vitest suites for components to ensure no regressions:
    ```bash
    pnpm --dir app/sentinel-core test core-notification-dropdown.test.tsx
    pnpm --dir app/sentinel-web test instructor-notification-dropdown.test.tsx
    pnpm --dir app/sentinel-support test support-notification-dropdown.test.tsx
    ```

### Manual Verification

- Run the dev server (`pnpm dev`).
- Open the notifications dropdown in each portal and verify the scrollbar is invisible but scrolling remains fully operational.
