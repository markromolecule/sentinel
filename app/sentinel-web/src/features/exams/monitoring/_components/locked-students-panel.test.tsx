import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { LockedStudentsPanel } from './locked-students-panel';
import type { StudentSession } from '@sentinel/shared/types';

const mockAuthorizeMutateAsync = vi.fn();
const mockReopenMutateAsync = vi.fn();
const mockOverrideMutateAsync = vi.fn();

vi.mock('@sentinel/hooks', () => ({
    useAuthorizeStudentReentryMutation: () => ({
        mutateAsync: mockAuthorizeMutateAsync,
    }),
    useReopenExamAttemptMutation: () => ({
        mutateAsync: mockReopenMutateAsync,
    }),
    useOverrideReconnectLimitMutation: () => ({
        mutateAsync: mockOverrideMutateAsync,
    }),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

function createStudent(overrides?: Partial<StudentSession>): StudentSession {
    return {
        id: 'user-1',
        attemptId: 'attempt-1',
        studentRecordId: 'student-record-1',
        studentNo: '2026-001',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        avatarUrl: null,
        roomName: 'Main Room',
        startTime: '2026-09-03T10:00:00.000Z',
        lastActiveTime: '2026-09-03T10:30:00.000Z',
        status: 'in_progress',
        progress: 50,
        currentSectionId: 'sec-1',
        currentSectionTitle: 'Section 1',
        answersCount: 10,
        totalQuestions: 20,
        reconnectCount: 0,
        lifecycleState: 'IN_PROGRESS',
        incidentCount: 0,
        openIncidentCount: 0,
        latestIncidentType: null,
        lastActivity: 'Now',
        ...overrides,
    };
}

describe('LockedStudentsPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('returns null when no students are locked or reconnect-limited', () => {
        const { container } = render(
            <LockedStudentsPanel
                examId="exam-1"
                students={[createStudent()]}
                maxReconnectAttempts={3}
            />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders Authorize Re-entry button and triggers mutation for locked student', async () => {
        mockAuthorizeMutateAsync.mockResolvedValue(undefined);
        const lockedStudent = createStudent({
            id: 'user-2',
            studentRecordId: 'student-record-2',
            lifecycleState: 'LOCKED',
        });

        render(
            <LockedStudentsPanel
                examId="exam-1"
                students={[lockedStudent]}
                maxReconnectAttempts={3}
            />,
        );

        expect(screen.getByText('Locked & Reconnect-Limited Students (1)')).toBeTruthy();
        expect(screen.getByText('Locked')).toBeTruthy();

        const authorizeButton = screen.getByRole('button', { name: /authorize re-entry/i });
        fireEvent.click(authorizeButton);

        expect(mockAuthorizeMutateAsync).toHaveBeenCalledWith({
            id: 'exam-1',
            studentId: 'student-record-2',
            reason: '1-click re-entry authorization granted by instructor.',
        });
    });

    it('renders Authorize Re-entry button for student with reconnects reached in zero-reconnect mode', async () => {
        mockAuthorizeMutateAsync.mockResolvedValue(undefined);
        const limitedStudent = createStudent({
            id: 'user-3',
            studentRecordId: 'student-record-3',
            reconnectCount: 1,
            lifecycleState: 'IN_PROGRESS',
        });

        render(
            <LockedStudentsPanel
                examId="exam-1"
                students={[limitedStudent]}
                maxReconnectAttempts={0}
            />,
        );

        expect(screen.getByText('Locked & Reconnect-Limited Students (1)')).toBeTruthy();
        expect(screen.getByText('Limit Reached')).toBeTruthy();

        const authorizeButton = screen.getByRole('button', { name: /authorize re-entry/i });
        fireEvent.click(authorizeButton);

        expect(mockAuthorizeMutateAsync).toHaveBeenCalledWith({
            id: 'exam-1',
            studentId: 'student-record-3',
            reason: '1-click re-entry authorization granted by instructor.',
        });
    });
});
