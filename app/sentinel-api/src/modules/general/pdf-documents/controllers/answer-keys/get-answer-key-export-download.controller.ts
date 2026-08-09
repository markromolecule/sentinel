import { createRoute, z } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { LogsService } from '../../../logs/logs.service';
import { PdfStorageService } from '../../storage/pdf-storage.service';
import {
    canAccessPdfInstitutionScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';
import { assertInstructorExamAccess } from '../../../../examination/assign/services/exam-access.service';

export const getAnswerKeyExportDownloadRoute = createRoute({
    method: 'get',
    path: '/answer-keys/:exportId/download',
    tags: ['PDF Documents', 'Answer Keys'],
    summary: 'Get signed download URL for an answer key export',
    description:
        'Generates a short-lived (5-minute) signed URL to download the requested private answer-key PDF. ' +
        'Requires examinations:export_answer_key permission.',
    request: {
        params: z.object({ exportId: z.string().uuid() }),
    },
    responses: {
        200: {
            description: 'Signed download URL',
            content: {
                'application/json': {
                    schema: z.object({
                        success: z.boolean(),
                        downloadUrl: z.string().url(),
                    }),
                },
            },
        },
        400: { description: 'Export is not READY, coordinates missing or expired' },
        403: { description: 'Forbidden' },
        404: { description: 'Export not found' },
        500: { description: 'Internal server error' },
    },
});

export const getAnswerKeyExportDownloadHandler: AppRouteHandler<
    typeof getAnswerKeyExportDownloadRoute
> = async (c) => {
    const user = c.get('user');
    const dbClient = c.get('dbClient');
    const supabaseUser = c.get('supabaseUser') as any;
    const role = c.get('role') || supabaseUser?.user_metadata?.role;

    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: 'examinations:export_answer_key',
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
            return c.json({ success: false, error: 'Export record not found.' }, 404 as any);
        }

        // Instructor scope check
        if (role === 'instructor') {
            try {
                await assertInstructorExamAccess({
                    dbClient,
                    examId: row.exam_id,
                    userId: user.id,
                });
            } catch {
                return c.json({ success: false, error: 'Export record not found.' }, 404 as any);
            }
        }

        // Validate state transitions & coordinates
        if (row.status !== 'READY') {
            return c.json(
                {
                    success: false,
                    error: `Lifecycle conflict: export status is ${row.status}, expected READY.`,
                },
                400 as any,
            );
        }

        if (!row.storage_path || !row.storage_bucket) {
            return c.json(
                { success: false, error: 'Lifecycle conflict: missing PDF storage coordinates.' },
                400 as any,
            );
        }

        if (row.expires_at && new Date() > new Date(row.expires_at)) {
            return c.json(
                { success: false, error: 'Lifecycle conflict: answer key download has expired.' },
                400 as any,
            );
        }

        // Audit log download
        try {
            await LogsService.createLog(dbClient, {
                userId: user.id,
                action: 'ANSWER_KEY_EXPORT_DOWNLOADED',
                activeInstitutionId: row.institution_id,
                details: { exportId, examId: row.exam_id },
            });
        } catch (logErr: any) {
            console.warn('[AnswerKey] Audit log failed for download:', logErr.message);
        }

        // Generate signed URL (5 minutes = 300 seconds)
        const signedUrl = await PdfStorageService.createSignedUrl(
            row.storage_bucket,
            row.storage_path,
            300,
        );

        return c.json({ success: true, downloadUrl: signedUrl }) as any;
    } catch (e: any) {
        return c.json(
            { success: false, error: e.message || 'Error resolving download.' },
            500 as any,
        );
    }
};
