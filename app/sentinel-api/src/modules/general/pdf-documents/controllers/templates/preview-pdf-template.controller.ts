import { createRoute, z } from '@hono/zod-openapi';
import { type AppRouteHandler } from '../../../../../types/hono';
import { previewPdfTemplateBodySchema } from '../../pdf-documents.dto';
import { renderAnalyticsOverallPdf } from '../../rendering/analytics-overall-renderer';
import { renderExamAnswerKeyPdf } from '../../rendering/exam-answer-key-renderer';
import { renderExamResultsReportPdf } from '../../rendering/exam-results-report-renderer';
import { mockExamAnswerKeyFixture } from '../../rendering/fixtures/exam-answer-key';
import { mockExamResultsReportFixture } from '../../rendering/fixtures/exam-results-report';
import { InstitutionBrandingService } from '../../services/institution-branding.service';
import { HTTPException } from 'hono/http-exception';
import {
    assertOverallReportTemplateScope,
    canAccessPdfInstitutionScope,
    requirePdfDocumentAccess,
} from '../../services/pdf-document-authorization.service';

export const previewPdfTemplateRoute = createRoute({
    method: 'post',
    path: '/templates/preview',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: previewPdfTemplateBodySchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Streaming generated PDF preview document',
            content: {
                'application/pdf': {
                    schema: z.instanceof(Uint8Array),
                },
            },
        },
        400: {
            description: 'Invalid preview request parameters or layout constraints violation',
        },
        403: {
            description: 'Denied access due to insufficient permissions',
        },
        500: {
            description: 'Internal server error rendering PDF',
        },
    },
    summary: 'Preview a PDF template layout with sample data',
    description:
        'Generates a PDF on the fly using the supplied header and footer configurations. Requires support role and pdf_templates:view permission.',
});

export const previewPdfTemplateHandler: AppRouteHandler<typeof previewPdfTemplateRoute> = async (
    c,
) => {
    const dbClient = c.get('dbClient');
    const user = c.get('user');

    requirePdfDocumentAccess({
        activePermissionKeys: c.get('activePermissionKeys'),
        requiredPermissions: ['pdf_templates:view', 'pdf_templates:manage'],
        missingPermissionMessage: 'Forbidden: Insufficient privileges.',
    });

    const { document_kind, header_config, footer_config, institution_id } = c.req.valid('json');
    const userInstitutionId = c.get('institutionId');

    // 2. Lay constraints validation
    if (document_kind === 'ANALYTICS_OVERALL') {
        if (header_config.sentinel_logo_visible !== true) {
            return c.json(
                {
                    success: false,
                    error: 'Co-branding constraint error: Sentinel logo must be visible on overall analytics reports.',
                },
                400,
            ) as any;
        }

        await assertOverallReportTemplateScope(dbClient, institution_id);
    } else if (institution_id) {
        const institution = await dbClient
            .selectFrom('institutions')
            .select(['id'])
            .where('id', '=', institution_id)
            .executeTakeFirst();

        if (!institution) {
            throw new HTTPException(400, {
                message: `Institution ${institution_id} does not exist.`,
            });
        }

        if (!(await canAccessPdfInstitutionScope(dbClient, userInstitutionId, institution_id))) {
            throw new HTTPException(403, {
                message:
                    "Forbidden. You cannot preview another institution's PDF template override.",
            });
        }
    }

    try {
        // 3. Resolve branding logo if institution ID supplied
        let logoBuffer: Buffer | null = null;
        if (institution_id) {
            const branding = await InstitutionBrandingService.getBranding(dbClient, institution_id);
            if (branding && branding.logo_storage_bucket && branding.logo_storage_path) {
                try {
                    logoBuffer = await InstitutionBrandingService.downloadBrandingLogo(
                        branding.logo_storage_bucket,
                        branding.logo_storage_path,
                    );
                } catch (err) {
                    // Suppress and default to no logo
                    logoBuffer = null;
                }
            }
        }

        // 4. Generate PDF buffer depending on the document kind
        let pdfBuffer: Buffer;

        if (document_kind === 'ANALYTICS_OVERALL') {
            const mockAnalyticsData = {
                generatedBy: user.email || 'Support System',
                institutionName: 'Sentinel University (Preview)',
                periodLabel: 'Last 30 Days (Sample Data)',
                kpis: {
                    averageScore: 78.4,
                    passRate: 85.2,
                    totalCompletions: 1250,
                    integrityIncidentsCount: 14,
                },
                departments: [
                    {
                        departmentName: 'College of Computer Studies',
                        courseCount: 8,
                        studentCount: 340,
                        averageScore: 81.2,
                        integrityRate: 97.8,
                    },
                    {
                        departmentName: 'College of Engineering',
                        courseCount: 6,
                        studentCount: 210,
                        averageScore: 76.5,
                        integrityRate: 99.1,
                    },
                    {
                        departmentName: 'College of Business',
                        courseCount: 12,
                        studentCount: 520,
                        averageScore: 77.2,
                        integrityRate: 98.4,
                    },
                ],
                incidentTypes: [
                    { type: 'Tab Switching', count: 8, percentage: 57.1 },
                    { type: 'Multiple Faces', count: 4, percentage: 28.6 },
                    { type: 'No Face Detected', count: 2, percentage: 14.3 },
                ],
                incidentSeverities: [
                    { severity: 'LOW' as const, count: 9 },
                    { severity: 'MEDIUM' as const, count: 4 },
                    { severity: 'HIGH' as const, count: 1 },
                ],
            };
            pdfBuffer = await renderAnalyticsOverallPdf(
                header_config,
                footer_config,
                logoBuffer,
                mockAnalyticsData,
            );
        } else if (document_kind === 'EXAM_ANSWER_KEY') {
            // EXAM_ANSWER_KEY
            const mockData = {
                ...mockExamAnswerKeyFixture,
                generatedBy: user.email || 'Dr. Evelyn Martinez',
            };
            pdfBuffer = await renderExamAnswerKeyPdf(
                header_config,
                footer_config,
                logoBuffer,
                mockData,
            );
        } else {
            const mockData = {
                examId: 'preview-exam-results-report',
                institutionId: institution_id ?? 'preview-global-scope',
                examTitle: `${mockExamResultsReportFixture.examTitle} (Sample Preview)`,
                subjectCode: mockExamResultsReportFixture.subjectCode,
                subjectName: mockExamResultsReportFixture.subjectName,
                durationMinutes: mockExamResultsReportFixture.durationMinutes,
                passingScore: mockExamResultsReportFixture.passingScore,
                scheduledDate: mockExamResultsReportFixture.scheduledDate,
                endDateTime: mockExamResultsReportFixture.endDateTime,
                institutionName: `${mockExamResultsReportFixture.institutionName} (Sample Preview)`,
                generatedBy: user.email || 'Sentinel Support Preview',
                report: {
                    summary: {
                        totalAssignedStudents: mockExamResultsReportFixture.summary.totalStudents,
                        averageScore: mockExamResultsReportFixture.summary.averageScore,
                        passRate: mockExamResultsReportFixture.summary.passRate,
                        totalSubmitted: mockExamResultsReportFixture.summary.totalCompletions,
                        totalAbsent: mockExamResultsReportFixture.summary.totalAbsent,
                        incidentBreakdownByType: mockExamResultsReportFixture.incidentTypes.map(
                            (incident) => ({
                                type: `${incident.type} (Sample)`,
                                count: incident.count,
                            }),
                        ),
                    },
                    students: mockExamResultsReportFixture.students.map((student) => ({
                        studentId: student.studentId,
                        studentNo: `SAMPLE-${student.studentNo}`,
                        firstName: `${student.firstName} Sample`,
                        lastName: student.lastName,
                        sectionName: `${student.sectionName} (Sample)`,
                        score: student.score,
                        status: student.status.toLowerCase(),
                        attemptKind: student.attemptKind,
                        activeOverrideType: student.activeOverrideType,
                        incidentOutcomes: {
                            pending: student.incidentsPending,
                            reviewed: student.incidentsReviewed,
                            confirmed: student.incidentsConfirmed,
                            dismissed: student.incidentsDismissed,
                        },
                        needsReview: student.incidentsPending > 0 || student.incidentsConfirmed > 0,
                        needsMakeup: student.attemptKind === 'makeup',
                        needsRetake: student.attemptKind === 'retake',
                        isFlagged: student.status === 'FLAGGED',
                    })),
                },
            };
            pdfBuffer = await renderExamResultsReportPdf(
                header_config,
                footer_config,
                logoBuffer,
                mockData,
            );
        }

        // 5. Stream response with appropriate headers
        c.header('Content-Type', 'application/pdf');
        c.header('Content-Length', pdfBuffer.length.toString());
        c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        return c.body(new Uint8Array(pdfBuffer)) as any;
    } catch (e) {
        if (e instanceof HTTPException) {
            throw e;
        }
        return c.json(
            { success: false, error: 'Internal error rendering PDF preview.' },
            500,
        ) as any;
    }
};
