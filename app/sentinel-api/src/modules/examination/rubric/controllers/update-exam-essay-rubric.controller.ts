import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { updateExamEssayRubricSchema } from '../rubric.dto';
import { RubricService } from '../services/rubric.service';
import { getExamByIdData } from '../../exams/data/get-exam-by-id';
import { requireExamRecord } from '../../exams/services/require-exam-record.service';
import { resolveAssessmentReadScope } from '../../assessment/assessment-access';
import { requireActivePermission } from '../../../../lib/permissions';
import { LogsService } from '../../../general/logs/logs.service';
import { findActiveExamRubric } from '../data/find-active-exam-rubric';
import { type EssayRubricDefinition } from '@sentinel/shared';

export const updateExamEssayRubricRoute = createRoute({
    method: 'post',
    path: '/exams/{examId}',
    tags: ['Essay Rubric'],
    summary: 'Update or customize the essay rubric override for an exam',
    request: {
        params: updateExamEssayRubricSchema.params,
        body: {
            content: {
                'application/json': {
                    schema: updateExamEssayRubricSchema.body,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Exam essay rubric override updated successfully',
            content: {
                'application/json': {
                    schema: updateExamEssayRubricSchema.response,
                },
            },
        },
    },
});

export const updateExamEssayRubricRouteHandler: AppRouteHandler<
    typeof updateExamEssayRubricRoute
> = async (c) => {
    const { examId } = c.req.valid('param');
    const { criteria } = c.req.valid('json');
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

    // Find currently active override to log old/new IDs
    const previousOverride = await findActiveExamRubric(dbClient, examId);

    const definition: EssayRubricDefinition = { criteria };

    const newVersion = await RubricService.createEssayRubricVersion(
        dbClient,
        'EXAM_OVERRIDE',
        examId,
        definition,
        user.id,
    );

    // Emit audit log
    await LogsService.createLog(dbClient, {
        userId: user.id,
        action: 'essay_rubric.exam_override_updated',
        resourceType: 'exam',
        resourceId: examId,
        activeInstitutionId: institutionId ?? '',
        details: {
            previousRubricVersionId: previousOverride?.rubric_version_id || null,
            newRubricVersionId: newVersion.rubric_version_id,
            versionNumber: newVersion.version_number,
        },
    });

    return c.json(
        {
            message: 'Exam essay rubric override updated successfully',
            data: {
                rubricVersionId: newVersion.rubric_version_id,
                versionNumber: newVersion.version_number,
                scope: newVersion.scope,
                definition: newVersion.definition as unknown as EssayRubricDefinition,
            },
        },
        200,
    );
};
