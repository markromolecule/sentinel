import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type DbClient } from '@sentinel/db';
import { getExamMonitoringStudentDetail } from './get-exam-monitoring-student-detail';
import { getMonitoringExamContext } from './get-monitoring-exam-context';
import { TelemetryStorageService } from '../../../telemetry/storage/storage.service';

vi.mock('./get-monitoring-exam-context', () => ({
    getMonitoringExamContext: vi.fn(),
}));

vi.mock('../../../telemetry/storage/storage.service', () => ({
    TelemetryStorageService: {
        getIncidents: vi.fn(),
    },
}));

describe('getExamMonitoringStudentDetail', () => {
    let mockDb: any;

    beforeEach(() => {
        vi.clearAllMocks();

        let executeTakeFirstCall = 0;
        mockDb = {
            selectFrom: vi.fn().mockReturnThis(),
            distinctOn: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            leftJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn(async () => {
                executeTakeFirstCall += 1;

                if (executeTakeFirstCall === 1) {
                    return {
                        student_user_id: 'student-user-1',
                        student_record_id: 'student-record-1',
                        student_number: '2024-0001',
                        first_name: 'Ana',
                        last_name: 'Santos',
                        last_seen_at: '2026-07-11T10:00:00.000Z',
                        attempt_id: 'attempt-1',
                        attempt_status: 'IN_PROGRESS',
                        lifecycle_state: 'LOCKED',
                        score_state: 'DRAFT',
                        started_at: '2026-07-11T09:30:00.000Z',
                        completed_at: null,
                        time_spent_minutes: 20,
                        answered_question_count: 8,
                        score: null,
                        total_score: null,
                        closed_reason: 'MANUAL_MONITORING_LOCK',
                        reopened_until: '2026-07-11T10:30:00.000Z',
                        finalized_at: null,
                        incident_count: 1,
                        open_incident_count: 1,
                        has_high_severity: false,
                        latest_incident_type: 'TAB_SWITCH',
                        latest_incident_at: '2026-07-11T09:55:00.000Z',
                    };
                }

                return undefined;
            }),
            execute: vi.fn(async () => [
                {
                    event_id: 'event-1',
                    attempt_id: 'attempt-1',
                    exam_id: 'exam-1',
                    student_id: 'student-record-1',
                    event_type: 'LOCKED',
                    previous_state: 'IN_PROGRESS',
                    next_state: 'LOCKED',
                    actor_user_id: null,
                    reason_code: 'MANUAL_MONITORING_LOCK',
                    notes: 'Locked from monitoring',
                    related_incident_ids: null,
                    related_override_id: null,
                    metadata: null,
                    created_at: '2026-07-11T09:56:00.000Z',
                },
            ]),
        };

        vi.mocked(getMonitoringExamContext).mockResolvedValue({
            examId: 'exam-1',
            title: 'Physics Final',
            subject: 'Physics',
            durationMinutes: 60,
            scheduledDate: '2026-07-11T09:00:00.000Z',
            endDateTime: '2026-07-11T10:00:00.000Z',
            maxReconnectAttempts: 3,
            questionCount: 20,
            remediation: null,
        } as any);

        vi.mocked(TelemetryStorageService.getIncidents).mockResolvedValue([
            {
                incidentId: 'incident-1',
                attemptId: 'attempt-1',
                examId: 'exam-1',
                examTitle: 'Physics Final',
                institutionId: 'institution-1',
                studentId: 'student-user-1',
                studentRecordId: 'student-record-1',
                studentName: 'Ana Santos',
                platform: 'WEB',
                source: 'CLIENT',
                ruleKey: 'webSecurity.tab_switching_monitor',
                incidentType: 'TAB_SWITCH',
                severity: 'MEDIUM',
                status: 'PENDING',
                timestamp: '2026-07-11T09:55:00.000Z',
                evidenceUrl: null,
                reviewedBy: null,
                reviewedAt: null,
                reviewNotes: null,
                configurationSnapshot: null,
                sessionContext: null,
                details: {
                    occurrenceCount: 2,
                    severityReason: 'repeat-escalated',
                    severityInputs: {
                        baseSeverity: 'LOW',
                        ladder: ['LOW', 'MEDIUM', 'HIGH'],
                        matchingCount: 2,
                        matchingWindowSeconds: 300,
                        repeatThreshold: 2,
                        overrideSeverity: null,
                    },
                },
            } as any,
        ]);
    });

    it('includes committed flagged incidents in the student monitoring detail response', async () => {
        const result = await getExamMonitoringStudentDetail({
            dbClient: mockDb as DbClient,
            examId: 'exam-1',
            studentId: 'student-user-1',
            institutionId: 'institution-1',
            viewerRole: 'instructor',
            userId: 'user-1',
        });

        expect(getMonitoringExamContext).toHaveBeenCalled();
        expect(TelemetryStorageService.getIncidents).toHaveBeenCalledWith(
            mockDb,
            {
                attemptId: 'attempt-1',
                limit: 200,
            },
            'institution-1',
        );
        expect(result.flags).toHaveLength(1);
        expect(result.flags[0]).toMatchObject({
            id: 'incident-1',
            occurrenceCount: 2,
            severity: 'medium',
            severityReason: 'repeat-escalated',
        });
        expect(result.lifecycleState).toBe('LOCKED');
        expect(result.lifecycleEvents?.[0]).toMatchObject({
            eventType: 'LOCKED',
            reasonCode: 'MANUAL_MONITORING_LOCK',
        });
    });

    it('fetches incidents only for the selected operational attempt', async () => {
        mockDb.executeTakeFirst.mockResolvedValueOnce({
            student_user_id: 'student-user-1',
            student_record_id: 'student-record-1',
            student_number: '2024-0001',
            first_name: 'Ana',
            last_name: 'Santos',
            last_seen_at: '2026-07-11T10:00:00.000Z',
            attempt_id: 'active-attempt',
            attempt_status: 'IN_PROGRESS',
            lifecycle_state: 'IN_PROGRESS',
            score_state: 'DRAFT',
            started_at: '2026-07-11T09:45:00.000Z',
            completed_at: null,
            time_spent_minutes: 10,
            answered_question_count: 4,
            score: null,
            total_score: null,
            closed_reason: null,
            reopened_until: null,
            finalized_at: null,
            incident_count: 1,
            open_incident_count: 1,
            has_high_severity: true,
            latest_incident_type: 'TAB_SWITCH',
            latest_incident_at: '2026-07-11T09:58:00.000Z',
        });
        mockDb.execute.mockResolvedValueOnce([]);
        vi.mocked(TelemetryStorageService.getIncidents).mockResolvedValueOnce([
            {
                incidentId: 'active-incident',
                attemptId: 'active-attempt',
                examId: 'exam-1',
                examTitle: 'Physics Final',
                institutionId: 'institution-1',
                studentId: 'student-user-1',
                studentRecordId: 'student-record-1',
                studentName: 'Ana Santos',
                platform: 'WEB',
                source: 'CLIENT',
                ruleKey: 'webSecurity.tab_switching_monitor',
                incidentType: 'TAB_SWITCH',
                severity: 'HIGH',
                status: 'PENDING',
                timestamp: '2026-07-11T09:58:00.000Z',
                evidenceUrl: null,
                reviewedBy: null,
                reviewedAt: null,
                reviewNotes: null,
                configurationSnapshot: null,
                sessionContext: null,
                details: {
                    occurrenceCount: 3,
                    severityReason: 'repeat-escalated',
                },
            } as any,
        ]);

        const result = await getExamMonitoringStudentDetail({
            dbClient: mockDb as DbClient,
            examId: 'exam-1',
            studentId: 'student-user-1',
            institutionId: 'institution-1',
            viewerRole: 'instructor',
            userId: 'user-1',
        });

        expect(TelemetryStorageService.getIncidents).toHaveBeenCalledWith(
            mockDb,
            {
                attemptId: 'active-attempt',
                limit: 200,
            },
            'institution-1',
        );
        expect(result.attemptId).toBe('active-attempt');
        expect(result.flags).toHaveLength(1);
        expect(result.flags[0]).toMatchObject({
            id: 'active-incident',
            severity: 'high',
        });
        expect(result.flags.map((flag) => flag.attemptId)).not.toContain('completed-attempt');
    });
});
