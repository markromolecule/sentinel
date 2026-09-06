import { describe, expect, it, vi } from 'vitest';
import {
    buildMonitoringOverview,
    mapMonitoringExam,
    mapMonitoringIncident,
    mapMonitoringIncidentWithEvidenceSummary,
    mapMonitoringStudentDetail,
    mapMonitoringStudentSummary,
} from './map-monitoring-response.service';

describe('map monitoring response', () => {
    it('marks stale in-progress attempts as disconnected when there are no open incidents', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-20T10:00:00.000Z'));

        const student = mapMonitoringStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0001',
                first_name: 'Maria',
                last_name: 'Garcia',
                last_seen_at: '2026-04-20T09:53:00.000Z',
                attempt_id: '33333333-3333-4333-8333-333333333333',
                attempt_status: 'IN_PROGRESS',
                lifecycle_state: 'IN_PROGRESS',
                score_state: 'DRAFT',
                started_at: '2026-04-20T09:00:00.000Z',
                completed_at: null,
                time_spent_minutes: 30,
                score: null,
                total_score: null,
                closed_reason: null,
                reopened_until: null,
                finalized_at: null,
                incident_count: 0,
                open_incident_count: 0,
                has_high_severity: false,
                latest_incident_type: null,
                latest_incident_at: null,
            },
            60,
        );

        expect(student.status).toBe('disconnected');
        expect(student.progress).toBe(50);
        expect(student.lifecycleState).toBe('IN_PROGRESS');

        vi.useRealTimers();
    });

    it('marks attempts with unresolved incidents as flagged before submitted', () => {
        const student = mapMonitoringStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0001',
                first_name: 'Juan',
                last_name: 'Dela Cruz',
                last_seen_at: '2026-04-20T09:59:00.000Z',
                attempt_id: '33333333-3333-4333-8333-333333333333',
                attempt_status: 'COMPLETED',
                lifecycle_state: 'SUBMITTED',
                score_state: 'DRAFT',
                started_at: '2026-04-20T09:00:00.000Z',
                completed_at: '2026-04-20T09:45:00.000Z',
                time_spent_minutes: 45,
                score: 85,
                total_score: 100,
                closed_reason: null,
                reopened_until: null,
                finalized_at: null,
                incident_count: 2,
                open_incident_count: 1,
                has_high_severity: false,
                latest_incident_type: 'TAB_SWITCH',
                latest_incident_at: '2026-04-20T09:40:00.000Z',
            },
            60,
        );

        expect(student.status).toBe('flagged');
        expect(student.progress).toBe(100);
        expect(student.lifecycleState).toBe('SUBMITTED');
    });

    it('maps lifecycle state, score state, and closure metadata onto summaries', () => {
        const student = mapMonitoringStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222229',
                student_number: '2024-0009',
                first_name: 'Nina',
                last_name: 'Lifecycle',
                last_seen_at: '2026-04-20T09:59:00.000Z',
                attempt_id: '33333333-3333-4333-8333-333333333339',
                attempt_status: 'COMPLETED',
                lifecycle_state: 'CLOSED',
                score_state: 'FINALIZED',
                started_at: '2026-04-20T09:00:00.000Z',
                completed_at: '2026-04-20T09:30:00.000Z',
                time_spent_minutes: 30,
                score: 90,
                total_score: 100,
                closed_reason: 'AUTO_HIGH_INCIDENT_THRESHOLD',
                reopened_until: '2026-04-20T10:15:00.000Z',
                finalized_at: '2026-04-20T10:00:00.000Z',
                incident_count: 0,
                open_incident_count: 0,
                has_high_severity: false,
                latest_incident_type: null,
                latest_incident_at: null,
            },
            60,
        );

        expect(student.lifecycleState).toBe('CLOSED');
        expect(student.scoreState).toBe('FINALIZED');
        expect(student.closedReason).toBe('AUTO_HIGH_INCIDENT_THRESHOLD');
        expect(student.reopenedUntil).toBe('2026-04-20T10:15:00.000Z');
        expect(student.finalizedAt).toBe('2026-04-20T10:00:00.000Z');
    });

    it('maps telemetry incidents into the frontend flag shape', () => {
        const incident = mapMonitoringIncidentWithEvidenceSummary(
            {
                incidentId: '11111111-1111-4111-8111-111111111111',
                attemptId: '22222222-2222-4222-8222-222222222222',
                examId: '33333333-3333-4333-8333-333333333333',
                examTitle: 'Algorithms Final',
                institutionId: '44444444-4444-4444-8444-444444444444',
                studentId: '55555555-5555-4555-8555-555555555555',
                studentRecordId: '66666666-6666-4666-8666-666666666666',
                studentName: 'Ana Santos',
                platform: 'WEB',
                source: 'CLIENT',
                ruleKey: 'webSecurity.tab_switching_monitor',
                incidentType: 'TAB_SWITCH',
                severity: 'HIGH',
                status: 'PENDING',
                timestamp: '2026-04-20T09:40:00.000Z',
                evidenceUrl: 'https://example.com/frame.png',
                reviewedBy: null,
                reviewedAt: null,
                reviewNotes: null,
                configurationSnapshot: null,
                sessionContext: null,
                details: {
                    occurrenceCount: 3,
                    severityReason: 'repeat-escalated',
                    severityInputs: {
                        baseSeverity: 'MEDIUM',
                        ladder: ['MEDIUM', 'HIGH'],
                        matchingCount: 3,
                        matchingWindowSeconds: 300,
                        repeatThreshold: 2,
                        overrideSeverity: null,
                    },
                    metadata: {
                        aggregation: {
                            trigger: 'repeat-threshold',
                        },
                    },
                } as any,
            },
            [
                {
                    incident_id: '11111111-1111-4111-8111-111111111111',
                    state: 'AVAILABLE',
                    count: 2,
                },
                {
                    incident_id: '11111111-1111-4111-8111-111111111111',
                    state: 'EXPIRED',
                    count: 1,
                },
            ],
        );

        expect(incident.description).toBe('Tab Switch Detected');
        expect(incident.severity).toBe('high');
        expect(incident.rawEventType).toBeNull();
        expect(incident.snapshotUrl).toBe('https://example.com/frame.png');
        expect(incident.evidenceCount).toBe(3);
        expect(incident.evidenceStates).toEqual(['AVAILABLE', 'EXPIRED']);
        expect(incident.occurrenceCount).toBe(3);
        expect(incident.severityReason).toBe('repeat-escalated');
        expect(incident.persistenceTrigger).toBe('repeat-threshold');
        expect(incident.matchingWindowSeconds).toBe(300);
        expect(incident.wasSeverityForced).toBe(false);
    });

    it('maps first telemetry incidents with occurrence and calibrated severity display data', () => {
        const incident = mapMonitoringIncident({
            incidentId: '11111111-1111-4111-8111-111111111111',
            attemptId: '22222222-2222-4222-8222-222222222222',
            examId: '33333333-3333-4333-8333-333333333333',
            examTitle: 'Algorithms Final',
            institutionId: '44444444-4444-4444-8444-444444444444',
            studentId: '55555555-5555-4555-8555-555555555555',
            studentRecordId: '66666666-6666-4666-8666-666666666666',
            studentName: 'Ana Santos',
            platform: 'WEB',
            source: 'CLIENT',
            ruleKey: 'webSecurity.right_click_disable',
            incidentType: 'SUSPICIOUS_MOVEMENT',
            severity: 'LOW',
            status: 'PENDING',
            timestamp: '2026-04-20T09:40:00.000Z',
            evidenceUrl: null,
            reviewedBy: null,
            reviewedAt: null,
            reviewNotes: null,
            configurationSnapshot: null,
            sessionContext: null,
            details: {
                eventType: 'RIGHT_CLICK_ATTEMPT',
                occurrenceCount: 1,
                severityReason: 'default-ladder',
                previousSeverity: null,
                severityInputs: {
                    baseSeverity: 'LOW',
                    ladder: ['LOW', 'MEDIUM', 'HIGH'],
                    matchingCount: 1,
                    matchingWindowSeconds: 300,
                    repeatThreshold: 3,
                    overrideSeverity: null,
                },
            } as any,
        });

        expect(incident.description).toBe('Suspicious Movement');
        expect(incident.severity).toBe('low');
        expect(incident.rawEventType).toBe('RIGHT_CLICK_ATTEMPT');
        expect(incident.occurrenceCount).toBe(1);
        expect(incident.severityReason).toBe('default-ladder');
        expect(incident.matchingWindowSeconds).toBe(300);
        expect(incident.wasSeverityForced).toBe(false);
    });

    it('includes latest occurrence count and severity on student detail flags', () => {
        const detail = mapMonitoringStudentDetail(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0001',
                first_name: 'Ana',
                last_name: 'Santos',
                last_seen_at: '2026-04-20T09:53:00.000Z',
                attempt_id: '33333333-3333-4333-8333-333333333333',
                attempt_status: 'IN_PROGRESS',
                lifecycle_state: 'LOCKED',
                score_state: 'FINALIZED',
                started_at: '2026-04-20T09:00:00.000Z',
                completed_at: null,
                time_spent_minutes: 30,
                score: null,
                total_score: null,
                closed_reason: null,
                reopened_until: '2026-04-20T10:30:00.000Z',
                finalized_at: '2026-04-20T10:15:00.000Z',
                incident_count: 1,
                open_incident_count: 1,
                has_high_severity: false,
                latest_incident_type: 'TAB_SWITCH',
                latest_incident_at: '2026-04-20T09:40:00.000Z',
            },
            60,
            10,
            [
                {
                    incidentId: '77777777-7777-4777-8777-777777777777',
                    attemptId: '33333333-3333-4333-8333-333333333333',
                    examId: '88888888-8888-4888-8888-888888888888',
                    examTitle: 'Algorithms Final',
                    institutionId: '99999999-9999-4999-8999-999999999999',
                    studentId: '11111111-1111-4111-8111-111111111111',
                    studentRecordId: '22222222-2222-4222-8222-222222222222',
                    studentName: 'Ana Santos',
                    platform: 'WEB',
                    source: 'CLIENT',
                    ruleKey: 'webSecurity.tab_switching_monitor',
                    incidentType: 'TAB_SWITCH',
                    severity: 'MEDIUM',
                    status: 'PENDING',
                    timestamp: '2026-04-20T09:40:00.000Z',
                    evidenceUrl: null,
                    reviewedBy: null,
                    reviewedAt: null,
                    reviewNotes: null,
                    configurationSnapshot: null,
                    sessionContext: null,
                    details: {
                        occurrenceCount: 3,
                        severityReason: 'repeat-escalated',
                        severityInputs: {
                            baseSeverity: 'LOW',
                            ladder: ['LOW', 'MEDIUM', 'HIGH'],
                            matchingCount: 3,
                            matchingWindowSeconds: 300,
                            repeatThreshold: 3,
                            overrideSeverity: null,
                        },
                    } as any,
                },
            ],
            [
                {
                    incident_id: '77777777-7777-4777-8777-777777777777',
                    state: 'AVAILABLE',
                    count: 1,
                },
                {
                    incident_id: '77777777-7777-4777-8777-777777777777',
                    state: 'PENDING_UPLOAD',
                    count: 1,
                },
            ],
            [
                {
                    event_id: '77777777-7777-4777-8777-777777777778',
                    attempt_id: '33333333-3333-4333-8333-333333333333',
                    exam_id: '88888888-8888-4888-8888-888888888888',
                    student_id: '22222222-2222-4222-8222-222222222222',
                    event_type: 'LOCKED',
                    previous_state: 'IN_PROGRESS',
                    next_state: 'LOCKED',
                    actor_user_id: null,
                    reason_code: 'MANUAL_MONITORING_LOCK',
                    notes: 'Locked from monitoring',
                    related_incident_ids: null,
                    related_override_id: null,
                    metadata: null,
                    created_at: '2026-04-20T10:10:00.000Z',
                },
            ],
        );

        expect(detail.flags).toHaveLength(1);
        expect(detail.flags[0]).toMatchObject({
            occurrenceCount: 3,
            severity: 'medium',
            severityReason: 'repeat-escalated',
            matchingWindowSeconds: 300,
            evidenceCount: 2,
            evidenceStates: ['AVAILABLE', 'PENDING_UPLOAD'],
        });
        expect(detail.lifecycleState).toBe('LOCKED');
        expect(detail.scoreState).toBe('FINALIZED');
        expect(detail.lifecycleEvents?.[0]).toMatchObject({
            eventType: 'LOCKED',
            reasonCode: 'MANUAL_MONITORING_LOCK',
        });
    });

    it('exposes the raw telemetry event when monitoring incidents were normalized for storage', () => {
        const incident = mapMonitoringIncident({
            incidentId: '11111111-1111-4111-8111-111111111111',
            attemptId: '22222222-2222-4222-8222-222222222222',
            examId: '33333333-3333-4333-8333-333333333333',
            examTitle: 'Algorithms Final',
            institutionId: '44444444-4444-4444-8444-444444444444',
            studentId: '55555555-5555-4555-8555-555555555555',
            studentRecordId: '66666666-6666-4666-8666-666666666666',
            studentName: 'Ana Santos',
            platform: 'WEB',
            source: 'AI',
            ruleKey: 'aiRules.face_detection',
            incidentType: 'FACE_NOT_VISIBLE',
            severity: 'MEDIUM',
            status: 'PENDING',
            timestamp: '2026-04-20T09:40:00.000Z',
            evidenceUrl: null,
            reviewedBy: null,
            reviewedAt: null,
            reviewNotes: null,
            configurationSnapshot: null,
            sessionContext: null,
            details: {
                eventType: 'NO_FACE_DETECTED',
                lastEvent: {
                    eventType: 'NO_FACE_DETECTED',
                    timestamp: '2026-04-20T09:39:58.000Z',
                    metadata: {
                        aggregation: {
                            trigger: 'duration-threshold',
                        },
                    },
                },
            },
        });

        expect(incident.type).toBe('FACE_NOT_VISIBLE');
        expect(incident.rawEventType).toBe('NO_FACE_DETECTED');
        expect(incident.description).toBe('Face Not Visible');
    });

    it('uses live elapsed time when an active attempt has not been submitted yet', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-20T10:45:00.000Z'));

        const student = mapMonitoringStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0002',
                first_name: 'Lia',
                last_name: 'Reyes',
                last_seen_at: '2026-04-20T10:44:00.000Z',
                attempt_id: '33333333-3333-4333-8333-333333333333',
                attempt_status: 'IN_PROGRESS',
                lifecycle_state: 'IN_PROGRESS',
                score_state: 'DRAFT',
                started_at: '2026-04-20T10:15:00.000Z',
                completed_at: null,
                time_spent_minutes: 0,
                score: null,
                total_score: null,
                closed_reason: null,
                reopened_until: null,
                finalized_at: null,
                incident_count: 0,
                open_incident_count: 0,
                has_high_severity: false,
                latest_incident_type: null,
                latest_incident_at: null,
            },
            60,
        );

        expect(student.progress).toBe(50);

        vi.useRealTimers();
    });

    it('uses answered question percentage for active monitoring progress when available', () => {
        const student = mapMonitoringStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0003',
                first_name: 'Ben',
                last_name: 'Santos',
                last_seen_at: '2026-04-20T10:44:00.000Z',
                attempt_id: '33333333-3333-4333-8333-333333333333',
                attempt_status: 'IN_PROGRESS',
                lifecycle_state: 'IN_PROGRESS',
                score_state: 'DRAFT',
                started_at: '2026-04-20T10:15:00.000Z',
                completed_at: null,
                time_spent_minutes: 45,
                answered_question_count: 2,
                score: null,
                total_score: null,
                closed_reason: null,
                reopened_until: null,
                finalized_at: null,
                incident_count: 0,
                open_incident_count: 0,
                has_high_severity: false,
                latest_incident_type: null,
                latest_incident_at: null,
            },
            60,
            5,
        );

        expect(student.progress).toBe(40);
    });

    it('maps remediation context onto the monitoring exam payload', () => {
        const exam = mapMonitoringExam({
            examId: '11111111-1111-4111-8111-111111111111',
            title: 'Final Exam (Retake)',
            subject: 'Algorithms',
            scheduledDate: '2026-04-21T09:00:00.000Z',
            endDateTime: '2026-04-21T10:00:00.000Z',
            maxReconnectAttempts: 2,
            remediationContext: {
                remediationId: '22222222-2222-4222-8222-222222222222',
                remediationType: 'RETAKE',
                sourceExamId: '33333333-3333-4333-8333-333333333333',
                sourceExamTitle: 'Final Exam',
                sourceAttemptId: '44444444-4444-4444-8444-444444444444',
            },
        });

        expect(exam.remediationContext).toEqual({
            remediationId: '22222222-2222-4222-8222-222222222222',
            remediationType: 'RETAKE',
            sourceExamId: '33333333-3333-4333-8333-333333333333',
            sourceExamTitle: 'Final Exam',
            sourceAttemptId: '44444444-4444-4444-8444-444444444444',
        });
    });

    it('tallies submitted and flagged counts correctly when a submitted student has open incidents', () => {
        const studentSubmittedWithFlags = mapMonitoringStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111111',
                student_record_id: '22222222-2222-4222-8222-222222222221',
                student_number: '2024-0001',
                first_name: 'Mark',
                last_name: 'FlaggedSubmitted',
                last_seen_at: '2026-09-06T09:59:00.000Z',
                attempt_id: '33333333-3333-4333-8333-333333333331',
                attempt_status: 'COMPLETED',
                lifecycle_state: 'SUBMITTED',
                score_state: 'DRAFT',
                started_at: '2026-09-06T09:00:00.000Z',
                completed_at: '2026-09-06T09:45:00.000Z',
                time_spent_minutes: 45,
                score: 80,
                total_score: 100,
                closed_reason: null,
                reopened_until: null,
                finalized_at: null,
                incident_count: 5,
                open_incident_count: 3,
                has_high_severity: false,
                latest_incident_type: 'TAB_SWITCH',
                latest_incident_at: '2026-09-06T09:40:00.000Z',
            },
            60,
        );

        const studentSubmittedClean = mapMonitoringStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111112',
                student_record_id: '22222222-2222-4222-8222-222222222222',
                student_number: '2024-0002',
                first_name: 'Jane',
                last_name: 'CleanSubmitted',
                last_seen_at: '2026-09-06T09:55:00.000Z',
                attempt_id: '33333333-3333-4333-8333-333333333332',
                attempt_status: 'COMPLETED',
                lifecycle_state: 'SUBMITTED',
                score_state: 'DRAFT',
                started_at: '2026-09-06T09:00:00.000Z',
                completed_at: '2026-09-06T09:50:00.000Z',
                time_spent_minutes: 50,
                score: 95,
                total_score: 100,
                closed_reason: null,
                reopened_until: null,
                finalized_at: null,
                incident_count: 0,
                open_incident_count: 0,
                has_high_severity: false,
                latest_incident_type: null,
                latest_incident_at: null,
            },
            60,
        );

        const studentActiveFlagged = mapMonitoringStudentSummary(
            {
                student_user_id: '11111111-1111-4111-8111-111111111113',
                student_record_id: '22222222-2222-4222-8222-222222222223',
                student_number: '2024-0003',
                first_name: 'Bob',
                last_name: 'ActiveFlagged',
                last_seen_at: '2026-09-06T09:58:00.000Z',
                attempt_id: '33333333-3333-4333-8333-333333333333',
                attempt_status: 'IN_PROGRESS',
                lifecycle_state: 'IN_PROGRESS',
                score_state: 'DRAFT',
                started_at: '2026-09-06T09:00:00.000Z',
                completed_at: null,
                time_spent_minutes: 30,
                score: null,
                total_score: null,
                closed_reason: null,
                reopened_until: null,
                finalized_at: null,
                incident_count: 1,
                open_incident_count: 1,
                has_high_severity: false,
                latest_incident_type: 'AUDIO_ANOMALY',
                latest_incident_at: '2026-09-06T09:57:00.000Z',
            },
            60,
        );

        const overview = buildMonitoringOverview({
            exam: {
                id: 'exam-1',
                title: 'Test Exam',
                subject: 'IT Elective',
                scheduledDate: null,
                endDateTime: null,
                maxReconnectAttempts: 3,
            },
            lobbyAdmissions: {
                waiting: 0,
                approved: 0,
                inAttempt: 1,
            },
            students: [studentSubmittedWithFlags, studentSubmittedClean, studentActiveFlagged],
        });

        expect(overview.stats).toEqual({
            total: 3,
            active: 0,
            flagged: 2, // Mark (submitted with flags) + Bob (active with flag)
            submitted: 2, // Mark (submitted with flags) + Jane (clean submitted)
            disconnected: 0,
        });
    });
});
