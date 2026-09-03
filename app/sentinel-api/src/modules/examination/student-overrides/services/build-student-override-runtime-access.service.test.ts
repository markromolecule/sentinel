import { describe, expect, it } from 'vitest';
import { buildStudentOverrideRuntimeAccess } from './build-student-override-runtime-access.service';
import type { StudentExamAccessOverride } from '../student-overrides.dto';
import type { ExamRuntimeAccessType } from '@sentinel/shared';

describe('buildStudentOverrideRuntimeAccess', () => {
    const baseOverride: StudentExamAccessOverride = {
        id: '11111111-1111-4111-8111-111111111111',
        examId: '22222222-2222-4222-8222-222222222222',
        studentId: '33333333-3333-4333-8333-333333333333',
        grantedBy: null,
        overrideType: 'MAKEUP',
        availableFrom: '2026-04-13T06:00:00.000Z',
        availableUntil: '2026-04-13T08:00:00.000Z',
        allowedAttempts: 1,
        usedAttempts: 0,
        usedAttemptIds: [],
        sourceAttemptId: null,
        notes: null,
        createdAt: '2026-04-13T05:00:00.000Z',
        updatedAt: '2026-04-13T05:00:00.000Z',
    };

    const baseRuntimeAccess: ExamRuntimeAccessType = {
        state: 'closed',
        reasonCode: 'WINDOW_CLOSED',
        message: 'The scheduled window for this exam has ended.',
        canStart: false,
        canResume: false,
        hasActiveAttempt: false,
        startsAt: '2026-04-13T00:00:00.000Z',
        endsAt: '2026-04-13T04:00:00.000Z',
        reopenedUntil: null,
    };

    it('builds reopened runtime access for MAKEUP override', () => {
        const result = buildStudentOverrideRuntimeAccess({
            accessOverride: baseOverride,
            runtimeAccess: baseRuntimeAccess,
            hasActiveAttempt: false,
        });

        expect(result.state).toBe('reopened');
        expect(result.reasonCode).toBe('REOPENED');
        expect(result.canStart).toBe(true);
        expect(result.canResume).toBe(false);
        expect(result.hasActiveAttempt).toBe(false);
        expect(result.reopenedUntil).toBe('2026-04-13T08:00:00.000Z');
        expect(result.message).toContain('makeup');
    });

    it('builds reopened runtime access for RETAKE override with active attempt', () => {
        const result = buildStudentOverrideRuntimeAccess({
            accessOverride: { ...baseOverride, overrideType: 'RETAKE' },
            runtimeAccess: baseRuntimeAccess,
            hasActiveAttempt: true,
        });

        expect(result.state).toBe('reopened');
        expect(result.canResume).toBe(true);
        expect(result.hasActiveAttempt).toBe(true);
        expect(result.message).toContain('retake');
    });
});
