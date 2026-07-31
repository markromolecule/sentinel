import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { getEffectiveEssayRubricSchema } from '../rubric.dto';
import { RubricService } from '../services/rubric.service';
import { getExamByIdData } from '../../exams/data/get-exam-by-id';
import { requireExamRecord } from '../../exams/services/require-exam-record.service';
import {
    resolveAssessmentReadScope,
    assertAssessmentReadAccess,
} from '../../assessment/assessment-access';
import { hasActivePermission } from '../../../../lib/permissions';

export const getEffectiveEssayRubricRoute = createRoute({
    method: 'get',
    path: '/exams/{examId}',
    tags: ['Essay Rubric'],
    summary: 'Get the effective essay rubric for an exam',
    request: {
        params: getEffectiveEssayRubricSchema.params,
    },
    responses: {
        200: {
            description: 'Effective essay rubric resolved successfully',
            content: {
                'application/json': {
                    schema: getEffectiveEssayRubricSchema.response,
                },
            },
        },
    },
});

export const getEffectiveEssayRubricRouteHandler: AppRouteHandler<
    typeof getEffectiveEssayRubricRoute
> = async (c) => {
    const { examId } = c.req.valid('param');
    const dbClient = c.get('dbClient');
    const user = c.get('user');
    const supabaseUser = c.get('supabaseUser') as any;

    const { institutionId, instructorUserId } = await resolveAssessmentReadScope({
        dbClient,
        user,
        claimedRole: supabaseUser?.user_metadata?.role,
        contextInstitutionId: c.get('institutionId'),
        activePermissionKeys: c.get('activePermissionKeys'),
    });

    // Enforce authenticated staff read access
    assertAssessmentReadAccess(c);

    // Verify exam exists and is scoped/accessible
    requireExamRecord(
        await getExamByIdData({
            dbClient,
            id: examId,
            institutionId,
            staffUserId: instructorUserId,
            applyStaffVisibility: Boolean(instructorUserId),
        }),
    );

    const rubric = await RubricService.resolveEffectiveEssayRubric(dbClient, examId);

    // Add canOverride capability flag
    const canOverride = hasActivePermission(c, 'examinations:override_essay_rubric');

    return c.json(
        {
            message: 'Effective essay rubric resolved successfully',
            data: {
                ...rubric,
                canOverride,
            },
        },
        200,
    );
};
