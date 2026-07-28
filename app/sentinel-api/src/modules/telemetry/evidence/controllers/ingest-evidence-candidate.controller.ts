import { createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import { type AppRouteHandler } from '../../../../types/hono';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { ingestEvidenceCandidateSchema } from '../evidence.dto';
import { EvidenceCandidateService } from '../services/evidence-candidate.service';

export const ingestEvidenceCandidateRoute = createRoute({
    method: 'post',
    path: '/evidence/candidates',
    tags: ['Telemetry Evidence'],
    summary: 'Ingest MediaPipe Evidence Candidate',
    description:
        'Persists a MediaPipe telemetry occurrence and returns the authoritative evidence upload decision.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: ingestEvidenceCandidateSchema.body,
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: ingestEvidenceCandidateSchema.response,
                },
            },
            description: 'Candidate processed successfully.',
        },
        400: {
            description: 'Bad Request - invalid candidate payload.',
        },
        403: {
            description: 'Forbidden - student context mismatch.',
        },
        500: {
            description: 'Internal Server Error.',
        },
    },
});

export const ingestEvidenceCandidateRouteHandler: AppRouteHandler<
    typeof ingestEvidenceCandidateRoute
> = async (c) => {
    try {
        const body = c.req.valid('json');
        const user = c.get('user');

        if (body.studentId !== user.id) {
            throw new HTTPException(403, {
                message: 'Telemetry evidence candidate student does not match the authenticated user.',
            });
        }

        const result = await EvidenceCandidateService.process(c.get('dbClient'), body, user.id);
        return c.json(result, 200);
    } catch (error: any) {
        return respondWithRouteError(c, error, 'Ingest Evidence Candidate Error:');
    }
};
