import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { completeEvidenceUploadSchema } from '../evidence.dto';
import { EvidenceUploadService } from '../services/evidence-upload.service';

export const completeEvidenceUploadRoute = createRoute({
    method: 'post',
    path: '/evidence/{evidenceId}/complete',
    tags: ['Telemetry Evidence'],
    summary: 'Complete Evidence Upload',
    description: 'Completes and validates the evidence file upload.',
    request: {
        params: completeEvidenceUploadSchema.params,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: completeEvidenceUploadSchema.response,
                },
            },
            description: 'Evidence upload successfully completed and verified.',
        },
        400: {
            description: 'Bad Request - size or MIME mismatch.',
        },
        403: {
            description: 'Forbidden - unauthorized access.',
        },
        404: {
            description: 'Not Found - evidence record not found.',
        },
        500: {
            description: 'Internal Server Error.',
        },
    },
});

export const completeEvidenceUploadRouteHandler: AppRouteHandler<
    typeof completeEvidenceUploadRoute
> = async (c) => {
    try {
        const { evidenceId } = c.req.valid('param');
        const user = c.get('user');

        const result = await EvidenceUploadService.completeUpload(
            c.get('dbClient'),
            evidenceId,
            user.id,
        );

        return c.json(
            {
                evidenceId: result.evidenceId,
                state: result.state,
                expiresAt: result.expiresAt.toISOString(),
            },
            200,
        );
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Complete Evidence Upload Error:');
    }
};
