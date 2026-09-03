import { describe, expect, it, vi } from 'vitest';
import type { DbClient } from '@sentinel/db';
import { createStudentExamAccessOverride } from './create-student-exam-access-override.service';
import { StudentOverridesRepository } from '../data/student-overrides.repository';
import { LogsService } from '../../../general/logs/logs.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';

describe('createStudentExamAccessOverride', () => {
    const examId = '22222222-2222-4222-8222-222222222222';
    const studentId = '33333333-3333-4333-8333-333333333333';
    const institutionId = '44444444-4444-4444-8444-444444444444';

    it('creates an override, persists it, and emits telemetry and notifications', async () => {
        const dbClient = {} as DbClient;

        const insertSpy = vi
            .spyOn(StudentOverridesRepository, 'insertExamOverrideRecord')
            .mockResolvedValue({} as any);

        vi.spyOn(StudentOverridesRepository, 'findExamForTelemetry').mockResolvedValue({
            institution_id: institutionId,
            title: 'Midterm Exam',
        });

        const logSpy = vi.spyOn(LogsService, 'createLog').mockResolvedValue({} as any);
        const notifySpy = vi
            .spyOn(ActivityNotificationService, 'notifyInstitutionActivityOverride')
            .mockResolvedValue({} as any);

        const result = await createStudentExamAccessOverride({
            dbClient,
            examId,
            body: {
                studentId,
                overrideType: 'MAKEUP',
                availableFrom: '2026-04-13T06:00:00.000Z',
                availableUntil: '2026-04-13T08:00:00.000Z',
                allowedAttempts: 1,
                notes: 'Medical exemption',
            },
            grantedBy: 'instructor-1',
        });

        expect(result.examId).toBe(examId);
        expect(result.studentId).toBe(studentId);
        expect(result.overrideType).toBe('MAKEUP');
        expect(result.allowedAttempts).toBe(1);
        expect(result.notes).toBe('Medical exemption');
        expect(insertSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith(
            dbClient,
            expect.objectContaining({
                action: 'exam.override_created',
                activeInstitutionId: institutionId,
            }),
        );
        expect(notifySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                institutionId,
                targetType: 'EXAM_OVERRIDE',
            }),
        );
    });
});
