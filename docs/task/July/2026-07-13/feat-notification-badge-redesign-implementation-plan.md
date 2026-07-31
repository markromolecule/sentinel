# Notification Badge Redesign Implementation Plan

## 1. The Context

The current notification badge displays `99+` but is too large and positioned too far to the top-right relative to the bell icon because it is absolute-positioned relative to the larger `size="icon"` button rather than the bell itself.

To create a sleeker, more premium look, we will:

1. Wrap the `<Bell className="h-5 w-5" />` in a `<div className="relative">` container so that the badge coordinates are relative to the icon itself.
2. Decrease the badge size from `h-4 min-w-4` (`16px`) to `h-3.5 min-w-3.5` (`14px`) and the font from `9px` to `8px`.
3. Add a `ring-2 ring-background` outline to separate the badge from the bell icon lines, creating a clean premium look.

---

## 2. Proposed Changes

We will apply this redesign to the notification dropdown component in all three portals:

### Sentinel Core (`sentinel-core`)

#### [MODIFY] [core-notification-dropdown.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/components/sidebar/common/core-notification-dropdown.tsx)

- Wrap `<Bell />` and its badge span in a `relative` wrapper div, and update the badge styling:
    ```tsx
    <div className="relative">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground ring-background animate-in fade-in zoom-in-75 absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] leading-none font-bold shadow-sm ring-2 duration-200">
                {unreadCount > 99 ? '99+' : unreadCount}
            </span>
        )}
    </div>
    ```

---

### Sentinel Web (`sentinel-web`)

#### [MODIFY] [instructor-notification-dropdown.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/components/sidebar/instructor/instructor-notification-dropdown.tsx)

- Apply the same redesign wrap and style:
    ```tsx
    <div className="relative">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground ring-background animate-in fade-in zoom-in-75 absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] leading-none font-bold shadow-sm ring-2 duration-200">
                {unreadCount > 99 ? '99+' : unreadCount}
            </span>
        )}
    </div>
    ```

---

### Sentinel Support (`sentinel-support`)

#### [MODIFY] [support-notification-dropdown.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/components/sidebar/common/support-notification-dropdown.tsx)

- Apply the same redesign wrap and style:
    ```tsx
    <div className="relative">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground ring-background animate-in fade-in zoom-in-75 absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] leading-none font-bold shadow-sm ring-2 duration-200">
                {unreadCount > 99 ? '99+' : unreadCount}
            </span>
        )}
    </div>
    ```

---

## 3. Verification Plan

### Automated Tests

- Run Vitest component tests to confirm trigger interactions are unaffected.

### Manual Verification

- View the bell icon trigger in the local dev server. Ensure the badge is centered on the top-right of the bell, is proportional, has a clean background-colored border separating it, and handles "99+" without looking oversized.
