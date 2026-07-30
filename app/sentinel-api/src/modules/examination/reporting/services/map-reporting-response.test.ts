import { describe, expect, it } from 'vitest';
import { buildExamReport, mapReportStudentSummary } from './map-reporting-response';

describe('map reporting response', () => {
    it('marks students without attempts as absent and needing makeup', () => {
        const student = mapReportStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0001',
                first_name: 'Ana',
                last_name: 'Santos',
                attempt_id: null,
                attempt_status: null,
                started_at: null,
                completed_at: null,
                time_spent_minutes: null,
                score: null,
                total_score: null,
                attempt_count: 0,
                incident_count: 0,
                open_incident_count: 0,
                pending_incident_count: 0,
                reviewed_incident_count: 0,
                confirmed_incident_count: 0,
                dismissed_incident_count: 0,
                highest_incident_type: null,
                highest_incident_severity: null,
            },
            75,
        );

        expect(student.status).toBe('absent');
        expect(student.submissionType).toBe('absent');
        expect(student.attemptKind).toBeNull();
        expect(student.sectionName).toBeNull();
        expect(student.needsMakeup).toBe(true);
        expect(student.needsReview).toBe(false);
    });

    it('marks repeated failing attempts as retakes and keeps high-severity incidents reviewable', () => {
        const student = mapReportStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0002',
                first_name: 'Maria',
                last_name: 'Garcia',
                section_id: '44444444-4444-4444-8444-444444444444',
                section_name: 'BSCS 3A',
                attempt_id: '33333333-3333-4333-8333-333333333333',
                attempt_status: 'COMPLETED',
                started_at: '2026-04-20T09:00:00.000Z',
                completed_at: '2026-04-20T09:50:00.000Z',
                time_spent_minutes: 50,
                score: 60,
                total_score: 100,
                attempt_count: 2,
                incident_count: 1,
                open_incident_count: 0,
                pending_incident_count: 0,
                reviewed_incident_count: 1,
                confirmed_incident_count: 0,
                dismissed_incident_count: 0,
                highest_incident_type: 'TAB_SWITCH',
                highest_incident_severity: 'HIGH',
            },
            75,
        );

        expect(student.status).toBe('flagged');
        expect(student.submissionType).toBe('retake');
        expect(student.attemptKind).toBe('retake');
        expect(student.sectionName).toBe('BSCS 3A');
        expect(student.needsReview).toBe(true);
        expect(student.needsRetake).toBe(true);
    });

    it('uses the resolved inherited passing score when deciding retakes', () => {
        const student = mapReportStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0002',
                first_name: 'Maria',
                last_name: 'Garcia',
                attempt_id: '33333333-3333-4333-8333-333333333333',
                attempt_status: 'COMPLETED',
                started_at: '2026-04-20T09:00:00.000Z',
                completed_at: '2026-04-20T09:50:00.000Z',
                time_spent_minutes: 50,
                score: 70,
                total_score: 100,
                attempt_count: 1,
                incident_count: 0,
                open_incident_count: 0,
                pending_incident_count: 0,
                reviewed_incident_count: 0,
                confirmed_incident_count: 0,
                dismissed_incident_count: 0,
                highest_incident_type: null,
                highest_incident_severity: null,
            },
            68,
        );

        expect(student.needsRetake).toBe(false);
    });

    it('does not keep a student in the makeup queue when an active makeup override already exists', () => {
        const student = mapReportStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0005',
                first_name: 'Joel',
                last_name: 'Lim',
                attempt_id: null,
                attempt_status: null,
                started_at: null,
                completed_at: null,
                time_spent_minutes: null,
                score: null,
                total_score: null,
                attempt_count: 0,
                incident_count: 0,
                open_incident_count: 0,
                pending_incident_count: 0,
                reviewed_incident_count: 0,
                confirmed_incident_count: 0,
                dismissed_incident_count: 0,
                highest_incident_type: null,
                highest_incident_severity: null,
                active_override_type: 'MAKEUP',
            },
            75,
        );

        expect(student.needsMakeup).toBe(false);
    });

    it('does not keep a student in the makeup queue when a makeup remediation was already granted', () => {
        const student = mapReportStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0005',
                first_name: 'Joel',
                last_name: 'Lim',
                attempt_id: null,
                attempt_status: null,
                started_at: null,
                completed_at: null,
                time_spent_minutes: null,
                score: null,
                total_score: null,
                attempt_count: 0,
                incident_count: 0,
                open_incident_count: 0,
                pending_incident_count: 0,
                reviewed_incident_count: 0,
                confirmed_incident_count: 0,
                dismissed_incident_count: 0,
                highest_incident_type: null,
                highest_incident_severity: null,
                active_override_type: null,
            },
            75,
            {
                remediations: [
                    {
                        remediationId: '33333333-3333-4333-8333-333333333333',
                        remediationExamId: '44444444-4444-4444-8444-444444444444',
                        remediationType: 'MAKEUP',
                        scheduledDate: '2026-07-31T01:00:00.000Z',
                        endDateTime: '2026-07-31T03:00:00.000Z',
                        title: 'Final Exam (Makeup)',
                        status: 'PUBLISHED',
                    },
                ],
            },
        );

        expect(student.needsMakeup).toBe(false);
    });

    it('builds the report summary with averages and action item counts', () => {
        const report = buildExamReport({
            exam: {
                id: '11111111-1111-4111-8111-111111111111',
                title: 'Final Exam',
                subject: 'Algorithms',
                scheduledDate: '2026-04-20T09:00:00.000Z',
                endDateTime: '2026-04-20T10:00:00.000Z',
                durationMinutes: 60,
                passingScore: 75,
            },
            students: [
                mapReportStudentSummary(
                    {
                        student_user_id: '11111111-1111-4111-8111-111111111111',
                        student_record_id: '22222222-2222-4222-8222-222222222222',
                        student_number: '2024-0003',
                        first_name: 'Luis',
                        last_name: 'Reyes',
                        attempt_id: '33333333-3333-4333-8333-333333333333',
                        attempt_status: 'COMPLETED',
                        started_at: '2026-04-20T09:00:00.000Z',
                        completed_at: '2026-04-20T09:45:00.000Z',
                        time_spent_minutes: 45,
                        score: 90,
                        total_score: 100,
                        attempt_count: 1,
                        incident_count: 0,
                        open_incident_count: 0,
                        pending_incident_count: 0,
                        reviewed_incident_count: 0,
                        confirmed_incident_count: 0,
                        dismissed_incident_count: 0,
                        highest_incident_type: null,
                        highest_incident_severity: null,
                    },
                    75,
                ),
                mapReportStudentSummary(
                    {
                        student_user_id: '44444444-4444-4444-8444-444444444444',
                        student_record_id: '55555555-5555-4555-8555-555555555555',
                        student_number: '2024-0004',
                        first_name: 'Nina',
                        last_name: 'Lopez',
                        attempt_id: null,
                        attempt_status: null,
                        started_at: null,
                        completed_at: null,
                        time_spent_minutes: null,
                        score: null,
                        total_score: null,
                        attempt_count: 0,
                        incident_count: 0,
                        open_incident_count: 0,
                        pending_incident_count: 0,
                        reviewed_incident_count: 0,
                        confirmed_incident_count: 0,
                        dismissed_incident_count: 0,
                        highest_incident_type: null,
                        highest_incident_severity: null,
                    },
                    75,
                ),
            ],
            incidentBreakdownByType: [{ type: 'TAB_SWITCH', count: 3 }],
            incidentBreakdownBySeverity: [{ severity: 'HIGH', count: 2 }],
        });

        expect(report.summary.totalAssignedStudents).toBe(2);
        expect(report.summary.totalStarted).toBe(1);
        expect(report.summary.totalSubmitted).toBe(1);
        expect(report.summary.totalAbsent).toBe(1);
        expect(report.summary.averageScore).toBe(90);
        expect(report.summary.passRate).toBe(100);
        expect(report.summary.needsMakeupCount).toBe(1);
        expect(report.actionItems.makeup).toHaveLength(1);
    });

    it('correctly maps percentage and isFinalized attributes from raw database rows', () => {
        const student = mapReportStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0006',
                first_name: 'David',
                last_name: 'Tan',
                attempt_id: '33333333-3333-4333-8333-333333333333',
                attempt_status: 'COMPLETED',
                started_at: '2026-04-20T09:00:00.000Z',
                completed_at: '2026-04-20T09:45:00.000Z',
                time_spent_minutes: 45,
                score: 85,
                total_score: 100,
                attempt_count: 1,
                incident_count: 0,
                open_incident_count: 0,
                pending_incident_count: 0,
                reviewed_incident_count: 0,
                confirmed_incident_count: 0,
                dismissed_incident_count: 0,
                highest_incident_type: null,
                highest_incident_severity: null,
                attempt_finalized_at: '2026-04-20T10:00:00.000Z',
            },
            75,
        );

        expect(student.percentage).toBe(85);
        expect(student.isFinalized).toBe(true);
        expect(student.finalizedAt).toBe('2026-04-20T10:00:00.000Z');
    });

    it('prefers persisted percentage when legacy aggregate columns drift', () => {
        const student = mapReportStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0007',
                first_name: 'Ella',
                last_name: 'Cruz',
                attempt_id: '33333333-3333-4333-8333-333333333333',
                attempt_status: 'COMPLETED',
                started_at: '2026-04-20T09:00:00.000Z',
                completed_at: '2026-04-20T09:45:00.000Z',
                time_spent_minutes: 45,
                score: 0,
                total_score: 5,
                percentage: 60,
                attempt_count: 1,
                incident_count: 0,
                open_incident_count: 0,
                pending_incident_count: 0,
                reviewed_incident_count: 0,
                confirmed_incident_count: 0,
                dismissed_incident_count: 0,
                highest_incident_type: null,
                highest_incident_severity: null,
            },
            75,
        );

        expect(student.percentage).toBe(60);
        expect(student.needsRetake).toBe(true);
    });

    it('supports new attempt lifecycle states (LOCKED, CLOSED, SUPERSEDED) and finalized score states', () => {
        // Locked attempt
        const lockedStudent = mapReportStudentSummary(
            {
                student_user_id: '1111-1111',
                student_record_id: '2222-2222',
                student_number: '2024-0010',
                first_name: 'Locked',
                last_name: 'User',
                attempt_id: '3333-3333',
                attempt_status: 'IN_PROGRESS',
                started_at: '2026-04-20T09:00:00.000Z',
                completed_at: null,
                time_spent_minutes: 10,
                score: null,
                total_score: null,
                attempt_count: 1,
                incident_count: 3,
                open_incident_count: 3,
                pending_incident_count: 3,
                reviewed_incident_count: 0,
                confirmed_incident_count: 0,
                dismissed_incident_count: 0,
                highest_incident_type: 'TAB_SWITCH',
                highest_incident_severity: 'HIGH',
                lifecycle_state: 'LOCKED',
                score_state: 'DRAFT',
            },
            75,
        );
        expect(lockedStudent.status).toBe('flagged');
        expect(lockedStudent.needsReview).toBe(true);
        expect(lockedStudent.lifecycleState).toBe('LOCKED');

        // Closed attempt
        const closedStudent = mapReportStudentSummary(
            {
                student_user_id: '1111-1111',
                student_record_id: '2222-2222',
                student_number: '2024-0011',
                first_name: 'Closed',
                last_name: 'User',
                attempt_id: '3333-3334',
                attempt_status: 'COMPLETED',
                started_at: '2026-04-20T09:00:00.000Z',
                completed_at: '2026-04-20T09:15:00.000Z',
                time_spent_minutes: 15,
                score: 50,
                total_score: 100,
                attempt_count: 1,
                incident_count: 0,
                open_incident_count: 0,
                pending_incident_count: 0,
                reviewed_incident_count: 0,
                confirmed_incident_count: 0,
                dismissed_incident_count: 0,
                highest_incident_type: null,
                highest_incident_severity: null,
                lifecycle_state: 'CLOSED',
                score_state: 'DRAFT',
            },
            75,
        );
        expect(closedStudent.submissionType).toBe('force_close');
        expect(closedStudent.lifecycleState).toBe('CLOSED');

        // Superseded attempt
        const supersededStudent = mapReportStudentSummary(
            {
                student_user_id: '1111-1111',
                student_record_id: '2222-2222',
                student_number: '2024-0012',
                first_name: 'Superseded',
                last_name: 'User',
                attempt_id: '3333-3335',
                attempt_status: 'COMPLETED',
                started_at: '2026-04-20T09:00:00.000Z',
                completed_at: '2026-04-20T09:45:00.000Z',
                time_spent_minutes: 45,
                score: 40,
                total_score: 100,
                attempt_count: 2,
                incident_count: 0,
                open_incident_count: 0,
                pending_incident_count: 0,
                reviewed_incident_count: 0,
                confirmed_incident_count: 0,
                dismissed_incident_count: 0,
                highest_incident_type: null,
                highest_incident_severity: null,
                lifecycle_state: 'SUPERSEDED',
                score_state: 'DRAFT',
            },
            75,
        );
        expect(supersededStudent.needsRetake).toBe(false);
        expect(supersededStudent.lifecycleState).toBe('SUPERSEDED');

        // Finalized attempt
        const finalizedStudent = mapReportStudentSummary(
            {
                student_user_id: '1111-1111',
                student_record_id: '2222-2222',
                student_number: '2024-0013',
                first_name: 'Finalized',
                last_name: 'User',
                attempt_id: '3333-3336',
                attempt_status: 'COMPLETED',
                started_at: '2026-04-20T09:00:00.000Z',
                completed_at: '2026-04-20T09:45:00.000Z',
                time_spent_minutes: 45,
                score: 85,
                total_score: 100,
                attempt_count: 1,
                incident_count: 0,
                open_incident_count: 0,
                pending_incident_count: 0,
                reviewed_incident_count: 0,
                confirmed_incident_count: 0,
                dismissed_incident_count: 0,
                highest_incident_type: null,
                highest_incident_severity: null,
                lifecycle_state: 'SUBMITTED',
                score_state: 'FINALIZED',
                finalized_at: '2026-04-20T10:00:00.000Z',
            },
            75,
        );
        expect(finalizedStudent.isFinalized).toBe(true);
        expect(finalizedStudent.scoreState).toBe('FINALIZED');
    });

    it('excludes superseded attempts from action queues in buildExamReport', () => {
        const report = buildExamReport({
            exam: {
                id: 'exam-123',
                title: 'Final Exam',
                subject: 'Algorithms',
                scheduledDate: '2026-04-20T09:00:00.000Z',
                endDateTime: '2026-04-20T10:00:00.000Z',
                durationMinutes: 60,
                passingScore: 75,
            },
            students: [
                mapReportStudentSummary(
                    {
                        student_user_id: '1111-1111',
                        student_record_id: '2222-2222',
                        student_number: '2024-0014',
                        first_name: 'Superseded',
                        last_name: 'User',
                        attempt_id: '3333-3337',
                        attempt_status: 'COMPLETED',
                        started_at: '2026-04-20T09:00:00.000Z',
                        completed_at: '2026-04-20T09:45:00.000Z',
                        time_spent_minutes: 45,
                        score: 40,
                        total_score: 100,
                        attempt_count: 2,
                        incident_count: 0,
                        open_incident_count: 0,
                        pending_incident_count: 0,
                        reviewed_incident_count: 0,
                        confirmed_incident_count: 0,
                        dismissed_incident_count: 0,
                        highest_incident_type: null,
                        highest_incident_severity: null,
                        lifecycle_state: 'SUPERSEDED',
                        score_state: 'DRAFT',
                    },
                    75,
                ),
            ],
            incidentBreakdownByType: [],
            incidentBreakdownBySeverity: [],
        });

        // The superseded student is in the student list, but NOT in any action items (review, makeup, retake)
        expect(report.students).toHaveLength(1);
        expect(report.actionItems.retake).toHaveLength(0);
    });

    it('keeps linked remediation exam metadata on the mapped student summary', () => {
        const student = mapReportStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0011',
                first_name: 'Remediation',
                last_name: 'Linked',
                attempt_id: null,
                attempt_status: null,
                started_at: null,
                completed_at: null,
                time_spent_minutes: null,
                score: null,
                total_score: null,
                attempt_count: 0,
                incident_count: 0,
                open_incident_count: 0,
                pending_incident_count: 0,
                reviewed_incident_count: 0,
                confirmed_incident_count: 0,
                dismissed_incident_count: 0,
                highest_incident_type: null,
                highest_incident_severity: null,
            },
            75,
            {
                remediations: [
                    {
                        remediationId: '33333333-3333-4333-8333-333333333333',
                        remediationExamId: '44444444-4444-4444-8444-444444444444',
                        remediationType: 'MAKEUP',
                        scheduledDate: '2026-04-21T09:00:00.000Z',
                        endDateTime: '2026-04-21T10:00:00.000Z',
                        title: 'Final Exam (Makeup)',
                        status: 'PUBLISHED',
                    },
                ],
            },
        );

        expect(student.remediations).toEqual([
            expect.objectContaining({
                remediationType: 'MAKEUP',
                remediationExamId: '44444444-4444-4444-8444-444444444444',
            }),
        ]);
    });
});
