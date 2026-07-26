import { createRoute, z } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { PdfStorageService } from '../../storage/pdf-storage.service';
import { LogsService } from '../../../logs/logs.service';
import {
    canAccessPdfInstitutionScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';

export const deleteAnswerKeyExportRoute = createRoute({
    method: 'delete',
    path: '/answer-keys/:exportId',
    tags: ['PDF Documents', 'Answer Keys'],
    summary: 'Delete an answer key export',
    description:
        'Removes the export record and purges the private storage object. ' +
        'Requires support role and pdf_templates:manage permission.',
    request: {
        params: z.object({ exportId: z.string().uuid() }),
    },
    responses: {
        200: {
            description: 'Export deleted',
            content: {
                'application/json': {
                    schema: z.object({ success: z.boolean(), message: z.string() }),
                },
            },
        },
        403: { description: 'Forbidden' },
        404: { description: 'Export not found' },
        500: { description: 'Internal server error' },
    },
});

export const deleteAnswerKeyExportHandler: AppRouteHandler<
    typeof deleteAnswerKeyExportRoute
> = async (c) => {
    const user = c.get('user');
    const dbClient = c.get('dbClient');

    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: 'pdf_templates:manage',
        missingPermissionMessage: 'Forbidden. Missing pdf_templates:manage permission.',
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

        // Delete private storage object first (if present)
        if (row.storage_bucket && row.storage_path) {
            try {
                await PdfStorageService.deletePdf(row.storage_bucket, row.storage_path);
            } catch (storageErr: any) {
                console.warn(
                    `[AnswerKey] Storage delete failed for ${exportId}:`,
                    storageErr.message,
                );
                // Proceed with DB deletion even if storage fails — orphan object reconciliation is operational
            }
        }

        // Delete the DB record
        await dbClient
            .deleteFrom('exam_answer_key_exports')
            .where('export_id', '=', exportId)
            .execute();

        // Audit log
        try {
            await LogsService.createLog(dbClient, {
                userId: user.id,
                action: 'ANSWER_KEY_EXPORT_DELETED',
                activeInstitutionId: row.institution_id,
                details: { exportId, examId: row.exam_id },
            });
        } catch (logErr: any) {
            console.warn('[AnswerKey] Audit log failed for delete:', logErr.message);
        }

        return c.json({ success: true, message: 'Answer key export deleted successfully.' }) as any;
    } catch (e: any) {
        return c.json(
            { success: false, error: e.message || 'Failed to delete answer key export.' },
            500 as any,
        );
    }
};
