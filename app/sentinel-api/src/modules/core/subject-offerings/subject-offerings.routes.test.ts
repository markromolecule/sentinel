import { beforeEach, describe, expect, it, vi } from 'vitest';
import subjectOfferingsRoutes from './subject-offerings.routes';
import { SubjectOfferingsService } from './subject-offerings.service';

vi.mock('../../../middleware/auth', () => ({
    authMiddleware: vi.fn(async (c, next) => {
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
        c.set('activePermissionKeys', ['subject_offerings:delete']);
        await next();
    }),
}));

vi.mock('./subject-offerings.service', () => ({
    SubjectOfferingsService: {
        getSubjectOfferingById: vi.fn(),
        deleteSubjectOffering: vi.fn(),
    },
}));

describe('subjectOfferingsRoutes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('matches POST /bulk-delete before parameter routes', async () => {
        vi.mocked(SubjectOfferingsService.getSubjectOfferingById).mockResolvedValue({
            subject_offering_id: '33333333-3333-4333-8333-333333333333',
            department_ids: [],
            course_ids: [],
            origin_institution_id: '11111111-1111-4111-8111-111111111111',
            effective_institution_id: '11111111-1111-4111-8111-111111111111',
        } as any);

        const response = await subjectOfferingsRoutes.request('/bulk-delete', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                ids: ['33333333-3333-4333-8333-333333333333'],
                institutionId: '11111111-1111-4111-8111-111111111111',
            }),
        });

        expect(response.status).toBe(200);
        expect(SubjectOfferingsService.deleteSubjectOffering).toHaveBeenCalled();
    });
});
