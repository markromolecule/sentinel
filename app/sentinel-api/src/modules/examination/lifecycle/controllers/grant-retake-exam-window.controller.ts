import { createRoute } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import { type AppRouteHandler } from '../../../../types/hono';
import { EntitlementsRepository } from '../../access/data/entitlements.repository';
import { getReportingExamContext } from '../../reporting/services/get-reporting-exam-context';
import { requireLifecycleMutationAccess } from '../lifecycle-access';
import { grantRetakeExamWindowSchema } from '../lifecycle.dto';
import { resolveLifecycleStudentId } from '../services/resolve-lifecycle-student-id';
import { grantRetakeExamWindow } from '../services/grant-retake-exam-window';

export const grantRetakeExamWindowRoute = createRoute({
    method: 'post',
    path: '/:id/students/:studentId/lifecycle/grant-retake',
    tags: ['Exams'],
    summary: 'Grant a retake exam window for one student',
    request: {
        params: grantRetakeExamWindowSchema.params,
        body: {
            content: {
                'application/json': {
                    schema: grantRetakeExamWindowSchema.body,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Retake exam window granted successfully',
            content: {
                'application/json': {
                    schema: grantRetakeExamWindowSchema.response,
                },
            },
        },
    },
});

export const grantRetakeExamWindowRouteHandler: AppRouteHandler<
    typeof grantRetakeExamWindowRoute
> = async (c) => {
    requireLifecycleMutationAccess(c);

    const { id, studentId } = c.req.valid('param');
    const body = c.req.valid('json');
    const resolvedStudentId = await resolveLifecycleStudentId(c.get('dbClient'), studentId);
    const exam = await getReportingExamContext({
        dbClient: c.get('dbClient'),
        examId: id,
        institutionId: c.get('institutionId'),
        viewerRole: 'admin',
        userId: c.get('user')?.id,
    });

    const isEnrolled = await EntitlementsRepository.hasStudentExamEnrollment(c.get('dbClient'), {
        studentId: resolvedStudentId,
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

    const result = await grantRetakeExamWindow({
        dbClient: c.get('dbClient'),
        examId: id,
        studentId: resolvedStudentId,
        sourceAttemptId: body.sourceAttemptId,
        availableFrom: body.availableFrom,
        availableUntil: body.availableUntil,
        allowedAttempts: body.allowedAttempts,
        notes: body.notes ?? null,
        actorUserId: c.get('user')?.id ?? null,
        institutionId: c.get('institutionId'),
    });

    return c.json({
        message: 'Retake exam window granted successfully',
        data: result,
    });
};
