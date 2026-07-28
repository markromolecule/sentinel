import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InstructorLobbyPage from './page';

const {
    mockUseParams,
    mockUseInstructorLobby,
    mockRefreshLobbyAdmissions,
    mockInstructorLobbyPanel,
} = vi.hoisted(() => ({
    mockUseParams: vi.fn(),
    mockUseInstructorLobby: vi.fn(),
    mockRefreshLobbyAdmissions: vi.fn(),
    mockInstructorLobbyPanel: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useParams: () => mockUseParams(),
}));

vi.mock('./_hooks/use-instructor-lobby', () => ({
    useInstructorLobby: (examId: string) => mockUseInstructorLobby(examId),
}));

vi.mock('./_components/instructor-lobby-admission-panel', () => ({
    InstructorLobbyAdmissionPanel: (props: unknown) => {
        mockInstructorLobbyPanel(props);
        return <div data-testid="lobby-admission-panel" />;
    },
}));

function createLobbyHookValue() {
    return {
        lobbyAdmissions: [],
        lobbyAdmissionGroups: {
            waitingStudents: [],
            approvedStudents: [],
            rejectedStudents: [],
            inAttemptStudents: [],
        },
        searchTerm: '',
        setSearchTerm: vi.fn(),
        statusFilter: 'all',
        setStatusFilter: vi.fn(),
        isUpdatingLobbyAdmissions: false,
        overridingStudentId: null,
        refreshLobbyAdmissions: mockRefreshLobbyAdmissions,
        handleUpdateLobbyAdmissions: vi.fn(),
        handleOverrideReconnect: vi.fn(),
    };
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('InstructorLobbyPage', () => {
    it('renders the lobby header without the old Lobby and Monitoring tabs', () => {
        mockUseParams.mockReturnValue({ id: 'exam-1' });
        mockUseInstructorLobby.mockReturnValue(createLobbyHookValue());

        render(<InstructorLobbyPage />);

        expect(screen.getByRole('heading', { name: 'Exam Lobby' })).toBeTruthy();
        expect(
            screen.getByText('Manage real-time student admissions and active attempts.'),
        ).toBeTruthy();
        expect(screen.queryByRole('link', { name: 'Lobby' })).toBeNull();
        expect(screen.queryByRole('link', { name: 'Monitoring' })).toBeNull();
        expect(screen.getByTestId('lobby-admission-panel')).toBeTruthy();
    });

    it('refreshes lobby admissions from the header action', () => {
        mockUseParams.mockReturnValue({ id: 'exam-1' });
        mockUseInstructorLobby.mockReturnValue(createLobbyHookValue());

        render(<InstructorLobbyPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Refresh Lobby' }));

        expect(mockRefreshLobbyAdmissions).toHaveBeenCalledTimes(1);
    });

    it('forwards override props to the admission panel', () => {
        mockUseParams.mockReturnValue({ id: 'exam-1' });
        const hookValue = createLobbyHookValue();
        hookValue.overridingStudentId = 'student-1';
        mockUseInstructorLobby.mockReturnValue(hookValue);

        render(<InstructorLobbyPage />);

        expect(mockInstructorLobbyPanel).toHaveBeenCalledWith(
            expect.objectContaining({
                overridingStudentId: 'student-1',
                onOverrideReconnect: hookValue.handleOverrideReconnect,
            }),
        );
    });
});
