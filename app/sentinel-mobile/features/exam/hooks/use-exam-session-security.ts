import { useEffect, useRef, useCallback } from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { emitMobileTelemetryEvent } from '@/features/exam/lib/mobile-telemetry-client';
import type { MobileExamDisplay } from '@/features/exam/lib/mobile-exam-adapter.types';

interface UseExamSessionSecurityOptions {
    exam?: MobileExamDisplay;
    sessionId?: string;
    user?: { id: string } | null;
    apiClient: any;
}

export function useExamSessionSecurity({
    exam,
    sessionId,
    user,
    apiClient,
}: UseExamSessionSecurityOptions) {
    // App state tracking refs (iOS active -> inactive -> background robust lifecycle)
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const hasLeftForegroundRef = useRef(false);
    const hasEmittedBackgroundViolationRef = useRef(false);
    const lastNotificationViolationAtRef = useRef(0);
    const lastScreenshotAtRef = useRef(0);

    const emitSessionTelemetry = useCallback(
        (
            eventType:
                | 'APP_BACKGROUNDING'
                | 'SCREENSHOT_ATTEMPT'
                | 'APP_PINNING_VIOLATION'
                | 'NOTIFICATION_BLOCK_VIOLATION',
        ) => {
            if (!exam || !sessionId || !user?.id) {
                return;
            }

            void emitMobileTelemetryEvent({
                apiClient,
                configuration: exam.configuration,
                examSessionId: sessionId,
                eventType,
                studentId: user.id,
            }).catch((error) => {
                console.warn('Failed to emit mobile telemetry event.', {
                    eventType,
                    error,
                });
            });
        },
        [apiClient, exam, sessionId, user?.id],
    );

    const emitNotificationViolationIfAllowed = useCallback(() => {
        const now = Date.now();
        if (now - lastNotificationViolationAtRef.current < 2000) {
            return;
        }
        lastNotificationViolationAtRef.current = now;
        emitSessionTelemetry('NOTIFICATION_BLOCK_VIOLATION');
    }, [emitSessionTelemetry]);

    // Mobile Security Policy listeners with multi-stage iOS transition tracking
    useEffect(() => {
        const configuration = exam?.configuration?.mobileSecurity;
        if (!configuration) {
            return;
        }

        const subscription = AppState.addEventListener('change', (nextState) => {
            const prevState = appStateRef.current;

            if (prevState === 'active' && (nextState === 'inactive' || nextState === 'background')) {
                hasLeftForegroundRef.current = true;
            }

            // Inactive transition (notification pull-down, control center, incoming call)
            if (nextState === 'inactive') {
                if (configuration.notification_block) {
                    emitNotificationViolationIfAllowed();
                }
            }

            // Background transition (home button, app switcher) — works even after 'inactive'
            if (nextState === 'background' && hasLeftForegroundRef.current) {
                const isRecentScreenshot = Date.now() - lastScreenshotAtRef.current < 2000;

                if (!hasEmittedBackgroundViolationRef.current && !isRecentScreenshot) {
                    if (configuration.prevent_backgrounding) {
                        emitSessionTelemetry('APP_BACKGROUNDING');
                    }
                    if (configuration.app_pinning_required) {
                        emitSessionTelemetry('APP_PINNING_VIOLATION');
                    }
                    hasEmittedBackgroundViolationRef.current = true;

                    Alert.alert(
                        'Focus Required',
                        'Leaving the exam app is prohibited and has been recorded in the security audit.',
                    );
                }
            }

            // Return to active foreground
            if (nextState === 'active') {
                hasLeftForegroundRef.current = false;
                hasEmittedBackgroundViolationRef.current = false;
            }

            appStateRef.current = nextState;
        });

        const blurSubscription = AppState.addEventListener('blur', () => {
            if (!configuration.notification_block) {
                return;
            }
            emitNotificationViolationIfAllowed();
        });

        return () => {
            subscription.remove();
            blurSubscription.remove();
        };
    }, [
        emitNotificationViolationIfAllowed,
        emitSessionTelemetry,
        exam?.configuration?.mobileSecurity,
    ]);

    // Hardware Screen Capture Prevention (enforces FLAG_SECURE on Android, preventing screenshots and recording)
    useEffect(() => {
        const configuration = exam?.configuration?.mobileSecurity;
        const shouldBlockScreenshot = configuration ? configuration.screenshot_block : true;

        if (shouldBlockScreenshot) {
            ScreenCapture.preventScreenCaptureAsync().catch(() => { });
        }

        return () => {
            ScreenCapture.allowScreenCaptureAsync().catch(() => { });
        };
    }, [exam?.configuration?.mobileSecurity]);

    // Native Screenshot Listener (iOS & Android)
    useEffect(() => {
        const configuration = exam?.configuration?.mobileSecurity;
        const shouldBlockScreenshot = configuration ? configuration.screenshot_block : true;

        if (!shouldBlockScreenshot) {
            return;
        }

        const subscription = ScreenCapture.addScreenshotListener(() => {
            lastScreenshotAtRef.current = Date.now();
            emitSessionTelemetry('SCREENSHOT_ATTEMPT');
            Alert.alert(
                'Screenshot Detected',
                'Taking screenshots during this exam is strictly prohibited and has been recorded in the security audit.',
            );
        });

        return () => {
            subscription.remove();
        };
    }, [emitSessionTelemetry, exam?.configuration?.mobileSecurity]);

    return {
        emitSessionTelemetry,
    };
}
