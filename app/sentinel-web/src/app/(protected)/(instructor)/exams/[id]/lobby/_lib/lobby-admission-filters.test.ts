import { describe, expect, it } from 'vitest';
import type { ExamLobbyWaitingStudent } from '@sentinel/services';
import { filterLobbyAdmissions, getLobbyAdmissionGroups } from './lobby-admission-filters';

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

const admissions: ExamLobbyWaitingStudent[] = [
    createAdmission({
        admissionId: 'waiting-1',
        studentId: 'student-1',
        studentName: 'Pat Student',
        studentNumber: '2026-001',
        status: 'WAITING',
    }),
    createAdmission({
        admissionId: 'approved-1',
        studentId: 'student-2',
        studentName: 'Alex Learner',
        studentNumber: '2026-002',
        status: 'APPROVED',
    }),
    createAdmission({
        admissionId: 'rejected-1',
        studentId: 'student-3',
        studentName: 'Casey Returned',
        studentNumber: '2026-003',
        status: 'REJECTED',
    }),
    createAdmission({
        admissionId: 'waiting-active-1',
        studentId: 'student-5',
        studentName: 'Taylor Reconnect',
        studentNumber: '2026-005',
        status: 'WAITING',
        hasActiveAttempt: true,
        attemptStatus: 'IN_PROGRESS',
        reconnectCount: 3,
    }),
    createAdmission({
        admissionId: 'attempt-1',
        studentId: 'student-4',
        studentName: 'Riley Active',
        studentNumber: '2026-004',
        status: 'APPROVED',
        hasActiveAttempt: true,
        attemptStatus: 'IN_PROGRESS',
    }),
];

describe('getLobbyAdmissionGroups', () => {
    it('groups waiting, approved, rejected, and active-attempt students', () => {
        const groups = getLobbyAdmissionGroups(admissions);

        expect(groups.waitingStudents.map((student) => student.studentId)).toEqual([
            'student-1',
            'student-5',
        ]);
        expect(groups.approvedStudents.map((student) => student.studentId)).toEqual(['student-2']);
        expect(groups.rejectedStudents.map((student) => student.studentId)).toEqual(['student-3']);
        expect(groups.inAttemptStudents.map((student) => student.studentId)).toEqual(['student-4']);
    });
});

describe('filterLobbyAdmissions', () => {
    it('filters by student name', () => {
        const filteredAdmissions = filterLobbyAdmissions(admissions, {
            query: 'alex',
            statusFilter: 'all',
        });

        expect(filteredAdmissions.map((student) => student.studentId)).toEqual(['student-2']);
    });

    it('filters by student number', () => {
        const filteredAdmissions = filterLobbyAdmissions(admissions, {
            query: '2026-003',
            statusFilter: 'all',
        });

        expect(filteredAdmissions.map((student) => student.studentId)).toEqual(['student-3']);
    });

    it.each([
        ['all', ['student-1', 'student-2', 'student-3', 'student-5', 'student-4']],
        ['waiting', ['student-1', 'student-5']],
        ['approved', ['student-2']],
        ['rejected', ['student-3']],
        ['inAttempt', ['student-4']],
    ] as const)('filters %s status admissions', (statusFilter, expectedIds) => {
        const filteredAdmissions = filterLobbyAdmissions(admissions, {
            query: '',
            statusFilter,
        });

        expect(filteredAdmissions.map((student) => student.studentId)).toEqual(expectedIds);
    });
});
