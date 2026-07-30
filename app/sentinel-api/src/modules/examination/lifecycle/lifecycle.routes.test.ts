import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import { registerLifecycleRoutes } from './lifecycle.routes';
import { lockExamAttempt } from './services/lock-exam-attempt';
import { getReportingExamContext } from '../reporting/services/get-reporting-exam-context';
import { EntitlementsRepository } from '../access/data/entitlements.repository';
import { grantMakeupExamWindow } from './services/grant-makeup-exam-window';
import { grantRetakeExamWindow } from './services/grant-retake-exam-window';
import { resolveLifecycleStudentId } from './services/resolve-lifecycle-student-id';

vi.mock('./services/lock-exam-attempt', () => ({
    lockExamAttempt: vi.fn(),
}));

vi.mock('../reporting/services/get-reporting-exam-context', () => ({
    getReportingExamContext: vi.fn(),
}));

vi.mock('../access/data/entitlements.repository', () => ({
    EntitlementsRepository: {
        hasStudentExamEnrollment: vi.fn(),
    },
}));

vi.mock('./services/grant-makeup-exam-window', () => ({
    grantMakeupExamWindow: vi.fn(),
}));

vi.mock('./services/grant-retake-exam-window', () => ({
    grantRetakeExamWindow: vi.fn(),
}));

vi.mock('./services/resolve-lifecycle-student-id', () => ({
    resolveLifecycleStudentId: vi.fn(),
}));

describe('registerLifecycleRoutes', () => {
    function createApp(
        activePermissionKeys: string[] = ['examinations:update'],
        role: string = 'admin',
        institutionId = 'institution-1',
    ) {
        const app = new OpenAPIHono();

        app.use('*', async (c, next) => {
            c.set('dbClient', {} as any);
            c.set('user', { id: 'actor-1' } as any);
            c.set('supabaseUser', { user_metadata: { role } } as any);
            c.set('institutionId', institutionId);
            c.set('activePermissionKeys', activePermissionKeys);
            c.set('role', role);
            await next();
        });

        registerLifecycleRoutes(app);

        return app;
    }

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(resolveLifecycleStudentId).mockImplementation(
            async (_dbClient, studentId) => studentId,
        );
    });

    it('returns 403 when the caller lacks examination update permissions', async () => {
        const app = createApp([], 'admin');
        const response = await app.request(
            '/11111111-1111-4111-8111-111111111111/attempts/22222222-2222-4222-8222-222222222222/lifecycle/lock',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reasonCode: 'PROCTOR_LOCK',
                }),
            },
        );

        expect(response.status).toBe(403);
    });

    it('returns 403 when a student actor has the permission key', async () => {
        const app = createApp(['examinations:update'], 'student');
        const response = await app.request(
            '/11111111-1111-4111-8111-111111111111/attempts/22222222-2222-4222-8222-222222222222/lifecycle/lock',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reasonCode: 'PROCTOR_LOCK',
                }),
            },
        );

        expect(response.status).toBe(403);
        expect(lockExamAttempt).not.toHaveBeenCalled();
    });

    it('passes the active institution scope into the lifecycle service', async () => {
        vi.mocked(lockExamAttempt).mockResolvedValue({
            attempt: {
                attemptId: '22222222-2222-4222-8222-222222222222',
                examId: '11111111-1111-4111-8111-111111111111',
                studentId: '33333333-3333-4333-8333-333333333333',
                lifecycleState: 'LOCKED',
                lifecycleReason: 'PROCTOR_LOCK',
                lifecycleNote: null,
                lockedAt: '2026-07-03T16:00:00.000Z',
                lockedBy: 'actor-1',
                reopenedUntil: null,
                closedAt: null,
                closedBy: null,
                closedReason: null,
                supersededByAttemptId: null,
                supersededAt: null,
                supersededBy: null,
                finalizedAt: null,
                finalizedBy: null,
                scoreState: 'DRAFT',
                events: [],
            },
            latestEvent: {
                eventId: 'event-1',
                attemptId: '22222222-2222-4222-8222-222222222222',
                examId: '11111111-1111-4111-8111-111111111111',
                studentId: '33333333-3333-4333-8333-333333333333',
                eventType: 'LOCKED',
                previousState: 'IN_PROGRESS',
                nextState: 'LOCKED',
                actorUserId: 'actor-1',
                reasonCode: 'PROCTOR_LOCK',
                notes: null,
                relatedIncidentIds: [],
                relatedOverrideId: null,
                metadata: null,
                createdAt: '2026-07-03T16:00:00.000Z',
            },
        });

        const app = createApp(['examinations:update'], 'instructor', 'institution-2');
        const response = await app.request(
            '/11111111-1111-4111-8111-111111111111/attempts/22222222-2222-4222-8222-222222222222/lifecycle/lock',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reasonCode: 'PROCTOR_LOCK',
                }),
            },
        );

        expect(response.status).toBe(200);
        expect(lockExamAttempt).toHaveBeenCalledWith(
            expect.objectContaining({
                institutionId: 'institution-2',
                actorUserId: 'actor-1',
            }),
        );
    });

    it('returns 404 when the attempt is not found', async () => {
        vi.mocked(lockExamAttempt).mockRejectedValue(
            new HTTPException(404, {
                message: 'Exam attempt not found for this exam.',
            }),
        );

        const app = createApp();
        const response = await app.request(
            '/11111111-1111-4111-8111-111111111111/attempts/22222222-2222-4222-8222-222222222222/lifecycle/lock',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reasonCode: 'PROCTOR_LOCK',
                }),
            },
        );

        expect(response.status).toBe(404);
    });

    it('returns 404 when the attempt belongs to a different exam', async () => {
        vi.mocked(lockExamAttempt).mockRejectedValue(
            new HTTPException(404, {
                message: 'Exam attempt not found for this exam.',
            }),
        );

        const app = createApp();
        const response = await app.request(
            '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/attempts/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/lifecycle/lock',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reasonCode: 'PROCTOR_LOCK',
                }),
            },
        );

        expect(response.status).toBe(404);
    });

    it('returns 404 when the attempt is outside the active institution', async () => {
        vi.mocked(lockExamAttempt).mockRejectedValue(
            new HTTPException(404, {
                message: 'Exam attempt not found for this exam.',
            }),
        );

        const app = createApp(['examinations:update'], 'instructor', 'institution-other');
        const response = await app.request(
            '/11111111-1111-4111-8111-111111111111/attempts/22222222-2222-4222-8222-222222222222/lifecycle/lock',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reasonCode: 'PROCTOR_LOCK',
                }),
            },
        );

        expect(response.status).toBe(404);
        expect(lockExamAttempt).toHaveBeenCalledWith(
            expect.objectContaining({
                institutionId: 'institution-other',
            }),
        );
    });

    it('returns the expected response shape on success', async () => {
        vi.mocked(lockExamAttempt).mockResolvedValue({
            attempt: {
                attemptId: '22222222-2222-4222-8222-222222222222',
                examId: '11111111-1111-4111-8111-111111111111',
                studentId: '33333333-3333-4333-8333-333333333333',
                lifecycleState: 'LOCKED',
                lifecycleReason: 'PROCTOR_LOCK',
                lifecycleNote: 'Paused for review.',
                lockedAt: '2026-07-03T16:00:00.000Z',
                lockedBy: 'actor-1',
                reopenedUntil: null,
                closedAt: null,
                closedBy: null,
                closedReason: null,
                supersededByAttemptId: null,
                supersededAt: null,
                supersededBy: null,
                finalizedAt: null,
                finalizedBy: null,
                scoreState: 'DRAFT',
                events: [],
            },
            latestEvent: {
                eventId: 'event-1',
                attemptId: '22222222-2222-4222-8222-222222222222',
                examId: '11111111-1111-4111-8111-111111111111',
                studentId: '33333333-3333-4333-8333-333333333333',
                eventType: 'LOCKED',
                previousState: 'IN_PROGRESS',
                nextState: 'LOCKED',
                actorUserId: 'actor-1',
                reasonCode: 'PROCTOR_LOCK',
                notes: 'Paused for review.',
                relatedIncidentIds: [],
                relatedOverrideId: null,
                metadata: null,
                createdAt: '2026-07-03T16:00:00.000Z',
            },
        });

        const app = createApp(['examinations:update'], 'instructor');
        const response = await app.request(
            '/11111111-1111-4111-8111-111111111111/attempts/22222222-2222-4222-8222-222222222222/lifecycle/lock',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reasonCode: 'PROCTOR_LOCK',
                    notes: 'Paused for review.',
                }),
            },
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            message: 'Exam attempt locked successfully',
            data: {
                attempt: {
                    attemptId: '22222222-2222-4222-8222-222222222222',
                    examId: '11111111-1111-4111-8111-111111111111',
                    studentId: '33333333-3333-4333-8333-333333333333',
                    lifecycleState: 'LOCKED',
                    lifecycleReason: 'PROCTOR_LOCK',
                    lifecycleNote: 'Paused for review.',
                    lockedAt: '2026-07-03T16:00:00.000Z',
                    lockedBy: 'actor-1',
                    reopenedUntil: null,
                    closedAt: null,
                    closedBy: null,
                    closedReason: null,
                    supersededByAttemptId: null,
                    supersededAt: null,
                    supersededBy: null,
                    finalizedAt: null,
                    finalizedBy: null,
                    scoreState: 'DRAFT',
                    events: [],
                },
                latestEvent: {
                    eventId: 'event-1',
                    attemptId: '22222222-2222-4222-8222-222222222222',
                    examId: '11111111-1111-4111-8111-111111111111',
                    studentId: '33333333-3333-4333-8333-333333333333',
                    eventType: 'LOCKED',
                    previousState: 'IN_PROGRESS',
                    nextState: 'LOCKED',
                    actorUserId: 'actor-1',
                    reasonCode: 'PROCTOR_LOCK',
                    notes: 'Paused for review.',
                    relatedIncidentIds: [],
                    relatedOverrideId: null,
                    metadata: null,
                    createdAt: '2026-07-03T16:00:00.000Z',
                },
            },
        });
    });

    describe('grant-makeup and grant-retake routes', () => {
        it('returns 404 if student is not assigned to exam scope', async () => {
            vi.mocked(getReportingExamContext).mockResolvedValue({
                classGroupId: 'class-1',
                subjectId: 'sub-1',
                sectionId: 'sec-1',
                assignedSectionIds: ['sec-1'],
            } as any);
            vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(false);

            const app = createApp(['examinations:update'], 'admin');
            const response = await app.request(
                '/11111111-1111-4111-8111-111111111111/students/33333333-3333-4333-8333-333333333333/lifecycle/grant-makeup',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        availableFrom: '2026-07-04T08:00:00.000Z',
                        availableUntil: '2026-07-04T10:00:00.000Z',
                    }),
                },
            );

            expect(response.status).toBe(404);
            expect(await response.text()).toBe('Student is not assigned to this exam scope.');
        });

        it('successfully grants makeup window', async () => {
            vi.mocked(getReportingExamContext).mockResolvedValue({
                classGroupId: 'class-1',
                subjectId: 'sub-1',
                sectionId: 'sec-1',
                assignedSectionIds: ['sec-1'],
            } as any);
            vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
            vi.mocked(grantMakeupExamWindow).mockResolvedValue({
                remediationExam: {
                    exam_id: 'cloned-exam-id',
                    title: 'Math Cloned',
                    scheduled_date: '2026-07-04T08:00:00.000Z',
                    end_date_time: '2026-07-04T10:00:00.000Z',
                    status: 'PUBLISHED',
                },
                remediationSchedule: {
                    remediation_id: 'remediation-id',
                    source_exam_id: '11111111-1111-4111-8111-111111111111',
                    remediation_exam_id: 'cloned-exam-id',
                    student_id: '33333333-3333-4333-8333-333333333333',
                    source_attempt_id: null,
                    remediation_type: 'MAKEUP',
                    scheduled_date: '2026-07-04T08:00:00.000Z',
                    end_date_time: '2026-07-04T10:00:00.000Z',
                    created_by: 'actor-1',
                    created_at: '2026-07-04T08:00:00.000Z',
                    notes: null,
                },
                override: null,
                latestEvent: null,
            } as any);

            const app = createApp(['examinations:update'], 'admin');
            const response = await app.request(
                '/11111111-1111-4111-8111-111111111111/students/33333333-3333-4333-8333-333333333333/lifecycle/grant-makeup',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        availableFrom: '2026-07-04T08:00:00.000Z',
                        availableUntil: '2026-07-04T10:00:00.000Z',
                    }),
                },
            );

            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.data.remediationExam.exam_id).toBe('cloned-exam-id');
        });

        it('returns 409 conflict when grantMakeupExamWindow throws 409', async () => {
            vi.mocked(getReportingExamContext).mockResolvedValue({
                classGroupId: 'class-1',
                subjectId: 'sub-1',
                sectionId: 'sec-1',
                assignedSectionIds: ['sec-1'],
            } as any);
            vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
            vi.mocked(grantMakeupExamWindow).mockRejectedValue(
                new HTTPException(409, {
                    message: 'Student already has an active, non-superseded attempt for this exam.',
                }),
            );

            const app = createApp(['examinations:update'], 'admin');
            const response = await app.request(
                '/11111111-1111-4111-8111-111111111111/students/33333333-3333-4333-8333-333333333333/lifecycle/grant-makeup',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        availableFrom: '2026-07-04T08:00:00.000Z',
                        availableUntil: '2026-07-04T10:00:00.000Z',
                    }),
                },
            );

            expect(response.status).toBe(409);
        });
    });
});
