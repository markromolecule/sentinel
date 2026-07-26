import { createRoute, z } from '@hono/zod-openapi';
import { sql } from 'kysely';
import { type AppRouteHandler } from '../../../../../types/hono';
import {
    listAnswerKeyExportsQuerySchema,
    answerKeyExportListResponseSchema,
    answerKeyExportRecordSchema,
} from '../../pdf-documents.dto';
import {
    canAccessPdfInstitutionScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';

export const getAnswerKeyExportsRoute = createRoute({
    method: 'get',
    path: '/answer-keys',
    tags: ['PDF Documents', 'Answer Keys'],
    summary: 'List answer key exports',
    description:
        'Returns a paginated list of exam answer-key export records. ' +
        'Requires support role and pdf_templates:view or reports:view permission.',
    request: {
        query: listAnswerKeyExportsQuerySchema,
    },
    responses: {
        200: {
            description: 'Paginated list of answer key export records',
            content: { 'application/json': { schema: answerKeyExportListResponseSchema } },
        },
        403: { description: 'Forbidden' },
        500: { description: 'Internal server error' },
    },
});

export const getAnswerKeyExportsHandler: AppRouteHandler<typeof getAnswerKeyExportsRoute> = async (
    c,
) => {
    const dbClient = c.get('dbClient');

    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: ['pdf_templates:view', 'reports:view'],
        missingPermissionMessage: 'Forbidden. Insufficient privileges.',
    });

    const { examId, institutionId, limit = 10, page = 1 } = c.req.valid('query');
    const userInstitutionId = c.get('institutionId');

    if (
        institutionId &&
        !(await canAccessPdfInstitutionScope(dbClient, userInstitutionId, institutionId))
    ) {
        return c.json(
            {
                success: false,
                error: "Forbidden. Cannot list another institution's answer key exports.",
            },
            403 as any,
        );
    }

    try {
        const offset = (page - 1) * limit;

        let countQuery = dbClient
            .selectFrom('exam_answer_key_exports as ake')
            .select(sql<string>`count(ake.export_id)`.as('count'));

        let listQuery = dbClient
            .selectFrom('exam_answer_key_exports as ake')
            .select([
                'ake.export_id',
                'ake.exam_id',
                'ake.institution_id',
                'ake.template_id',
                'ake.status',
                'ake.failure_code',
                'ake.failure_message',
                'ake.retry_count',
                'ake.storage_bucket',
                'ake.storage_path',
                'ake.created_by',
                'ake.created_at',
                'ake.updated_at',
                'ake.completed_at',
            ])
            .orderBy('ake.created_at', 'desc')
            .limit(limit)
            .offset(offset);

        if (examId) {
            countQuery = countQuery.where('ake.exam_id', '=', examId);
            listQuery = listQuery.where('ake.exam_id', '=', examId);
        }
        if (institutionId) {
            countQuery = countQuery.where('ake.institution_id', '=', institutionId);
            listQuery = listQuery.where('ake.institution_id', '=', institutionId);
        } else if (userInstitutionId) {
            countQuery = countQuery.where('ake.institution_id', '=', userInstitutionId);
            listQuery = listQuery.where('ake.institution_id', '=', userInstitutionId);
        }

        const [countRow, rows] = await Promise.all([
            countQuery.executeTakeFirst(),
            listQuery.execute(),
        ]);

        const total_records = Number((countRow as any)?.count ?? 0);
        const records: z.infer<typeof answerKeyExportRecordSchema>[] = rows.map((r: any) => ({
            exportId: r.export_id,
            examId: r.exam_id,
            institutionId: r.institution_id,
            templateId: r.template_id ?? null,
            status: r.status,
            failureCode: r.failure_code ?? null,
            failureMessage: r.failure_message ?? null,
            retryCount: r.retry_count,
            storageBucket: r.storage_bucket ?? null,
            storagePath: r.storage_path ?? null,
            createdBy: r.created_by ?? null,
            createdAt:
                r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
            updatedAt:
                r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
            completedAt: r.completed_at
                ? r.completed_at instanceof Date
                    ? r.completed_at.toISOString()
                    : String(r.completed_at)
                : null,
        }));

        return c.json({ success: true, data: { records, total_records, limit, page } }) as any;
    } catch (e: any) {
        return c.json(
            { success: false, error: e.message || 'Failed to list answer key exports.' },
            500 as any,
        );
    }
};
