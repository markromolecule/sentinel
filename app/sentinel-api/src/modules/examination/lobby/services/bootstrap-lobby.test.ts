import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type DbClient } from '@sentinel/db';
import { bootstrapLobby } from './bootstrap-lobby';
import { checkInLobby } from './check-in-lobby';
import { getLobbyCount } from './get-lobby-count';
import { getExamDetail } from '../../exams/services/get-exam-detail.service';
import { EntitlementsRepository } from '../../access/data/entitlements.repository';

vi.mock('./check-in-lobby', () => ({
    checkInLobby: vi.fn(),
}));

vi.mock('./get-lobby-count', () => ({
    getLobbyCount: vi.fn(),
}));

vi.mock('../../exams/services/get-exam-detail.service', () => ({
    getExamDetail: vi.fn(),
}));

vi.mock('../../access/data/entitlements.repository', () => ({
    EntitlementsRepository: {
        getStudentProfileByUserId: vi.fn(),
    },
}));

describe('bootstrapLobby Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws 404 if student profile is not found', async () => {
        const mockDb = {} as unknown as DbClient;
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue(null);

        await expect(
            bootstrapLobby(mockDb, 'exam-1', 'user-1', 'inst-1'),
        ).rejects.toThrowError('Student profile not found');
    });

    it('executes check-in, detail fetching, and count in parallel and returns consolidated payload', async () => {
        const mockDb = {} as unknown as DbClient;
        const now = new Date('2026-04-13T05:00:00.000Z');

        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'student-123',
            user_id: 'user-1',
            institution_id: 'inst-1',
        } as any);

        vi.mocked(checkInLobby).mockResolvedValue({
            status: 'WAITING',
            checkedInAt: now.toISOString(),
        });

        vi.mocked(getExamDetail).mockResolvedValue({
            id: 'exam-1',
            title: 'Final Exam',
            configuration: {
                lobbyAdmissionMode: 'INSTRUCTOR_GATED',
                allowedAttempts: 1,
            },
            runtimeAccess: {
                state: 'open',
                reasonCode: 'OPEN',
                canStart: true,
                canResume: false,
                hasActiveAttempt: false,
            },
        } as any);

        vi.mocked(getLobbyCount).mockResolvedValue({ count: 14 });

        const result = await bootstrapLobby(mockDb, 'exam-1', 'user-1', 'inst-1');

        expect(result).toBeDefined();
        expect(result.admission.status).toBe('WAITING');
        expect(result.admission.checkedInAt).toBe(now.toISOString());
        expect(result.waitingCount).toBe(14);
        expect(result.configuration.lobbyAdmissionMode).toBe('INSTRUCTOR_GATED');
        expect(result.runtimeAccess.state).toBe('lobby_waiting');
        expect(result.runtimeAccess.canStart).toBe(false);

        expect(checkInLobby).toHaveBeenCalledWith(mockDb, 'exam-1', 'student-123');
        expect(getExamDetail).toHaveBeenCalledWith(mockDb, 'exam-1', 'inst-1', 'user-1');
        expect(getLobbyCount).toHaveBeenCalledWith(mockDb, 'exam-1');
    });

    it('returns approved runtime access when admission is approved', async () => {
        const mockDb = {} as unknown as DbClient;
        const now = new Date('2026-04-13T05:00:00.000Z');

        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'student-123',
            user_id: 'user-1',
            institution_id: 'inst-1',
        } as any);

        vi.mocked(checkInLobby).mockResolvedValue({
            status: 'APPROVED',
            checkedInAt: now.toISOString(),
        });

        vi.mocked(getExamDetail).mockResolvedValue({
            id: 'exam-1',
            title: 'Final Exam',
            configuration: {
                lobbyAdmissionMode: 'AUTOMATIC',
            },
            runtimeAccess: {
                state: 'open',
                reasonCode: 'OPEN',
                canStart: true,
                canResume: false,
                hasActiveAttempt: false,
            },
        } as any);

        vi.mocked(getLobbyCount).mockResolvedValue({ count: 0 });

        const result = await bootstrapLobby(mockDb, 'exam-1', 'user-1', 'inst-1');

        expect(result.admission.status).toBe('APPROVED');
        expect(result.runtimeAccess.state).toBe('lobby_approved');
        expect(result.runtimeAccess.canStart).toBe(true);
    });
});
