import { createRoute, z } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { LogsService } from '../../../logs/logs.service';
import { PdfStorageService } from '../../storage/pdf-storage.service';
import {
    requireAllPdfDocumentPermissions,
} from '../../services/pdf-document-authorization.service';
import {
    type AssessmentAllowedRole,
    assertAssessmentAccess,
    resolveAssessmentActorRole,
    resolveAssessmentInstitutionId,
} from '../../../../examination/assessment/assessment-access';
import { getReportingExamContext } from '../../../../examination/reporting/services/get-reporting-exam-context';

export const getExamReportExportDownloadRoute = createRoute({
    method: 'get',
    path: '/exam-reports/:exportId/download',
    tags: ['PDF Documents', 'Exam Reports'],
    summary: 'Get signed download URL for an exam results report export',
    description:
        'Generates a short-lived (5-minute) signed URL to download the requested private exam results report PDF. ' +
        'Requires examinations:export_results_report permission.',
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
        400: { description: 'Export is not READY' },
        403: { description: 'Forbidden' },
        404: { description: 'Export not found' },
        410: { description: 'Export has expired' },
        500: { description: 'Internal server error' },
    },
});

export const getExamReportExportDownloadHandler: AppRouteHandler<
    typeof getExamReportExportDownloadRoute
> = async (c) => {
    const user = c.get('user');
    const dbClient = c.get('dbClient');
    const supabaseUser = c.get('supabaseUser') as any;

    requireAllPdfDocumentPermissions({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: ['examinations:export_results_report'],
        missingPermissionMessage: 'Forbidden. Missing examinations:export_results_report permission.',
    });

    const { exportId } = c.req.valid('param');

    // Resolve viewer role & assess access rights
    const resolvedRole = await resolveAssessmentActorRole({
        dbClient,
        userId: user?.id,
        claimedRole: supabaseUser?.user_metadata?.role,
    });

    assertAssessmentAccess(resolvedRole);
    const role = resolvedRole as AssessmentAllowedRole;

    const userInstitutionId = resolveAssessmentInstitutionId({
        role,
        contextInstitutionId: c.get('institutionId'),
    });

    try {
        const row = await dbClient
            .selectFrom('exam_report_exports')
            .selectAll()
            .where('export_id', '=', exportId)
            .executeTakeFirst();

        if (!row) {
            return c.json({ success: false, error: 'Export record not found.' }, 404 as any);
        }

        // Enforce institution & exam visibility
        try {
            await getReportingExamContext({
                dbClient,
                examId: row.exam_id,
                institutionId: userInstitutionId || undefined,
                viewerRole: role,
                userId: user?.id,
            });
        } catch {
            return c.json({ success: false, error: 'Export record not found.' }, 404 as any);
        }

        const now = new Date();
        const isExpired = row.status === 'EXPIRED' || (row.expires_at && new Date(row.expires_at) < now);

        if (isExpired) {
            return c.json(
                { success: false, error: 'Exam report has expired and is no longer available.' },
                410 as any,
            );
        }

        if (row.status !== 'READY' || !row.storage_path || !row.storage_bucket) {
            return c.json(
                { success: false, error: 'Exam report PDF is not ready for download.' },
                400 as any,
            );
        }

        // Audit log download (identifiers only)
        try {
            await LogsService.createLog(dbClient, {
                userId: user.id,
                action: 'EXAM_REPORT_EXPORT_DOWNLOADED',
                activeInstitutionId: row.institution_id,
                details: { exportId, examId: row.exam_id },
            });
        } catch (logErr: any) {
            console.warn('[ExamReport] Audit log failed for download:', logErr.message);
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
