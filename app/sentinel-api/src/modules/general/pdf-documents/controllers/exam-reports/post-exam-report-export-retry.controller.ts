import { createRoute, z } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { executeTransaction } from '@sentinel/db';
import { pdfGenerationQueueService } from '../../queue/pdf-generation-queue.service';
import { LogsService } from '../../../logs/logs.service';
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

export const postExamReportExportRetryRoute = createRoute({
    method: 'post',
    path: '/exam-reports/:exportId/retry',
    tags: ['PDF Documents', 'Exam Reports'],
    summary: 'Retry a failed exam results report export',
    description:
        'Resets a FAILED exam results report export to PENDING and requeues the generation job. ' +
        'Requires examinations:export_results_report permission.',
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

export const postExamReportExportRetryHandler: AppRouteHandler<
    typeof postExamReportExportRetryRoute
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
        const result = await executeTransaction(async (trx) => {
            const row = await trx
                .selectFrom('exam_report_exports')
                .selectAll()
                .where('export_id', '=', exportId)
                .forUpdate()
                .executeTakeFirst();

            if (!row) {
                return { success: false, status: 404, error: 'Export record not found.' };
            }

            // Enforce institution & exam visibility
            try {
                await getReportingExamContext({
                    dbClient: trx,
                    examId: row.exam_id,
                    institutionId: userInstitutionId || undefined,
                    viewerRole: role,
                    userId: user?.id,
                });
            } catch {
                return { success: false, status: 404, error: 'Export record not found.' };
            }

            if (row.status !== 'FAILED') {
                return {
                    success: false,
                    status: 400,
                    error: `Cannot retry export in status: ${row.status}. Only FAILED exports can be retried.`,
                };
            }

            await trx
                .updateTable('exam_report_exports')
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
                    action: 'EXAM_REPORT_EXPORT_RETRIED',
                    activeInstitutionId: result.institutionId,
                    details: { exportId },
                });
            } catch (logErr: any) {
                console.warn('[ExamReport] Audit log failed for retry:', logErr.message);
            }
        }

        await pdfGenerationQueueService.submitPdfJob(exportId, 'EXAM_RESULTS_REPORT');

        return c.json({
            success: true,
            message: 'Exam report export retry queued successfully.',
        }) as any;
    } catch (e: any) {
        return c.json(
            { success: false, error: e.message || 'Failed to retry exam report export.' },
            500 as any,
        );
    }
};
