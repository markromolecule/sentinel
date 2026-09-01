import type { ExamLobbyWaitingStudent } from '@sentinel/services';

export type LobbyAdmissionStatusFilter =
    | 'all'
    | 'waiting'
    | 'approved'
    | 'inAttempt'
    | 'submitted'
    | 'rejected';

export type LobbyAdmissionGroups = {
    waitingStudents: ExamLobbyWaitingStudent[];
    approvedStudents: ExamLobbyWaitingStudent[];
    inAttemptStudents: ExamLobbyWaitingStudent[];
    submittedStudents: ExamLobbyWaitingStudent[];
    rejectedStudents?: ExamLobbyWaitingStudent[];
};

type FilterLobbyAdmissionsArgs = {
    query: string;
    statusFilter: LobbyAdmissionStatusFilter;
};

function isSubmittedAttempt(student: ExamLobbyWaitingStudent): boolean {
    return student.attemptStatus === 'SUBMITTED' || student.attemptStatus === 'COMPLETED';
}

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
            (student) =>
                student.status === 'APPROVED' &&
                !student.hasActiveAttempt &&
                !isSubmittedAttempt(student),
        ),
        inAttemptStudents: admissions.filter(
            (student) => student.hasActiveAttempt && student.status === 'APPROVED',
        ),
        submittedStudents: admissions.filter((student) => isSubmittedAttempt(student)),
        rejectedStudents: admissions.filter(
            (student) => student.status === 'REJECTED' && !student.hasActiveAttempt,
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
                return (
                    student.status === 'APPROVED' &&
                    !student.hasActiveAttempt &&
                    !isSubmittedAttempt(student)
                );
            case 'inAttempt':
                return student.hasActiveAttempt && student.status === 'APPROVED';
            case 'submitted':
                return isSubmittedAttempt(student);
            case 'rejected':
                return student.status === 'REJECTED' && !student.hasActiveAttempt;
            case 'all':
            default:
                return true;
        }
    });
}

