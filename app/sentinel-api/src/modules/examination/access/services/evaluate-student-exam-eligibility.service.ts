import { type DbClient } from '@sentinel/db';
import type { ExamAccessEligibility } from '../access.dto';
import { EntitlementsRepository } from '../data/entitlements.repository';
import { RuntimeAccessService } from '../../runtime-access/runtime-access.service';
import { StudentOverridesService } from '../../student-overrides/student-overrides.service';
import { validateBasicEligibility } from './validate-basic-eligibility';
import { resolveLobbyRuntimeAccess } from './resolve-lobby-runtime-access';
import { validateRemediationAccess } from './validate-remediation-access';
import { validateStudentEnrollment } from './validate-student-enrollment';
import { resolveStudentOverrideAccess } from './resolve-student-override-access';
import { DEFAULT_EXAMINATION_GLOBAL_SETTINGS } from '@sentinel/shared/constants';

export type EvaluateStudentExamEligibilityArgs = {
    dbClient: DbClient;
    userId: string;
    examId: string;
    now?: Date;
};

function buildAttemptLifecycleRuntimeBlock(args: {
    lifecycleState?: string | null;
    reopenedUntil?: string | Date | null;
    reason?: string | null;
    now: Date;
}) {
    const reopenedUntil = args.reopenedUntil ? new Date(args.reopenedUntil) : null;
    const hasActiveReopenWindow = Boolean(
        reopenedUntil && !Number.isNaN(reopenedUntil.getTime()) && reopenedUntil >= args.now,
    );

    if (args.lifecycleState === 'LOCKED') {
        return {
            isBlocked: !hasActiveReopenWindow,
            isResumable: true,
            runtimeAccess: {
                state: 'locked' as const,
                reasonCode: 'LOCKED' as const,
                message:
                    args.reason ??
                    'This exam attempt is locked right now. Wait for a reopen window before resuming.',
                canStart: false,
                canResume: hasActiveReopenWindow,
                hasActiveAttempt: true,
                startsAt: null,
                endsAt: null,
                reopenedUntil: reopenedUntil?.toISOString() ?? null,
            },
        };
    }

    if (args.lifecycleState === 'CLOSED') {
        return {
            // Allow resumption when there is an active reopen window so the
            // REOPEN override path can grant the student a fresh entry.
            isBlocked: !hasActiveReopenWindow,
            isResumable: hasActiveReopenWindow,
            runtimeAccess: hasActiveReopenWindow
                ? null
                : {
                      state: 'closed' as const,
                      reasonCode: 'CLOSED' as const,
                      message:
                          args.reason ??
                          'This exam attempt has been closed and can no longer be resumed.',
                      canStart: false,
                      canResume: false,
                      hasActiveAttempt: false,
                      startsAt: null,
                      endsAt: null,
                      reopenedUntil: null,
                  },
        };
    }

    if (args.lifecycleState === 'SUPERSEDED') {
        return {
            isBlocked: true,
            isResumable: false,
            runtimeAccess: {
                state: 'closed' as const,
                reasonCode: 'CLOSED' as const,
                message:
                    args.reason ??
                    'This exam attempt was reset and replaced. Start the replacement attempt instead.',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
                startsAt: null,
                endsAt: null,
                reopenedUntil: null,
            },
        };
    }

    return {
        isBlocked: false,
        isResumable: args.lifecycleState === 'IN_PROGRESS' || args.lifecycleState === 'LOCKED',
        runtimeAccess: null,
    };
}

function buildEligibilityContext(args: {
    resolvedExam: NonNullable<
        Awaited<ReturnType<typeof EntitlementsRepository.getExamAccessPolicy>>
    >;
    resolvedStudent: NonNullable<
        Awaited<ReturnType<typeof EntitlementsRepository.getStudentProfileByUserId>>
    >;
}) {
    const { resolvedExam, resolvedStudent } = args;

    return {
        examId: resolvedExam.exam_id,
        studentId: resolvedStudent.student_id,
        studentUserId: resolvedStudent.user_id,
        classroomId: resolvedExam.class_group_id,
        subjectId: resolvedExam.subject_id!,
        sectionId: resolvedExam.section_id,
        sectionIds: resolvedExam.assigned_section_ids,
        roomId: resolvedExam.room_id,
        durationMinutes: resolvedExam.duration_minutes,
        scheduledDate: resolvedExam.scheduled_date!,
        endDateTime: resolvedExam.end_date_time,
        status: resolvedExam.status,
        publishedAt: resolvedExam.published_at,
        institutionId: resolvedExam.institution_id,
        remediation: resolvedExam.remediation_id
            ? {
                  remediationId: resolvedExam.remediation_id,
                  sourceExamId: resolvedExam.remediation_source_exam_id!,
                  sourceAttemptId: resolvedExam.remediation_source_attempt_id ?? null,
                  remediationType: resolvedExam.remediation_type!,
                  scheduledDate: resolvedExam.remediation_scheduled_date ?? null,
                  endDateTime: resolvedExam.remediation_end_date_time ?? null,
              }
            : null,
    };
}

/**
 * Performs core eligibility and access rule evaluations for a student exam access request.
 * Delegates basic constraints and lobby gating checks to modular helpers.
 *
 * @param args - The evaluation arguments containing database client, student, and exam identifiers.
 * @returns The resolved student access and eligibility payload.
 */
export async function evaluateStudentExamEligibilityService({
    dbClient,
    userId,
    examId,
    now = new Date(),
}: EvaluateStudentExamEligibilityArgs): Promise<ExamAccessEligibility> {
    const [student, exam] = await Promise.all([
        EntitlementsRepository.getStudentProfileByUserId(dbClient, userId),
        EntitlementsRepository.getExamAccessPolicy(dbClient, examId),
    ]);

    const basicCheck = validateBasicEligibility({ student, exam, now });
    if (!basicCheck.isEligible) {
        return basicCheck.errorResponse;
    }

    const { startsAt, endsAt } = basicCheck;

    // Student and Exam are verified non-nullable here by validateBasicEligibility
    const resolvedStudent = student!;
    const resolvedExam = exam!;

    // 1. Remediation check
    const remediationCheck = validateRemediationAccess({
        resolvedExam,
        resolvedStudent,
        startsAt,
        endsAt,
    });
    if (!remediationCheck.isEligible) {
        return remediationCheck.errorResponse;
    }

    // 2. Enrollment check
    const enrollmentCheck = await validateStudentEnrollment({
        dbClient,
        resolvedStudent,
        resolvedExam,
        startsAt,
        endsAt,
    });
    if (!enrollmentCheck.isEligible) {
        return enrollmentCheck.errorResponse;
    }

    // 3. Data retrieval for attempt, override and lobby resolution
    const latestAttempt = await EntitlementsRepository.getStudentLatestExamAttempt(dbClient, {
        studentId: resolvedStudent.student_id,
        examId: resolvedExam.exam_id,
    });
    const latestAttemptLifecycle = buildAttemptLifecycleRuntimeBlock({
        lifecycleState: latestAttempt?.lifecycle_state,
        reopenedUntil: latestAttempt?.reopened_until,
        reason: latestAttempt?.lifecycle_reason,
        now,
    });
    const latestLobbyAdmission = await EntitlementsRepository.getStudentLatestLobbyAdmission(
        dbClient,
        {
            studentId: resolvedStudent.student_id,
            examId: resolvedExam.exam_id,
        },
    );
    const persistedRuntimeAccess = await RuntimeAccessService.getPersistedExamRuntimeAccess(
        dbClient,
        resolvedExam.exam_id,
    );
    const hasResumableAttempt =
        latestAttempt?.status === 'IN_PROGRESS' &&
        latestAttemptLifecycle.isResumable &&
        latestAttempt?.lifecycle_state !== 'SUPERSEDED';
    const scheduledRuntimeAccess = await RuntimeAccessService.resolveExamRuntimeAccess({
        dbClient,
        examId: resolvedExam.exam_id,
        scheduledDate: resolvedExam.scheduled_date!,
        endDateTime: resolvedExam.end_date_time,
        durationMinutes: resolvedExam.duration_minutes,
        now,
        hasActiveAttempt: hasResumableAttempt,
        reconnectAttemptCount: Number(latestAttempt?.reconnect_attempt_count ?? 0),
        maxReconnectAttempts:
            resolvedExam.max_reconnect_attempts ??
            DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultMaxReconnectAttempts,
    });
    const accessOverride = await StudentOverridesService.getActiveStudentExamOverride({
        dbClient,
        examId: resolvedExam.exam_id,
        studentId: resolvedStudent.student_id,
        now,
    });
    const hasValidReopenOverride =
        accessOverride?.overrideType === 'REOPEN' &&
        accessOverride.sourceAttemptId === latestAttempt?.attempt_id &&
        latestAttempt?.status === 'IN_PROGRESS';
    // NOTE: isResumable is intentionally excluded — a CLOSED attempt that
    // receives a REOPEN override must still be treated as having a valid
    // reopen override so the student can navigate to the lobby and resume.
    const runtimeAccess =
        (resolvedExam.lobby_admission_mode ?? 'INSTRUCTOR_GATED') === 'INSTRUCTOR_GATED' &&
        !latestAttempt?.completed_at &&
        latestAttempt?.status !== 'IN_PROGRESS' &&
        (scheduledRuntimeAccess.canStart || accessOverride)
            ? resolveLobbyRuntimeAccess({
                  scheduledRuntimeAccess,
                  admissionStatus: latestLobbyAdmission?.status ?? null,
              })
            : scheduledRuntimeAccess;

    // 4. Student Override and Attempt Lifecycle Gating checks
    const overrideResult = resolveStudentOverrideAccess({
        accessOverride,
        latestAttempt,
        latestAttemptLifecycle,
        hasResumableAttempt,
        scheduledRuntimeAccess,
        persistedRuntimeAccess,
        hasValidReopenOverride,
        runtimeAccess,
        startsAt,
        endsAt,
        buildContext: () => buildEligibilityContext({ resolvedExam, resolvedStudent }),
    });

    if (overrideResult) {
        return overrideResult;
    }

    // 5. Standard schedule / lobby validation fallback
    if (!runtimeAccess.canStart && !runtimeAccess.canResume) {
        return {
            isEligible: false,
            reason: runtimeAccess.message,
            reasonCode: runtimeAccess.reasonCode,
            runtimeAccess,
            accessOverride: accessOverride ?? null,
        };
    }

    return {
        isEligible: true,
        context: buildEligibilityContext({ resolvedExam, resolvedStudent }),
        runtimeAccess,
        accessOverride: accessOverride ?? null,
    };
}
