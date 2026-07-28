'use client';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentExamPrivacyPage from './page';

const {
    mockRouterPush,
    mockPatchStoredStudentExamFlow,
    mockReadStoredStudentExamFlow,
    mockStudentExamData,
} = vi.hoisted(() => ({
    mockRouterPush: vi.fn(),
    mockPatchStoredStudentExamFlow: vi.fn(),
    mockReadStoredStudentExamFlow: vi.fn(),
    mockStudentExamData: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockRouterPush,
    }),
}));

vi.mock('../_components/student-exam-loading-state', () => ({
    StudentExamLoadingState: () => <div>Loading...</div>,
}));

vi.mock('../_components/student-flow-shell', () => ({
    StudentFlowShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../_hooks/use-student-exam-stage-guard', () => ({
    useStudentExamStageGuard: () => {
        const data = mockStudentExamData();
        return {
            ...data,
            isResolving: data?.isLoading ?? false,
            resolution: {
                targetStage: 'privacy',
                reasonCode: 'PRIVACY_REQUIRED',
                shouldRedirect: false,
            },
            storedFlow: { privacyAccepted: false, checkupCompleted: false },
        };
    },
}));

vi.mock('../_hooks/use-turned-in-exam-redirect', () => ({
    useTurnedInExamRedirect: () => false,
}));

vi.mock('../_lib/student-exam-flow', async () => {
    const actual = await vi.importActual<typeof import('../_lib/student-exam-flow')>(
        '../_lib/student-exam-flow',
    );

    return {
        ...actual,
        buildStudentExamHref: (examId: string, step: string) => `/student/exam/${examId}/${step}`,
        patchStoredStudentExamFlow: mockPatchStoredStudentExamFlow,
        readStoredStudentExamFlow: mockReadStoredStudentExamFlow,
    };
});

vi.mock('@sentinel/ui', async () => {
    const actual = await vi.importActual<typeof import('@sentinel/ui')>('@sentinel/ui');

    return {
        ...actual,
        Checkbox: ({
            id,
            checked,
            onCheckedChange,
        }: {
            id: string;
            checked?: boolean;
            onCheckedChange?: (checked: boolean) => void;
        }) => (
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(event) => onCheckedChange?.(event.target.checked)}
            />
        ),
        Label: ({
            children,
            htmlFor,
            className,
        }: {
            children: ReactNode;
            htmlFor: string;
            className?: string;
        }) => (
            <label htmlFor={htmlFor} className={className}>
                {children}
            </label>
        ),
    };
});

describe('StudentExamPrivacyPage', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders the streamlined privacy layout and keeps continue disabled until consent', () => {
        mockReadStoredStudentExamFlow.mockReturnValue({
            privacyAccepted: false,
        });
        mockStudentExamData.mockReturnValue({
            examId: 'exam-1',
            blockedState: {
                isBlocked: false,
            },
            exam: {
                status: 'published',
                attemptId: null,
                runtimeAccess: null,
            },
            configuration: {
                cameraRequired: true,
                aiRules: {
                    gaze_tracking: true,
                    face_detection: true,
                },
                micRequired: true,
                webSecurity: {
                    full_screen_required: true,
                },
            },
            isLoading: false,
        });

        render(<StudentExamPrivacyPage />);

        expect(screen.getByText('Step 2 of 4')).toBeTruthy();
        expect(screen.getByText('Monitored signals')).toBeTruthy();
        expect(screen.getByText('Authorized Live Camera Inspection')).toBeTruthy();
        expect(screen.getByText('Flagged Frame Evidence')).toBeTruthy();
        expect(
            screen.getByText(/does not enable microphone publishing or recording/i),
        ).toBeTruthy();
        expect(
            screen.getByText(/capture one frame for reviewer context, retain it for up to seven days/i),
        ).toBeTruthy();
        expect(screen.queryByText('What this means')).toBeNull();
        expect(screen.getByText('Policies & terms')).toBeTruthy();
        expect(screen.getByText('RA 10173 compliance')).toBeTruthy();
        expect(screen.queryByText('RA 10173')).toBeNull();
        const continueButton = screen.getByRole('button', { name: /continue to checkup/i });
        expect((continueButton as HTMLButtonElement).disabled).toBe(true);
    });

    it('persists consent and enables the continue action', () => {
        mockReadStoredStudentExamFlow.mockReturnValue({
            privacyAccepted: false,
        });
        mockStudentExamData.mockReturnValue({
            examId: 'exam-1',
            blockedState: {
                isBlocked: false,
            },
            exam: {
                status: 'published',
                attemptId: null,
                runtimeAccess: null,
            },
            configuration: {
                aiRules: {
                    gaze_tracking: false,
                    face_detection: false,
                },
                micRequired: false,
                webSecurity: {
                    full_screen_required: false,
                },
            },
            isLoading: false,
        });

        render(<StudentExamPrivacyPage />);

        fireEvent.click(screen.getByLabelText(/i agree to this exam's/i));

        expect(mockPatchStoredStudentExamFlow).toHaveBeenCalledWith('exam-1', {
            privacyAccepted: true,
        });
        const continueButton = screen.getByRole('button', { name: /continue to checkup/i });
        expect((continueButton as HTMLButtonElement).disabled).toBe(false);
    });

    it('explains that frame evidence is disabled when camera monitoring is not required', () => {
        mockReadStoredStudentExamFlow.mockReturnValue({
            privacyAccepted: false,
        });
        mockStudentExamData.mockReturnValue({
            examId: 'exam-1',
            blockedState: {
                isBlocked: false,
            },
            exam: {
                status: 'published',
                attemptId: null,
                runtimeAccess: null,
            },
            configuration: {
                cameraRequired: false,
                aiRules: {
                    gaze_tracking: false,
                    face_detection: false,
                },
                micRequired: false,
                webSecurity: {
                    full_screen_required: false,
                },
            },
            isLoading: false,
        });

        render(<StudentExamPrivacyPage />);

        expect(
            screen.getByText(/automatic frame capture is inactive unless this exam enables a reviewable camera rule/i),
        ).toBeTruthy();
    });

    it('shows the lifecycle block message and removes the checkup CTA when the exam is closed', () => {
        mockReadStoredStudentExamFlow.mockReturnValue({
            privacyAccepted: false,
        });
        mockStudentExamData.mockReturnValue({
            examId: 'exam-1',
            blockedState: {
                isBlocked: true,
                title: 'Exam Closed',
                message: 'This exam has been closed.',
            },
            exam: null,
            configuration: {
                aiRules: {
                    gaze_tracking: true,
                    face_detection: true,
                },
                micRequired: true,
                webSecurity: {
                    full_screen_required: true,
                },
            },
            isLoading: false,
        });

        render(<StudentExamPrivacyPage />);

        expect(screen.getByText('Exam Closed')).toBeTruthy();
        expect(screen.getByText('This exam has been closed.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /continue to checkup/i })).toBeNull();
    });

    it('invalidates downstream checkup and calibration state when consent is revoked', () => {
        mockReadStoredStudentExamFlow.mockReturnValue({
            privacyAccepted: true,
        });
        mockStudentExamData.mockReturnValue({
            examId: 'exam-1',
            blockedState: { isBlocked: false },
            configuration: { aiRules: {}, webSecurity: {} },
            isLoading: false,
        });

        render(<StudentExamPrivacyPage />);

        fireEvent.click(screen.getByLabelText(/i agree to this exam's/i));

        expect(mockPatchStoredStudentExamFlow).toHaveBeenCalledWith('exam-1', {
            privacyAccepted: false,
            checkupCompleted: false,
            mediaPipeActivatedAt: null,
            mediaPipeCalibrationCompletedAt: null,
            mediaPipeActivationSource: null,
            mediaPipeCalibrationProfile: null,
        });
    });
});
