import { createRoute, z } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { PdfStorageService } from '../../storage/pdf-storage.service';
import { LogsService } from '../../../logs/logs.service';
import { requireAllPdfDocumentPermissions } from '../../services/pdf-document-authorization.service';
import {
    type AssessmentAllowedRole,
    assertAssessmentAccess,
    resolveAssessmentActorRole,
    resolveAssessmentInstitutionId,
} from '../../../../examination/assessment/assessment-access';
import { getReportingExamContext } from '../../../../examination/reporting/services/get-reporting-exam-context';

export const deleteExamReportExportRoute = createRoute({
    method: 'delete',
    path: '/exam-reports/:exportId',
    tags: ['PDF Documents', 'Exam Reports'],
    summary: 'Delete an exam results report export',
    description:
        'Removes the export record and purges the private storage object. ' +
        'Requires examinations:export_results_report permission.',
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

export const deleteExamReportExportHandler: AppRouteHandler<
    typeof deleteExamReportExportRoute
> = async (c) => {
    const user = c.get('user');
    const dbClient = c.get('dbClient');
    const supabaseUser = c.get('supabaseUser') as any;

    requireAllPdfDocumentPermissions({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: ['examinations:export_results_report'],
        missingPermissionMessage:
            'Forbidden. Missing examinations:export_results_report permission.',
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

        // Delete private storage object first (if present)
        if (row.storage_bucket && row.storage_path) {
            try {
                await PdfStorageService.deletePdf(row.storage_bucket, row.storage_path);
            } catch (storageErr: any) {
                console.warn(
                    `[ExamReport] Storage delete failed for ${exportId}:`,
                    storageErr.message,
                );
                // Proceed with DB deletion
            }
        }

        // Delete the DB record
        await dbClient
            .deleteFrom('exam_report_exports')
            .where('export_id', '=', exportId)
            .execute();

        // Audit log (identifiers only)
        try {
            await LogsService.createLog(dbClient, {
                userId: user.id,
                action: 'EXAM_REPORT_EXPORT_DELETED',
                activeInstitutionId: row.institution_id,
                details: { exportId, examId: row.exam_id },
            });
        } catch (logErr: any) {
            console.warn('[ExamReport] Audit log failed for delete:', logErr.message);
        }

        return c.json({
            success: true,
            message: 'Exam report export deleted successfully.',
        }) as any;
    } catch (e: any) {
        return c.json(
            { success: false, error: e.message || 'Failed to delete exam report export.' },
            500 as any,
        );
    }
};
