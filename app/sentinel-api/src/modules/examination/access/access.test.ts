import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type DbClient } from '@sentinel/db';
import { AccessGatekeeperService } from './access.service';
import { EntitlementsRepository } from './data/entitlements.repository';
import { RuntimeAccessService } from '../runtime-access/runtime-access.service';
import { StudentOverridesService } from '../student-overrides/student-overrides.service';

vi.mock('./data/entitlements.repository', () => ({
    EntitlementsRepository: {
        getStudentProfileByUserId: vi.fn(),
        getExamAccessPolicy: vi.fn(),
        hasStudentExamEnrollment: vi.fn(),
        getStudentLatestExamAttempt: vi.fn(),
        getStudentLatestLobbyAdmission: vi.fn(),
    },
}));

vi.mock('../runtime-access/runtime-access.service', () => ({
    RuntimeAccessService: {
        resolveExamRuntimeAccess: vi.fn(),
        getPersistedExamRuntimeAccess: vi.fn(),
    },
}));

vi.mock('../student-overrides/student-overrides.service', async () => {
    const actual = await vi.importActual<
        typeof import('../student-overrides/student-overrides.service')
    >('../student-overrides/student-overrides.service');

    return {
        ...actual,
        StudentOverridesService: {
            getActiveStudentExamOverride: vi.fn(),
        },
    };
});

describe('AccessGatekeeperService', () => {
    const mockDb = {} as DbClient;
    const userId = 'b49ef7a1-c7c7-4c79-851d-b5c6c0e48ff8';
    const examId = '0df6f61d-282e-4be7-a2f2-a190246ef7be';
    const now = new Date('2026-04-13T06:00:00.000Z');

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(RuntimeAccessService.resolveExamRuntimeAccess).mockResolvedValue({
            state: 'open',
            reasonCode: 'OPEN',
            message: 'This exam is open for students.',
            canStart: true,
            canResume: false,
            hasActiveAttempt: false,
            startsAt: null,
            endsAt: null,
            reopenedUntil: null,
        });
        vi.mocked(RuntimeAccessService.getPersistedExamRuntimeAccess).mockResolvedValue(null);
        vi.mocked(StudentOverridesService.getActiveStudentExamOverride).mockResolvedValue(null);
        vi.mocked(EntitlementsRepository.getStudentLatestLobbyAdmission).mockResolvedValue(
            undefined,
        );
    });

    it('rejects access when the authenticated account has no student profile', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue(undefined);
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue(undefined);

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toEqual({
            isEligible: false,
            reason: 'Student profile not found for the authenticated account.',
            reasonCode: 'CLOSED',
            runtimeAccess: {
                state: 'closed',
                reasonCode: 'CLOSED',
                message: 'Student profile not found for the authenticated account.',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
                startsAt: null,
                endsAt: null,
                reopenedUntil: null,
            },
        });
    });

    it('rejects access when runtime access says the exam has not started yet', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: null,
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T08:00:00.000Z'),
            end_date_time: new Date('2026-04-13T09:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
            lobby_admission_mode: 'AUTOMATIC',
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue(undefined);
        vi.mocked(RuntimeAccessService.resolveExamRuntimeAccess).mockResolvedValue({
            state: 'before_start',
            reasonCode: 'NOT_STARTED',
            message: 'This exam will open on 4/13/2026, 4:00:00 PM.',
            canStart: false,
            canResume: false,
            hasActiveAttempt: false,
            startsAt: '2026-04-13T08:00:00.000Z',
            endsAt: '2026-04-13T09:00:00.000Z',
            reopenedUntil: null,
        });

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toEqual({
            isEligible: false,
            reason: 'This exam will open on 4/13/2026, 4:00:00 PM.',
            reasonCode: 'NOT_STARTED',
            accessOverride: null,
            runtimeAccess: {
                state: 'before_start',
                reasonCode: 'NOT_STARTED',
                message: 'This exam will open on 4/13/2026, 4:00:00 PM.',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
                startsAt: '2026-04-13T08:00:00.000Z',
                endsAt: '2026-04-13T09:00:00.000Z',
                reopenedUntil: null,
            },
        });
        expect(EntitlementsRepository.hasStudentExamEnrollment).toHaveBeenCalled();
    });

    it('returns the access context when enrollment and schedule checks pass', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: 'section-1',
            room_id: 'room-1',
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: 'room-1',
            room_institution_id: 'institution-1',
            assigned_section_ids: null,
            lobby_admission_mode: 'AUTOMATIC',
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue(undefined);

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toMatchObject({
            isEligible: true,
            context: {
                examId,
                studentId: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
                classroomId: null,
                subjectId: 'subject-1',
                sectionId: 'section-1',
                sectionIds: null,
                roomId: 'room-1',
                durationMinutes: 60,
                scheduledDate: new Date('2026-04-13T05:00:00.000Z'),
                endDateTime: new Date('2026-04-13T07:00:00.000Z'),
                status: 'PUBLISHED',
                publishedAt: new Date('2026-04-12T06:00:00.000Z'),
                institutionId: 'institution-1',
                remediation: null,
            },
            accessOverride: null,
            runtimeAccess: {
                state: 'open',
                reasonCode: 'OPEN',
                message: 'This exam is open for students.',
                canStart: true,
                canResume: false,
                hasActiveAttempt: false,
                startsAt: null,
                endsAt: null,
                reopenedUntil: null,
            },
        });
        expect(EntitlementsRepository.hasStudentExamEnrollment).toHaveBeenCalledWith(mockDb, {
            studentId: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            classGroupId: null,
            subjectId: 'subject-1',
            sectionId: 'section-1',
            sectionIds: null,
        });
    });

    it('allows a remediation exam only for the linked student', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'student-record-1',
            user_id: userId,
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: null,
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
            lobby_admission_mode: 'AUTOMATIC',
            remediation_id: 'remediation-1',
            remediation_source_exam_id: 'source-exam-1',
            remediation_student_id: userId,
            remediation_source_attempt_id: 'source-attempt-1',
            remediation_type: 'RETAKE',
            remediation_scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            remediation_end_date_time: new Date('2026-04-13T07:00:00.000Z'),
        } as any);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue(undefined);

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toMatchObject({
            isEligible: true,
            context: {
                examId,
                studentId: 'student-record-1',
                studentUserId: userId,
                remediation: {
                    remediationId: 'remediation-1',
                    sourceExamId: 'source-exam-1',
                    sourceAttemptId: 'source-attempt-1',
                    remediationType: 'RETAKE',
                },
            },
        });
        expect(EntitlementsRepository.hasStudentExamEnrollment).not.toHaveBeenCalled();
    });

    it('blocks classmates from opening a remediation exam that is not linked to them', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'student-record-2',
            user_id: 'classmate-user-2',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: null,
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
            lobby_admission_mode: 'AUTOMATIC',
            remediation_id: 'remediation-1',
            remediation_source_exam_id: 'source-exam-1',
            remediation_student_id: 'target-user-1',
            remediation_source_attempt_id: 'source-attempt-1',
            remediation_type: 'RETAKE',
            remediation_scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            remediation_end_date_time: new Date('2026-04-13T07:00:00.000Z'),
        } as any);

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toEqual({
            isEligible: false,
            reason: 'This remediation exam is only available to the assigned student.',
            reasonCode: 'CLOSED',
            runtimeAccess: {
                state: 'closed',
                reasonCode: 'CLOSED',
                message: 'This remediation exam is only available to the assigned student.',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
                startsAt: new Date('2026-04-13T05:00:00.000Z'),
                endsAt: new Date('2026-04-13T07:00:00.000Z'),
                reopenedUntil: null,
            },
        });
        expect(EntitlementsRepository.hasStudentExamEnrollment).not.toHaveBeenCalled();
    });

    it('passes merged assigned section ids through the eligibility path', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: null,
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: ['section-from-new-assignment-table'],
            lobby_admission_mode: 'AUTOMATIC',
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue(undefined);

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toMatchObject({
            isEligible: true,
            context: {
                sectionIds: ['section-from-new-assignment-table'],
            },
        });
        expect(EntitlementsRepository.hasStudentExamEnrollment).toHaveBeenCalledWith(mockDb, {
            studentId: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            classGroupId: null,
            subjectId: 'subject-1',
            sectionId: null,
            sectionIds: ['section-from-new-assignment-table'],
        });
    });

    it('treats exact classroom assignments as eligible even when the section is shared elsewhere', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: 'classroom-1',
            subject_id: 'subject-1',
            section_id: 'section-1',
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: ['section-1'],
            lobby_admission_mode: 'AUTOMATIC',
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue(undefined);

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toMatchObject({
            isEligible: true,
            context: {
                classroomId: 'classroom-1',
                sectionId: 'section-1',
            },
        });
        expect(EntitlementsRepository.hasStudentExamEnrollment).toHaveBeenCalledWith(mockDb, {
            studentId: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            classGroupId: 'classroom-1',
            subjectId: 'subject-1',
            sectionId: 'section-1',
            sectionIds: ['section-1'],
        });
    });

    it('rejects students in another classroom when exact classroom eligibility fails', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: 'classroom-1',
            subject_id: 'subject-1',
            section_id: 'section-1',
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: ['section-1'],
            lobby_admission_mode: 'AUTOMATIC',
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(false);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue(undefined);

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toMatchObject({
            isEligible: false,
            reasonCode: 'CLOSED',
        });
        expect(EntitlementsRepository.hasStudentExamEnrollment).toHaveBeenCalledWith(mockDb, {
            studentId: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            classGroupId: 'classroom-1',
            subjectId: 'subject-1',
            sectionId: 'section-1',
            sectionIds: ['section-1'],
        });
    });

    it('allows locked exams to resume when the student has an active attempt', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: 'section-1',
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
            lobby_admission_mode: 'AUTOMATIC',
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue({
            attempt_id: 'attempt-1',
            status: 'IN_PROGRESS',
        } as never);
        vi.mocked(RuntimeAccessService.resolveExamRuntimeAccess).mockResolvedValue({
            state: 'locked',
            reasonCode: 'LOCKED',
            message: 'This exam is locked to new joins, but your active attempt can still resume.',
            canStart: false,
            canResume: true,
            hasActiveAttempt: true,
            startsAt: '2026-04-13T05:00:00.000Z',
            endsAt: '2026-04-13T07:00:00.000Z',
            reopenedUntil: null,
        });

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toMatchObject({
            isEligible: true,
            runtimeAccess: {
                state: 'locked',
                canStart: false,
                canResume: true,
                hasActiveAttempt: true,
            },
        });
    });

    it('blocks a locked attempt when no reopen window is active', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: 'section-1',
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
            lobby_admission_mode: 'AUTOMATIC',
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue({
            attempt_id: 'attempt-locked',
            status: 'IN_PROGRESS',
            lifecycle_state: 'LOCKED',
            lifecycle_reason: 'Instructor paused this attempt.',
            reopened_until: null,
            reconnect_attempt_count: 1,
            completed_at: null,
        } as never);

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toMatchObject({
            isEligible: false,
            reasonCode: 'LOCKED',
            runtimeAccess: {
                state: 'locked',
                canResume: false,
                message: 'Instructor paused this attempt.',
            },
        });
    });

    it('allows a reopen override only when it references the latest resumable attempt', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: 'section-1',
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
            lobby_admission_mode: 'AUTOMATIC',
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue({
            attempt_id: 'attempt-reopen',
            status: 'IN_PROGRESS',
            lifecycle_state: 'LOCKED',
            lifecycle_reason: 'Needs manual reopen.',
            reopened_until: null,
            reconnect_attempt_count: 1,
            completed_at: null,
        } as never);
        vi.mocked(RuntimeAccessService.resolveExamRuntimeAccess).mockResolvedValue({
            state: 'closed',
            reasonCode: 'CLOSED',
            message: 'The scheduled exam window has ended.',
            canStart: false,
            canResume: false,
            hasActiveAttempt: false,
            startsAt: '2026-04-13T05:00:00.000Z',
            endsAt: '2026-04-13T07:00:00.000Z',
            reopenedUntil: null,
        });
        vi.mocked(StudentOverridesService.getActiveStudentExamOverride).mockResolvedValue({
            id: 'reopen-1',
            examId,
            studentId: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            grantedBy: 'instructor-1',
            overrideType: 'REOPEN',
            availableFrom: '2026-04-13T06:00:00.000Z',
            availableUntil: '2026-04-13T08:00:00.000Z',
            allowedAttempts: 1,
            usedAttempts: 0,
            usedAttemptIds: [],
            sourceAttemptId: 'attempt-reopen',
            notes: 'Resume the paused attempt.',
            createdAt: '2026-04-13T06:00:00.000Z',
            updatedAt: '2026-04-13T06:00:00.000Z',
        });

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            new Date('2026-04-13T06:30:00.000Z'),
        );

        expect(result).toMatchObject({
            isEligible: true,
            accessOverride: {
                overrideType: 'REOPEN',
                sourceAttemptId: 'attempt-reopen',
            },
            runtimeAccess: {
                state: 'reopened',
                canResume: true,
                hasActiveAttempt: true,
            },
        });
    });

    it('blocks a superseded attempt until a replacement override is granted', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: 'section-1',
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T06:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue({
            attempt_id: 'attempt-superseded',
            status: 'COMPLETED',
            lifecycle_state: 'SUPERSEDED',
            lifecycle_reason: 'This attempt was reset and replaced.',
            reopened_until: null,
            reconnect_attempt_count: 0,
            completed_at: new Date('2026-04-13T05:45:00.000Z'),
        } as never);

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            new Date('2026-04-13T06:30:00.000Z'),
        );

        expect(result).toMatchObject({
            isEligible: false,
            reasonCode: 'CLOSED',
            runtimeAccess: {
                state: 'closed',
                message: 'This attempt was reset and replaced.',
            },
        });
    });

    it('allows a retake override to create a replacement attempt after a superseded attempt', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: 'section-1',
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T06:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue({
            attempt_id: 'attempt-superseded',
            status: 'COMPLETED',
            lifecycle_state: 'SUPERSEDED',
            lifecycle_reason: 'This attempt was reset and replaced.',
            reopened_until: null,
            reconnect_attempt_count: 0,
            completed_at: new Date('2026-04-13T05:45:00.000Z'),
        } as never);
        vi.mocked(RuntimeAccessService.resolveExamRuntimeAccess).mockResolvedValue({
            state: 'closed',
            reasonCode: 'CLOSED',
            message: 'This exam window has already closed.',
            canStart: false,
            canResume: false,
            hasActiveAttempt: false,
            startsAt: '2026-04-13T05:00:00.000Z',
            endsAt: '2026-04-13T06:00:00.000Z',
            reopenedUntil: null,
        });
        vi.mocked(StudentOverridesService.getActiveStudentExamOverride).mockResolvedValue({
            id: 'retake-1',
            examId,
            studentId: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            grantedBy: 'instructor-1',
            overrideType: 'RETAKE',
            availableFrom: '2026-04-13T06:00:00.000Z',
            availableUntil: '2026-04-13T08:00:00.000Z',
            allowedAttempts: 1,
            usedAttempts: 0,
            usedAttemptIds: [],
            sourceAttemptId: 'attempt-superseded',
            notes: 'Approved retake.',
            createdAt: '2026-04-13T06:00:00.000Z',
            updatedAt: '2026-04-13T06:00:00.000Z',
        });

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            new Date('2026-04-13T06:30:00.000Z'),
        );

        expect(result).toMatchObject({
            isEligible: true,
            accessOverride: {
                overrideType: 'RETAKE',
            },
            runtimeAccess: {
                state: 'reopened',
                canStart: true,
                canResume: false,
            },
        });
    });

    it('allows a student-specific makeup override to bypass the closed exam schedule', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: 'section-1',
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T06:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue(undefined);
        vi.mocked(RuntimeAccessService.resolveExamRuntimeAccess).mockResolvedValue({
            state: 'closed',
            reasonCode: 'CLOSED',
            message: 'This exam window has already closed.',
            canStart: false,
            canResume: false,
            hasActiveAttempt: false,
            startsAt: '2026-04-13T05:00:00.000Z',
            endsAt: '2026-04-13T06:00:00.000Z',
            reopenedUntil: null,
        });
        vi.mocked(StudentOverridesService.getActiveStudentExamOverride).mockResolvedValue({
            id: '11111111-1111-4111-8111-111111111111',
            examId,
            studentId: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            grantedBy: '22222222-2222-4222-8222-222222222222',
            overrideType: 'MAKEUP',
            availableFrom: '2026-04-13T06:00:00.000Z',
            availableUntil: '2026-04-13T08:00:00.000Z',
            allowedAttempts: 1,
            usedAttempts: 0,
            usedAttemptIds: [],
            sourceAttemptId: null,
            notes: 'Approved makeup',
            createdAt: '2026-04-13T06:00:00.000Z',
            updatedAt: '2026-04-13T06:00:00.000Z',
        });

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            new Date('2026-04-13T06:30:00.000Z'),
        );

        expect(result).toMatchObject({
            isEligible: true,
            accessOverride: {
                overrideType: 'MAKEUP',
            },
            runtimeAccess: {
                state: 'reopened',
                canStart: true,
            },
        });
    });

    it('keeps a manually gated student in the lobby until approval is granted', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: null,
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
            lobby_admission_mode: 'INSTRUCTOR_GATED',
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue(undefined);

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toEqual({
            isEligible: false,
            reason: 'This exam requires instructor approval before you can enter the attempt. Stay in the lobby while waiting.',
            reasonCode: 'LOBBY_WAITING',
            accessOverride: null,
            runtimeAccess: {
                state: 'lobby_waiting',
                reasonCode: 'LOBBY_WAITING',
                message:
                    'This exam requires instructor approval before you can enter the attempt. Stay in the lobby while waiting.',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
                startsAt: null,
                endsAt: null,
                reopenedUntil: null,
            },
        });
    });

    it('allows a manually approved student to start the exam from the lobby', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: null,
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
            lobby_admission_mode: 'INSTRUCTOR_GATED',
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue(undefined);
        vi.mocked(EntitlementsRepository.getStudentLatestLobbyAdmission).mockResolvedValue({
            admission_id: 'admission-1',
            status: 'APPROVED',
            checked_in_at: new Date('2026-04-13T05:01:00.000Z'),
            decided_at: new Date('2026-04-13T05:02:00.000Z'),
        } as never);

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toMatchObject({
            isEligible: true,
            runtimeAccess: {
                state: 'lobby_approved',
                reasonCode: 'LOBBY_APPROVED',
                canStart: true,
                canResume: false,
            },
        });
    });

    it('allows an active manually gated attempt to resume without lobby gating', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: null,
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
            lobby_admission_mode: 'INSTRUCTOR_GATED',
        });
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue({
            attempt_id: 'attempt-1',
            status: 'IN_PROGRESS',
            completed_at: null,
        } as never);
        vi.mocked(EntitlementsRepository.getStudentLatestLobbyAdmission).mockResolvedValue({
            admission_id: 'admission-1',
            status: 'WAITING',
            checked_in_at: new Date('2026-04-13T05:01:00.000Z'),
            decided_at: null,
        } as never);
        vi.mocked(RuntimeAccessService.resolveExamRuntimeAccess).mockResolvedValue({
            state: 'locked',
            reasonCode: 'LOCKED',
            message: 'This exam is locked to new joins, but your active attempt can still resume.',
            canStart: false,
            canResume: true,
            hasActiveAttempt: true,
            startsAt: '2026-04-13T05:00:00.000Z',
            endsAt: '2026-04-13T07:00:00.000Z',
            reopenedUntil: null,
        });

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toMatchObject({
            isEligible: true,
            runtimeAccess: {
                state: 'locked',
                reasonCode: 'LOCKED',
                canStart: false,
                canResume: true,
                hasActiveAttempt: true,
            },
        });
    });
    it('grants eligible access to a CLOSED attempt when a matching REOPEN override exists', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: null,
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
            lobby_admission_mode: 'AUTOMATIC',
            max_reconnect_attempts: 3,
        } as never);
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue({
            attempt_id: 'attempt-closed-1',
            status: 'IN_PROGRESS',
            completed_at: null,
            started_at: new Date('2026-04-13T05:01:00.000Z'),
            lifecycle_state: 'CLOSED',
            lifecycle_reason: 'Closed due to HIGH flagging threshold.',
            reconnect_attempt_count: 2,
            reopened_until: null,
            closed_at: new Date('2026-04-13T05:20:00.000Z'),
            superseded_by_attempt_id: null,
        } as never);
        vi.mocked(StudentOverridesService.getActiveStudentExamOverride).mockResolvedValue({
            id: 'override-reopen-1',
            examId,
            studentId: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            grantedBy: 'instructor-1',
            overrideType: 'REOPEN',
            availableFrom: '2026-04-13T06:00:00.000Z',
            availableUntil: '2026-04-13T08:00:00.000Z',
            allowedAttempts: 1,
            usedAttempts: 0,
            usedAttemptIds: [],
            sourceAttemptId: 'attempt-closed-1',
            notes: null,
            createdAt: '2026-04-13T06:00:00.000Z',
            updatedAt: '2026-04-13T06:00:00.000Z',
        } as never);
        vi.mocked(RuntimeAccessService.resolveExamRuntimeAccess).mockResolvedValue({
            state: 'open',
            reasonCode: 'OPEN',
            message: 'This exam is open for students.',
            canStart: true,
            canResume: false,
            hasActiveAttempt: false,
            startsAt: '2026-04-13T05:00:00.000Z',
            endsAt: '2026-04-13T07:00:00.000Z',
            reopenedUntil: null,
        });

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toMatchObject({
            isEligible: true,
        });
        expect(result.isEligible && result.accessOverride?.overrideType).toBe('REOPEN');
    });

    it('blocks access to a CLOSED attempt when no REOPEN override or reopen window exists', async () => {
        vi.mocked(EntitlementsRepository.getStudentProfileByUserId).mockResolvedValue({
            student_id: 'e5c1ca10-c818-4bda-8f95-5255c1d5b1e7',
            institution_id: 'institution-1',
        });
        vi.mocked(EntitlementsRepository.getExamAccessPolicy).mockResolvedValue({
            exam_id: examId,
            class_group_id: null,
            subject_id: 'subject-1',
            section_id: null,
            room_id: null,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-13T05:00:00.000Z'),
            end_date_time: new Date('2026-04-13T07:00:00.000Z'),
            status: 'PUBLISHED',
            published_at: new Date('2026-04-12T06:00:00.000Z'),
            institution_id: 'institution-1',
            assigned_room_id: null,
            room_institution_id: null,
            assigned_section_ids: null,
            lobby_admission_mode: 'AUTOMATIC',
            max_reconnect_attempts: 3,
        } as never);
        vi.mocked(EntitlementsRepository.hasStudentExamEnrollment).mockResolvedValue(true);
        vi.mocked(EntitlementsRepository.getStudentLatestExamAttempt).mockResolvedValue({
            attempt_id: 'attempt-closed-2',
            status: 'IN_PROGRESS',
            completed_at: null,
            started_at: new Date('2026-04-13T05:01:00.000Z'),
            lifecycle_state: 'CLOSED',
            lifecycle_reason: 'Closed due to HIGH flagging threshold.',
            reconnect_attempt_count: 2,
            reopened_until: null,
            closed_at: new Date('2026-04-13T05:20:00.000Z'),
            superseded_by_attempt_id: null,
        } as never);
        // No active override
        vi.mocked(StudentOverridesService.getActiveStudentExamOverride).mockResolvedValue(null);

        const result = await AccessGatekeeperService.verifyStudentExamEligibility(
            mockDb,
            userId,
            examId,
            now,
        );

        expect(result).toMatchObject({
            isEligible: false,
            reasonCode: 'CLOSED',
        });
    });
});

