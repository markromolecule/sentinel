import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_TELEMETRY_SETTINGS } from '@sentinel/shared';
import type { ExamConfiguration } from '@sentinel/shared/types';
import { useAttemptEffectiveConfig } from './use-attempt-effective-config';

vi.mock('@sentinel/hooks', () => ({
    useAudioSettingsQuery: () => ({
        data: null,
        isLoading: false,
    }),
}));

describe('useAttemptEffectiveConfig', () => {
    const baseConfig: ExamConfiguration = {
        lobbyAdmissionMode: 'AUTOMATIC',
        maxReconnectAttempts: 3,
        strictMode: true,
        screenLock: true,
        cameraRequired: true,
        micRequired: true,
        autoSubmitTimeoutMinutes: 5,
        aiRules: {
            gaze_tracking: true,
            face_detection: true,
            audio_anomaly_detection: false,
            multiple_faces_detection: true,
        },
        webSecurity: {
            tab_switching_monitor: true,
            full_screen_required: true,
            clipboard_control: true,
            right_click_disable: true,
            print_screen_disable: true,
        },
        mobileSecurity: {
            app_pinning_required: true,
            prevent_backgrounding: true,
            notification_block: true,
            screenshot_block: true,
            root_jailbreak_detection: false,
        },
    };

    it('falls back to DEFAULT_TELEMETRY_SETTINGS.mediaPipeSandbox when undefined is passed', () => {
        const { result } = renderHook(() =>
            useAttemptEffectiveConfig({
                configuration: {
                    ...baseConfig,
                    cameraRequired: false,
                },
                mediaPipeSandbox: undefined,
                isBlocked: false,
                isRedirectingToTurnIn: false,
                isRedirectingToHistory: false,
                isTerminalAttempt: false,
            }),
        );

        expect(result.current.effectiveMediaPipeSandbox).toEqual(
            DEFAULT_TELEMETRY_SETTINGS.mediaPipeSandbox,
        );
    });

    it('enables and configures MediaPipe sandbox when camera and AI gaze tracking are required', () => {
        const { result } = renderHook(() =>
            useAttemptEffectiveConfig({
                configuration: baseConfig,
                mediaPipeSandbox: undefined,
                isBlocked: false,
                isRedirectingToTurnIn: false,
                isRedirectingToHistory: false,
                isTerminalAttempt: false,
            }),
        );

        expect(result.current.effectiveMediaPipeSandbox).toEqual({
            ...DEFAULT_TELEMETRY_SETTINGS.mediaPipeSandbox,
            enabled: true,
            captureDuringCheckup: true,
            emitDuringExam: true,
            calibrationRequired: true,
        });
    });

    it('resolves sessionConfiguration over configuration', () => {
        const sessionConfig: ExamConfiguration = {
            ...baseConfig,
            autoSubmitTimeoutMinutes: 10,
        };

        const { result } = renderHook(() =>
            useAttemptEffectiveConfig({
                configuration: baseConfig,
                sessionConfiguration: sessionConfig,
                isBlocked: false,
                isRedirectingToTurnIn: false,
                isRedirectingToHistory: false,
                isTerminalAttempt: false,
            }),
        );

        expect(result.current.effectiveConfiguration?.autoSubmitTimeoutMinutes).toBe(10);
    });

    it('computes isLiveInspectionEligible accurately based on blockers and requirements', () => {
        const { result, rerender } = renderHook(
            (props) =>
                useAttemptEffectiveConfig({
                    configuration: baseConfig,
                    sessionId: props.sessionId,
                    examAttemptId: props.examAttemptId,
                    sessionAttemptId: props.sessionAttemptId,
                    isBlocked: props.isBlocked,
                    isRedirectingToTurnIn: props.isRedirectingToTurnIn,
                    isRedirectingToHistory: props.isRedirectingToHistory,
                    isTerminalAttempt: props.isTerminalAttempt,
                }),
            {
                initialProps: {
                    sessionId: 'session-123',
                    examAttemptId: 'attempt-123',
                    sessionAttemptId: null as string | null,
                    isBlocked: false,
                    isRedirectingToTurnIn: false,
                    isRedirectingToHistory: false,
                    isTerminalAttempt: false,
                },
            },
        );

        expect(result.current.isLiveInspectionEligible).toBe(true);
        expect(result.current.canonicalAttemptId).toBe('attempt-123');

        // When blocked, live inspection becomes ineligible
        rerender({
            sessionId: 'session-123',
            examAttemptId: 'attempt-123',
            sessionAttemptId: null,
            isBlocked: true,
            isRedirectingToTurnIn: false,
            isRedirectingToHistory: false,
            isTerminalAttempt: false,
        });
        expect(result.current.isLiveInspectionEligible).toBe(false);
    });
});
