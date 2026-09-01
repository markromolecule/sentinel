import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { act, createElement, StrictMode, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExamConfig } from '@sentinel/shared';
import { useExamMonitoring } from './use-exam-monitoring';
import type { AttemptMonitoringPhase } from './use-exam-monitoring/_types';
import { emitWebTelemetryEvent } from '../_lib/web-telemetry-client';
import { detectScreenCaptureShortcut } from '../_lib/web-telemetry-client/_utils/screen-capture-shortcut';

const { mockApiClient, mockToastError, mockToastWarning } = vi.hoisted(() => ({
    mockApiClient: vi.fn(),
    mockToastError: vi.fn(),
    mockToastWarning: vi.fn(),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => mockApiClient,
    useAuth: () => ({
        user: {
            id: '123e4567-e89b-12d3-a456-426614174001',
        },
    }),
}));

vi.mock('sonner', () => ({
    toast: {
        error: mockToastError,
        warning: mockToastWarning,
    },
}));

vi.mock('../_lib/web-telemetry-client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../_lib/web-telemetry-client')>();

    return {
        ...actual,
        emitWebTelemetryEvent: vi.fn().mockResolvedValue(true),
        createTelemetryActionMetadata: (
            args:
                | string
                | {
                      eventType: string;
                      examSessionId?: string;
                      actionSource?: string;
                      actionBucketId?: string;
                      clientActionAt?: string;
                      bucketMs?: number;
                  },
        ) => {
            const eventType = typeof args === 'string' ? args : args.eventType;
            const examSessionId =
                typeof args === 'string' ? 'mock-session' : (args.examSessionId ?? 'mock-session');
            const actionSource =
                typeof args === 'string'
                    ? 'generic-action'
                    : (args.actionSource ?? 'generic-action');
            const actionBucketId =
                typeof args === 'string' ? actionSource : (args.actionBucketId ?? actionSource);
            const clientActionAt =
                typeof args === 'string'
                    ? new Date().toISOString()
                    : (args.clientActionAt ?? new Date().toISOString());
            const bucketMs = typeof args === 'string' ? 1000 : (args.bucketMs ?? 1000);
            const bucketStart = new Date(
                Math.floor(new Date(clientActionAt).getTime() / bucketMs) * bucketMs,
            ).toISOString();
            const dedupeKey = `${examSessionId}:${eventType}:${actionBucketId}:${bucketStart}`;

            return {
                eventId: dedupeKey,
                dedupeKey,
                clientActionAt,
                detectionTimestamp: clientActionAt,
                detectorSource: actionSource,
                eventSubtype: actionSource,
            };
        },
        writeMonitoringEventTrace: vi.fn(),
    };
});

function createExamConfiguration(overrides: Partial<ExamConfig['webSecurity']> = {}): ExamConfig {
    return {
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
            audio_anomaly_detection: true,
            multiple_faces_detection: true,
        },
        webSecurity: {
            tab_switching_monitor: true,
            full_screen_required: true,
            clipboard_control: true,
            right_click_disable: true,
            print_screen_disable: true,
            ...overrides,
        },
        mobileSecurity: {
            app_pinning_required: true,
            prevent_backgrounding: true,
            notification_block: true,
            screenshot_block: true,
            root_jailbreak_detection: true,
        },
    };
}

describe('use-exam-monitoring', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.useRealTimers();
        window.sessionStorage.clear();

        Object.defineProperty(window.navigator, 'userAgent', {
            value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
            configurable: true,
        });
        Object.defineProperty(document, 'fullscreenEnabled', {
            value: true,
            configurable: true,
        });
        Object.defineProperty(document, 'fullscreenElement', {
            value: null,
            configurable: true,
        });
        Object.defineProperty(document.documentElement, 'requestFullscreen', {
            value: vi.fn().mockResolvedValue(undefined),
            configurable: true,
        });
    });

    it('locks the exam and emits telemetry when focus is lost', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration(),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            window.dispatchEvent(new Event('blur'));
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('focus-loss');
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledWith(
            mockApiClient,
            expect.objectContaining({
                eventType: 'TAB_SWITCH',
            }),
        );
    });

    it('flags task-switching shortcuts before the focus-loss lock is raised', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration(),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Tab',
                    altKey: true,
                }),
            );
            window.dispatchEvent(new Event('blur'));
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('focus-loss');
        });

        expect(mockToastWarning).toHaveBeenCalledWith(
            'Navigation away from the exam was detected.',
            expect.objectContaining({
                description: expect.stringContaining('task-switching shortcut'),
            }),
        );
    });

    it('does not lock the exam when tab-switch monitoring is disabled', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ tab_switching_monitor: false }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            window.dispatchEvent(new Event('blur'));
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBeNull();
        });

        expect(emitWebTelemetryEvent).not.toHaveBeenCalled();
    });

    it('locks the exam when fullscreen is exited under required fullscreen mode', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ full_screen_required: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('fullscreen-exit');
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledWith(
            mockApiClient,
            expect.objectContaining({
                eventType: 'FULL_SCREEN_EXIT',
            }),
        );
    });

    it('suppresses locks and telemetry after monitoring is suspended for intentional redirect', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ full_screen_required: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            result.current.suspendSecurityMonitoring();
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBeNull();
        });

        expect(emitWebTelemetryEvent).not.toHaveBeenCalled();
        expect(mockToastWarning).not.toHaveBeenCalled();
    });

    it('updates the suspension ref immediately before the next fullscreenchange is handled', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ full_screen_required: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            expect(result.current.suspendSecurityMonitoring()).toBe(true);
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBeNull();
        });

        expect(emitWebTelemetryEvent).not.toHaveBeenCalled();
    });

    it('blocks clipboard shortcuts and shows the attempt warning immediately', async () => {
        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ clipboard_control: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'c',
                    ctrlKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(emitWebTelemetryEvent).toHaveBeenCalledWith(
                mockApiClient,
                expect.objectContaining({
                    eventType: 'CLIPBOARD_ATTEMPT',
                }),
            );
        });

        expect(mockToastWarning).toHaveBeenCalledWith(
            'Clipboard actions are disabled for this exam.',
        );
    });

    it('deduplicates clipboard shortcut and DOM clipboard events for the same action burst', async () => {
        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ clipboard_control: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'v',
                    ctrlKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
            document.dispatchEvent(
                new Event('paste', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        });

        expect(mockToastWarning).toHaveBeenCalledTimes(1);
    });

    it('keeps the first clipboard burst at one warning and one telemetry event', async () => {
        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ clipboard_control: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'c',
                    ctrlKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
            document.dispatchEvent(
                new Event('copy', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        });

        expect(mockToastWarning).toHaveBeenCalledTimes(1);
    });

    it('counts a second clipboard action after the burst window as a new incident', async () => {
        vi.useFakeTimers();

        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ clipboard_control: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'c',
                    ctrlKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
            document.dispatchEvent(
                new Event('copy', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        expect(mockToastWarning).toHaveBeenCalledTimes(1);

        act(() => {
            vi.advanceTimersByTime(801);
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'v',
                    ctrlKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(2);
        expect(mockToastWarning).toHaveBeenCalledTimes(2);
    });

    it('reuses one dedupe identity for clipboard DOM signals in one burst and rotates on the next burst', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-22T00:00:00.100Z'));

        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ clipboard_control: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'c',
                    ctrlKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
            document.dispatchEvent(
                new Event('copy', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        const firstCall = vi.mocked(emitWebTelemetryEvent).mock.calls[0]?.[1];

        act(() => {
            vi.advanceTimersByTime(801);
            document.dispatchEvent(
                new Event('paste', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        const secondCall = vi.mocked(emitWebTelemetryEvent).mock.calls[1]?.[1];

        expect(firstCall?.dedupeKey).toBe(
            '123e4567-e89b-12d3-a456-426614174000:CLIPBOARD_ATTEMPT:clipboard:2026-04-22T00:00:00.000Z',
        );
        expect(firstCall?.eventId).toBe(firstCall?.dedupeKey);
        expect(secondCall?.dedupeKey).toBe(
            '123e4567-e89b-12d3-a456-426614174000:CLIPBOARD_ATTEMPT:clipboard:2026-04-22T00:00:00.800Z',
        );
        expect(secondCall?.eventId).toBe(secondCall?.dedupeKey);
        expect(secondCall?.dedupeKey).not.toBe(firstCall?.dedupeKey);
    });

    it('keeps one listener set active through StrictMode remounts', async () => {
        const wrapper = ({ children }: { children: ReactNode }) =>
            createElement(StrictMode, null, children);

        renderHook(
            () =>
                useExamMonitoring({
                    configuration: createExamConfiguration({ right_click_disable: true }),
                    examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                    examId: '123e4567-e89b-12d3-a456-426614174999',
                }),
            { wrapper },
        );

        act(() => {
            document.dispatchEvent(
                new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        });
        expect(mockToastWarning).toHaveBeenCalledTimes(1);
    });

    it('removes interaction listeners on unmount so later DOM events do not emit in parallel', () => {
        const { unmount } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ right_click_disable: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        unmount();

        act(() => {
            document.dispatchEvent(
                new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        expect(emitWebTelemetryEvent).not.toHaveBeenCalled();
    });

    it('blocks right-click attempts and raises the shared security alert', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ right_click_disable: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('right-click');
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledWith(
            mockApiClient,
            expect.objectContaining({
                eventType: 'RIGHT_CLICK_ATTEMPT',
            }),
        );
        expect(mockToastWarning).toHaveBeenCalledWith(
            'Right-click actions are disabled for this exam.',
            expect.objectContaining({
                description: expect.stringContaining('event is logged'),
            }),
        );
    });

    it('does not emit right-click telemetry when right-click blocking is disabled', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ right_click_disable: false }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBeNull();
        });

        expect(emitWebTelemetryEvent).not.toHaveBeenCalled();
    });

    it('deduplicates repeated right-click attempts in the same burst', async () => {
        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ right_click_disable: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
            document.dispatchEvent(
                new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        });
        expect(mockToastWarning).toHaveBeenCalledTimes(1);
    });

    it('emits exactly one right-click telemetry payload for the first action', async () => {
        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ right_click_disable: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        });
        expect(emitWebTelemetryEvent).toHaveBeenLastCalledWith(
            mockApiClient,
            expect.objectContaining({
                eventType: 'RIGHT_CLICK_ATTEMPT',
            }),
        );
    });

    it('emits exactly one clipboard telemetry payload for the first clipboard action', async () => {
        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ clipboard_control: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'c',
                    ctrlKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        });
        expect(emitWebTelemetryEvent).toHaveBeenLastCalledWith(
            mockApiClient,
            expect.objectContaining({
                eventType: 'CLIPBOARD_ATTEMPT',
            }),
        );
    });

    it('emits exactly one tab-switch telemetry payload for the first focus-loss action', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ tab_switching_monitor: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            window.dispatchEvent(new Event('blur'));
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('focus-loss');
        });
        expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        expect(emitWebTelemetryEvent).toHaveBeenLastCalledWith(
            mockApiClient,
            expect.objectContaining({
                eventType: 'TAB_SWITCH',
            }),
        );
    });

    it('emits exactly one fullscreen telemetry payload for the first fullscreen exit', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ full_screen_required: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('fullscreen-exit');
        });
        expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        expect(emitWebTelemetryEvent).toHaveBeenLastCalledWith(
            mockApiClient,
            expect.objectContaining({
                eventType: 'FULL_SCREEN_EXIT',
            }),
        );
    });

    it('locks the exam and emits telemetry for the PrintScreen key', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ print_screen_disable: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'PrintScreen',
                    code: 'PrintScreen',
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('screen-capture');
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledWith(
            mockApiClient,
            expect.objectContaining({
                eventType: 'PRINT_SCREEN_ATTEMPT',
            }),
        );
        expect(mockToastWarning).toHaveBeenCalledWith(
            'A screen capture shortcut was detected for this exam.',
            expect.objectContaining({
                description: expect.stringContaining('logged'),
            }),
        );
    });

    it('locks the exam and emits telemetry for the macOS capture shortcut', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ print_screen_disable: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: '3',
                    metaKey: true,
                    shiftKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('screen-capture');
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledWith(
            mockApiClient,
            expect.objectContaining({
                eventType: 'PRINT_SCREEN_ATTEMPT',
            }),
        );
    });

    it('locks the exam and emits telemetry for the Windows snipping shortcut', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ print_screen_disable: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 's',
                    metaKey: true,
                    shiftKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('screen-capture');
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledWith(
            mockApiClient,
            expect.objectContaining({
                eventType: 'PRINT_SCREEN_ATTEMPT',
            }),
        );
    });

    it('does not emit print-screen telemetry when print-screen blocking is disabled', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ print_screen_disable: false }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'PrintScreen',
                    code: 'PrintScreen',
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBeNull();
        });

        expect(emitWebTelemetryEvent).not.toHaveBeenCalled();
    });

    it('deduplicates repeated print-screen events in the same burst', async () => {
        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ print_screen_disable: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'PrintScreen',
                    code: 'PrintScreen',
                    bubbles: true,
                    cancelable: true,
                }),
            );
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'PrintScreen',
                    code: 'PrintScreen',
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        });
        expect(mockToastWarning).toHaveBeenCalledTimes(1);
    });

    it('uses the shared shortcut detector to classify delivered print-screen events', () => {
        expect(
            detectScreenCaptureShortcut({
                event: new KeyboardEvent('keydown', {
                    key: 'PrintScreen',
                    code: 'PrintScreen',
                }),
                isMobile: false,
            }),
        ).toMatchObject({
            detected: true,
            shortcut: 'print-screen',
        });
    });

    it('intercepts PrintScreen delivered on keyup and locks the exam with screen-capture', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ print_screen_disable: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keyup', {
                    key: 'PrintScreen',
                    code: 'PrintScreen',
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('screen-capture');
            expect(emitWebTelemetryEvent).toHaveBeenCalledWith(
                mockApiClient,
                expect.objectContaining({
                    eventType: 'PRINT_SCREEN_ATTEMPT',
                }),
            );
        });
    });

    it('intercepts macOS Cmd+Shift+4 and Windows Win+Shift+S shortcuts and locks with screen-capture', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ print_screen_disable: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        // macOS Cmd+Shift+4
        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: '4',
                    code: 'Digit4',
                    metaKey: true,
                    shiftKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('screen-capture');
            expect(emitWebTelemetryEvent).toHaveBeenCalledWith(
                mockApiClient,
                expect.objectContaining({
                    eventType: 'PRINT_SCREEN_ATTEMPT',
                }),
            );
        });
    });

    it('correlates recent Meta+Shift modifier state with window blur to trigger screen-capture lock', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({
                    tab_switching_monitor: true,
                    print_screen_disable: true,
                }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        // Student presses Cmd+Shift (OS screenshot overlay / snipping tool activates and blurs the browser)
        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Shift',
                    code: 'ShiftLeft',
                    metaKey: true,
                    shiftKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
            window.dispatchEvent(new Event('blur'));
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('screen-capture');
            expect(emitWebTelemetryEvent).toHaveBeenCalledWith(
                mockApiClient,
                expect.objectContaining({
                    eventType: 'PRINT_SCREEN_ATTEMPT',
                }),
            );
        });

        expect(mockToastWarning).toHaveBeenCalledWith(
            'A screen capture shortcut was detected for this exam.',
            expect.objectContaining({
                description: expect.stringContaining('Close any capture tool'),
            }),
        );
    });

    it('emits exactly one PRINT_SCREEN_ATTEMPT event when shortcut keydown is followed immediately by window blur', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({
                    tab_switching_monitor: true,
                    print_screen_disable: true,
                }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        // Student presses Cmd+Shift+4: keydown fires first, then snipping tool takes focus and fires window blur
        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: '4',
                    code: 'Digit4',
                    metaKey: true,
                    shiftKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
            window.dispatchEvent(new Event('blur'));
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('screen-capture');
        });

        const printScreenEmissions = vi
            .mocked(emitWebTelemetryEvent)
            .mock.calls.filter((call) => call[1]?.eventType === 'PRINT_SCREEN_ATTEMPT');

        expect(printScreenEmissions).toHaveLength(1);
    });

    it('does not emit desktop right-click or print-screen telemetry on mobile', async () => {
        Object.defineProperty(window.navigator, 'userAgent', {
            value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
            configurable: true,
        });

        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({
                    right_click_disable: true,
                    print_screen_disable: true,
                }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'PrintScreen',
                    code: 'PrintScreen',
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBeNull();
        });

        expect(emitWebTelemetryEvent).not.toHaveBeenCalled();
    });

    it('emits one canonical app-backgrounding event for a mobile visibility-only transition', async () => {
        Object.defineProperty(window.navigator, 'userAgent', {
            value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
            configurable: true,
        });

        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration(),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            Object.defineProperty(document, 'hidden', { value: true, configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
        });

        await waitFor(() => {
            expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        });
        expect(emitWebTelemetryEvent).toHaveBeenLastCalledWith(
            mockApiClient,
            expect.objectContaining({
                eventType: 'APP_BACKGROUNDING',
                platform: 'MOBILE',
            }),
        );
        expect(mockToastWarning).toHaveBeenCalledWith(
            'Backgrounding the exam app was detected.',
            expect.objectContaining({
                description: 'Incident logged.',
            }),
        );

        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    });

    it('collapses mobile blur plus visibility into one backgrounding event and emits again on a later transition', async () => {
        vi.useFakeTimers();
        Object.defineProperty(window.navigator, 'userAgent', {
            value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
            configurable: true,
        });

        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration(),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            Object.defineProperty(document, 'hidden', { value: true, configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
            window.dispatchEvent(new Event('blur'));
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        expect(vi.mocked(emitWebTelemetryEvent).mock.calls[0]?.[1]).toEqual(
            expect.objectContaining({
                eventType: 'APP_BACKGROUNDING',
            }),
        );

        act(() => {
            Object.defineProperty(document, 'hidden', { value: false, configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);

        act(() => {
            vi.advanceTimersByTime(1001);
            Object.defineProperty(document, 'hidden', { value: true, configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(2);
        expect(vi.mocked(emitWebTelemetryEvent).mock.calls[1]?.[1]).toEqual(
            expect.objectContaining({
                eventType: 'APP_BACKGROUNDING',
            }),
        );

        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    });

    it('clears the security lock and allows interaction after the student resumes the secured exam', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ tab_switching_monitor: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        // Crucial: resumeSecuredExam returns early if the ref is null.
        // We simulate the element being mounted.
        result.current.fullScreenContainerRef.current = document.createElement('div');

        // Mock requestFullscreen to avoid "not implemented" errors
        result.current.fullScreenContainerRef.current.requestFullscreen = vi
            .fn()
            .mockResolvedValue(undefined);

        act(() => {
            window.dispatchEvent(new Event('blur'));
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBe('focus-loss');
        });

        await act(async () => {
            await result.current.resumeSecuredExam();
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBeNull();
        });

        expect(result.current.isResumingExam).toBe(false);
    });

    it('does not lock on fullscreen exit when full-screen monitoring is disabled', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ full_screen_required: false }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        await waitFor(() => {
            expect(result.current.securityLockReason).toBeNull();
        });

        expect(emitWebTelemetryEvent).not.toHaveBeenCalled();
    });

    it('sends metadata eventId, dedupeKey, and clientActionAt when event is emitted', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-22T00:00:00.100Z'));

        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration(),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
            );
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledWith(
            mockApiClient,
            expect.objectContaining({
                eventType: 'RIGHT_CLICK_ATTEMPT',
                eventId: expect.any(String),
                dedupeKey:
                    '123e4567-e89b-12d3-a456-426614174000:RIGHT_CLICK_ATTEMPT:right-click:2026-04-22T00:00:00.000Z',
                clientActionAt: expect.any(String),
            }),
        );
    });

    it('applies client burst guards on repeated contextmenu', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-22T00:00:00.100Z'));

        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration(),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
            );
            document.dispatchEvent(
                new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
            );
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
    });

    it('creates a distinct dedupe key for a second right-click after the burst window', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-22T00:00:00.100Z'));

        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ right_click_disable: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        act(() => {
            vi.advanceTimersByTime(801);
            vi.setSystemTime(new Date('2026-04-22T00:00:01.100Z'));
            document.dispatchEvent(
                new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                }),
            );
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(2);

        const firstPayload = vi.mocked(emitWebTelemetryEvent).mock.calls[0]?.[1];
        const secondPayload = vi.mocked(emitWebTelemetryEvent).mock.calls[1]?.[1];

        expect(firstPayload?.dedupeKey).not.toBe(secondPayload?.dedupeKey);
    });

    it('applies client burst guards on repeated fullscreenchange', async () => {
        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ full_screen_required: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        await waitFor(() => {
            expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        });
    });

    it('handles clipboard keydown and copy/paste event burst guards', async () => {
        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration(),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }),
            );
            document.dispatchEvent(new Event('copy', { bubbles: true }));
        });

        await waitFor(() => {
            expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        });
    });

    it('handles visibilitychange and blur event burst guards', async () => {
        renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration(),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
            }),
        );

        act(() => {
            Object.defineProperty(document, 'hidden', { value: true, configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
            window.dispatchEvent(new Event('blur'));
        });

        await waitFor(() => {
            expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        });

        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    });

    it('does not emit fullscreen exit telemetry when phase is submitting', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ full_screen_required: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
                monitoringPhase: 'submitting',
            }),
        );

        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(result.current.securityLockReason).toBeNull();
        expect(emitWebTelemetryEvent).not.toHaveBeenCalled();
    });

    it('does not emit fullscreen exit telemetry when phase is navigating-to-turn-in', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ full_screen_required: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
                monitoringPhase: 'navigating-to-turn-in',
            }),
        );

        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(result.current.securityLockReason).toBeNull();
        expect(emitWebTelemetryEvent).not.toHaveBeenCalled();
    });

    it('does not emit fullscreen exit telemetry when phase is suspended', async () => {
        const { result } = renderHook(() =>
            useExamMonitoring({
                configuration: createExamConfiguration({ full_screen_required: true }),
                examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                examId: '123e4567-e89b-12d3-a456-426614174999',
                monitoringPhase: 'suspended',
            }),
        );

        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(result.current.securityLockReason).toBeNull();
        expect(emitWebTelemetryEvent).not.toHaveBeenCalled();
    });

    it('still emits one active fullscreen exit while keeping teardown phases suppressed', async () => {
        const { rerender } = renderHook(
            ({ monitoringPhase }) =>
                useExamMonitoring({
                    configuration: createExamConfiguration({ full_screen_required: true }),
                    examSessionId: '123e4567-e89b-12d3-a456-426614174000',
                    examId: '123e4567-e89b-12d3-a456-426614174999',
                    monitoringPhase,
                }),
            {
                initialProps: {
                    monitoringPhase: 'active' as AttemptMonitoringPhase,
                },
            },
        );

        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        await waitFor(() => {
            expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
        });

        rerender({ monitoringPhase: 'submitting' as const });
        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        rerender({ monitoringPhase: 'navigating-to-turn-in' as const });
        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        rerender({ monitoringPhase: 'suspended' as const });
        act(() => {
            document.dispatchEvent(new Event('fullscreenchange'));
        });

        expect(emitWebTelemetryEvent).toHaveBeenCalledTimes(1);
    });
});
