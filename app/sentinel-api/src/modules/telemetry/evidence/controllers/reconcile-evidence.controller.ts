import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { respondWithRouteError } from '../../../../lib/route-error-response';
import { reconcileEvidenceSchema } from '../evidence.dto';
import { EvidenceReconciliationService } from '../services/evidence-reconciliation.service';
import { SystemLogsService } from '../../../general/logs/services/system-logs.service';
import { HTTPException } from 'hono/http-exception';

export const reconcileEvidenceRoute = createRoute({
    method: 'post',
    path: '/internal/evidence/reconcile',
    tags: ['Telemetry Evidence'],
    summary: 'Reconcile Telemetry Evidence',
    description:
        'Internal endpoint to clean up stale uploads, expired retention files, and deleted coordinates.',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: reconcileEvidenceSchema.response,
                },
            },
            description: 'Evidence reconciliation completed successfully.',
        },
        401: {
            description: 'Unauthorized - invalid or missing cron secret.',
        },
        500: {
            description: 'Internal Server Error.',
        },
    },
});

export const reconcileEvidenceRouteHandler: AppRouteHandler<
    typeof reconcileEvidenceRoute
> = async (c) => {
    try {
        const authHeader = c.req.header('Authorization');
        const cronSecret = process.env.TELEMETRY_CRON_SECRET || process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            throw new HTTPException(401, { message: 'Unauthorized cron access.' });
        }

        if (!cronSecret) {
            console.warn(
                '[EvidenceReconcile] Warning: No cron secret configured (TELEMETRY_CRON_SECRET or CRON_SECRET).',
            );
        }

        const result = await EvidenceReconciliationService.reconcileEvidence(c.get('dbClient'));

        try {
            await SystemLogsService.logSystemEvent(c.get('dbClient'), {
                action: 'telemetry_evidence.reconcile_success',
                details: {
                    message: 'Evidence reconciliation completed successfully.',
                    ...result,
                },
            });
        } catch (logError) {
            console.error('[EvidenceReconcile] Failed to create system log:', logError);
        }

        return c.json(result, 200);
    } catch (error: any) {
        try {
            await SystemLogsService.logSystemEvent(c.get('dbClient'), {
                action: 'telemetry_evidence.reconcile_failure',
                details: {
                    error: error?.message || String(error),
                },
            });
        } catch (logError) {
            console.error('[EvidenceReconcile] Failed to log failure:', logError);
        }

        return respondWithRouteError(c, error, 'Reconcile Evidence Error:');
    }
};
