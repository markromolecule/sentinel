import { cleanup, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StudentMonitoringPage from './page';
import type { UseMonitoringRealtimeArgs, StudentProgressPayload, StudentSubmittedPayload } from '@sentinel/hooks';

const {
    mockUseParams,
    mockUseExamMonitoringStudentQuery,
    mockUseMonitoringRealtime,
} = vi.hoisted(() => ({
    mockUseParams: vi.fn(),
    mockUseExamMonitoringStudentQuery: vi.fn(),
    mockUseMonitoringRealtime: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useParams: () => mockUseParams(),
}));

vi.mock('@sentinel/hooks', () => ({
    useExamMonitoringStudentQuery: (examId: string, studentId: string) =>
        mockUseExamMonitoringStudentQuery(examId, studentId),
    useMonitoringRealtime: (args: UseMonitoringRealtimeArgs) =>
        mockUseMonitoringRealtime(args),
}));

vi.mock('@/features/exams/monitoring/_components/student-monitoring-detail', () => ({
    StudentMonitoringDetail: ({
        student,
        examId,
        onRefresh,
    }: {
        student: { id: string; firstName: string; progress: number; status: string };
        examId: string;
        onRefresh: () => void;
    }) => (
        <div data-testid="student-monitoring-detail">
            <span data-testid="student-name">{student.firstName}</span>
            <span data-testid="student-progress">{student.progress}%</span>
            <span data-testid="student-status">{student.status}</span>
            <span data-testid="exam-id">{examId}</span>
            <button type="button" onClick={onRefresh}>
                Refresh Detail
            </button>
        </div>
    ),
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('StudentMonitoringPage', () => {
    const mockStudent = {
        id: 'student-user-1',
        studentRecordId: 'student-rec-1',
        firstName: 'Jane',
        lastName: 'Doe',
        studentNo: 'STU-001',
        status: 'active' as const,
        progress: 25,
        attemptId: 'attempt-1',
        deviceStatus: 'HEALTHY' as const,
        lastActivity: '2 minutes ago',
    };

    it('renders loading spinner when query is loading', () => {
        mockUseParams.mockReturnValue({ id: 'exam-1', studentId: 'student-user-1' });
        mockUseExamMonitoringStudentQuery.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
            isFetching: false,
            refetch: vi.fn(),
        });

        const { container } = render(<StudentMonitoringPage />);
        expect(container.querySelector('.animate-spin, svg')).toBeTruthy();
    });

    it('renders Student Not Found when query returns error or empty', () => {
        mockUseParams.mockReturnValue({ id: 'exam-1', studentId: 'student-user-1' });
        mockUseExamMonitoringStudentQuery.mockReturnValue({
            data: null,
            isLoading: false,
            isError: true,
            isFetching: false,
            refetch: vi.fn(),
        });

        render(<StudentMonitoringPage />);
        expect(screen.getByText('Student Not Found')).toBeTruthy();
    });

    it('subscribes to realtime updates and updates progress live when receiving broadcast', () => {
        mockUseParams.mockReturnValue({ id: 'exam-1', studentId: 'student-user-1' });
        mockUseExamMonitoringStudentQuery.mockReturnValue({
            data: mockStudent,
            isLoading: false,
            isError: false,
            isFetching: false,
            refetch: vi.fn(),
        });

        let realtimeArgs: UseMonitoringRealtimeArgs | null = null;
        mockUseMonitoringRealtime.mockImplementation((args: UseMonitoringRealtimeArgs) => {
            realtimeArgs = args;
        });

        render(<StudentMonitoringPage />);

        expect(screen.getByTestId('student-progress').textContent).toBe('25%');
        expect(screen.getByTestId('student-status').textContent).toBe('active');
        expect(realtimeArgs).not.toBeNull();
        expect(realtimeArgs!.examId).toBe('exam-1');

        // Receive student:progress broadcast for this student
        act(() => {
            realtimeArgs!.onProgressUpdate?.({
                studentId: 'student-user-1',
                answeredCount: 3,
                totalQuestions: 4,
                progress: 75,
            });
        });

        // Instant update to 75%
        expect(screen.getByTestId('student-progress').textContent).toBe('75%');
    });

    it('updates progress to 100% and status to submitted upon receiving student:submitted broadcast', () => {
        mockUseParams.mockReturnValue({ id: 'exam-1', studentId: 'student-user-1' });
        mockUseExamMonitoringStudentQuery.mockReturnValue({
            data: mockStudent,
            isLoading: false,
            isError: false,
            isFetching: false,
            refetch: vi.fn(),
        });

        let realtimeArgs: UseMonitoringRealtimeArgs | null = null;
        mockUseMonitoringRealtime.mockImplementation((args: UseMonitoringRealtimeArgs) => {
            realtimeArgs = args;
        });

        render(<StudentMonitoringPage />);

        // Receive student:submitted broadcast
        act(() => {
            realtimeArgs!.onStudentSubmitted?.({
                studentId: 'student-rec-1',
                submittedAt: new Date().toISOString(),
            });
        });

        expect(screen.getByTestId('student-progress').textContent).toBe('100%');
        expect(screen.getByTestId('student-status').textContent).toBe('submitted');
    });

    it('ignores broadcast events for other students', () => {
        mockUseParams.mockReturnValue({ id: 'exam-1', studentId: 'student-user-1' });
        mockUseExamMonitoringStudentQuery.mockReturnValue({
            data: mockStudent,
            isLoading: false,
            isError: false,
            isFetching: false,
            refetch: vi.fn(),
        });

        let realtimeArgs: UseMonitoringRealtimeArgs | null = null;
        mockUseMonitoringRealtime.mockImplementation((args: UseMonitoringRealtimeArgs) => {
            realtimeArgs = args;
        });

        render(<StudentMonitoringPage />);

        // Receive progress for a different student
        act(() => {
            realtimeArgs!.onProgressUpdate?.({
                studentId: 'other-student-id',
                answeredCount: 4,
                totalQuestions: 4,
                progress: 100,
            });
        });

        // Progress should stay 25%
        expect(screen.getByTestId('student-progress').textContent).toBe('25%');
    });
});
