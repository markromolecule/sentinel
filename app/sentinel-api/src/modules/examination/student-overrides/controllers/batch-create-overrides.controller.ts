import { createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import { type AppRouteHandler } from '../../../../types/hono';
import {
    type AssessmentAllowedRole,
    assertAssessmentAccess,
    resolveAssessmentActorRole,
    resolveAssessmentInstitutionId,
} from '../../assessment/assessment-access';
import { EntitlementsRepository } from '../../access/data/entitlements.repository';
import { getReportingExamContext } from '../../reporting/services/get-reporting-exam-context';
import { batchCreateStudentExamAccessOverrideSchema } from '../student-overrides.dto';
import { StudentOverridesService } from '../student-overrides.service';

export const batchCreateStudentExamAccessOverrideRoute = createRoute({
    method: 'post',
    path: '/:id/overrides/batch-makeup',
    tags: ['Exams'],
    summary: 'Batch schedule make-up exam access overrides for multiple students',
    request: {
        params: batchCreateStudentExamAccessOverrideSchema.params,
        body: {
            content: {
                'application/json': {
                    schema: batchCreateStudentExamAccessOverrideSchema.body,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Batch make-up overrides granted successfully',
            content: {
                'application/json': {
                    schema: batchCreateStudentExamAccessOverrideSchema.response,
                },
            },
        },
    },
});

export const batchCreateStudentExamAccessOverrideRouteHandler: AppRouteHandler<
    typeof batchCreateStudentExamAccessOverrideRoute
> = async (c) => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const supabaseUser = c.get('supabaseUser') as any;
    const user = c.get('user');
    const resolvedRole = await resolveAssessmentActorRole({
        dbClient: c.get('dbClient'),
        userId: user?.id,
        claimedRole: supabaseUser?.user_metadata?.role,
    });

    assertAssessmentAccess(resolvedRole);

    const role = resolvedRole as AssessmentAllowedRole;
    const exam = await getReportingExamContext({
        dbClient: c.get('dbClient'),
        examId: id,
        institutionId: resolveAssessmentInstitutionId({
            role,
            contextInstitutionId: c.get('institutionId'),
        }),
        viewerRole: role,
        userId: user?.id,
    });

    // Validate enrollment for all students
    for (const studentId of body.studentIds) {
        const isEnrolled = await EntitlementsRepository.hasStudentExamEnrollment(
            c.get('dbClient'),
            {
                studentId,
                classGroupId: exam.classGroupId,
                subjectId: exam.subjectId,
                sectionId: exam.sectionId,
                sectionIds: exam.assignedSectionIds,
            },
        );

        if (!isEnrolled) {
            throw new HTTPException(404, {
                message: `Student with ID ${studentId} is not assigned to this exam scope.`,
            });
        }
    }

    const accessOverrides = await StudentOverridesService.batchCreateStudentExamAccessOverrides({
        dbClient: c.get('dbClient'),
        examId: id,
        body,
        grantedBy: user?.id,
    });

    return c.json({
        message: 'Batch make-up overrides granted successfully',
        data: accessOverrides,
    });
};
