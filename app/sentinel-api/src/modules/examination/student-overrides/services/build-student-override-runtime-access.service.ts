import type { ExamRuntimeAccessType } from '@sentinel/shared';
import type { StudentExamAccessOverride } from '../student-overrides.dto';
import { parseDateValue, toIsoDate } from './student-overrides-helpers';

export function buildStudentOverrideRuntimeAccess(args: {
    accessOverride: StudentExamAccessOverride;
    runtimeAccess: ExamRuntimeAccessType;
    hasActiveAttempt?: boolean;
}): ExamRuntimeAccessType {
    const hasActiveAttempt = Boolean(args.hasActiveAttempt);
    const availableUntil = parseDateValue(args.accessOverride.availableUntil);
    const actionLabel =
        args.accessOverride.overrideType === 'MAKEUP'
            ? 'makeup'
            : args.accessOverride.overrideType === 'RETAKE'
              ? 'retake'
              : 'exam access';

    return {
        state: 'reopened',
        reasonCode: 'REOPENED',
        message: availableUntil
            ? `Your approved ${actionLabel} window is open until ${availableUntil.toLocaleString()}.`
            : `Your approved ${actionLabel} window is currently open.`,
        canStart: true,
        canResume: hasActiveAttempt,
        hasActiveAttempt,
        startsAt: args.runtimeAccess.startsAt ?? toIsoDate(args.accessOverride.availableFrom),
        endsAt: args.runtimeAccess.endsAt ?? toIsoDate(args.accessOverride.availableUntil),
        reopenedUntil: toIsoDate(args.accessOverride.availableUntil),
    };
}
