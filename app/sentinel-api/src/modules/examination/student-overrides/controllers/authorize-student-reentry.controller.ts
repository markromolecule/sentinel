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
import { authorizeStudentReentrySchema } from '../student-overrides.dto';
import { StudentOverridesService } from '../student-overrides.service';

export const authorizeStudentReentryRoute = createRoute({
    method: 'post',
    path: '/:id/student-overrides/authorize-reentry/:studentId',
    tags: ['Exams'],
    summary: 'Authorize student re-entry and reset reconnect count',
    request: {
        params: authorizeStudentReentrySchema.params,
        body: {
            content: {
                'application/json': {
                    schema: authorizeStudentReentrySchema.body,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Student re-entry authorized successfully',
            content: {
                'application/json': {
                    schema: authorizeStudentReentrySchema.response,
                },
            },
        },
    },
});

export const authorizeStudentReentryRouteHandler: AppRouteHandler<
    typeof authorizeStudentReentryRoute
> = async (c) => {
    const { id, studentId } = c.req.valid('param');
    const body = c.req.valid('json');
    const supabaseUser = c.get('supabaseUser') as any;
    const user = c.get('user');
    const dbClient = c.get('dbClient');
    const resolvedRole = await resolveAssessmentActorRole({
        dbClient,
        userId: user?.id,
        claimedRole: supabaseUser?.user_metadata?.role,
    });

    assertAssessmentAccess(resolvedRole);

    const role = resolvedRole as AssessmentAllowedRole;
    const institutionId = resolveAssessmentInstitutionId({
        role,
        contextInstitutionId: c.get('institutionId'),
    });
    const exam = await getReportingExamContext({
        dbClient,
        examId: id,
        institutionId,
        viewerRole: role,
        userId: user?.id,
    });

    const isEnrolled = await EntitlementsRepository.hasStudentExamEnrollment(dbClient, {
        studentId,
        classGroupId: exam.classGroupId,
        subjectId: exam.subjectId,
        sectionId: exam.sectionId,
        sectionIds: exam.assignedSectionIds,
    });

    if (!isEnrolled) {
        throw new HTTPException(404, {
            message: 'Student is not assigned to this exam scope.',
        });
    }

    try {
        const result = await StudentOverridesService.authorizeStudentReentry({
            dbClient,
            examId: id,
            studentId,
            reason: body.reason,
            actorUserId: user?.id,
            institutionId,
        });

        return c.json({
            message: 'Student re-entry authorized successfully',
            data: result,
        });
    } catch (error) {
        throw new HTTPException(400, {
            message:
                error instanceof Error ? error.message : 'Failed to authorize student re-entry.',
        });
    }
};
