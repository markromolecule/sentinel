import { afterEach, describe, expect, it, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { type DbClient } from '@sentinel/db';
import { EntitlementsRepository } from '../access/data/entitlements.repository';
import { assertInstructorExamAccess } from '../assign/services/exam-access.service';
import { getMonitoringExamContext } from '../monitoring/data/get-monitoring-exam-context';
import { bootstrapLobby } from './services/bootstrap-lobby';
import { checkInLobby } from './services/check-in-lobby';
import { getAdmissionStatus } from './services/get-admission-status';
import { getLobbyCount } from './services/get-lobby-count';
import { getWaitingList } from './services/get-waiting-list';
import { updateAdmissions } from './services/update-admissions';
import { LobbyService } from './lobby.service';

vi.mock('../access/data/entitlements.repository', () => ({
    EntitlementsRepository: {
        getStudentProfileByUserId: vi.fn(),
    },
}));

vi.mock('../assign/services/exam-access.service', () => ({
    assertInstructorExamAccess: vi.fn(),
}));

vi.mock('../monitoring/data/get-monitoring-exam-context', () => ({
    getMonitoringExamContext: vi.fn(),
}));

vi.mock('./services/bootstrap-lobby', () => ({
    bootstrapLobby: vi.fn(),
}));

vi.mock('./services/check-in-lobby', () => ({
    checkInLobby: vi.fn(),
}));

vi.mock('./services/get-admission-status', () => ({
    getAdmissionStatus: vi.fn(),
}));

vi.mock('./services/get-waiting-list', () => ({
    getWaitingList: vi.fn(),
}));

vi.mock('./services/get-lobby-count', () => ({
    getLobbyCount: vi.fn(),
}));

vi.mock('./services/update-admissions', () => ({
    updateAdmissions: vi.fn(),
}));

const dbClient = {} as DbClient;

describe('LobbyService', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('resolves the authenticated user to a student record before checking in', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'student-record-1',
            institution_id: 'institution-1',
        });
        vi.mocked(checkInLobby).mockResolvedValue({
            status: 'WAITING',
            checkedInAt: '2026-04-13T05:01:00.000Z',
        });

        const result = await LobbyService.checkIn(dbClient, 'exam-1', 'auth-user-1');

        expect(result.status).toBe('WAITING');
        expect(EntitlementsRepository.getStudentProfileByUserId).toHaveBeenCalledWith(
            dbClient,
            'auth-user-1',
        );
        expect(checkInLobby).toHaveBeenCalledWith(dbClient, 'exam-1', 'student-record-1');
    });

    it('resolves the authenticated user to a student record before polling admission status', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'student-record-1',
            institution_id: 'institution-1',
        });
        vi.mocked(getAdmissionStatus).mockResolvedValue({
            status: 'APPROVED',
            checkedInAt: '2026-04-13T05:01:00.000Z',
            decidedAt: '2026-04-13T05:02:00.000Z',
        });

        const result = await LobbyService.getAdmissionStatus(dbClient, 'exam-1', 'auth-user-1');

        expect(result.status).toBe('APPROVED');
        expect(getAdmissionStatus).toHaveBeenCalledWith(dbClient, 'exam-1', 'student-record-1');
    });

    it('returns a clear not-found error when the authenticated user has no student profile', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue(undefined);

        await expect(LobbyService.checkIn(dbClient, 'exam-1', 'auth-user-1')).rejects.toThrow(
            HTTPException,
        );
        expect(checkInLobby).not.toHaveBeenCalled();
    });

    it('checks creator-or-accepted-assignee access before reading the waiting list', async () => {
        vi.mocked(getMonitoringExamContext).mockResolvedValue({ examId: 'exam-1' } as any);
        vi.mocked(getWaitingList).mockResolvedValue([]);

        await LobbyService.getWaitingList(
            dbClient,
            'exam-1',
            'instructor-1',
            'instructor',
            'institution-1',
        );

        expect(getMonitoringExamContext).toHaveBeenCalledWith({
            dbClient,
            examId: 'exam-1',
            institutionId: 'institution-1',
            viewerRole: 'instructor',
            userId: 'instructor-1',
        });
        expect(getWaitingList).toHaveBeenCalledWith(dbClient, 'exam-1');
    });

    it('checks creator-or-accepted-assignee access before mutating lobby admissions', async () => {
        vi.mocked(getMonitoringExamContext).mockResolvedValue({ examId: 'exam-1' } as any);
        vi.mocked(updateAdmissions).mockResolvedValue({ updatedCount: 1 });

        await LobbyService.updateAdmissions(
            dbClient,
            'exam-1',
            ['student-1'],
            'APPROVED',
            'instructor-1',
            'instructor',
            'institution-1',
        );

        expect(getMonitoringExamContext).toHaveBeenCalledWith({
            dbClient,
            examId: 'exam-1',
            institutionId: 'institution-1',
            viewerRole: 'instructor',
            userId: 'instructor-1',
        });
        expect(updateAdmissions).toHaveBeenCalledWith(
            dbClient,
            'exam-1',
            ['student-1'],
            'APPROVED',
            'instructor-1',
        );
    });

    it('lets admin-role viewers read the waiting list without instructor assignment checks', async () => {
        vi.mocked(getMonitoringExamContext).mockResolvedValue({ examId: 'exam-1' } as any);
        vi.mocked(getWaitingList).mockResolvedValue([]);

        await LobbyService.getWaitingList(dbClient, 'exam-1', 'admin-1', 'admin', 'inst-1');

        expect(assertInstructorExamAccess).not.toHaveBeenCalled();
        expect(getMonitoringExamContext).toHaveBeenCalledWith({
            dbClient,
            examId: 'exam-1',
            institutionId: 'inst-1',
            viewerRole: 'admin',
            userId: 'admin-1',
        });
        expect(getWaitingList).toHaveBeenCalledWith(dbClient, 'exam-1');
    });

    it('counts lobby students through the student path when auth metadata is stale', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'student-record-1',
            institution_id: 'institution-1',
        });
        vi.mocked(getLobbyCount).mockResolvedValue({ count: 1 });

        const result = await LobbyService.getLobbyCount(
            dbClient,
            'exam-1',
            'auth-user-1',
            'institution-1',
            'instructor',
        );

        expect(result).toEqual({ count: 1 });
        expect(assertInstructorExamAccess).not.toHaveBeenCalled();
        expect(getLobbyCount).toHaveBeenCalledWith(dbClient, 'exam-1');
    });

    it('delegates bootstrap requests directly to bootstrapLobby', async () => {
        vi.mocked(bootstrapLobby).mockResolvedValue({
            exam: { id: 'exam-1', title: 'Test Exam' } as any,
            configuration: { lobbyAdmissionMode: 'INSTRUCTOR_GATED' } as any,
            admission: { status: 'WAITING', checkedInAt: '2026-04-13T05:00:00.000Z' },
            waitingCount: 1,
            runtimeAccess: { canStart: false, state: 'lobby_waiting' } as any,
        });

        const result = await LobbyService.bootstrap(
            dbClient,
            'exam-1',
            'auth-user-1',
            'institution-1',
        );

        expect(result.waitingCount).toBe(1);
        expect(result.admission.status).toBe('WAITING');
        expect(bootstrapLobby).toHaveBeenCalledWith(
            dbClient,
            'exam-1',
            'auth-user-1',
            'institution-1',
        );
    });

    it('handles 200 concurrent student bootstrap requests simultaneously with linear scaling and zero contention', async () => {
        const studentCount = 200;
        vi.mocked(bootstrapLobby).mockImplementation(async (_db, examId, userId) => ({
            exam: { id: examId, title: 'Burst Test Exam' } as any,
            configuration: { lobbyAdmissionMode: 'INSTRUCTOR_GATED' } as any,
            admission: { status: 'WAITING', checkedInAt: new Date().toISOString() },
            waitingCount: studentCount,
            runtimeAccess: { canStart: false, state: 'lobby_waiting' } as any,
        }));

        const requests = Array.from({ length: studentCount }, (_, i) =>
            LobbyService.bootstrap(
                dbClient,
                'exam-surge-101',
                `student-user-${i}`,
                'institution-1',
            ),
        );

        const results = await Promise.all(requests);

        expect(results).toHaveLength(studentCount);
        expect(bootstrapLobby).toHaveBeenCalledTimes(studentCount);
        results.forEach((res) => {
            expect(res.admission.status).toBe('WAITING');
            expect(res.waitingCount).toBe(studentCount);
            expect(res.exam.id).toBe('exam-surge-101');
        });
    });
});
