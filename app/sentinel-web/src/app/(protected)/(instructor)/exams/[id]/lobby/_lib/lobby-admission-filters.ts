import type { ExamLobbyWaitingStudent } from '@sentinel/services';

export type LobbyAdmissionStatusFilter = 'all' | 'waiting' | 'approved' | 'rejected' | 'inAttempt';

export type LobbyAdmissionGroups = {
    waitingStudents: ExamLobbyWaitingStudent[];
    approvedStudents: ExamLobbyWaitingStudent[];
    rejectedStudents: ExamLobbyWaitingStudent[];
    inAttemptStudents: ExamLobbyWaitingStudent[];
};

type FilterLobbyAdmissionsArgs = {
    query: string;
    statusFilter: LobbyAdmissionStatusFilter;
};

/**
 * getLobbyAdmissionGroups partitions lobby admissions into the queues shown to instructors.
 *
 * @param admissions - Lobby admission records returned by the exam lobby API.
 */
export function getLobbyAdmissionGroups(
    admissions: ExamLobbyWaitingStudent[],
): LobbyAdmissionGroups {
    return {
        waitingStudents: admissions.filter((student) => student.status === 'WAITING'),
        approvedStudents: admissions.filter(
            (student) => student.status === 'APPROVED' && !student.hasActiveAttempt,
        ),
        rejectedStudents: admissions.filter(
            (student) => student.status === 'REJECTED' && !student.hasActiveAttempt,
        ),
        inAttemptStudents: admissions.filter(
            (student) => student.hasActiveAttempt && student.status === 'APPROVED',
        ),
    };
}

/**
 * filterLobbyAdmissions applies instructor search and status filters to lobby admissions.
 *
 * @param admissions - Lobby admission records returned by the exam lobby API.
 * @param args - Search query and selected status filter.
 */
export function filterLobbyAdmissions(
    admissions: ExamLobbyWaitingStudent[],
    args: FilterLobbyAdmissionsArgs,
) {
    const normalizedQuery = args.query.trim().toLowerCase();

    return admissions.filter((student) => {
        const matchesQuery =
            normalizedQuery.length === 0 ||
            student.studentName.toLowerCase().includes(normalizedQuery) ||
            (student.studentNumber ?? '').toLowerCase().includes(normalizedQuery);

        if (!matchesQuery) {
            return false;
        }

        switch (args.statusFilter) {
            case 'waiting':
                return student.status === 'WAITING';
            case 'approved':
                return student.status === 'APPROVED' && !student.hasActiveAttempt;
            case 'rejected':
                return student.status === 'REJECTED' && !student.hasActiveAttempt;
            case 'inAttempt':
                return student.hasActiveAttempt && student.status === 'APPROVED';
            case 'all':
            default:
                return true;
        }
    });
}
