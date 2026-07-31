# Notification Badge Count Display Implementation Plan

## 1. The Context

Currently, the notification bell icon button in the sidebar of `sentinel-core`, `sentinel-web`, and `sentinel-support` displays a simple red dot (`bg-destructive absolute top-2 right-2 h-2 w-2 rounded-full`) when there are unread notifications.

To improve usability and follow modern design patterns, we will replace this dot with a rounded badge displaying the actual number of unread notifications, capped at `99+` to maintain a compact size and premium look.

---

## 2. Proposed Changes

We will modify the bell trigger component in the notification dropdown for each portal:

### Sentinel Core (`sentinel-core`)

#### [MODIFY] [core-notification-dropdown.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-core/src/components/sidebar/common/core-notification-dropdown.tsx)

- Replace the unread dot span with a badge displaying the unread count (capped at `99+`) styled with absolute positioning, small text, and centered alignment:
    ```tsx
    {
        unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground animate-in fade-in zoom-in-75 absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold shadow-sm duration-200">
                {unreadCount > 99 ? '99+' : unreadCount}
            </span>
        );
    }
    ```

---

### Sentinel Web (`sentinel-web`)

#### [MODIFY] [instructor-notification-dropdown.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-web/src/components/sidebar/instructor/instructor-notification-dropdown.tsx)

- Apply the same badge modification to display the unread count:
    ```tsx
    {
        unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground animate-in fade-in zoom-in-75 absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold shadow-sm duration-200">
                {unreadCount > 99 ? '99+' : unreadCount}
            </span>
        );
    }
    ```

---

### Sentinel Support (`sentinel-support`)

#### [MODIFY] [support-notification-dropdown.tsx](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-support/src/components/sidebar/common/support-notification-dropdown.tsx)

- Apply the same badge modification to display the unread count:
    ```tsx
    {
        unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground animate-in fade-in zoom-in-75 absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold shadow-sm duration-200">
                {unreadCount > 99 ? '99+' : unreadCount}
            </span>
        );
    }
    ```

---

## 3. Verification Plan

### Automated Tests

- Run component tests:
    ```bash
    pnpm --dir app/sentinel-core test core-notification-dropdown.test.tsx
    pnpm --dir app/sentinel-web test instructor-notification-dropdown.test.tsx
    pnpm --dir app/sentinel-support test support-notification-dropdown.test.tsx
    ```

### Manual Verification

- Check the rendered badge on the bell icon to ensure the count is readable and styled correctly.
