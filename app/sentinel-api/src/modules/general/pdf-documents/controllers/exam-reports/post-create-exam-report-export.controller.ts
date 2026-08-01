import { createRoute } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { pdfGenerationQueueService } from '../../queue/pdf-generation-queue.service';
import { resolvePdfTemplate } from '../../services/resolve-pdf-template.service';
import { LogsService } from '../../../logs/logs.service';
import { requireAllPdfDocumentPermissions } from '../../services/pdf-document-authorization.service';
import {
    type AssessmentAllowedRole,
    assertAssessmentAccess,
    resolveAssessmentActorRole,
    resolveAssessmentInstitutionId,
} from '../../../../examination/assessment/assessment-access';
import { getReportingExamContext } from '../../../../examination/reporting/services/get-reporting-exam-context';
import {
    createExamResultsReportExportBodySchema,
    createExamResultsReportExportResponseSchema,
} from '../../pdf-documents.dto';

export const postCreateExamReportExportRoute = createRoute({
    method: 'post',
    path: '/exam-reports',
    tags: ['PDF Documents', 'Exam Reports'],
    summary: 'Generate an examination results report PDF',
    description:
        'Creates a PENDING exam report export record and enqueues PDF generation. ' +
        'Requires examinations:export_results_report permission.',
    request: {
        body: {
            content: { 'application/json': { schema: createExamResultsReportExportBodySchema } },
        },
    },
    responses: {
        202: {
            description: 'Exam report export accepted and queued',
            content: {
                'application/json': { schema: createExamResultsReportExportResponseSchema },
            },
        },
        400: { description: 'Validation error or exam not found' },
        403: { description: 'Forbidden — permission missing' },
        404: { description: 'Exam or institution not found' },
        500: { description: 'Internal server error' },
    },
});

export const postCreateExamReportExportHandler: AppRouteHandler<
    typeof postCreateExamReportExportRoute
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

    const body = c.req.valid('json');

    // Resolve viewer role & assess access rights
    const resolvedRole = await resolveAssessmentActorRole({
        dbClient,
        userId: user?.id,
        claimedRole: supabaseUser?.user_metadata?.role,
    });

    assertAssessmentAccess(resolvedRole);
    const role = resolvedRole as AssessmentAllowedRole;

    // Load exam context & perform ownership / assignment visibility check
    const exam = await getReportingExamContext({
        dbClient,
        examId: body.exam_id,
        institutionId:
            resolveAssessmentInstitutionId({
                role,
                contextInstitutionId: c.get('institutionId'),
            }) || undefined,
        viewerRole: role,
        userId: user?.id,
    });

    try {
        // Resolve and snapshot the template at request time
        const resolvedTemplate = await resolvePdfTemplate(
            dbClient,
            exam.institutionId!,
            'EXAM_RESULTS_REPORT',
            { persistBuiltInFallback: true },
        );

        // Insert PENDING record
        const insertedRow = await dbClient
            .insertInto('exam_report_exports')
            .values({
                exam_id: body.exam_id,
                institution_id: exam.institutionId!,
                template_id: resolvedTemplate.templateId as any,
                template_snapshot: JSON.stringify(resolvedTemplate) as any,
                status: 'PENDING',
                retry_count: 0,
                created_by: user.id,
                request_snapshot: JSON.stringify({ title: body.title }) as any,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        // Enqueue the generation job
        await pdfGenerationQueueService.submitPdfJob(insertedRow.export_id, 'EXAM_RESULTS_REPORT');

        // Audit log (identifiers only)
        try {
            await LogsService.createLog(dbClient, {
                userId: user.id,
                action: 'EXAM_REPORT_EXPORT_REQUESTED',
                activeInstitutionId: exam.institutionId!,
                details: {
                    exportId: insertedRow.export_id,
                    examId: body.exam_id,
                },
            });
        } catch (logErr: any) {
            console.warn('[ExamReport] Audit log failed for export request:', logErr.message);
        }

        const responseData = {
            exportId: insertedRow.export_id,
            examId: insertedRow.exam_id,
            institutionId: insertedRow.institution_id,
            templateId: insertedRow.template_id,
            status: insertedRow.status as any,
            failureCode: insertedRow.failure_code ?? null,
            failureMessage: insertedRow.failure_message ?? null,
            retryCount: insertedRow.retry_count,
            createdBy: insertedRow.created_by ?? null,
            createdAt: insertedRow.created_at.toISOString(),
            updatedAt: insertedRow.updated_at.toISOString(),
            completedAt: insertedRow.completed_at ? insertedRow.completed_at.toISOString() : null,
            expiresAt: insertedRow.expires_at ? insertedRow.expires_at.toISOString() : null,
        };

        return c.json(
            {
                success: true,
                message: 'Exam report export accepted and queued.',
                data: responseData,
            },
            202 as any,
        );
    } catch (e: any) {
        return c.json(
            { success: false, error: e.message || 'Failed to create exam report export.' },
            500 as any,
        );
    }
};
