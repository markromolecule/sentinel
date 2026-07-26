import { createRoute, z } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { answerKeyExportRecordSchema } from '../../pdf-documents.dto';
import {
    canAccessPdfInstitutionScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';

export const getAnswerKeyExportStatusRoute = createRoute({
    method: 'get',
    path: '/answer-keys/:exportId/status',
    tags: ['PDF Documents', 'Answer Keys'],
    summary: 'Get answer key export status',
    description:
        'Retrieves the current processing status of an exam answer-key export. ' +
        'Requires support role and pdf_templates:view or reports:view permission.',
    request: {
        params: z.object({ exportId: z.string().uuid() }),
    },
    responses: {
        200: {
            description: 'Export status record',
            content: {
                'application/json': {
                    schema: z.object({
                        success: z.boolean(),
                        data: answerKeyExportRecordSchema,
                    }),
                },
            },
        },
        403: { description: 'Forbidden' },
        404: { description: 'Export not found' },
        500: { description: 'Internal server error' },
    },
});

export const getAnswerKeyExportStatusHandler: AppRouteHandler<
    typeof getAnswerKeyExportStatusRoute
> = async (c) => {
    const dbClient = c.get('dbClient');

    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: ['pdf_templates:view', 'reports:view'],
        missingPermissionMessage: 'Forbidden. Insufficient privileges.',
    });

    const { exportId } = c.req.valid('param');

    try {
        const row = await dbClient
            .selectFrom('exam_answer_key_exports')
            .selectAll()
            .where('export_id', '=', exportId)
            .executeTakeFirst();

        if (!row) {
            return c.json({ success: false, error: 'Export record not found.' }, 404 as any);
        }

        // Institution scope check
        const userInstitutionId = c.get('institutionId');
        if (
            !(await canAccessPdfInstitutionScope(dbClient, userInstitutionId, row.institution_id))
        ) {
            return c.json(
                {
                    success: false,
                    error: "Forbidden: Access denied to this institution's exports.",
                },
                403 as any,
            );
        }

        const data: z.infer<typeof answerKeyExportRecordSchema> = {
            exportId: row.export_id,
            examId: row.exam_id,
            institutionId: row.institution_id,
            templateId: row.template_id ?? null,
            status: row.status as any,
            failureCode: row.failure_code ?? null,
            failureMessage: row.failure_message ?? null,
            retryCount: row.retry_count,
            storageBucket: row.storage_bucket ?? null,
            storagePath: row.storage_path ?? null,
            createdBy: row.created_by ?? null,
            createdAt:
                row.created_at instanceof Date
                    ? row.created_at.toISOString()
                    : String(row.created_at),
            updatedAt:
                row.updated_at instanceof Date
                    ? row.updated_at.toISOString()
                    : String(row.updated_at),
            completedAt: row.completed_at
                ? row.completed_at instanceof Date
                    ? row.completed_at.toISOString()
                    : String(row.completed_at)
                : null,
        };

        return c.json({ success: true, data }) as any;
    } catch (e: any) {
        return c.json(
            { success: false, error: e.message || 'Failed to retrieve export status.' },
            500 as any,
        );
    }
};
