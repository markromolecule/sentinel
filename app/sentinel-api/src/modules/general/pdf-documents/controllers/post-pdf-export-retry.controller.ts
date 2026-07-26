import { createRoute, z } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { executeTransaction } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import { pdfGenerationQueueService } from '../queue/pdf-generation-queue.service';
import { LogsService } from '../../logs/logs.service';
import { requirePdfDocumentAccess } from '../services/pdf-document-authorization.service';

export const postPdfExportRetryRoute = createRoute({
    method: 'post',
    path: '/exports/:exportId/retry',
    request: {
        params: z.object({
            exportId: z.string().uuid(),
        }),
    },
    responses: {
        200: {
            description: 'Successfully queued the PDF export retry',
            content: {
                'application/json': {
                    schema: z.object({
                        success: z.boolean(),
                        message: z.string(),
                    }),
                },
            },
        },
        400: {
            description: 'Invalid UUID format or state does not permit retry',
        },
        403: {
            description: 'Access denied',
        },
        404: {
            description: 'Export record not found',
        },
        500: {
            description: 'Internal server error queueing retry',
        },
    },
    summary: 'Retry a failed PDF generation export',
    description:
        'Triggers a retry for a FAILED PDF generation job by resetting the status and submitting a new job to the queue. Requires support role and pdf_templates:manage permission.',
});

export const postPdfExportRetryHandler: AppRouteHandler<typeof postPdfExportRetryRoute> = async (
    c,
) => {
    const dbClient = c.get('dbClient');
    const user = c.get('user');

    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: ['pdf_templates:manage', 'reports:generate'],
        missingPermissionMessage: 'Forbidden: Insufficient privileges.',
    });

    const { exportId } = c.req.valid('param');

    try {
        const result = await executeTransaction(async (trx) => {
            // Check analytics_reports first
            let record = await trx
                .selectFrom('analytics_reports')
                .selectAll()
                .where('report_id', '=', exportId)
                .forUpdate()
                .executeTakeFirst();

            let documentKind: 'ANALYTICS_OVERALL' | 'EXAM_ANSWER_KEY' = 'ANALYTICS_OVERALL';
            let tableName = 'analytics_reports';
            let idCol = 'report_id';

            if (!record) {
                const answerKeyRecord = await trx
                    .selectFrom('exam_answer_key_exports')
                    .selectAll()
                    .where('export_id', '=', exportId)
                    .forUpdate()
                    .executeTakeFirst();

                if (answerKeyRecord) {
                    record = {
                        ...answerKeyRecord,
                        report_id: answerKeyRecord.export_id,
                    } as any;
                    documentKind = 'EXAM_ANSWER_KEY';
                    tableName = 'exam_answer_key_exports';
                    idCol = 'export_id';
                }
            }

            if (!record) {
                return { success: false, status: 404, error: 'Export record not found.' };
            }

            // Only permit retry if status is FAILED
            if (record.status !== 'FAILED') {
                return {
                    success: false,
                    status: 400,
                    error: `Cannot retry PDF export in status: ${record.status}. Only failed exports can be retried.`,
                };
            }

            // Reset status to PENDING
            const updateSet: any = {
                status: 'PENDING',
                failure_code: null,
                failure_message: null,
            };
            if (tableName !== 'analytics_reports') {
                updateSet.updated_at = new Date();
            }

            await trx
                .updateTable(tableName as any)
                .set(updateSet)
                .where(idCol as any, '=', exportId)
                .execute();

            return { success: true, documentKind, institutionId: record.institution_id };
        });

        if (!result.success) {
            return c.json({ success: false, error: result.error }, result.status as any) as any;
        }

        // Log retry event
        if (result.institutionId) {
            try {
                await LogsService.createLog(dbClient, {
                    userId: user.id,
                    action: 'PDF_EXPORT_RETRIED',
                    activeInstitutionId: result.institutionId,
                    details: {
                        exportId,
                        documentKind: result.documentKind,
                    },
                });
            } catch (logErr: any) {
                console.warn(
                    `[PDFWorker] Audit logging failed for retry of ${exportId}:`,
                    logErr.message,
                );
            }
        }

        // Submit the fresh job to BullMQ
        await pdfGenerationQueueService.submitPdfJob(exportId, result.documentKind!);

        return c.json({
            success: true,
            message: 'PDF export retry queued successfully.',
        }) as any;
    } catch (e: any) {
        if (e instanceof HTTPException) {
            throw e;
        }
        return c.json(
            { success: false, error: e.message || 'Error scheduling retry.' },
            500,
        ) as any;
    }
};
