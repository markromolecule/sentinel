import { createRoute, z } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { executeTransaction } from '@sentinel/db';
import { pdfGenerationQueueService } from '../../queue/pdf-generation-queue.service';
import { LogsService } from '../../../logs/logs.service';
import {
    canAccessPdfInstitutionScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';

export const postAnswerKeyExportRetryRoute = createRoute({
    method: 'post',
    path: '/answer-keys/:exportId/retry',
    tags: ['PDF Documents', 'Answer Keys'],
    summary: 'Retry a failed answer key export',
    description:
        'Resets a FAILED answer-key export to PENDING and requeues the generation job. ' +
        'Requires support role and pdf_templates:manage or reports:generate permission.',
    request: {
        params: z.object({ exportId: z.string().uuid() }),
    },
    responses: {
        200: {
            description: 'Retry queued',
            content: {
                'application/json': {
                    schema: z.object({ success: z.boolean(), message: z.string() }),
                },
            },
        },
        400: { description: 'Export is not in a FAILED state' },
        403: { description: 'Forbidden' },
        404: { description: 'Export not found' },
        500: { description: 'Internal server error' },
    },
});

export const postAnswerKeyExportRetryHandler: AppRouteHandler<
    typeof postAnswerKeyExportRetryRoute
> = async (c) => {
    const user = c.get('user');
    const dbClient = c.get('dbClient');

    requirePdfDocumentAccess({
        role: c.get('role'),
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: ['pdf_templates:manage', 'reports:generate'],
        missingRoleMessage: 'Forbidden. Support role required.',
        missingPermissionMessage: 'Forbidden. Insufficient privileges.',
    });

    const { exportId } = c.req.valid('param');

    try {
        const result = await executeTransaction(async (trx) => {
            const row = await trx
                .selectFrom('exam_answer_key_exports')
                .selectAll()
                .where('export_id', '=', exportId)
                .forUpdate()
                .executeTakeFirst();

            if (!row) {
                return { success: false, status: 404, error: 'Export record not found.' };
            }

            const userInstitutionId = c.get('institutionId');
            if (
                !(await canAccessPdfInstitutionScope(
                    dbClient,
                    userInstitutionId,
                    row.institution_id,
                ))
            ) {
                return {
                    success: false,
                    status: 403,
                    error: "Forbidden. Cannot retry another institution's answer key export.",
                };
            }

            if (row.status !== 'FAILED') {
                return {
                    success: false,
                    status: 400,
                    error: `Cannot retry export in status: ${row.status}. Only FAILED exports can be retried.`,
                };
            }

            await trx
                .updateTable('exam_answer_key_exports')
                .set({
                    status: 'PENDING',
                    failure_code: null,
                    failure_message: null,
                    updated_at: new Date(),
                })
                .where('export_id', '=', exportId)
                .execute();

            return { success: true, institutionId: row.institution_id };
        });

        if (!result.success) {
            return c.json({ success: false, error: result.error }, result.status as any) as any;
        }

        if (result.institutionId) {
            try {
                await LogsService.createLog(dbClient, {
                    userId: user.id,
                    action: 'ANSWER_KEY_EXPORT_RETRIED',
                    activeInstitutionId: result.institutionId,
                    details: { exportId },
                });
            } catch (logErr: any) {
                console.warn('[AnswerKey] Audit log failed for retry:', logErr.message);
            }
        }

        await pdfGenerationQueueService.submitPdfJob(exportId, 'EXAM_ANSWER_KEY');

        return c.json({
            success: true,
            message: 'Answer key export retry queued successfully.',
        }) as any;
    } catch (e: any) {
        return c.json(
            { success: false, error: e.message || 'Failed to retry answer key export.' },
            500 as any,
        );
    }
};
