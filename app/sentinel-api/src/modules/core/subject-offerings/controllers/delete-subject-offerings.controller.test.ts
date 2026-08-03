import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
    deleteSubjectOfferingsRoute,
    deleteSubjectOfferingsRouteHandler,
} from './delete-subject-offerings.controller';
import { SubjectOfferingsService } from '../subject-offerings.service';

vi.mock('../../../_shared/academic-scope', () => ({
    buildRequesterAcademicScope: vi.fn((scope) => scope),
    assertSubjectOfferingMutationAccess: vi.fn(),
    assertSubjectOfferingRecordInScope: vi.fn(),
}));

vi.mock('../subject-offerings.service', () => ({
    SubjectOfferingsService: {
        getSubjectOfferingById: vi.fn(),
        deleteSubjectOffering: vi.fn(),
    },
}));

describe('deleteSubjectOfferingsRouteHandler', () => {
    const app = new OpenAPIHono();
    const parentInstitutionId = '11111111-1111-4111-8111-111111111111';
    const childInstitutionId = '22222222-2222-4222-8222-222222222222';
    const offeringId = '33333333-3333-4333-8333-333333333333';
    const userId = '44444444-4444-4444-8444-444444444444';

    app.use('*', async (c, next) => {
        c.set('dbClient', {} as any);
        c.set('institutionId', parentInstitutionId);
        c.set('supabaseUser', {
            user_metadata: {
                role: 'support',
            },
        } as any);
        c.set('user', {
            id: userId,
            user_profiles: {
                department_id: null,
                course_id: null,
            },
        } as any);
        c.set('activePermissionKeys', ['subject_offerings:delete']);
        await next();
    });

    app.openapi(deleteSubjectOfferingsRoute, deleteSubjectOfferingsRouteHandler);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('falls back to unscoped lookup and deletes using the offering institution', async () => {
        vi.mocked(SubjectOfferingsService.getSubjectOfferingById)
            .mockRejectedValueOnce(new Error('no result'))
            .mockResolvedValueOnce({
                subject_offering_id: offeringId,
                department_ids: ['department-id'],
                course_ids: ['course-id'],
                origin_institution_id: childInstitutionId,
                effective_institution_id: childInstitutionId,
            } as any);

        const res = await app.request('/bulk-delete', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                ids: [offeringId],
                institutionId: parentInstitutionId,
            }),
        });

        expect(res.status).toBe(200);
        expect(SubjectOfferingsService.getSubjectOfferingById).toHaveBeenNthCalledWith(
            1,
            {},
            offeringId,
            parentInstitutionId,
        );
        expect(SubjectOfferingsService.getSubjectOfferingById).toHaveBeenNthCalledWith(
            2,
            {},
            offeringId,
        );
        expect(SubjectOfferingsService.deleteSubjectOffering).toHaveBeenCalledWith(
            {},
            offeringId,
            childInstitutionId,
            userId,
        );
    });
});
