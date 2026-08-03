import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
    createSubjectOfferingsFromClassificationRoute,
    createSubjectOfferingsFromClassificationRouteHandler,
} from './create-subject-offerings-from-classification.controller';
import { SubjectOfferingsService } from '../subject-offerings.service';

vi.mock('../../../_shared/academic-scope', () => ({
    buildRequesterAcademicScope: vi.fn((scope) => scope),
    assertSubjectOfferingMutationAccess: vi.fn(),
    resolveSubjectOfferingAssignmentsForScope: vi.fn(async (_dbClient, _scope, payload) => ({
        departmentIds: payload.departmentIds ?? [],
        courseIds: payload.courseIds ?? [],
        sectionIds: payload.sectionIds ?? [],
        yearLevels: payload.yearLevels ?? [],
    })),
}));

vi.mock('../subject-offerings.service', () => ({
    SubjectOfferingsService: {
        createSubjectOfferingsFromClassification: vi.fn(),
    },
}));

describe('createSubjectOfferingsFromClassificationRouteHandler', () => {
    const app = new OpenAPIHono();

    app.use('*', async (c, next) => {
        c.set('dbClient', {} as any);
        c.set('institutionId', '11111111-1111-4111-8111-111111111111');
        c.set('supabaseUser', {
            user_metadata: {
                role: 'support',
            },
        } as any);
        c.set('user', {
            id: '44444444-4444-4444-8444-444444444444',
            user_profiles: {
                department_id: null,
                course_id: null,
            },
        } as any);
        c.set('activePermissionKeys', ['subject_offerings:offer']);
        await next();
    });

    app.openapi(
        createSubjectOfferingsFromClassificationRoute,
        createSubjectOfferingsFromClassificationRouteHandler,
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('uses the support-provided institution override when creating offerings', async () => {
        vi.mocked(
            SubjectOfferingsService.createSubjectOfferingsFromClassification,
        ).mockResolvedValue({
            classification_id: '55555555-5555-4555-8555-555555555555',
            classification_name: 'General Education',
            term_id: '22222222-2222-4222-8222-222222222222',
            created_count: 0,
            skipped_count: 0,
            total_subject_count: 0,
            duplicate_strategy: 'skip_existing',
            created: [],
            skipped: [],
        } as any);

        const res = await app.request('/bulk/classification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subject_classification_id: '55555555-5555-4555-8555-555555555555',
                term_id: '22222222-2222-4222-8222-222222222222',
                institution_id: '33333333-3333-4333-8333-333333333333',
                department_ids: ['66666666-6666-4666-8666-666666666666'],
                course_ids: ['77777777-7777-4777-8777-777777777777'],
                section_ids: [],
                year_levels: [],
            }),
        });

        expect(res.status).toBe(201);
        expect(
            SubjectOfferingsService.createSubjectOfferingsFromClassification,
        ).toHaveBeenCalledWith(
            {},
            expect.objectContaining({
                institution_id: '33333333-3333-4333-8333-333333333333',
                created_by: '44444444-4444-4444-8444-444444444444',
            }),
        );
    });
});
