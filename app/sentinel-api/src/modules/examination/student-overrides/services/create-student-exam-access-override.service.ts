import { randomUUID } from 'node:crypto';
import type { DbClient } from '@sentinel/db';
import type {
    CreateStudentExamAccessOverrideBody,
    StudentExamAccessOverride,
} from '../student-overrides.dto';
import { LogsService } from '../../../general/logs/logs.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';
import { StudentOverridesRepository } from '../data/student-overrides.repository';
import { normalizeSourceAttemptId } from './student-overrides-helpers';

/**
 * Creates and persists a student-specific exam access override.
 */
export async function createStudentExamAccessOverride(args: {
    dbClient: DbClient;
    examId: string;
    body: CreateStudentExamAccessOverrideBody;
    grantedBy?: string | null;
}): Promise<StudentExamAccessOverride> {
    const now = new Date();
    const overrideId = randomUUID();
    const sourceAttemptId = normalizeSourceAttemptId({
        overrideType: args.body.overrideType,
        sourceAttemptId: args.body.sourceAttemptId,
    });
    const payload: StudentExamAccessOverride = {
        id: overrideId,
        examId: args.examId,
        studentId: args.body.studentId,
        grantedBy: args.grantedBy ?? null,
        overrideType: args.body.overrideType,
        availableFrom: new Date(args.body.availableFrom).toISOString(),
        availableUntil: new Date(args.body.availableUntil).toISOString(),
        allowedAttempts: args.body.allowedAttempts ?? 1,
        usedAttempts: 0,
        usedAttemptIds: [],
        sourceAttemptId,
        notes: args.body.notes ?? null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
    };

    await StudentOverridesRepository.insertExamOverrideRecord({
        dbClient: args.dbClient,
        examId: args.examId,
        studentId: args.body.studentId,
        overrideId,
        overrideType: args.body.overrideType,
        payload,
        grantedBy: args.grantedBy ?? null,
        createdAt: now,
    });

    // Telemetry logging and notifications
    try {
        const exam = await StudentOverridesRepository.findExamForTelemetry(
            args.dbClient,
            args.examId,
        );

        if (exam?.institution_id) {
            await LogsService.createLog(args.dbClient, {
                userId: args.grantedBy ?? '00000000-0000-0000-0000-000000000000',
                action: 'exam.override_created',
                resourceType: 'exam_override',
                resourceId: overrideId,
                activeInstitutionId: exam.institution_id,
                details: {
                    examId: args.examId,
                    studentId: args.body.studentId,
                    overrideType: args.body.overrideType,
                    allowedAttempts: args.body.allowedAttempts,
                    availableFrom: payload.availableFrom,
                    availableUntil: payload.availableUntil,
                },
            });

            await ActivityNotificationService.notifyInstitutionActivityOverride({
                dbClient: args.dbClient,
                actorUserId: args.grantedBy ?? '00000000-0000-0000-0000-000000000000',
                institutionId: exam.institution_id,
                targetType: 'EXAM_OVERRIDE',
                targetId: overrideId,
                targetLabel: `${args.body.overrideType} override`,
                title: 'Exam override granted',
                message: `An exam override of type "${args.body.overrideType}" was granted to student for exam "${exam.title || 'Exam'}".`,
                sourceModule: 'exams',
                sourceAction: 'create-override',
                metadata: {
                    examId: args.examId,
                    studentId: args.body.studentId,
                    overrideType: args.body.overrideType,
                },
            });
        }
    } catch (logErr) {
        console.error('Failed to log or notify exam override creation:', logErr);
    }

    return payload;
}
