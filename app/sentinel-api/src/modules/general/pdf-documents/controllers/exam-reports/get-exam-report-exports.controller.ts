import { createRoute, z } from '@hono/zod-openapi';
import { sql } from 'kysely';
import { type AppRouteHandler } from '../../../../../types/hono';
import {
    listExamResultsReportExportsQuerySchema,
    examResultsReportExportListResponseSchema,
    examResultsReportExportRecordSchema,
} from '../../pdf-documents.dto';
import { requireAllPdfDocumentPermissions } from '../../services/pdf-document-authorization.service';
import {
    type AssessmentAllowedRole,
    assertAssessmentAccess,
    resolveAssessmentActorRole,
    resolveAssessmentInstitutionId,
} from '../../../../examination/assessment/assessment-access';
import { getReportingExamContext } from '../../../../examination/reporting/services/get-reporting-exam-context';
import { buildAssignedInstructorExamVisibilityPredicates } from '../../../../examination/assign/services/exam-access.service';

export const getExamReportExportsRoute = createRoute({
    method: 'get',
    path: '/exam-reports',
    tags: ['PDF Documents', 'Exam Reports'],
    summary: 'List exam results report exports',
    description:
        'Returns a paginated list of exam results report export records. ' +
        'Requires examinations:export_results_report permission.',
    request: {
        query: listExamResultsReportExportsQuerySchema,
    },
    responses: {
        200: {
            description: 'Paginated list of exam report export records',
            content: { 'application/json': { schema: examResultsReportExportListResponseSchema } },
        },
        403: { description: 'Forbidden' },
        500: { description: 'Internal server error' },
    },
});

export const getExamReportExportsHandler: AppRouteHandler<
    typeof getExamReportExportsRoute
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

    const { examId, institutionId, limit = 10, page = 1 } = c.req.valid('query');

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

    // Enforce cross-institution access check if querying a specific institutionId
    if (institutionId && userInstitutionId && institutionId !== userInstitutionId) {
        // Standalone/child institutions cannot query other institutions
        return c.json(
            {
                success: false,
                error: "Forbidden. Cannot list another institution's exam report exports.",
            },
            403 as any,
        );
    }

    // Enforce exam scope if querying a specific examId
    if (examId) {
        await getReportingExamContext({
            dbClient,
            examId,
            institutionId: userInstitutionId || undefined,
            viewerRole: role,
            userId: user?.id,
        });
    }

    try {
        const offset = (page - 1) * limit;

        let countQuery = dbClient
            .selectFrom('exam_report_exports as ere')
            .leftJoin('exams as e', 'e.exam_id', 'ere.exam_id')
            .select(sql<string>`count(ere.export_id)`.as('count'));

        let listQuery = dbClient
            .selectFrom('exam_report_exports as ere')
            .leftJoin('exams as e', 'e.exam_id', 'ere.exam_id')
            .select([
                'ere.export_id',
                'ere.exam_id',
                'ere.institution_id',
                'ere.template_id',
                'ere.status',
                'ere.failure_code',
                'ere.failure_message',
                'ere.retry_count',
                'ere.created_by',
                'ere.created_at',
                'ere.updated_at',
                'ere.completed_at',
                'ere.expires_at',
            ])
            .orderBy('ere.created_at', 'desc')
            .limit(limit)
            .offset(offset);

        // Apply filters
        if (examId) {
            countQuery = countQuery.where('ere.exam_id', '=', examId);
            listQuery = listQuery.where('ere.exam_id', '=', examId);
        }
        if (institutionId) {
            countQuery = countQuery.where('ere.institution_id', '=', institutionId);
            listQuery = listQuery.where('ere.institution_id', '=', institutionId);
        } else if (userInstitutionId) {
            countQuery = countQuery.where('ere.institution_id', '=', userInstitutionId);
            listQuery = listQuery.where('ere.institution_id', '=', userInstitutionId);
        }

        // Apply instructor visibility predicates if role is instructor
        if (role === 'instructor' && user?.id) {
            const visibilityPredicates = await buildAssignedInstructorExamVisibilityPredicates({
                dbClient,
                userId: user.id,
            });
            const filterClause = sql<boolean>`(${sql.join(visibilityPredicates, sql` or `)})`;
            countQuery = countQuery.where(filterClause);
            listQuery = listQuery.where(filterClause);
        }

        const [countRow, rows] = await Promise.all([
            countQuery.executeTakeFirst(),
            listQuery.execute(),
        ]);

        const total_records = Number((countRow as any)?.count ?? 0);
        const records: z.infer<typeof examResultsReportExportRecordSchema>[] = rows.map(
            (r: any) => ({
                exportId: r.export_id,
                examId: r.exam_id,
                institutionId: r.institution_id,
                templateId: r.template_id ?? null,
                status: r.status,
                failureCode: r.failure_code ?? null,
                failureMessage: r.failure_message ?? null,
                retryCount: r.retry_count,
                createdBy: r.created_by ?? null,
                createdAt:
                    r.created_at instanceof Date
                        ? r.created_at.toISOString()
                        : String(r.created_at),
                updatedAt:
                    r.updated_at instanceof Date
                        ? r.updated_at.toISOString()
                        : String(r.updated_at),
                completedAt: r.completed_at
                    ? r.completed_at instanceof Date
                        ? r.completed_at.toISOString()
                        : String(r.completed_at)
                    : null,
                expiresAt: r.expires_at
                    ? r.expires_at instanceof Date
                        ? r.expires_at.toISOString()
                        : String(r.expires_at)
                    : null,
            }),
        );

        return c.json({ success: true, data: { records, total_records, limit, page } }) as any;
    } catch (e: any) {
        return c.json(
            { success: false, error: e.message || 'Failed to list exam report exports.' },
            500 as any,
        );
    }
};
