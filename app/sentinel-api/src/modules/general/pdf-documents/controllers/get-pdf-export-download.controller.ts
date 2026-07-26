import { createRoute, z } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../types/hono';
import { HTTPException } from 'hono/http-exception';
import { PdfStorageService } from '../storage/pdf-storage.service';
import { LogsService } from '../../logs/logs.service';
import { requirePdfDocumentAccess } from '../services/pdf-document-authorization.service';

export const getPdfExportDownloadRoute = createRoute({
    method: 'get',
    path: '/exports/:exportId/download',
    request: {
        params: z.object({
            exportId: z.string().uuid(),
        }),
    },
    responses: {
        200: {
            description: 'Returns temporary signed URL to download PDF artifact',
            content: {
                'application/json': {
                    schema: z.object({
                        success: z.boolean(),
                        downloadUrl: z.string().url(),
                    }),
                },
            },
        },
        400: {
            description: 'Invalid UUID format or missing parameters',
        },
        403: {
            description: 'Access denied',
        },
        404: {
            description: 'Export record not found',
        },
        410: {
            description: 'Exported artifact is expired and has been purged',
        },
        500: {
            description: 'Internal server error resolving download',
        },
    },
    summary: 'Get signed download URL for generated PDF artifact',
    description:
        'Generates a short-lived (5-minute) signed URL to download the requested PDF document from private storage. Requires support role and pdf_templates:view permission.',
});

export const getPdfExportDownloadHandler: AppRouteHandler<
    typeof getPdfExportDownloadRoute
> = async (c) => {
    const dbClient = c.get('dbClient');
    const user = c.get('user');

    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: ['pdf_templates:view', 'reports:export'],
        missingPermissionMessage: 'Forbidden: Insufficient privileges.',
    });

    const { exportId } = c.req.valid('param');

    try {
        // 2. Fetch the export record from either analytics_reports or exam_answer_key_exports
        let record = await dbClient
            .selectFrom('analytics_reports')
            .selectAll()
            .where('report_id', '=', exportId)
            .executeTakeFirst();

        let documentKind = 'ANALYTICS_OVERALL';

        if (!record) {
            const answerKeyRecord = await dbClient
                .selectFrom('exam_answer_key_exports')
                .selectAll()
                .where('export_id', '=', exportId)
                .executeTakeFirst();

            if (answerKeyRecord) {
                record = {
                    ...answerKeyRecord,
                    report_id: answerKeyRecord.export_id,
                } as any;
                documentKind = 'EXAM_ANSWER_KEY';
            }
        }

        if (!record) {
            return c.json({ success: false, error: 'Export record not found.' }, 404) as any;
        }

        // 3. Check expiration
        const isExpired =
            record.status === 'EXPIRED' ||
            (record.expires_at && new Date(record.expires_at).getTime() <= Date.now());

        if (isExpired) {
            return c.json(
                { success: false, error: 'Artifact has expired and was purged.' },
                410,
            ) as any;
        }

        // 4. Verify record is READY
        if (record.status !== 'READY' || !record.storage_path || !record.storage_bucket) {
            return c.json(
                { success: false, error: 'PDF artifact is not ready for download.' },
                400,
            ) as any;
        }

        // Log download event
        if (record.institution_id) {
            try {
                await LogsService.createLog(dbClient, {
                    userId: user.id,
                    action: 'PDF_EXPORT_DOWNLOADED',
                    activeInstitutionId: record.institution_id,
                    details: {
                        exportId,
                        documentKind,
                    },
                });
            } catch (logErr: any) {
                console.warn(
                    `[PDFWorker] Audit logging failed for download of ${exportId}:`,
                    logErr.message,
                );
            }
        }

        // 6. Generate signed URL for 5 minutes (300 seconds)
        const signedUrl = await PdfStorageService.createSignedUrl(
            record.storage_bucket,
            record.storage_path,
            300,
        );

        return c.json({
            success: true,
            downloadUrl: signedUrl,
        }) as any;
    } catch (e: any) {
        if (e instanceof HTTPException) {
            throw e;
        }
        return c.json(
            { success: false, error: e.message || 'Error resolving download.' },
            500,
        ) as any;
    }
};
