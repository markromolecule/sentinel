import { useRef } from 'react';
import type { ExamConfig } from '@sentinel/shared/types';
import { type SecurityLockReason } from '../../_lib/exam-session-storage';
import {
    type TelemetryActionMetadata,
    type BrowserTelemetryEventType,
} from '../../_lib/web-telemetry-client';
import { type AttemptMonitoringPhase } from './_types';

import { useClipboardListener } from './use-interaction-listeners/use-clipboard-listener';
import { useFocusListener } from './use-interaction-listeners/use-focus-listener';
import { useFullscreenListener } from './use-interaction-listeners/use-fullscreen-listener';
import { useRightClickListener } from './use-interaction-listeners/use-right-click-listener';
import { useKeyboardListener } from './use-interaction-listeners/use-keyboard-listener';
import { useBeforeUnloadListener } from './use-interaction-listeners/use-before-unload-listener';

/**
 * Hook that sets up document-level and window-level interaction event listeners.
 * Tracks copy/paste/cut, contextmenu (right-click), printscreen shortcuts, focus loss (window blur, visibilitychange), and fullscreen changes.
 *
 * @param args - Callback functions and flags for enabling/disabling security locks/telemetry.
 */
export function useInteractionListeners(args: {
    configuration?: ExamConfig;
    examSessionId?: string;
    isMonitoringSuspended: React.MutableRefObject<boolean>;
    isMobile: boolean;
    shouldMonitorVisibility: boolean;
    shouldMonitorFullscreen: boolean;
    emitTelemetryEvent: (
        eventType: BrowserTelemetryEventType,
        metadata?: TelemetryActionMetadata,
    ) => void;
    lockExam: (reason: SecurityLockReason) => void;
    setTabSwitches: (fn: (c: number) => number) => void;
    monitoringPhase?: React.MutableRefObject<AttemptMonitoringPhase>;
}) {
    const {
        configuration,
        examSessionId,
        isMonitoringSuspended,
        isMobile,
        shouldMonitorVisibility,
        shouldMonitorFullscreen,
        emitTelemetryEvent,
        lockExam,
        setTabSwitches,
        monitoringPhase,
    } = args;

    const lastNavigationShortcutAtRef = useRef(0);
    const lastCaptureModifierAtRef = useRef(0);

    const baseOptions = {
        configuration,
        examSessionId,
        isMonitoringSuspended,
        isMobile,
        emitTelemetryEvent,
        lockExam,
    };

    // 1. Clipboard actions (copy, cut, paste)
    const { registerClipboardIncident } = useClipboardListener(baseOptions);

    // 2. Focus and tab visibility changes
    useFocusListener({
        ...baseOptions,
        shouldMonitorVisibility,
        setTabSwitches,
        lastNavigationShortcutAtRef,
        lastCaptureModifierAtRef,
    });

    // 3. Fullscreen checks
    useFullscreenListener({
        ...baseOptions,
        shouldMonitorFullscreen,
        monitoringPhase,
    });

    // 4. Context menu (right-click) checks
    useRightClickListener(baseOptions);

    // 5. Keyboard shortcut controls and snipping checks
    useKeyboardListener({
        ...baseOptions,
        shouldMonitorVisibility,
        lastNavigationShortcutAtRef,
        lastCaptureModifierAtRef,
        registerClipboardIncident,
    });

    // 6. Prevent tab/window closure
    useBeforeUnloadListener({
        configuration,
        isMonitoringSuspended,
    });
}
