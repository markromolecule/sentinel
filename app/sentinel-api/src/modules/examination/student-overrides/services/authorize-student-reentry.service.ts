import type { DbClient } from '@sentinel/db';
import { broadcastLobbyEvent } from '../../lobby/services/broadcast-lobby-event';
import { appendExamAttemptLifecycleEvent } from '../../lifecycle/services/lifecycle-event.service';
import { recordAttemptLifecycleAudit } from '../../lifecycle/services/lifecycle-audit.service';
import { StudentOverridesRepository } from '../data/student-overrides.repository';
import { parseDateValue } from './student-overrides-helpers';

/**
 * Authorizes student re-entry by unlocking active/closed attempt, resetting
 * reconnect_attempt_count to 0, approving lobby admission, and broadcasting real-time event.
 */
export async function authorizeStudentReentry(args: {
    dbClient: DbClient;
    examId: string;
    studentId: string;
    reason?: string | null;
    actorUserId?: string | null;
    institutionId?: string;
    now?: Date;
}) {
    const now = args.now ?? new Date();
    const latestAttempt = await StudentOverridesRepository.findLatestAttemptForReentry(
        args.dbClient,
        args.examId,
        args.studentId,
    );

    if (
        latestAttempt &&
        (latestAttempt.status === 'COMPLETED' || latestAttempt.lifecycle_state === 'SUBMITTED')
    ) {
        throw new Error(
            'Student has already completed this exam. Grant a retake override instead.',
        );
    }

    const endDateTime = parseDateValue(latestAttempt?.end_date_time);
    const fallbackUntil = new Date(now.getTime() + 30 * 60_000);
    const reopenedUntil =
        endDateTime && endDateTime.getTime() > fallbackUntil.getTime()
            ? endDateTime
            : fallbackUntil;

    if (latestAttempt) {
        await StudentOverridesRepository.updateAttemptForReentry({
            dbClient: args.dbClient,
            attemptId: latestAttempt.attempt_id,
            reopenedUntil,
            reason: args.reason,
        });

        await appendExamAttemptLifecycleEvent({
            dbClient: args.dbClient,
            attemptId: latestAttempt.attempt_id,
            examId: args.examId,
            studentId: args.studentId,
            eventType: 'REOPENED',
            previousState: latestAttempt.lifecycle_state,
            nextState: 'IN_PROGRESS',
            actorUserId: args.actorUserId ?? null,
            reasonCode: 'REOPENED_BY_INSTRUCTOR',
            notes: args.reason?.trim() || 'Re-entry authorized by instructor.',
        });

        const resolvedInstId = args.institutionId || latestAttempt.institution_id || '';

        await recordAttemptLifecycleAudit({
            dbClient: args.dbClient,
            attemptId: latestAttempt.attempt_id,
            examId: args.examId,
            studentId: args.studentId,
            eventType: 'REOPENED',
            actorUserId: args.actorUserId ?? null,
            institutionId: resolvedInstId || null,
            reasonCode: 'REOPENED_BY_INSTRUCTOR',
            notes: args.reason?.trim() || 'Re-entry authorized by instructor.',
            previousState: latestAttempt.lifecycle_state,
            nextState: 'IN_PROGRESS',
            details: {
                reopenedUntil: reopenedUntil.toISOString(),
                reconnectReset: true,
            },
        });
    }

    await StudentOverridesRepository.updateLobbyAdmissionStatus({
        dbClient: args.dbClient,
        examId: args.examId,
        studentId: args.studentId,
        status: 'APPROVED',
        decidedAt: now,
        decidedBy: args.actorUserId ?? null,
    });

    void broadcastLobbyEvent(args.examId, 'admission:updated', {
        examId: args.examId,
        studentId: args.studentId,
        studentIds: [args.studentId],
        status: 'APPROVED',
        decidedAt: now.toISOString(),
    });

    return {
        attemptId: latestAttempt?.attempt_id ?? null,
        status: 'APPROVED',
        reconnectAttemptCount: 0,
        reopenedUntil: reopenedUntil.toISOString(),
    };
}
