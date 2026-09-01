/**
 * Minimal keyboard-event shape required to classify browser-delivered
 * screen-capture shortcuts.
 */
export type ScreenCaptureShortcutKeyboardEvent = Pick<
    KeyboardEvent,
    'key' | 'code' | 'metaKey' | 'shiftKey' | 'repeat'
> & {
    altKey?: boolean;
    ctrlKey?: boolean;
};

/**
 * Canonical shortcut identifiers used by attempt-page monitoring.
 */
export type ScreenCaptureShortcutType = 'print-screen' | 'macos-screenshot' | 'windows-snipping';

/**
 * Result returned from browser screen-capture shortcut detection.
 */
export type ScreenCaptureShortcutDetection = {
    detected: boolean;
    shortcut: ScreenCaptureShortcutType | null;
};

/**
 * Detects browser-delivered screen-capture shortcuts for desktop platforms.
 *
 * Supported combinations:
 * - `PrintScreen` (including `Alt+PrintScreen`, `Ctrl+PrintScreen`, `Shift+PrintScreen`)
 * - macOS `Cmd+Shift+3`, `Cmd+Shift+4`, `Cmd+Shift+5` (handles direct number keys, shifted symbols, and digit/numpad codes)
 * - Windows `Meta+Shift+S` / `Win+Shift+S`
 *
 * This is intentionally best effort. If the operating system intercepts the
 * shortcut before the browser receives the keyboard event, detection is not
 * possible directly from the key event alone.
 *
 * @param args.event The keyboard event payload to inspect.
 * @param args.isMobile Whether the current client is mobile/tablet and should skip desktop detection.
 * @returns The normalized detection result for the delivered shortcut.
 */
export function detectScreenCaptureShortcut(args: {
    event: ScreenCaptureShortcutKeyboardEvent;
    isMobile: boolean;
}): ScreenCaptureShortcutDetection {
    if (args.isMobile) {
        return {
            detected: false,
            shortcut: null,
        };
    }

    const rawKey = args.event.key ?? '';
    const rawCode = args.event.code ?? '';
    const normalizedKey = rawKey.toLowerCase();
    const normalizedCode = rawCode.toLowerCase();

    // 1. PrintScreen key (standard, Alt+PrintScreen, Ctrl+PrintScreen)
    const isPrintScreenKey =
        rawKey === 'PrintScreen' ||
        rawCode === 'PrintScreen' ||
        rawKey === 'Snapshot' ||
        rawCode === 'Snapshot' ||
        normalizedKey === 'printscreen' ||
        normalizedCode === 'printscreen' ||
        normalizedKey === 'snapshot' ||
        normalizedCode === 'snapshot';

    if (isPrintScreenKey) {
        return {
            detected: true,
            shortcut: 'print-screen',
        };
    }

    // 2. macOS screen capture shortcuts: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
    // Note: On shifted keys, event.key may report '3'/'4'/'5' or shifted symbols ('#', '$', '%')
    const isMacCaptureKey =
        ['3', '4', '5', '#', '$', '%'].includes(rawKey) ||
        ['digit3', 'digit4', 'digit5', 'numpad3', 'numpad4', 'numpad5'].includes(normalizedCode);

    if (args.event.metaKey && args.event.shiftKey && isMacCaptureKey) {
        return {
            detected: true,
            shortcut: 'macos-screenshot',
        };
    }

    // 3. Windows Snipping shortcut: Win+Shift+S
    const isWindowsSnippingKey =
        normalizedKey === 's' || normalizedCode === 'keys';

    if (args.event.metaKey && args.event.shiftKey && isWindowsSnippingKey) {
        return {
            detected: true,
            shortcut: 'windows-snipping',
        };
    }

    return {
        detected: false,
        shortcut: null,
    };
}
