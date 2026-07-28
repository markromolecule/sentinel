import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExamLobbyWaitingStudent } from '@sentinel/services';
import { getLobbyAdmissionGroups } from '../_lib/lobby-admission-filters';
import { InstructorLobbyAdmissionPanel } from './instructor-lobby-admission-panel';

function createAdmission(overrides: Partial<ExamLobbyWaitingStudent>): ExamLobbyWaitingStudent {
    return {
        admissionId: overrides.admissionId ?? 'admission-1',
        studentId: overrides.studentId ?? 'student-1',
        studentName: overrides.studentName ?? 'Pat Student',
        studentNumber: overrides.studentNumber ?? '2026-001',
        status: overrides.status ?? 'WAITING',
        checkedInAt: overrides.checkedInAt ?? null,
        decidedAt: overrides.decidedAt ?? null,
        hasActiveAttempt: overrides.hasActiveAttempt ?? false,
        attemptStatus: overrides.attemptStatus ?? null,
        reconnectCount: overrides.reconnectCount ?? 0,
        maxReconnectAttempts: overrides.maxReconnectAttempts ?? 3,
    };
}

const admissions = [
    createAdmission({
        admissionId: 'waiting-1',
        studentId: 'student-1',
        studentName: 'Pat Student',
        status: 'WAITING',
    }),
    createAdmission({
        admissionId: 'waiting-2',
        studentId: 'student-2',
        studentName: 'Alex Waiting',
        status: 'WAITING',
    }),
    createAdmission({
        admissionId: 'approved-1',
        studentId: 'student-3',
        studentName: 'Casey Approved',
        status: 'APPROVED',
    }),
    createAdmission({
        admissionId: 'attempt-1',
        studentId: 'student-4',
        studentName: 'Riley Active',
        status: 'APPROVED',
        hasActiveAttempt: true,
        attemptStatus: 'IN_PROGRESS',
    }),
    createAdmission({
        admissionId: 'rejected-1',
        studentId: 'student-5',
        studentName: 'Jordan Rejected',
        status: 'REJECTED',
    }),
];

function renderPanel(overrides?: {
    admissions?: ExamLobbyWaitingStudent[];
    searchTerm?: string;
    statusFilter?: 'all' | 'waiting' | 'approved' | 'rejected' | 'inAttempt';
    onSearchChange?: (value: string) => void;
    onStatusFilterChange?: (
        value: 'all' | 'waiting' | 'approved' | 'rejected' | 'inAttempt',
    ) => void;
    onUpdateLobbyAdmissions?: (
        studentIds: string[],
        status: 'APPROVED' | 'REJECTED',
    ) => Promise<void>;
}) {
    const sourceAdmissions = overrides?.admissions ?? admissions;
    const groups = getLobbyAdmissionGroups(sourceAdmissions);

    return render(
        <InstructorLobbyAdmissionPanel
            lobbyAdmissionGroups={groups}
            searchTerm={overrides?.searchTerm ?? ''}
            onSearchChange={overrides?.onSearchChange ?? vi.fn()}
            statusFilter={overrides?.statusFilter ?? 'all'}
            onStatusFilterChange={overrides?.onStatusFilterChange ?? vi.fn()}
            isUpdatingLobbyAdmissions={false}
            onUpdateLobbyAdmissions={overrides?.onUpdateLobbyAdmissions ?? vi.fn()}
        />,
    );
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('InstructorLobbyAdmissionPanel', () => {
    it('renders queue counts for waiting, approved, in-attempt, and rejected students', () => {
        renderPanel();

        expect(screen.getAllByText('Waiting').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);
        expect(screen.getAllByText('In Attempt').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Rejected').length).toBeGreaterThan(0);
        expect(screen.getAllByText('2').length).toBeGreaterThan(0);
        expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(3);
    });

    it('calls onSearchChange when typing in the search input', () => {
        const onSearchChange = vi.fn();
        renderPanel({ onSearchChange });

        fireEvent.change(screen.getByLabelText('Search lobby students'), {
            target: { value: 'pat' },
        });

        expect(onSearchChange).toHaveBeenCalledWith('pat');
    });

    it('calls onStatusFilterChange when selecting a status filter', () => {
        const onStatusFilterChange = vi.fn();
        renderPanel({ onStatusFilterChange });

        fireEvent.change(screen.getByLabelText('Filter lobby status'), {
            target: { value: 'approved' },
        });

        expect(onStatusFilterChange).toHaveBeenCalledWith('approved');
    });

    it('admits all currently visible waiting students', () => {
        const onUpdateLobbyAdmissions = vi.fn().mockResolvedValue(undefined);
        renderPanel({ onUpdateLobbyAdmissions });

        fireEvent.click(screen.getByRole('button', { name: 'Admit All' }));

        expect(onUpdateLobbyAdmissions).toHaveBeenCalledWith(
            ['student-1', 'student-2'],
            'APPROVED',
        );
    });

    it('submits individual admit and reject actions for a waiting student', () => {
        const onUpdateLobbyAdmissions = vi.fn().mockResolvedValue(undefined);
        renderPanel({
            admissions: [admissions[0]],
            onUpdateLobbyAdmissions,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Admit' }));
        fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

        expect(onUpdateLobbyAdmissions).toHaveBeenNthCalledWith(1, ['student-1'], 'APPROVED');
        expect(onUpdateLobbyAdmissions).toHaveBeenNthCalledWith(2, ['student-1'], 'REJECTED');
    });

    it('renders empty queues without fixed desktop height assumptions', () => {
        const { container } = renderPanel({ admissions: [] });

        expect(screen.getByText('No students waiting.')).toBeTruthy();
        expect(screen.getByText('No approved students waiting.')).toBeTruthy();
        expect(screen.getByText('No active attempts yet.')).toBeTruthy();
        expect(screen.getByText('No rejected admissions.')).toBeTruthy();
        expect(container.firstElementChild?.className).not.toContain('h-[700px]');
    });
});
