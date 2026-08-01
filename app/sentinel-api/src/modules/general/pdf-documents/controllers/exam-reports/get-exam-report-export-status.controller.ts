import { createRoute, z } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { examResultsReportExportRecordSchema } from '../../pdf-documents.dto';
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

export const getExamReportExportStatusRoute = createRoute({
    method: 'get',
    path: '/exam-reports/:exportId/status',
    tags: ['PDF Documents', 'Exam Reports'],
    summary: 'Get exam results report export status',
    description:
        'Retrieves the current processing status of an exam results report export. ' +
        'Requires examinations:export_results_report permission.',
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
                        data: examResultsReportExportRecordSchema,
                    }),
                },
            },
        },
        403: { description: 'Forbidden' },
        404: { description: 'Export not found' },
        500: { description: 'Internal server error' },
    },
});

export const getExamReportExportStatusHandler: AppRouteHandler<
    typeof getExamReportExportStatusRoute
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
            // Return 404 rather than leaking existence when scope checks fail
            return c.json({ success: false, error: 'Export record not found.' }, 404 as any);
        }

        const data: z.infer<typeof examResultsReportExportRecordSchema> = {
            exportId: row.export_id,
            examId: row.exam_id,
            institutionId: row.institution_id,
            templateId: row.template_id ?? null,
            status: row.status as any,
            failureCode: row.failure_code ?? null,
            failureMessage: row.failure_message ?? null,
            retryCount: row.retry_count,
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
            expiresAt: row.expires_at
                ? row.expires_at instanceof Date
                    ? row.expires_at.toISOString()
                    : String(row.expires_at)
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
