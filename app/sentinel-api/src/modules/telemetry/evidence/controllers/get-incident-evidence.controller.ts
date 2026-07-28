import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { getIncidentEvidenceSchema } from '../evidence.dto';
import { EvidenceQueryService } from '../services/evidence-query.service';
import { resolveAssessmentInstitutionId } from '../../../examination/assessment/assessment-access';
import { requireActivePermission } from '../../../../lib/permissions';

export const getIncidentEvidenceRoute = createRoute({
    method: 'get',
    path: '/incidents/{incidentId}/evidence',
    tags: ['Telemetry Evidence'],
    summary: 'Get Incident Evidence',
    description: 'Retrieves all evidence associated with a flagged incident.',
    request: {
        params: getIncidentEvidenceSchema.params,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: getIncidentEvidenceSchema.response,
                },
            },
            description: 'Incident evidence retrieved successfully.',
        },
        403: {
            description: 'Forbidden - user does not have view permission or scope.',
        },
        404: {
            description: 'Not Found - incident not found.',
        },
        500: {
            description: 'Internal Server Error.',
        },
    },
});

export const getIncidentEvidenceRouteHandler: AppRouteHandler<
    typeof getIncidentEvidenceRoute
> = async (c) => {
    try {
        const { incidentId } = c.req.valid('param');
        const supabaseUser = c.get('supabaseUser') as any;
        const role = c.get('role') || supabaseUser?.user_metadata?.role;
        const institutionId = c.get('institutionId');
        const user = c.get('user');

        requireActivePermission(c, 'incidents:view');

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

        const result = await EvidenceQueryService.getIncidentEvidence(
            c.get('dbClient'),
            incidentId,
            scopedInstitutionId,
            userScope,
            user.id,
            ipAddress,
        );

        return c.json(result, 200);
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Get Incident Evidence Error:');
    }
};
