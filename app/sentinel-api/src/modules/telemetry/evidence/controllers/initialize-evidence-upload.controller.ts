import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { initializeEvidenceUploadSchema } from '../evidence.dto';
import { EvidenceUploadService } from '../services/evidence-upload.service';

export const initializeEvidenceUploadRoute = createRoute({
    method: 'post',
    path: '/evidence/uploads',
    tags: ['Telemetry Evidence'],
    summary: 'Initialize Evidence Upload',
    description: 'Initializes the upload target for capturing video proctoring evidence.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: initializeEvidenceUploadSchema.body,
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: initializeEvidenceUploadSchema.response,
                },
            },
            description: 'Signed upload target initialized successfully.',
        },
        400: {
            description: 'Bad Request - invalid parameters or quota exceeded.',
        },
        403: {
            description: 'Forbidden - telemetry evidence disabled or student not authorized.',
        },
        409: {
            description: 'Conflict - event ID already exists with different metadata.',
        },
        500: {
            description: 'Internal Server Error.',
        },
    },
});

export const initializeEvidenceUploadRouteHandler: AppRouteHandler<
    typeof initializeEvidenceUploadRoute
> = async (c) => {
    try {
        const body = c.req.valid('json');
        const user = c.get('user');

        const result = await EvidenceUploadService.initializeUpload(c.get('dbClient'), {
            ...body,
            studentUserId: user.id,
        });

        return c.json(
            {
                evidenceId: result.evidenceId,
                uploadUrl: result.uploadUrl,
                uploadToken: result.uploadToken,
                expiresAt: result.expiresAt.toISOString(),
            },
            200,
        );
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Initialize Evidence Upload Error:');
    }
};
