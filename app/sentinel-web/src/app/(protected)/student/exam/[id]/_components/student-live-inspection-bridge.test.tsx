'use client';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudentLiveInspectionBridge } from './student-live-inspection-bridge';

const { mockPublisher } = vi.hoisted(() => ({
    mockPublisher: vi.fn(),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => vi.fn(),
    useAuth: () => ({ supabase: { channel: vi.fn(), removeChannel: vi.fn() } }),
    useStudentLiveInspectionPublisher: (args: unknown) => mockPublisher(args),
}));

vi.mock('./student-exam-mediapipe-provider', () => ({
    useStudentExamMediaPipeStream: () => ({
        getLiveVideoTrack: vi.fn(),
    }),
}));

describe('StudentLiveInspectionBridge', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders the student indicator only while publication is live', () => {
        mockPublisher.mockReturnValue({ isLive: true, status: 'live', activeLeaseId: 'lease-1' });

        render(
            <StudentLiveInspectionBridge
                sessionId="session-1"
                attemptId="attempt-1"
                enabled={true}
            />,
        );

        expect(screen.getByText('Camera being viewed live by an authorized proctor')).toBeTruthy();
        expect(screen.getByTestId('live-inspection-status').className).toContain(
            'pointer-events-none',
        );
        expect(screen.getByTestId('live-inspection-status').className).toContain(
            'bottom-[calc(env(safe-area-inset-bottom)+10rem)]',
        );
        expect(screen.getByTestId('live-inspection-status').className).toContain(
            'sm:bottom-[calc(env(safe-area-inset-bottom)+7rem)]',
        );
    });

    it('stays silent during request/connect states and forwards eligibility inputs', () => {
        mockPublisher.mockReturnValue({
            isLive: false,
            status: 'connecting',
            activeLeaseId: 'lease-1',
        });

        render(
            <StudentLiveInspectionBridge
                sessionId="session-1"
                attemptId="attempt-1"
                enabled={false}
            />,
        );

        expect(screen.queryByText('Camera being viewed live by an authorized proctor')).toBeNull();
        expect(mockPublisher).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: 'session-1',
                attemptId: 'attempt-1',
                enabled: false,
            }),
        );
    });
});
