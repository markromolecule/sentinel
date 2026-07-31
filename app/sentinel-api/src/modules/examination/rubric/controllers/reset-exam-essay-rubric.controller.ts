import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { resetExamEssayRubricSchema } from '../rubric.dto';
import { RubricService } from '../services/rubric.service';
import { deactivateActiveRubric } from '../data/deactivate-active-rubric';
import { getExamByIdData } from '../../exams/data/get-exam-by-id';
import { requireExamRecord } from '../../exams/services/require-exam-record.service';
import { resolveAssessmentReadScope } from '../../assessment/assessment-access';
import { requireActivePermission } from '../../../../lib/permissions';
import { LogsService } from '../../../general/logs/logs.service';
import { findActiveExamRubric } from '../data/find-active-exam-rubric';

export const resetExamEssayRubricRoute = createRoute({
    method: 'delete',
    path: '/exams/{examId}',
    tags: ['Essay Rubric'],
    summary: 'Reset the essay rubric override for an exam to inherit baseline',
    request: {
        params: resetExamEssayRubricSchema.params,
    },
    responses: {
        200: {
            description: 'Exam essay rubric override reset successfully',
            content: {
                'application/json': {
                    schema: resetExamEssayRubricSchema.response,
                },
            },
        },
    },
});

export const resetExamEssayRubricRouteHandler: AppRouteHandler<
    typeof resetExamEssayRubricRoute
> = async (c) => {
    const { examId } = c.req.valid('param');
    const dbClient = c.get('dbClient');
    const user = c.get('user');
    const supabaseUser = c.get('supabaseUser') as any;

    // Enforce active permission examinations:override_essay_rubric
    requireActivePermission(c, 'examinations:override_essay_rubric');

    const { institutionId, instructorUserId } = await resolveAssessmentReadScope({
        dbClient,
        user,
        claimedRole: supabaseUser?.user_metadata?.role,
        contextInstitutionId: c.get('institutionId'),
        activePermissionKeys: c.get('activePermissionKeys'),
    });

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

    // Lock and deactivate the active override
    const activeOverride = await findActiveExamRubric(dbClient, examId);
    let deactivatedId: string | null = null;
    if (activeOverride) {
        deactivatedId = await RubricService.executeWithTransactionFallback(
            dbClient,
            async (trx) => {
                return await deactivateActiveRubric({
                    dbClient: trx,
                    scope: 'EXAM_OVERRIDE',
                    examId,
                });
            },
        );
    }

    // Resolve the now-effective rubric
    const resolvedRubric = await RubricService.resolveEffectiveEssayRubric(dbClient, examId);

    // Emit audit log
    await LogsService.createLog(dbClient, {
        userId: user.id,
        action: 'essay_rubric.exam_override_reset',
        resourceType: 'exam',
        resourceId: examId,
        activeInstitutionId: institutionId ?? '',
        details: {
            deactivatedRubricVersionId: deactivatedId,
            effectiveRubricVersionId: resolvedRubric.rubricVersionId,
            effectiveSource: resolvedRubric.source,
        },
    });

    return c.json(
        {
            message: 'Exam essay rubric override reset successfully',
            data: resolvedRubric,
        },
        200,
    );
};
