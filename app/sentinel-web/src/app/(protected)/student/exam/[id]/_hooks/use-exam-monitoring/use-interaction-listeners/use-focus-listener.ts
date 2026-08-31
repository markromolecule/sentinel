import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { createTelemetryActionMetadata } from '../../../_lib/web-telemetry-client';
import { evaluateActionBurst } from '../../../_lib/web-telemetry-client/_utils/action-burst';
import { type BaseListenerOptions } from './types';

export interface FocusListenerOptions extends BaseListenerOptions {
    shouldMonitorVisibility: boolean;
    setTabSwitches: (fn: (c: number) => number) => void;
    lastNavigationShortcutAtRef: React.MutableRefObject<number>;
    lastCaptureModifierAtRef?: React.MutableRefObject<number>;
}

export function useFocusListener(options: FocusListenerOptions) {
    const {
        configuration,
        examSessionId,
        isMonitoringSuspended,
        isMobile,
        emitTelemetryEvent,
        lockExam,
        shouldMonitorVisibility,
        setTabSwitches,
        lastNavigationShortcutAtRef,
        lastCaptureModifierAtRef,
    } = options;

    const lastFocusIncidentAtRef = useRef(0);

    const registerFocusIncident = useCallback(
        (
            actionSource: 'focus-loss' | 'app-backgrounding',
            clientActionAt = new Date().toISOString(),
        ) => {
            if (isMonitoringSuspended.current) return;
            const now = new Date(clientActionAt).getTime();

            const burstResult = evaluateActionBurst({
                lastAcceptedAt: lastFocusIncidentAtRef.current,
                candidateAt: now,
                windowMs: 1000,
            });
            lastFocusIncidentAtRef.current = burstResult.nextAcceptedAt;
            if (!burstResult.accepted) return;

            const captureModifierDetected =
                !isMobile &&
                (configuration?.webSecurity.print_screen_disable ?? true) &&
                Boolean(lastCaptureModifierAtRef && now - lastCaptureModifierAtRef.current < 1500);

            if (captureModifierDetected) {
                // Purge clipboard immediately to prevent saving copied screenshot data
                if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText('').catch(() => { });
                }

                const metadata = createTelemetryActionMetadata({
                    eventType: 'PRINT_SCREEN_ATTEMPT',
                    examSessionId,
                    actionSource: 'screen-capture',
                    actionBucketId: 'screen-capture',
                    clientActionAt,
                    bucketMs: 1000,
                });

                emitTelemetryEvent('PRINT_SCREEN_ATTEMPT', metadata);
                lockExam('screen-capture');
                toast.warning('A screen capture shortcut was detected for this exam.', {
                    description:
                        'Close any capture tool before returning to the protected session.',
                });
                return;
            }

            const shortcutNavigationDetected = now - lastNavigationShortcutAtRef.current < 1500;
            setTabSwitches((current) => current + 1);

            if (isMobile) {
                const metadata = createTelemetryActionMetadata({
                    eventType: 'APP_BACKGROUNDING',
                    examSessionId,
                    actionSource,
                    actionBucketId: 'mobile-backgrounding',
                    clientActionAt,
                    bucketMs: 1000,
                });

                emitTelemetryEvent('APP_BACKGROUNDING', metadata);
                toast.warning('Backgrounding the exam app was detected.', {
                    description: 'Incident logged.',
                });
                return;
            }

            const metadata = createTelemetryActionMetadata({
                eventType: 'TAB_SWITCH',
                examSessionId,
                actionSource,
                actionBucketId: 'focus-visibility',
                clientActionAt,
                bucketMs: 1000,
            });

            emitTelemetryEvent('TAB_SWITCH', metadata);
            lockExam('focus-loss');
            toast.warning('Navigation away from the exam was detected.', {
                description: shortcutNavigationDetected
                    ? 'A task-switching shortcut or window change was detected. Return to the secured exam view to continue.'
                    : 'Return to the secured exam view to continue.',
            });
        },
        [
            configuration?.webSecurity,
            emitTelemetryEvent,
            examSessionId,
            isMobile,
            lockExam,
            isMonitoringSuspended,
            setTabSwitches,
            lastNavigationShortcutAtRef,
            lastCaptureModifierAtRef,
        ],
    );

    useEffect(() => {
        const handleVisibilityChange = () => {
            // Policy: Minimize and window-hidden actions are classified under focus/visibility incidents
            // and must not be silently reclassified as or remapped to fullscreen exits.
            if (!isMonitoringSuspended.current && shouldMonitorVisibility && document.hidden) {
                registerFocusIncident(isMobile ? 'app-backgrounding' : 'focus-loss');
            }
        };

        let blurTimeout: ReturnType<typeof setTimeout> | undefined;

        const handleWindowBlur = () => {
            if (!shouldMonitorVisibility) return;
            if (isMobile) return;

            if (blurTimeout) {
                clearTimeout(blurTimeout);
            }

            blurTimeout = setTimeout(() => {
                // Policy: Window blur/loss of focus is tracked separately from fullscreen state.
                if (!isMonitoringSuspended.current && !document.hasFocus() && !document.hidden) {
                    registerFocusIncident('focus-loss');
                }
            }, 100);
        };

        const handleWindowFocus = () => {
            if (
                !isMonitoringSuspended.current &&
                !isMobile &&
                (configuration?.webSecurity.print_screen_disable ?? true) &&
                lastCaptureModifierAtRef &&
                Date.now() - lastCaptureModifierAtRef.current < 3000
            ) {
                if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText('').catch(() => { });
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('focus', handleWindowFocus);

        return () => {
            if (blurTimeout) {
                clearTimeout(blurTimeout);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
            window.removeEventListener('focus', handleWindowFocus);
        };
    }, [
        configuration?.webSecurity,
        isMobile,
        registerFocusIncident,
        shouldMonitorVisibility,
        isMonitoringSuspended,
        lastCaptureModifierAtRef,
    ]);

    return { registerFocusIncident };
}
