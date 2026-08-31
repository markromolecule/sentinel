import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
    createTelemetryActionMetadata,
    detectScreenCaptureShortcut,
} from '../../../_lib/web-telemetry-client';
import { evaluateActionBurst } from '../../../_lib/web-telemetry-client/_utils/action-burst';
import { type BaseListenerOptions } from './types';

export interface KeyboardListenerOptions extends BaseListenerOptions {
    shouldMonitorVisibility: boolean;
    lastNavigationShortcutAtRef: React.MutableRefObject<number>;
    lastCaptureModifierAtRef?: React.MutableRefObject<number>;
    registerClipboardIncident: (clientActionAt?: string) => void;
}

export function useKeyboardListener(options: KeyboardListenerOptions) {
    const {
        configuration,
        examSessionId,
        isMonitoringSuspended,
        isMobile,
        emitTelemetryEvent,
        lockExam,
        shouldMonitorVisibility,
        lastNavigationShortcutAtRef,
        lastCaptureModifierAtRef,
        registerClipboardIncident,
    } = options;

    const lastPrintScreenIncidentAtRef = useRef(0);

    useEffect(() => {
        const handleKeyEvent = (event: KeyboardEvent) => {
            if (isMonitoringSuspended.current) return;

            // Track potential capture modifier combinations (Cmd+Shift, Win+Shift, Ctrl+Shift, PrintScreen)
            const isModifierCaptureCombo =
                (event.metaKey || event.ctrlKey || event.altKey) &&
                (event.shiftKey ||
                    event.key === 'PrintScreen' ||
                    event.code === 'PrintScreen' ||
                    event.key === 'Meta' ||
                    event.key === 'OS');

            if (isModifierCaptureCombo && lastCaptureModifierAtRef) {
                lastCaptureModifierAtRef.current = Date.now();
            }

            if (
                event.type === 'keydown' &&
                shouldMonitorVisibility &&
                event.key === 'Tab' &&
                (event.altKey || event.metaKey)
            ) {
                lastNavigationShortcutAtRef.current = Date.now();
            }

            if (
                event.type === 'keydown' &&
                (configuration?.webSecurity.clipboard_control ?? true) &&
                !isMobile
            ) {
                const normalizedKey = event.key.toLowerCase();
                if ((event.ctrlKey || event.metaKey) && ['c', 'x', 'v'].includes(normalizedKey)) {
                    event.preventDefault();
                    registerClipboardIncident(new Date().toISOString());
                    return;
                }
            }

            if (!(configuration?.webSecurity.print_screen_disable ?? true) || isMobile) return;

            const shortcutDetection = detectScreenCaptureShortcut({
                event,
                isMobile,
            });

            if (shortcutDetection.detected) {
                if (lastCaptureModifierAtRef) {
                    lastCaptureModifierAtRef.current = Date.now();
                }

                const clientActionAt = new Date().toISOString();
                const now = new Date(clientActionAt).getTime();

                const burstResult = evaluateActionBurst({
                    lastAcceptedAt: lastPrintScreenIncidentAtRef.current,
                    candidateAt: now,
                    windowMs: 800,
                });
                lastPrintScreenIncidentAtRef.current = burstResult.nextAcceptedAt;
                if (!burstResult.accepted) return;

                event.preventDefault();

                // Purge clipboard if supported to prevent saving copied screenshot data
                if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText('').catch(() => { });
                }

                const metadata = createTelemetryActionMetadata({
                    eventType: 'PRINT_SCREEN_ATTEMPT',
                    examSessionId,
                    actionSource: 'screen-capture',
                    actionBucketId: 'screen-capture',
                    clientActionAt,
                    bucketMs: 800,
                });

                emitTelemetryEvent('PRINT_SCREEN_ATTEMPT', metadata);
                lockExam('screen-capture');
                toast.warning('A screen capture shortcut was detected for this exam.', {
                    description:
                        'This browser event was logged. Some operating-system capture shortcuts may still be intercepted before the page can observe them.',
                });
            }
        };

        document.addEventListener('keydown', handleKeyEvent, true);
        document.addEventListener('keyup', handleKeyEvent, true);
        window.addEventListener('keydown', handleKeyEvent, true);
        window.addEventListener('keyup', handleKeyEvent, true);

        return () => {
            document.removeEventListener('keydown', handleKeyEvent, true);
            document.removeEventListener('keyup', handleKeyEvent, true);
            window.removeEventListener('keydown', handleKeyEvent, true);
            window.removeEventListener('keyup', handleKeyEvent, true);
        };
    }, [
        configuration?.webSecurity,
        examSessionId,
        isMobile,
        isMonitoringSuspended,
        emitTelemetryEvent,
        lockExam,
        registerClipboardIncident,
        shouldMonitorVisibility,
        lastNavigationShortcutAtRef,
        lastCaptureModifierAtRef,
    ]);
}
