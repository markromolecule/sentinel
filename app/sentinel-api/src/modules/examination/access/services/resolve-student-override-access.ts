import { buildStudentOverrideRuntimeAccess } from '../../student-overrides/student-overrides.service';
import type { ExamAccessEligibility } from '../access.dto';

export type ResolveStudentOverrideAccessArgs = {
    accessOverride: any;
    latestAttempt: any;
    latestAttemptLifecycle: {
        isBlocked: boolean;
        isResumable: boolean;
        runtimeAccess: {
            state: 'locked' | 'closed';
            message: string;
            reasonCode: 'LOCKED' | 'CLOSED';
            canStart: boolean;
            canResume: boolean;
            hasActiveAttempt: boolean;
            startsAt: any;
            endsAt: any;
            reopenedUntil: any;
        } | null;
    };
    hasResumableAttempt: boolean;
    scheduledRuntimeAccess: any;
    persistedRuntimeAccess: any;
    hasValidReopenOverride: boolean;
    runtimeAccess: any;
    startsAt: Date | null;
    endsAt: Date | null;
    buildContext: () => any;
};

/**
 * Resolves student override access logic and attempt-lifecycle blocking/resumption logic.
 *
 * @param args - The override resolver parameters.
 * @returns ExamAccessEligibility or null if the override decision is deferred/unhandled.
 */
export function resolveStudentOverrideAccess(
    args: ResolveStudentOverrideAccessArgs,
): ExamAccessEligibility | null {
    const {
        accessOverride,
        latestAttempt,
        latestAttemptLifecycle,
        hasResumableAttempt,
        scheduledRuntimeAccess,
        persistedRuntimeAccess,
        hasValidReopenOverride,
        startsAt,
        endsAt,
        buildContext,
    } = args;

    if (accessOverride?.overrideType === 'REOPEN' && !hasValidReopenOverride) {
        return {
            isEligible: false,
            reason: 'This reopen window no longer applies because the original attempt can no longer be resumed.',
            reasonCode: 'CLOSED',
            runtimeAccess: {
                state: 'closed',
                reasonCode: 'CLOSED',
                message:
                    'This reopen window no longer applies because the original attempt can no longer be resumed.',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
                startsAt,
                endsAt,
                reopenedUntil: null,
            },
            accessOverride,
        };
    }

    if (latestAttemptLifecycle.isBlocked && accessOverride?.overrideType !== 'REOPEN') {
        if (
            accessOverride &&
            (accessOverride.overrideType === 'MAKEUP' || accessOverride.overrideType === 'RETAKE')
        ) {
            return {
                isEligible: true,
                context: buildContext(),
                runtimeAccess: buildStudentOverrideRuntimeAccess({
                    accessOverride,
                    runtimeAccess: scheduledRuntimeAccess,
                    hasActiveAttempt: false,
                }),
                accessOverride,
            };
        }

        return {
            isEligible: false,
            reason: latestAttemptLifecycle.runtimeAccess!.message,
            reasonCode: latestAttemptLifecycle.runtimeAccess!.reasonCode,
            runtimeAccess: {
                ...latestAttemptLifecycle.runtimeAccess!,
                startsAt,
                endsAt,
            },
            accessOverride: accessOverride ?? null,
        };
    }

    if (
        accessOverride &&
        persistedRuntimeAccess?.state !== 'closed' &&
        (!scheduledRuntimeAccess.canStart || !scheduledRuntimeAccess.canResume)
    ) {
        return {
            isEligible: true,
            context: buildContext(),
            runtimeAccess: buildStudentOverrideRuntimeAccess({
                accessOverride,
                runtimeAccess: scheduledRuntimeAccess,
                hasActiveAttempt: hasValidReopenOverride || hasResumableAttempt,
            }),
            accessOverride,
        };
    }

    return null;
}
