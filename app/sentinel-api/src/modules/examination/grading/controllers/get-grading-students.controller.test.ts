import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
    getGradingStudentsRoute,
    getGradingStudentsRouteHandler,
} from './get-grading-students.controller';
import { GradingService } from '../grading.service';
import {
    assertAssessmentAccess,
    resolveAssessmentActorRole,
    resolveAssessmentInstitutionId,
} from '../../assessment/assessment-access';

vi.mock('../grading.service', () => ({
    GradingService: {
        getGradingStudents: vi.fn(),
    },
}));

vi.mock('../../assessment/assessment-access', () => ({
    assertAssessmentAccess: vi.fn(),
    resolveAssessmentActorRole: vi.fn(),
    resolveAssessmentInstitutionId: vi.fn(),
}));

function createApp() {
    const app = new OpenAPIHono();

    app.use('*', async (c, next) => {
        c.set('dbClient', {} as any);
        c.set('user', { id: 'user-1' } as any);
        c.set('institutionId', 'institution-1');
        c.set('supabaseUser', {
            user_metadata: {
                role: 'instructor',
            },
        } as any);
        await next();
    });

    app.openapi(getGradingStudentsRoute, getGradingStudentsRouteHandler);

    return app;
}

describe('getGradingStudentsRouteHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(resolveAssessmentActorRole).mockResolvedValue('instructor');
        vi.mocked(resolveAssessmentInstitutionId).mockReturnValue('institution-1');
        vi.mocked(assertAssessmentAccess).mockImplementation(() => undefined);
    });

    it('returns grading students with canonical enrolled section fields', async () => {
        vi.mocked(GradingService.getGradingStudents).mockResolvedValue({
            students: [
                {
                    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                    name: 'Alice Student',
                    studentId: '2026-0001',
                    sectionId: '22222222-2222-4222-8222-222222222222',
                    sectionName: 'BSCS 3A',
                    submissionDate: '2026-04-18T09:00:00.000Z',
                    score: 95,
                    maxScore: 100,
                    status: 'GRADED',
                    attemptId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                },
            ],
            sections: [
                {
                    sectionId: '22222222-2222-4222-8222-222222222222',
                    sectionName: 'BSCS 3A',
                    totalStudents: 1,
                    submittedCount: 1,
                    gradedCount: 1,
                    students: [
                        {
                            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                            name: 'Alice Student',
                            studentId: '2026-0001',
                            sectionId: '22222222-2222-4222-8222-222222222222',
                            sectionName: 'BSCS 3A',
                            submissionDate: '2026-04-18T09:00:00.000Z',
                            score: 95,
                            maxScore: 100,
                            status: 'GRADED',
                            attemptId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                        },
                    ],
                },
            ],
        });

        const app = createApp();
        const response = await app.request(
            '/11111111-1111-4111-8111-111111111111/students?sectionId=22222222-2222-4222-8222-222222222222&search=alice',
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            message: 'Grading students fetched successfully',
            data: {
                students: [
                    {
                        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                        name: 'Alice Student',
                        studentId: '2026-0001',
                        sectionId: '22222222-2222-4222-8222-222222222222',
                        sectionName: 'BSCS 3A',
                        submissionDate: '2026-04-18T09:00:00.000Z',
                        score: 95,
                        maxScore: 100,
                        status: 'GRADED',
                        attemptId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                    },
                ],
                sections: [
                    {
                        sectionId: '11111111-1111-1111-1111-111111111111',
                        sectionId: '22222222-2222-4222-8222-222222222222',
                        sectionName: 'BSCS 3A',
                        totalStudents: 1,
                        submittedCount: 1,
                        gradedCount: 1,
                        students: [
                            {
                                id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                                name: 'Alice Student',
                                studentId: '2026-0001',
                                sectionId: '22222222-2222-4222-8222-222222222222',
                                sectionName: 'BSCS 3A',
                                submissionDate: '2026-04-18T09:00:00.000Z',
                                score: 95,
                                maxScore: 100,
                                status: 'GRADED',
                                attemptId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                            },
                        ],
                    },
                ],
            },
        });
        expect(GradingService.getGradingStudents).toHaveBeenCalledWith({
            dbClient: expect.anything(),
            examId: '11111111-1111-4111-8111-111111111111',
            userId: 'user-1',
            institutionId: 'institution-1',
            sectionId: '22222222-2222-4222-8222-222222222222',
            search: 'alice',
        });
    });
});
