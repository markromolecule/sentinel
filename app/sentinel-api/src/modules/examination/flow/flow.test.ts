import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { SessionManagerService } from './flow.service';
import { AccessGatekeeperService } from '../access/access.service';
import { SessionRepository } from './data/session.repository';
import { type DbClient } from '@sentinel/db';
import { getExamConfigurationState } from '../configuration/configuration.service';
import { getExamQuestionsData } from '../exams/data/get-exam-questions';
import { LogsService } from '../../general/logs/logs.service';
import { ActivityNotificationService } from '../../general/notification/services/activity-notification.service';
import { appendExamAttemptLifecycleEvent } from '../lifecycle/services/lifecycle-event.service';
import {
    buildAnswerPayloadChecksum,
    ATTEMPT_SCORING_VERSION,
} from './services/attempt-snapshot.service';
import { buildPreparationToken } from './services/prepare-session.service';

// Mock dependencies
vi.mock('../access/access.service');
vi.mock('./data/session.repository');
vi.mock('../configuration/configuration.service', () => ({
    getExamConfigurationState: vi.fn(),
}));
vi.mock('../exams/data/get-exam-questions', () => ({
    getExamQuestionsData: vi.fn(),
}));
vi.mock('../../general/logs/logs.service', () => ({
    LogsService: {
        createLog: vi.fn(),
    },
}));
vi.mock('../../general/notification/services/activity-notification.service', () => ({
    ActivityNotificationService: {
        notifyInstitutionActivityCreated: vi.fn(),
    },
}));
vi.mock('../lifecycle/services/lifecycle-event.service', () => ({
    appendExamAttemptLifecycleEvent: vi.fn().mockResolvedValue({}),
}));

describe('Examination Flow Integration', () => {
    const mockDb = {} as DbClient;
    const studentId = 'student-123';
    const examId = 'exam-456';
    const accessStudentId = '5d380bbd-d078-4c92-ba87-6340509bb7f9';
    const runtimeAccess = {
        state: 'open' as const,
        reasonCode: 'OPEN' as const,
        message: 'This exam is open for students.',
        canStart: true,
        canResume: false,
        hasActiveAttempt: false,
        startsAt: null,
        endsAt: null,
        reopenedUntil: null,
    };
    const configSnapshot = {
        settings: {
            shuffleQuestions: true,
            showCorrectAnswers: false,
            allowReview: false,
            randomizeChoices: true,
        },
        configuration: {
            lobbyAdmissionMode: 'AUTOMATIC',
            maxReconnectAttempts: 3,
            strictMode: true,
            screenLock: true,
            cameraRequired: true,
            micRequired: true,
            autoSubmitTimeoutMinutes: 5,
            aiRules: {
                gaze_tracking: true,
                face_detection: true,
                audio_anomaly_detection: true,
                multiple_faces_detection: true,
            },
            webSecurity: {
                tab_switching_monitor: true,
                full_screen_required: true,
                clipboard_control: true,
                right_click_disable: true,
                print_screen_disable: true,
            },
            mobileSecurity: {
                app_pinning_required: true,
                prevent_backgrounding: true,
                notification_block: true,
                screenshot_block: true,
                root_jailbreak_detection: true,
            },
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        const rubricQuery = {
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue(undefined),
        };
        (mockDb as any).selectFrom = vi.fn().mockReturnValue(rubricQuery);
        vi.mocked(getExamConfigurationState).mockResolvedValue(configSnapshot);
        vi.mocked(LogsService.createLog).mockResolvedValue({} as never);
        vi.mocked(ActivityNotificationService.notifyInstitutionActivityCreated).mockResolvedValue(
            undefined,
        );
        vi.mocked(appendExamAttemptLifecycleEvent).mockResolvedValue({} as never);
    });

    it('denies session start if access gatekeeper determines student is ineligible', async () => {
        // Mock access rejection
        vi.mocked(AccessGatekeeperService.verifyStudentExamEligibility).mockResolvedValue({
            isEligible: false,
            reason: 'Student is not enrolled',
            reasonCode: 'CLOSED',
            runtimeAccess: {
                state: 'closed',
                reasonCode: 'CLOSED',
                message: 'Student is not enrolled',
                canStart: false,
                canResume: false,
                hasActiveAttempt: false,
                startsAt: null,
                endsAt: null,
                reopenedUntil: null,
            },
        });

        const result = await SessionManagerService.startSession(mockDb, studentId, examId);

        expect(result.error).toBe('Student is not enrolled');
        expect(result.sessionId).toBeUndefined();

        // Assert cross-domain integration
        expect(AccessGatekeeperService.verifyStudentExamEligibility).toHaveBeenCalledWith(
            mockDb,
            studentId,
            examId,
        );

        // Assert Flow halted before creating a session
        expect(SessionRepository.createSession).not.toHaveBeenCalled();
        expect(getExamConfigurationState).not.toHaveBeenCalled();
    });

    it('initializes session securely when access gatekeeper grants eligibility', async () => {
        const mockSessionId = 'session-uuid-789';

        // Mock access approval
        vi.mocked(AccessGatekeeperService.verifyStudentExamEligibility).mockResolvedValue({
            isEligible: true,
            context: {
                examId,
                studentId: accessStudentId,
                classroomId: null,
                subjectId: 'subject-123',
                sectionId: null,
                roomId: null,
                durationMinutes: 60,
                scheduledDate: new Date().toISOString(),
                endDateTime: new Date(Date.now() + 60_000).toISOString(),
                status: 'PUBLISHED',
                publishedAt: new Date().toISOString(),
                institutionId: 'institution-123',
            },
            runtimeAccess,
        });

        // Mock session repository
        vi.mocked(SessionRepository.createSession).mockResolvedValue({
            sessionId: mockSessionId,
            isResumed: false,
        });
        vi.mocked(getExamQuestionsData).mockResolvedValue([
            {
                question_id: 'question-1',
                exam_id: examId,
                exam_section_id: null,
                source_question_bank_question_id: null,
                source_collection_id: null,
                source_origin: 'MANUAL',
                source_file_name: null,
                source_page_number: null,
                source_evidence: null,
                passage_content: null,
                passage_type: null,
                question_type: 'TRUE_FALSE',
                points: 5,
                order_index: 0,
                content: {
                    prompt: 'Sentinel supports browser-based proctoring.',
                    correctAnswer: true,
                },
            },
        ] as never);

        const result = await SessionManagerService.startSession(mockDb, studentId, examId);

        expect(result.error).toBeUndefined();
        expect(result.sessionId).toBe(mockSessionId);
        expect(result.configSnapshot).toEqual(configSnapshot);
        expect(result.isResumed).toBe(false);

        // Core requirement check: Flow securely depends on Access
        expect(AccessGatekeeperService.verifyStudentExamEligibility).toHaveBeenCalledWith(
            mockDb,
            studentId,
            examId,
        );
        expect(getExamConfigurationState).toHaveBeenCalledWith(mockDb, examId);
        expect(SessionRepository.createSession).toHaveBeenCalledWith(mockDb, {
            studentId: accessStudentId,
            examId,
            maxReconnectAttempts: configSnapshot.configuration.maxReconnectAttempts,
            accessOverride: null,
            updatedBy: studentId,
        });
        expect(SessionRepository.persistAssessmentSnapshot).toHaveBeenCalledWith(
            mockDb,
            expect.objectContaining({
                attemptId: mockSessionId,
                snapshot: expect.objectContaining({
                    version: 'attempt-assessment.v2',
                    rubric: expect.objectContaining({
                        id: 'legacy-standard-v1',
                        source: 'LEGACY',
                    }),
                }),
            }),
        );
    });

    it('does not block session startup on telemetry delivery', async () => {
        const mockSessionId = 'session-uuid-telemetry';

        vi.mocked(AccessGatekeeperService.verifyStudentExamEligibility).mockResolvedValue({
            isEligible: true,
            context: {
                examId,
                studentId: accessStudentId,
                classroomId: null,
                subjectId: 'subject-123',
                sectionId: null,
                roomId: null,
                durationMinutes: 60,
                scheduledDate: new Date().toISOString(),
                endDateTime: new Date(Date.now() + 60_000).toISOString(),
                status: 'PUBLISHED',
                publishedAt: new Date().toISOString(),
                institutionId: 'institution-123',
            },
            runtimeAccess,
        });
        vi.mocked(SessionRepository.createSession).mockResolvedValue({
            sessionId: mockSessionId,
            isResumed: false,
        });
        vi.mocked(LogsService.createLog).mockImplementation(
            () => new Promise(() => undefined) as never,
        );

        const result = await SessionManagerService.startSession(mockDb, studentId, examId);

        expect(result.sessionId).toBe(mockSessionId);
        expect(result.error).toBeUndefined();
        expect(LogsService.createLog).toHaveBeenCalled();
    });

    it('returns a stable conflict payload when the latest attempt is already completed', async () => {
        vi.mocked(AccessGatekeeperService.verifyStudentExamEligibility).mockResolvedValue({
            isEligible: true,
            context: {
                examId,
                studentId: accessStudentId,
                classroomId: null,
                subjectId: 'subject-123',
                sectionId: null,
                roomId: null,
                durationMinutes: 60,
                scheduledDate: new Date().toISOString(),
                endDateTime: new Date(Date.now() + 60_000).toISOString(),
                status: 'PUBLISHED',
                publishedAt: new Date().toISOString(),
                institutionId: 'institution-123',
            },
            runtimeAccess,
        });
        vi.mocked(SessionRepository.createSession).mockResolvedValue({
            attemptId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            error: 'This exam has already been turned in.',
            errorCode: 'ATTEMPT_ALREADY_COMPLETED',
        });

        const result = await SessionManagerService.startSession(mockDb, studentId, examId);

        expect(result).toEqual({
            attemptId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            error: 'This exam has already been turned in.',
            errorCode: 'ATTEMPT_ALREADY_COMPLETED',
        });
        expect(SessionRepository.createSession).toHaveBeenCalledWith(mockDb, {
            studentId: accessStudentId,
            examId,
            maxReconnectAttempts: configSnapshot.configuration.maxReconnectAttempts,
            accessOverride: null,
            updatedBy: studentId,
        });
    });

    it('passes an approved retake override into session creation', async () => {
        const accessOverride = {
            id: '7d1d0c8f-c2bf-4f1d-9f9f-dfb9949d9d1b',
            examId,
            studentId: accessStudentId,
            grantedBy: 'granter-1',
            overrideType: 'RETAKE' as const,
            availableFrom: new Date().toISOString(),
            availableUntil: new Date(Date.now() + 60_000).toISOString(),
            allowedAttempts: 1,
            usedAttempts: 0,
            usedAttemptIds: [],
            sourceAttemptId: 'source-attempt-1',
            notes: 'Approved retake',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        vi.mocked(AccessGatekeeperService.verifyStudentExamEligibility).mockResolvedValue({
            isEligible: true,
            context: {
                examId,
                studentId: accessStudentId,
                classroomId: null,
                subjectId: 'subject-123',
                sectionId: null,
                roomId: null,
                durationMinutes: 60,
                scheduledDate: new Date().toISOString(),
                endDateTime: new Date(Date.now() + 60_000).toISOString(),
                status: 'PUBLISHED',
                publishedAt: new Date().toISOString(),
                institutionId: 'institution-123',
            },
            runtimeAccess,
            accessOverride,
        });
        vi.mocked(SessionRepository.createSession).mockResolvedValue({
            sessionId: 'session-uuid-override',
            isResumed: false,
        });

        await SessionManagerService.startSession(mockDb, studentId, examId);

        expect(SessionRepository.createSession).toHaveBeenCalledWith(mockDb, {
            studentId: accessStudentId,
            examId,
            maxReconnectAttempts: configSnapshot.configuration.maxReconnectAttempts,
            accessOverride,
            updatedBy: studentId,
        });
    });

    it('returns saved answers when an active session is resumed', async () => {
        vi.mocked(AccessGatekeeperService.verifyStudentExamEligibility).mockResolvedValue({
            isEligible: true,
            context: {
                examId,
                studentId: accessStudentId,
                classroomId: null,
                subjectId: 'subject-123',
                sectionId: null,
                roomId: null,
                durationMinutes: 60,
                scheduledDate: new Date().toISOString(),
                endDateTime: new Date(Date.now() + 60_000).toISOString(),
                status: 'PUBLISHED',
                publishedAt: new Date().toISOString(),
                institutionId: 'institution-123',
            },
            runtimeAccess: {
                ...runtimeAccess,
                canResume: true,
                hasActiveAttempt: true,
            },
        });
        vi.mocked(SessionRepository.createSession).mockResolvedValue({
            sessionId: 'session-uuid-resumed',
            isResumed: true,
            answers: {
                'question-1': 'B',
            },
            elapsedSeconds: 120,
            reconnectAttemptCount: 1,
            maxReconnectAttempts: 3,
        });

        const result = await SessionManagerService.startSession(mockDb, studentId, examId);

        expect(result).toMatchObject({
            sessionId: 'session-uuid-resumed',
            isResumed: true,
            answers: {
                'question-1': 'B',
            },
            elapsedSeconds: 120,
            reconnectAttemptCount: 1,
            maxReconnectAttempts: 3,
        });
    });

    it('completes an owned active session and stores the scored summary', async () => {
        vi.mocked(SessionRepository.getOwnedSessionAttempt).mockResolvedValue({
            attempt_id: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            exam_id: examId,
            student_id: 'student-profile-1',
            completed_at: null,
            status: 'IN_PROGRESS',
            started_at: new Date('2026-04-18T10:00:00.000Z'),
        } as never);
        vi.mocked(getExamQuestionsData).mockResolvedValue([
            {
                question_id: 'question-1',
                exam_id: examId,
                exam_section_id: null,
                source_question_bank_question_id: null,
                source_collection_id: null,
                question_type: 'TRUE_FALSE',
                content: {
                    prompt: 'Sentinel supports browser-based proctoring.',
                    correctAnswer: true,
                },
                points: 5,
                order_index: 0,
                created_at: null,
                updated_at: null,
                source_origin: null,
                source_file_name: null,
                source_page_number: null,
                source_evidence: null,
            },
        ] as never);
        vi.mocked(SessionRepository.completeSession).mockResolvedValue({
            attempt_id: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            completed_at: new Date('2026-04-18T10:42:00.000Z'),
        } as never);

        const result = await SessionManagerService.completeSession(mockDb, studentId, {
            sessionId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            answers: {
                'question-1': true,
            },
            elapsedSeconds: 121,
        });

        expect(result).toMatchObject({
            attemptId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            score: 5,
            totalScore: 5,
            percentage: 100,
            answeredCount: 1,
            autoGradableQuestionCount: 1,
            manualReviewQuestionCount: 0,
            requiresManualReview: false,
        });
        expect(SessionRepository.completeSession).toHaveBeenCalledWith(expect.any(Object), {
            sessionId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            score: 5,
            initialScore: 5,
            totalScore: 5,
            timeSpentMinutes: 3,
            answeredCount: 1,
            answers: {
                'question-1': true,
            },
            scoreSnapshot: expect.objectContaining({
                version: 'attempt-score.v1',
                scoringVersion: 'fix-001-student-score-integrity-v1',
                score: 5,
                totalScore: 5,
                rubric: expect.objectContaining({
                    id: 'legacy-standard-v1',
                    source: 'LEGACY',
                }),
            }),
            scoringVersion: 'fix-001-student-score-integrity-v1',
        });
    });

    it('returns a provisional zero score when only essay questions still need manual review', async () => {
        vi.mocked(SessionRepository.getOwnedSessionAttempt).mockResolvedValue({
            attempt_id: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            exam_id: examId,
            student_id: 'student-profile-1',
            completed_at: null,
            status: 'IN_PROGRESS',
            started_at: new Date('2026-04-18T10:00:00.000Z'),
        } as never);
        vi.mocked(getExamQuestionsData).mockResolvedValue([
            {
                question_id: 'question-1',
                exam_id: examId,
                exam_section_id: null,
                source_question_bank_question_id: null,
                source_collection_id: null,
                question_type: 'TRUE_FALSE',
                content: {
                    prompt: 'Sentinel supports browser-based proctoring.',
                    correctAnswer: true,
                },
                points: 5,
                order_index: 0,
                created_at: null,
                updated_at: null,
                source_origin: null,
                source_file_name: null,
                source_page_number: null,
                source_evidence: null,
            },
            {
                question_id: 'question-2',
                exam_id: examId,
                exam_section_id: null,
                source_question_bank_question_id: null,
                source_collection_id: null,
                question_type: 'ESSAY',
                content: {
                    prompt: 'Explain your reasoning.',
                },
                points: 10,
                order_index: 1,
                created_at: null,
                updated_at: null,
                source_origin: null,
                source_file_name: null,
                source_page_number: null,
                source_evidence: null,
            },
        ] as never);
        vi.mocked(SessionRepository.completeSession).mockResolvedValue({
            attempt_id: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            completed_at: new Date('2026-04-18T10:42:00.000Z'),
        } as never);

        const result = await SessionManagerService.completeSession(mockDb, studentId, {
            sessionId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            answers: {
                'question-1': false,
                'question-2': 'Because arithmetic.',
            },
            elapsedSeconds: 121,
        });

        expect(result).toMatchObject({
            attemptId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            score: 0,
            totalScore: 15,
            percentage: 0,
            answeredCount: 2,
            autoGradableQuestionCount: 1,
            manualReviewQuestionCount: 1,
            requiresManualReview: true,
        });
        expect(SessionRepository.completeSession).toHaveBeenCalledWith(expect.any(Object), {
            sessionId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            score: 0,
            initialScore: 0,
            totalScore: 15,
            timeSpentMinutes: 3,
            answeredCount: 2,
            answers: {
                'question-1': false,
                'question-2': 'Because arithmetic.',
            },
            scoreSnapshot: expect.objectContaining({
                version: 'attempt-score.v1',
                scoringVersion: 'fix-001-student-score-integrity-v1',
                score: 0,
                totalScore: 15,
                requiresManualReview: true,
                rubric: expect.objectContaining({
                    id: 'legacy-standard-v1',
                    source: 'LEGACY',
                }),
            }),
            scoringVersion: 'fix-001-student-score-integrity-v1',
        });
    });

    it('rejects completion when the preparation token no longer matches the latest answer payload', async () => {
        vi.mocked(SessionRepository.getOwnedSessionAttempt).mockResolvedValue({
            attempt_id: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            exam_id: examId,
            student_id: 'student-profile-1',
            completed_at: null,
            status: 'IN_PROGRESS',
            lifecycle_state: 'IN_PROGRESS',
            started_at: new Date('2026-04-18T10:00:00.000Z'),
        } as never);
        vi.mocked(getExamQuestionsData).mockResolvedValue([
            {
                question_id: 'question-1',
                exam_id: examId,
                exam_section_id: null,
                source_question_bank_question_id: null,
                source_collection_id: null,
                question_type: 'TRUE_FALSE',
                content: {
                    prompt: 'Sentinel supports browser-based proctoring.',
                    correctAnswer: true,
                },
                points: 5,
                order_index: 0,
                created_at: null,
                updated_at: null,
                source_origin: null,
                source_file_name: null,
                source_page_number: null,
                source_evidence: null,
            },
        ] as never);

        const stalePreparationToken = buildPreparationToken({
            attemptId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            answerChecksum: buildAnswerPayloadChecksum({
                attemptId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
                answers: { 'question-1': false },
                elapsedSeconds: 120,
            }),
            elapsedSeconds: 120,
            lifecycleState: 'IN_PROGRESS',
        });

        await expect(
            SessionManagerService.completeSession(mockDb, studentId, {
                sessionId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
                answers: {
                    'question-1': true,
                },
                elapsedSeconds: 121,
                preparationToken: stalePreparationToken,
            }),
        ).rejects.toThrowError(HTTPException);

        expect(SessionRepository.completeSession).not.toHaveBeenCalled();
    });

    it('treats a repeated completion with the same checksum as idempotent', async () => {
        vi.mocked(SessionRepository.getOwnedSessionAttempt)
            .mockResolvedValueOnce({
                attempt_id: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
                exam_id: examId,
                student_id: 'student-profile-1',
                completed_at: null,
                status: 'IN_PROGRESS',
                lifecycle_state: 'IN_PROGRESS',
                started_at: new Date('2026-04-18T10:00:00.000Z'),
            } as never)
            .mockResolvedValueOnce({
                attempt_id: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
                exam_id: examId,
                student_id: 'student-profile-1',
                completed_at: new Date('2026-04-18T10:42:00.000Z'),
                status: 'COMPLETED',
                lifecycle_state: 'SUBMITTED',
                score_snapshot: {
                    version: 'attempt-score.v1',
                    scoringVersion: ATTEMPT_SCORING_VERSION,
                    generatedAt: '2026-04-18T10:42:00.000Z',
                    answerChecksum: buildAnswerPayloadChecksum({
                        attemptId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
                        answers: { 'question-1': true },
                        elapsedSeconds: 121,
                    }),
                    score: 5,
                    totalScore: 5,
                    percentage: 100,
                    answeredCount: 1,
                    autoGradableQuestionCount: 1,
                    manualReviewQuestionCount: 0,
                    requiresManualReview: false,
                    questionReports: [],
                },
                scoring_version: ATTEMPT_SCORING_VERSION,
                started_at: new Date('2026-04-18T10:00:00.000Z'),
            } as never);
        vi.mocked(getExamQuestionsData).mockResolvedValue([
            {
                question_id: 'question-1',
                exam_id: examId,
                exam_section_id: null,
                source_question_bank_question_id: null,
                source_collection_id: null,
                question_type: 'TRUE_FALSE',
                content: {
                    prompt: 'Sentinel supports browser-based proctoring.',
                    correctAnswer: true,
                },
                points: 5,
                order_index: 0,
                created_at: null,
                updated_at: null,
                source_origin: null,
                source_file_name: null,
                source_page_number: null,
                source_evidence: null,
            },
        ] as never);
        vi.mocked(SessionRepository.completeSession).mockResolvedValue(undefined as never);

        const result = await SessionManagerService.completeSession(mockDb, studentId, {
            sessionId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            answers: {
                'question-1': true,
            },
            elapsedSeconds: 121,
        });

        expect(result).toMatchObject({
            attemptId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            score: 5,
            totalScore: 5,
            percentage: 100,
            answeredCount: 1,
        });
        expect(SessionRepository.completeSession).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({
                sessionId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
                scoreSnapshot: expect.objectContaining({
                    version: 'attempt-score.v1',
                    scoringVersion: 'fix-001-student-score-integrity-v1',
                    score: 5,
                    totalScore: 5,
                    rubric: expect.objectContaining({
                        id: 'legacy-standard-v1',
                        source: 'LEGACY',
                    }),
                }),
            }),
        );
        expect(appendExamAttemptLifecycleEvent).not.toHaveBeenCalled();
    });

    it('rejects completion when the session already belongs to a submitted attempt', async () => {
        vi.mocked(SessionRepository.getOwnedSessionAttempt).mockResolvedValue({
            attempt_id: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
            exam_id: examId,
            student_id: 'student-profile-1',
            completed_at: new Date('2026-04-18T10:42:00.000Z'),
            status: 'COMPLETED',
            started_at: new Date('2026-04-18T10:00:00.000Z'),
        } as never);

        await expect(
            SessionManagerService.completeSession(mockDb, studentId, {
                sessionId: '8e08d10d-a25f-4d6d-9b5f-8ca176fb8bc6',
                answers: {},
                elapsedSeconds: 0,
            }),
        ).rejects.toThrowError(HTTPException);

        expect(SessionRepository.completeSession).not.toHaveBeenCalled();
    });

    it('treats a lobby-based reconnect as a resumed session and increments reconnect count', async () => {
        // This simulates a student who refreshed the attempt page (redirect to lobby),
        // clicked "Continue" in the lobby, and the lobby re-called startSession.
        // The session repository detects an active attempt and increments the counter.
        vi.mocked(AccessGatekeeperService.verifyStudentExamEligibility).mockResolvedValue({
            isEligible: true,
            context: {
                examId,
                studentId: accessStudentId,
                classroomId: null,
                subjectId: 'subject-123',
                sectionId: null,
                roomId: null,
                durationMinutes: 60,
                scheduledDate: new Date().toISOString(),
                endDateTime: new Date(Date.now() + 60_000).toISOString(),
                status: 'PUBLISHED',
                publishedAt: new Date().toISOString(),
                institutionId: 'institution-123',
            },
            runtimeAccess: {
                ...runtimeAccess,
                canResume: true,
                hasActiveAttempt: true,
            },
        });
        vi.mocked(SessionRepository.createSession).mockResolvedValue({
            sessionId: 'session-reconnect-1',
            isResumed: true,
            answers: { 'q-1': 'A' },
            elapsedSeconds: 300,
            reconnectAttemptCount: 2,
            maxReconnectAttempts: 3,
        });

        const result = await SessionManagerService.startSession(mockDb, studentId, examId);

        // Reconnect must surface the incremented counter and draft answers
        expect(result.isResumed).toBe(true);
        expect(result.reconnectAttemptCount).toBe(2);
        expect(result.answers).toEqual({ 'q-1': 'A' });
        expect(result.elapsedSeconds).toBe(300);
        expect(result.error).toBeUndefined();
    });

    it('blocks session start when the gatekeeper returns a lobby-waiting state', async () => {
        // Simulates an exam with lobbyAdmissionMode = INSTRUCTOR_GATED and the student
        // has not yet been approved. The flow must NOT create a session.
        vi.mocked(AccessGatekeeperService.verifyStudentExamEligibility).mockResolvedValue({
            isEligible: false,
            reason: 'This exam requires instructor approval before you can enter the attempt. Stay in the lobby while waiting.',
            reasonCode: 'LOBBY_WAITING',
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

        const result = await SessionManagerService.startSession(mockDb, studentId, examId);

        expect(result.error).toBe(
            'This exam requires instructor approval before you can enter the attempt. Stay in the lobby while waiting.',
        );
        expect(result.sessionId).toBeUndefined();
        expect(SessionRepository.createSession).not.toHaveBeenCalled();
        expect(getExamConfigurationState).not.toHaveBeenCalled();
    });

    it('syncs active attempt progress atomically without routine activity log churn', async () => {
        vi.mocked(SessionRepository.getOwnedSessionAttempt).mockResolvedValue({
            attempt_id: 'attempt-sync-1',
            exam_id: examId,
            student_id: 'student-profile-1',
            completed_at: null,
            status: 'IN_PROGRESS',
            lifecycle_state: 'IN_PROGRESS',
            institution_id: 'institution-123',
        } as never);
        vi.mocked(SessionRepository.updateSyncProgress).mockResolvedValue(1 as never);

        await SessionManagerService.syncSession(mockDb, studentId, {
            sessionId: 'attempt-sync-1',
            answeredCount: 21,
            elapsedSeconds: 121,
            answers: {
                'question-1': 'A',
            },
        } as never);

        expect(SessionRepository.updateSyncProgress).toHaveBeenCalledWith(mockDb, {
            sessionId: 'attempt-sync-1',
            answeredCount: 21,
            timeSpentMinutes: 3,
            answers: {
                'question-1': 'A',
            },
        });
        expect(LogsService.createLog).not.toHaveBeenCalled();
    });

    it('converts a zero-row guarded sync update into a terminal 409', async () => {
        vi.mocked(SessionRepository.getOwnedSessionAttempt).mockResolvedValue({
            attempt_id: 'attempt-sync-2',
            exam_id: examId,
            student_id: 'student-profile-1',
            completed_at: null,
            status: 'IN_PROGRESS',
            lifecycle_state: 'IN_PROGRESS',
        } as never);
        vi.mocked(SessionRepository.updateSyncProgress).mockResolvedValue(0 as never);

        await expect(
            SessionManagerService.syncSession(mockDb, studentId, {
                sessionId: 'attempt-sync-2',
                answeredCount: 8,
                elapsedSeconds: 75,
            } as never),
        ).rejects.toMatchObject({
            status: 409,
            message: 'This exam attempt has been closed and can no longer accept progress updates.',
        } satisfies Partial<HTTPException>);

        expect(LogsService.createLog).not.toHaveBeenCalled();
    });
});
