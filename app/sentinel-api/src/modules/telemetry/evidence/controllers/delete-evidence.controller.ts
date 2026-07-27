import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { deleteEvidenceSchema } from '../evidence.dto';
import { EvidenceDeletionService } from '../services/evidence-deletion.service';
import { resolveAssessmentInstitutionId } from '../../../examination/assessment/assessment-access';
import { requireActivePermission } from '../../../../lib/permissions';

export const deleteEvidenceRoute = createRoute({
    method: 'delete',
    path: '/evidence/{evidenceId}',
    tags: ['Telemetry Evidence'],
    summary: 'Delete Evidence',
    description: 'Marks an evidence record as deleted and cleans up its storage objects.',
    request: {
        params: deleteEvidenceSchema.params,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: deleteEvidenceSchema.response,
                },
            },
            description: 'Evidence successfully marked as deleted and storage objects cleared.',
        },
        403: {
            description: 'Forbidden - user does not have review permission or scope.',
        },
        404: {
            description: 'Not Found - evidence record not found.',
        },
        500: {
            description: 'Internal Server Error.',
        },
    },
});

export const deleteEvidenceRouteHandler: AppRouteHandler<
    typeof deleteEvidenceRoute
> = async (c) => {
    try {
        const { evidenceId } = c.req.valid('param');
        const supabaseUser = c.get('supabaseUser') as any;
        const role = c.get('role') || supabaseUser?.user_metadata?.role;
        const institutionId = c.get('institutionId');
        const user = c.get('user');

        requireActivePermission(c, 'incidents:review');

        const scopedInstitutionId = resolveAssessmentInstitutionId({
            role,
            contextInstitutionId: institutionId,
        });

        const userScope = {
            role,
            userId: user.id,
            departmentId: user?.user_profiles?.department_id ?? null,
            courseId: user?.user_profiles?.course_id ?? null,
        };

        const ipAddress = c.req.header('x-forwarded-for') || null;

        await EvidenceDeletionService.deleteEvidence(
            c.get('dbClient'),
            evidenceId,
            scopedInstitutionId,
            userScope,
            user.id,
            ipAddress,
        );

        return c.json(
            {
                success: true,
                message: 'Evidence successfully marked as DELETED and storage objects converged.',
            },
            200,
        );
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Delete Evidence Error:');
    }
};
