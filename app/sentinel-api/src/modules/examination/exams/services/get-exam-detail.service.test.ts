import { describe, expect, it, vi, beforeEach } from 'vitest';
import { type DbClient } from '@sentinel/db';
import { getExamDetail } from './get-exam-detail.service';
import { getExamByIdData } from '../data/get-exam-by-id';
import { getExamQuestionsData } from '../data/get-exam-questions';
import { getExamSectionsData } from '../data/get-exam-sections';
import {
    getExamConfigurationState,
    resolveExaminationGlobalSettings,
} from '../../configuration/configuration.service';
import { TelemetrySettingsService } from '../../../telemetry/settings/telemetry-settings.service';
import { AccessGatekeeperService } from '../../access/access.service';
import { RuntimeAccessService } from '../../runtime-access/runtime-access.service';

vi.mock('../data/get-exam-by-id', () => ({
    getExamByIdData: vi.fn(),
}));

vi.mock('../data/get-exam-questions', () => ({
    getExamQuestionsData: vi.fn(),
}));

vi.mock('../data/get-exam-sections', () => ({
    getExamSectionsData: vi.fn(),
}));

vi.mock('../../configuration/configuration.service', () => ({
    getExamConfigurationState: vi.fn(),
    resolveExaminationGlobalSettings: vi.fn(),
}));

vi.mock('../../../telemetry/settings/telemetry-settings.service', () => ({
    TelemetrySettingsService: {
        getTelemetrySettings: vi.fn(),
    },
}));

vi.mock('../../access/access.service', () => ({
    AccessGatekeeperService: {
        verifyStudentExamEligibility: vi.fn(),
    },
}));

vi.mock('../../runtime-access/runtime-access.service', () => ({
    RuntimeAccessService: {
        resolveExamRuntimeAccess: vi.fn(),
    },
}));

describe('getExamDetail service', () => {
    const mockDb = {} as DbClient;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockExamRecord = {
        exam_id: 'exam-1',
        title: 'Sample Exam',
        description: 'Exam description',
        duration_minutes: 60,
        passing_score: 70,
        status: 'PUBLISHED',
        subject_id: 'subject-1',
        subject_title: 'Math',
        class_group_id: null,
        class_name: null,
        section_id: null,
        assigned_section_ids: [],
        assigned_section_names: [],
        section_name: null,
        linked_section_name: null,
        room_id: null,
        room_name: null,
        scheduled_date: new Date('2099-01-01T00:00:00Z'),
        end_date_time: new Date('2099-01-01T02:00:00Z'),
        published_at: new Date('2099-01-01T00:00:00Z'),
        question_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
        attempt_id: null,
        attempt_status: null,
        attempt_completed_at: null,
        attempt_score: null,
        attempt_total_score: null,
        attempt_time_spent_minutes: null,
        attempt_incident_count: 0,
        attempt_primary_incident_type: null,
        attempt_answered_count: 0,
    };

    const mockQuestion = {
        question_id: 'q-1',
        exam_id: 'exam-1',
        exam_section_id: null,
        source_question_bank_question_id: null,
        source_collection_id: null,
        source_origin: 'MANUAL',
        source_file_name: null,
        source_page_number: null,
        source_evidence: null,
        passage_content: null,
        passage_type: null,
        question_type: 'MULTIPLE_CHOICE',
        points: 5,
        order_index: 0,
        content: {
            prompt: 'Question 1',
            options: ['A', 'B'],
            correctAnswer: 'A',
        },
    };

    const mockConfigState = {
        settings: {
            shuffleQuestions: false,
            showCorrectAnswers: false,
            allowReview: true,
            randomizeChoices: false,
        },
        configuration: {
            lobbyAdmissionMode: 'AUTOMATIC',
            maxReconnectAttempts: 3,
            strictMode: true,
            screenLock: true,
            cameraRequired: true,
            micRequired: true,
            autoSubmitTimeoutMinutes: 5,
            aiRules: {},
            webSecurity: {},
            mobileSecurity: {},
        },
    };

    const mockTelemetrySettings = {
        value: {
            mediaPipeSandbox: {
                enabled: true,
                captureDuringCheckup: true,
                emitDuringExam: true,
                calibrationRequired: true,
            },
        },
    };

    it('should NOT sanitize answers when studentUserId is NOT provided (instructor view)', async () => {
        vi.mocked(getExamByIdData).mockResolvedValue(mockExamRecord);
        vi.mocked(getExamSectionsData).mockResolvedValue([]);
        vi.mocked(getExamQuestionsData).mockResolvedValue([mockQuestion]);
        vi.mocked(getExamConfigurationState).mockResolvedValue(mockConfigState as any);
        vi.mocked(resolveExaminationGlobalSettings).mockResolvedValue({} as any);
        vi.mocked(TelemetrySettingsService.getTelemetrySettings).mockResolvedValue(
            mockTelemetrySettings as any,
        );
        vi.mocked(RuntimeAccessService.resolveExamRuntimeAccess).mockResolvedValue({
            state: 'open',
            canStart: true,
            canResume: false,
            hasActiveAttempt: false,
        } as any);

        const result = await getExamDetail(mockDb, 'exam-1');

        expect(result.questions[0].content.correctAnswer).toBe('A');
    });

    it('should sanitize answers when studentUserId IS provided (student view)', async () => {
        vi.mocked(getExamByIdData).mockResolvedValue({
            ...mockExamRecord,
            attempt_id: 'attempt-1',
        });
        vi.mocked(getExamSectionsData).mockResolvedValue([]);
        vi.mocked(getExamQuestionsData).mockResolvedValue([mockQuestion]);
        vi.mocked(getExamConfigurationState).mockResolvedValue(mockConfigState as any);
        vi.mocked(resolveExaminationGlobalSettings).mockResolvedValue({} as any);
        vi.mocked(TelemetrySettingsService.getTelemetrySettings).mockResolvedValue(
            mockTelemetrySettings as any,
        );
        vi.mocked(AccessGatekeeperService.verifyStudentExamEligibility).mockResolvedValue({
            runtimeAccess: {
                state: 'open',
                canStart: true,
                canResume: false,
                hasActiveAttempt: false,
            },
        } as any);

        const result = await getExamDetail(mockDb, 'exam-1', undefined, 'student-1');

        expect(result.questions[0].content.correctAnswer).toBeUndefined();
    });

    it('reuses the persisted attempt assessment snapshot for student view even if current settings differ', async () => {
        vi.mocked(getExamByIdData).mockResolvedValue({
            ...mockExamRecord,
            attempt_id: 'attempt-1',
            attempt_assessment_snapshot: {
                version: 'attempt-assessment.v1',
                attemptId: 'attempt-1',
                examId: 'exam-1',
                seed: 'attempt-1',
                settings: {
                    shuffleQuestions: false,
                    randomizeChoices: false,
                    showCorrectAnswers: false,
                    allowReview: true,
                },
                configuration: {
                    lobbyAdmissionMode: 'AUTOMATIC',
                    releaseScoreMode: 'AUTO_RELEASE',
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
                    automaticClosePolicy: {
                        enabled: true,
                        highIncidentThreshold: 3,
                        windowMinutes: 15,
                        useOccurrenceCount: false,
                        immediateCloseEventTypes: [],
                    },
                },
                questions: [
                    {
                        id: 'q-1',
                        examId: 'exam-1',
                        subjectId: null,
                        institutionId: null,
                        sourceOrigin: 'MANUAL',
                        sourceFileName: null,
                        sourcePageNumber: null,
                        sourceEvidence: null,
                        passageContent: null,
                        passageType: null,
                        type: 'MULTIPLE_CHOICE',
                        difficulty: 'MODERATE',
                        points: 5,
                        tags: [],
                        orderIndex: 0,
                        content: {
                            prompt: 'Question 1',
                            options: ['Persisted B', 'Persisted A'],
                            correctAnswer: 'Persisted A',
                        },
                        prompt: null,
                        createdAt: null,
                        updatedAt: null,
                        createdBy: null,
                        updatedBy: null,
                        status: 'ACTIVE',
                    },
                ],
                totalScore: 5,
            },
        } as any);
        vi.mocked(getExamSectionsData).mockResolvedValue([]);
        vi.mocked(getExamQuestionsData).mockResolvedValue([
            {
                ...mockQuestion,
                content: {
                    prompt: 'Question 1',
                    options: ['Current A', 'Current B'],
                    correctAnswer: 'Current A',
                },
            },
        ] as any);
        vi.mocked(getExamConfigurationState).mockResolvedValue({
            ...mockConfigState,
            settings: {
                ...mockConfigState.settings,
                randomizeChoices: true,
                shuffleQuestions: true,
            },
        } as any);
        vi.mocked(resolveExaminationGlobalSettings).mockResolvedValue({} as any);
        vi.mocked(TelemetrySettingsService.getTelemetrySettings).mockResolvedValue(
            mockTelemetrySettings as any,
        );
        vi.mocked(AccessGatekeeperService.verifyStudentExamEligibility).mockResolvedValue({
            runtimeAccess: {
                state: 'open',
                canStart: true,
                canResume: false,
                hasActiveAttempt: true,
            },
        } as any);

        const result = await getExamDetail(mockDb, 'exam-1', undefined, 'student-1');

        expect((result.questions[0].content as any).options).toEqual([
            'Persisted B',
            'Persisted A',
        ]);
        expect((result.questions[0].content as any).correctAnswer).toBeUndefined();
    });
});
