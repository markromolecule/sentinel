import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type DbClient } from '@sentinel/db';
import { getExamMonitoringOverview } from './get-exam-monitoring-overview.service';
import { getMonitoringExamContext } from '../data/get-monitoring-exam-context';

vi.mock('../data/get-monitoring-exam-context', () => ({
    getMonitoringExamContext: vi.fn(),
}));

describe('getExamMonitoringOverview', () => {
    let mockDb: any;

    beforeEach(() => {
        vi.clearAllMocks();

        let executeCall = 0;
        mockDb = {
            selectFrom: vi.fn().mockReturnThis(),
            distinctOn: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockReturnThis(),
            as: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            leftJoin: vi.fn().mockReturnThis(),
            execute: vi.fn(async () => {
                executeCall += 1;

                if (executeCall === 1) {
                    return [
                        {
                            student_user_id: 'student-user-1',
                            student_record_id: 'student-record-1',
                            student_number: '2024-0001',
                            first_name: 'Ana',
                            last_name: 'Santos',
                            last_seen_at: '2026-07-11T10:00:00.000Z',
                            attempt_id: 'attempt-1',
                            attempt_status: 'IN_PROGRESS',
                            lifecycle_state: 'IN_PROGRESS',
                            score_state: 'DRAFT',
                            started_at: '2026-07-11T09:30:00.000Z',
                            completed_at: null,
                            time_spent_minutes: 20,
                            reconnect_attempt_count: 1,
                            answered_question_count: 8,
                            score: null,
                            total_score: null,
                            closed_reason: null,
                            reopened_until: null,
                            finalized_at: null,
                            incident_count: 2,
                            open_incident_count: 1,
                            has_high_severity: true,
                            latest_incident_type: 'TAB_SWITCH',
                            latest_incident_at: '2026-07-11T09:55:00.000Z',
                        },
                    ];
                }

                return [];
            }),
            executeTakeFirst: vi.fn(async () => ({
                waiting: 1,
                approved: 0,
                in_attempt: 1,
            })),
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
    });

    it('includes committed incident summary data in the monitoring overview response', async () => {
        const result = await getExamMonitoringOverview({
            dbClient: mockDb as DbClient,
            examId: 'exam-1',
            institutionId: 'institution-1',
            viewerRole: 'instructor',
            userId: 'user-1',
        });

        expect(getMonitoringExamContext).toHaveBeenCalledWith({
            dbClient: mockDb,
            examId: 'exam-1',
            institutionId: 'institution-1',
            viewerRole: 'instructor',
            userId: 'user-1',
        });
        expect(result.exam).toMatchObject({
            id: 'exam-1',
            title: 'Physics Final',
        });
        expect(result.students).toHaveLength(1);
        expect(result.students[0]).toMatchObject({
            id: 'student-user-1',
            incidentCount: 2,
            openIncidentCount: 1,
            latestIncidentType: 'TAB_SWITCH',
            status: 'flagged',
        });
        expect(result.lobbyAdmissions).toMatchObject({
            waiting: 1,
            approved: 0,
            inAttempt: 1,
        });
    });
});
