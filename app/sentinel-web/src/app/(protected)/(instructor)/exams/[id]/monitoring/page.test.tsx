import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExamMonitoringPage from './page';

const { mockPush, mockUseMonitoring } = vi.hoisted(() => ({
    mockPush: vi.fn(),
    mockUseMonitoring: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useParams: () => ({ id: 'exam-1' }),
    usePathname: () => '/exams/exam-1/monitoring',
    useRouter: () => ({ push: mockPush }),
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('./_hooks/use-monitoring', () => ({
    useMonitoring: (examId: string) => mockUseMonitoring(examId),
}));

vi.mock('@/features/exams', () => ({
    MonitoringHeader: ({ examTitle, onRefresh }: { examTitle: string; onRefresh: () => void }) => (
        <div>
            <div data-testid="monitoring-header">{examTitle}</div>
            <button type="button" onClick={onRefresh}>
                Refresh Monitoring
            </button>
        </div>
    ),
    MonitoringStats: () => <div data-testid="monitoring-stats" />,
    LockedStudentsPanel: () => <div data-testid="locked-students-panel" />,
    StudentList: ({
        students,
        onSelect,
    }: {
        students: Array<{ id: string; firstName?: string; incidentCount?: number }>;
        onSelect: (student: { id: string }) => void;
    }) => (
        <div>
            {students.map((student) => (
                <div key={student.id}>
                    <span>{student.firstName}</span>
                    <span>{student.incidentCount}</span>
                </div>
            ))}
            <button type="button" onClick={() => onSelect({ id: 'student-1' })}>
                Open Student
            </button>
        </div>
    ),
}));


vi.mock('./_components/runtime-access-dialogs', () => ({
    RuntimeAccessDialogs: () => <div data-testid="runtime-access-dialogs" />,
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('ExamMonitoringPage', () => {
    function mockMonitoringPageState(overrides?: Record<string, unknown>) {
        const refetch = vi.fn();

        mockUseMonitoring.mockReturnValue({
            monitoring: {
                exam: {
                    title: 'Biology Midterm',
                    subject: 'Biology',
                    maxReconnectAttempts: 3,
                },
                stats: {
                    total: 1,
                    active: 1,
                    flagged: 0,
                    submitted: 0,
                },
                lobbyAdmissions: {
                    waiting: 0,
                    approved: 0,
                    inAttempt: 1,
                },
            },
            isLoading: false,
            isFetching: false,
            isError: false,
            filteredStudents: [
                {
                    id: 'student-1',
                    firstName: 'Pat',
                    incidentCount: 1,
                },
            ],
            searchQuery: '',
            filterStatus: 'all',
            page: 1,
            pageSize: 8,
            isUpdatingAccess: false,
            pendingAction: null,
            isReopenDialogOpen: false,
            reopenMinutes: '30',
            overridingStudentId: null,
            setPendingAction: vi.fn(),
            setIsReopenDialogOpen: vi.fn(),
            setReopenMinutes: vi.fn(),
            setPage: vi.fn(),
            handleSearchChange: vi.fn(),
            handleFilterChange: vi.fn(),
            handleConfirmAction: vi.fn(),
            handleSubmitReopen: vi.fn(),
            handleOverrideReconnect: vi.fn(),
            refetch,
            ...overrides,
        });

        return { refetch };
    }

    it('renders in the runtime shell and routes selected students to detail pages', () => {
        mockMonitoringPageState();

        render(<ExamMonitoringPage />);

        expect(screen.getByTestId('monitoring-header')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Open Student' }));

        expect(mockPush).toHaveBeenCalledWith('/exams/exam-1/monitoring/student-1');
    });

    it('passes refreshed incident rows to the list and triggers manual refresh', () => {
        const { refetch } = mockMonitoringPageState();

        render(<ExamMonitoringPage />);

        expect(screen.getByText('Pat')).toBeTruthy();
        expect(screen.getByText('1')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Refresh Monitoring' }));

        expect(refetch).toHaveBeenCalledOnce();
    });
});
