import { createRoute, z } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { pdfGenerationQueueService } from '../../queue/pdf-generation-queue.service';
import { resolvePdfTemplate } from '../../services/resolve-pdf-template.service';
import { LogsService } from '../../../logs/logs.service';
import {
    canAccessPdfInstitutionScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';
import {
    createAnswerKeyExportBodySchema,
    createAnswerKeyExportResponseSchema,
} from '../../pdf-documents.dto';
import { assertInstructorExamAccess } from '../../../../examination/assign/services/exam-access.service';
import { HTTPException } from 'hono/http-exception';

export const postCreateAnswerKeyExportRoute = createRoute({
    method: 'post',
    path: '/answer-keys',
    tags: ['PDF Documents', 'Answer Keys'],
    summary: 'Generate an examination answer key PDF',
    description:
        'Creates a PENDING answer-key export record and enqueues PDF generation. ' +
        'Requires examinations:export_answer_key permission.',
    request: {
        body: {
            content: { 'application/json': { schema: createAnswerKeyExportBodySchema } },
        },
    },
    responses: {
        202: {
            description: 'Answer key export accepted and queued',
            content: { 'application/json': { schema: createAnswerKeyExportResponseSchema } },
        },
        400: { description: 'Validation error or exam not found in institution' },
        403: { description: 'Forbidden — permission missing' },
        404: { description: 'Exam or institution not found' },
        500: { description: 'Internal server error' },
    },
});

export const postCreateAnswerKeyExportHandler: AppRouteHandler<
    typeof postCreateAnswerKeyExportRoute
> = async (c) => {
    const user = c.get('user');
    const dbClient = c.get('dbClient');
    const supabaseUser = c.get('supabaseUser') as any;
    const role = c.get('role') || supabaseUser?.user_metadata?.role;

    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: 'examinations:export_answer_key',
        missingPermissionMessage: 'Forbidden. Missing examinations:export_answer_key permission.',
    });

    const body = c.req.valid('json');
    const userInstitutionId = c.get('institutionId');

    try {
        // Validate exam exists
        const exam = await dbClient
            .selectFrom('exams')
            .select(['exam_id', 'title', 'institution_id'])
            .where('exam_id', '=', body.exam_id)
            .executeTakeFirst();
        if (!exam) {
            return c.json({ success: false, error: 'Exam not found.' }, 404 as any);
        }

        const examInstitutionId = exam.institution_id;
        if (!examInstitutionId) {
            return c.json({ success: false, error: 'Exam is missing an institution.' }, 400 as any);
        }

        if (body.institution_id && body.institution_id !== examInstitutionId) {
            return c.json(
                { success: false, error: 'Exam does not belong to the specified institution.' },
                400 as any,
            );
        }

        // Validate institution exists
        const institution = await dbClient
            .selectFrom('institutions')
            .select('id')
            .where('id', '=', examInstitutionId)
            .executeTakeFirst();
        if (!institution) {
            return c.json({ success: false, error: 'Institution not found.' }, 404 as any);
        }

        if (!(await canAccessPdfInstitutionScope(dbClient, userInstitutionId, examInstitutionId))) {
            return c.json(
                {
                    success: false,
                    error: 'Forbidden. Cannot create an answer key export for another institution.',
                },
                403 as any,
            );
        }

        // Enforce instructor scope check
        if (role === 'instructor') {
            await assertInstructorExamAccess({
                dbClient,
                examId: exam.exam_id,
                userId: user.id,
            });
        }

        // Resolve and snapshot the template at request time
        const resolvedTemplate = await resolvePdfTemplate(
            dbClient,
            examInstitutionId,
            'EXAM_ANSWER_KEY',
            { persistBuiltInFallback: true },
        );

        // Insert PENDING record
        const insertedRow = await dbClient
            .insertInto('exam_answer_key_exports')
            .values({
                exam_id: body.exam_id,
                institution_id: examInstitutionId,
                template_id: resolvedTemplate.templateId as any,
                template_snapshot: JSON.stringify(resolvedTemplate) as any,
                status: 'PENDING',
                retry_count: 0,
                created_by: user.id,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        // Enqueue the generation job
        await pdfGenerationQueueService.submitPdfJob(insertedRow.export_id, 'EXAM_ANSWER_KEY');

        // Audit log
        try {
            await LogsService.createLog(dbClient, {
                userId: user.id,
                action: 'ANSWER_KEY_EXPORT_REQUESTED',
                activeInstitutionId: examInstitutionId,
                details: {
                    exportId: insertedRow.export_id,
                    examId: body.exam_id,
                },
            });
        } catch (logErr: any) {
            console.warn('[AnswerKey] Audit log failed for export request:', logErr.message);
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
        };

        return c.json(
            {
                success: true,
                message: 'Answer key export accepted and queued.',
                data: responseData,
            },
            202 as any,
        );
    } catch (e: any) {
        if (e instanceof HTTPException) {
            return c.json({ success: false, error: e.message }, e.status as any);
        }
        return c.json(
            { success: false, error: e.message || 'Failed to create answer key export.' },
            500 as any,
        );
    }
};
