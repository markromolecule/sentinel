import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { startLiveInspection } from './start-live-inspection.service';
import type { LiveKitConfig } from '../../../infrastructure/livekit/livekit.config';
import * as repository from '../live-inspection.repository';
import * as accessService from '../live-inspection-access.service';
import * as stopService from './stop-live-inspection.service';
import * as helpers from './live-inspection-service-helpers';
import { LiveKitService } from '../../../infrastructure/livekit/livekit.service';

vi.mock('../live-inspection.repository');
vi.mock('../live-inspection-access.service');
vi.mock('./stop-live-inspection.service');
vi.mock('../../../infrastructure/livekit/livekit.service');

vi.mock('./live-inspection-service-helpers', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./live-inspection-service-helpers')>();
    return {
        ...actual,
        getLiveInspectionAttemptForStaff: vi.fn(),
    };
});

const disabledConfig: LiveKitConfig = {
    enabled: false,
    allowedInstitutionIds: [],
    liveKitUrl: null,
    apiKey: null,
    apiSecret: null,
    requestTimeoutMs: 20_000,
    viewerJoinTimeoutMs: 15_000,
    maxInspectionDurationSeconds: 300,
    tokenTtlSeconds: 60,
    roomEmptyTimeoutSeconds: 30,
    roomDepartureTimeoutSeconds: 10,
    globalActiveInspectionLimit: 20,
    institutionActiveInspectionLimit: 10,
};

const enabledConfig: LiveKitConfig = {
    enabled: true,
    allowedInstitutionIds: [],
    liveKitUrl: 'wss://livekit.test',
    apiKey: 'key',
    apiSecret: 'secret',
    requestTimeoutMs: 20_000,
    viewerJoinTimeoutMs: 15_000,
    maxInspectionDurationSeconds: 300,
    tokenTtlSeconds: 60,
    roomEmptyTimeoutSeconds: 30,
    roomDepartureTimeoutSeconds: 10,
    globalActiveInspectionLimit: 20,
    institutionActiveInspectionLimit: 10,
};

const mockAttempt = {
    attemptId: 'attempt-123',
    examId: 'exam-123',
    studentUserId: 'student-123',
    institutionId: 'inst-123',
};

const mockLease = {
    lease_id: 'lease-123',
    exam_id: 'exam-123',
    attempt_id: 'attempt-123',
    student_user_id: 'student-123',
    viewer_user_id: 'viewer-123',
    institution_id: 'inst-123',
    provider_room_name: 'room-123',
    state: 'REQUESTED',
    version: 1,
    requested_at: new Date('2026-07-23T12:00:00Z'),
    expires_at: new Date('2026-07-23T12:05:00Z'),
    started_at: null,
    ended_at: null,
    end_reason: null,
    last_error_code: null,
};

describe('startLiveInspection', () => {
    let mockLiveKit: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockLiveKit = {
            createInspectionRoom: vi.fn().mockResolvedValue({}),
            createViewerToken: vi.fn().mockResolvedValue({
                token: 'mock-viewer-token',
                liveKitUrl: 'wss://livekit.test',
                participantIdentity: 'sentinel:viewer:viewer-123',
                expiresAt: new Date('2026-07-23T12:05:00Z'),
            }),
        };
        vi.mocked(accessService.assertLiveInspectionViewerAccess).mockResolvedValue({
            examId: 'exam-123',
        } as any);
        vi.mocked(helpers.getLiveInspectionAttemptForStaff).mockResolvedValue(mockAttempt as any);
    });

    it('fails closed before authorization, database acquisition, or provider calls when disabled', async () => {
        await expect(
            startLiveInspection(
                {
                    dbClient: {} as any,
                    examId: 'exam-123',
                    attemptId: 'attempt-123',
                    viewerUserId: 'viewer-123',
                    role: 'instructor',
                    activeInstitutionId: 'inst-123',
                },
                { config: disabledConfig, liveKit: mockLiveKit },
            ),
        ).rejects.toBeInstanceOf(HTTPException);
        expect(mockLiveKit.createInspectionRoom).not.toHaveBeenCalled();
    });

    it('returns existing lease owned by same viewer if restart is false with bundled connection', async () => {
        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt).mockResolvedValueOnce(
            mockLease as any,
        );

        const result = await startLiveInspection(
            {
                dbClient: {} as any,
                examId: 'exam-123',
                attemptId: 'attempt-123',
                viewerUserId: 'viewer-123',
                role: 'instructor',
                activeInstitutionId: 'inst-123',
            },
            { config: enabledConfig, liveKit: mockLiveKit },
        );

        expect(result.leaseId).toBe('lease-123');
        expect(result.connection).toBeDefined();
        expect(result.connection?.token).toBe('mock-viewer-token');
        expect(result.connection?.liveKitUrl).toBe('wss://livekit.test');
        expect(result.connection?.participantIdentity).toBe('sentinel:viewer:viewer-123');
        expect(repository.acquireLiveInspectionLease).not.toHaveBeenCalled();
    });

    it('throws 409 if active lease is owned by another viewer (regardless of restart flag)', async () => {
        const otherViewerLease = { ...mockLease, viewer_user_id: 'viewer-other' };
        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt).mockResolvedValueOnce(
            otherViewerLease as any,
        );

        await expect(
            startLiveInspection(
                {
                    dbClient: {} as any,
                    examId: 'exam-123',
                    attemptId: 'attempt-123',
                    restart: true,
                    viewerUserId: 'viewer-123',
                    role: 'instructor',
                    activeInstitutionId: 'inst-123',
                },
                { config: enabledConfig, liveKit: mockLiveKit },
            ),
        ).rejects.toThrow(
            new HTTPException(409, { message: 'Live inspection is already active.' }),
        );
    });

    it('calls stopLiveInspection, checks capacity, and acquires a new lease when restart is true', async () => {
        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt)
            .mockResolvedValueOnce(mockLease as any) // first call returns active lease
            .mockResolvedValueOnce({ ...mockLease, lease_id: 'lease-new', version: 1 } as any); // second call returns the newly acquired lease

        vi.mocked(repository.countActiveLiveInspectionLeases).mockResolvedValue(0);
        vi.mocked(repository.countActiveLiveInspectionLeasesByInstitution).mockResolvedValue(0);
        vi.mocked(repository.acquireLiveInspectionLease).mockResolvedValue({
            ok: true,
            leaseId: 'lease-new',
        });

        const result = await startLiveInspection(
            {
                dbClient: {} as any,
                examId: 'exam-123',
                attemptId: 'attempt-123',
                restart: true,
                viewerUserId: 'viewer-123',
                role: 'instructor',
                activeInstitutionId: 'inst-123',
            },
            { config: enabledConfig, liveKit: mockLiveKit },
        );

        expect(result.leaseId).toBe('lease-new');
        expect(result.connection).toBeDefined();
        expect(result.connection?.token).toBe('mock-viewer-token');
        expect(result.connection?.liveKitUrl).toBe('wss://livekit.test');
        expect(stopService.stopLiveInspection).toHaveBeenCalledWith(
            expect.objectContaining({ leaseId: 'lease-123', viewerUserId: 'viewer-123' }),
            expect.any(Object),
        );
        expect(repository.acquireLiveInspectionLease).toHaveBeenCalled();
        expect(mockLiveKit.createInspectionRoom).not.toHaveBeenCalled();
    });

    it('stops a stale lease owned by the viewer before starting another attempt', async () => {
        const previousLease = {
            ...mockLease,
            lease_id: 'lease-previous',
            exam_id: 'exam-previous',
            attempt_id: 'attempt-previous',
        };
        const newLease = { ...mockLease, lease_id: 'lease-new' };

        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(newLease as any);
        vi.mocked(repository.getActiveLiveInspectionLeaseForViewer).mockResolvedValueOnce(
            previousLease as any,
        );
        vi.mocked(repository.countActiveLiveInspectionLeases).mockResolvedValue(0);
        vi.mocked(repository.countActiveLiveInspectionLeasesByInstitution).mockResolvedValue(0);
        vi.mocked(repository.acquireLiveInspectionLease).mockResolvedValue({
            ok: true,
            leaseId: 'lease-new',
        });

        const result = await startLiveInspection(
            {
                dbClient: {} as any,
                examId: 'exam-123',
                attemptId: 'attempt-123',
                viewerUserId: 'viewer-123',
                role: 'instructor',
                activeInstitutionId: 'inst-123',
            },
            { config: enabledConfig, liveKit: mockLiveKit },
        );

        expect(stopService.stopLiveInspection).toHaveBeenCalledWith(
            expect.objectContaining({
                examId: 'exam-previous',
                leaseId: 'lease-previous',
                viewerUserId: 'viewer-123',
            }),
            expect.any(Object),
        );
        expect(result.leaseId).toBe('lease-new');
    });

    it('throws 429 when global capacity is reached after stopping the old lease', async () => {
        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt).mockResolvedValueOnce(
            mockLease as any,
        );
        vi.mocked(repository.countActiveLiveInspectionLeases).mockResolvedValue(20); // Limit is 20

        await expect(
            startLiveInspection(
                {
                    dbClient: {} as any,
                    examId: 'exam-123',
                    attemptId: 'attempt-123',
                    restart: true,
                    viewerUserId: 'viewer-123',
                    role: 'instructor',
                    activeInstitutionId: 'inst-123',
                },
                { config: enabledConfig, liveKit: mockLiveKit },
            ),
        ).rejects.toThrow(
            new HTTPException(429, { message: 'Live inspection global capacity reached.' }),
        );
    });

    it('converges on same viewer lease if concurrent restarts result in unique key conflict', async () => {
        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt)
            .mockResolvedValueOnce(null) // no existing lease initially
            .mockResolvedValueOnce({ ...mockLease, lease_id: 'lease-raced' } as any); // raced lease returned on re-read

        vi.mocked(repository.countActiveLiveInspectionLeases).mockResolvedValue(0);
        vi.mocked(repository.countActiveLiveInspectionLeasesByInstitution).mockResolvedValue(0);
        vi.mocked(repository.acquireLiveInspectionLease).mockResolvedValue({
            ok: false,
            code: 'INSPECTION_ALREADY_ACTIVE',
        });

        const result = await startLiveInspection(
            {
                dbClient: {} as any,
                examId: 'exam-123',
                attemptId: 'attempt-123',
                viewerUserId: 'viewer-123',
                role: 'instructor',
                activeInstitutionId: 'inst-123',
            },
            { config: enabledConfig, liveKit: mockLiveKit },
        );

        expect(result.leaseId).toBe('lease-raced');
        expect(mockLiveKit.createInspectionRoom).not.toHaveBeenCalled(); // The winner of the race handles room creation
    });

    it('recovers when the active-viewer unique constraint races the pre-check', async () => {
        const previousLease = {
            ...mockLease,
            lease_id: 'lease-raced-previous',
            exam_id: 'exam-previous',
            attempt_id: 'attempt-previous',
        };
        const newLease = { ...mockLease, lease_id: 'lease-new' };

        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(newLease as any);
        vi.mocked(repository.getActiveLiveInspectionLeaseForViewer)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(previousLease as any);
        vi.mocked(repository.countActiveLiveInspectionLeases).mockResolvedValue(0);
        vi.mocked(repository.countActiveLiveInspectionLeasesByInstitution).mockResolvedValue(0);
        vi.mocked(repository.acquireLiveInspectionLease)
            .mockResolvedValueOnce({
                ok: false,
                code: 'VIEWER_ALREADY_ACTIVE',
            })
            .mockResolvedValueOnce({
                ok: true,
                leaseId: 'lease-new',
            });

        const result = await startLiveInspection(
            {
                dbClient: {} as any,
                examId: 'exam-123',
                attemptId: 'attempt-123',
                viewerUserId: 'viewer-123',
                role: 'instructor',
                activeInstitutionId: 'inst-123',
            },
            { config: enabledConfig, liveKit: mockLiveKit },
        );

        expect(stopService.stopLiveInspection).toHaveBeenCalledWith(
            expect.objectContaining({
                examId: 'exam-previous',
                leaseId: 'lease-raced-previous',
            }),
            expect.any(Object),
        );
        expect(repository.acquireLiveInspectionLease).toHaveBeenCalledTimes(2);
        expect(result.leaseId).toBe('lease-new');
    });

    it('allows multiple unique instructors to concurrently inspect distinct students across exams', async () => {
        const instructorA = {
            viewerUserId: 'inst-user-A',
            examId: 'exam-1',
            attemptId: 'attempt-student-1',
            studentUserId: 'student-user-1',
        };
        const instructorB = {
            viewerUserId: 'inst-user-B',
            examId: 'exam-2',
            attemptId: 'attempt-student-2',
            studentUserId: 'student-user-2',
        };

        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ ...mockLease, lease_id: 'lease-inst-A', viewer_user_id: instructorA.viewerUserId } as any)
            .mockResolvedValueOnce({ ...mockLease, lease_id: 'lease-inst-B', viewer_user_id: instructorB.viewerUserId } as any);
        vi.mocked(repository.getActiveLiveInspectionLeaseForViewer).mockResolvedValue(null);
        vi.mocked(repository.countActiveLiveInspectionLeases).mockResolvedValue(0);
        vi.mocked(repository.countActiveLiveInspectionLeasesByInstitution).mockResolvedValue(0);
        vi.mocked(repository.acquireLiveInspectionLease)
            .mockResolvedValueOnce({ ok: true, leaseId: 'lease-inst-A' })
            .mockResolvedValueOnce({ ok: true, leaseId: 'lease-inst-B' });

        vi.mocked(helpers.getLiveInspectionAttemptForStaff)
            .mockResolvedValueOnce({
                attemptId: instructorA.attemptId,
                examId: instructorA.examId,
                studentUserId: instructorA.studentUserId,
                institutionId: 'inst-123',
            } as any)
            .mockResolvedValueOnce({
                attemptId: instructorB.attemptId,
                examId: instructorB.examId,
                studentUserId: instructorB.studentUserId,
                institutionId: 'inst-123',
            } as any);

        vi.mocked(accessService.assertLiveInspectionViewerAccess)
            .mockResolvedValueOnce({ examId: instructorA.examId } as any)
            .mockResolvedValueOnce({ examId: instructorB.examId } as any);

        const [resultA, resultB] = await Promise.all([
            startLiveInspection(
                {
                    dbClient: {} as any,
                    examId: instructorA.examId,
                    attemptId: instructorA.attemptId,
                    viewerUserId: instructorA.viewerUserId,
                    role: 'instructor',
                    activeInstitutionId: 'inst-123',
                },
                { config: enabledConfig, liveKit: mockLiveKit },
            ),
            startLiveInspection(
                {
                    dbClient: {} as any,
                    examId: instructorB.examId,
                    attemptId: instructorB.attemptId,
                    viewerUserId: instructorB.viewerUserId,
                    role: 'instructor',
                    activeInstitutionId: 'inst-123',
                },
                { config: enabledConfig, liveKit: mockLiveKit },
            ),
        ]);

        expect(resultA.leaseId).toBe('lease-inst-A');
        expect(resultB.leaseId).toBe('lease-inst-B');
    });

    it('rejects with 409 conflict when a second instructor attempts to inspect an already leased student', async () => {
        vi.mocked(repository.getActiveLiveInspectionLeaseForAttempt).mockResolvedValueOnce({
            ...mockLease,
            viewer_user_id: 'inst-user-A', // Currently held by Instructor A
            attempt_id: 'attempt-student-1',
        } as any);

        await expect(
            startLiveInspection(
                {
                    dbClient: {} as any,
                    examId: 'exam-123',
                    attemptId: 'attempt-student-1',
                    viewerUserId: 'inst-user-B', // Instructor B requests the same student
                    role: 'instructor',
                    activeInstitutionId: 'inst-123',
                },
                { config: enabledConfig, liveKit: mockLiveKit },
            ),
        ).rejects.toThrow(
            new HTTPException(409, { message: 'Live inspection is already active.' }),
        );
    });
});
