import { describe, expect, it } from 'vitest';
import {
    buildAssessmentSnapshot,
    buildLegacyEssayRubricSnapshot,
    parseAssessmentSnapshot,
    resolveAssessmentSnapshotRubric,
} from './attempt-snapshot.service';

describe('buildAssessmentSnapshot', () => {
    const configurationState = {
        settings: {
            shuffleQuestions: false,
            showCorrectAnswers: false,
            allowReview: true,
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
    } as const;

    const questions = [
        {
            question_id: 'question-1',
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
            points: 2,
            order_index: 0,
            content: {
                prompt: 'Choose one',
                options: ['Alpha', 'Beta', 'Gamma'],
                correctAnswer: 1,
            },
        },
    ] as const;

    it('stores attempt-specific option tokens in the assessment snapshot', () => {
        const snapshot = buildAssessmentSnapshot({
            attemptId: 'attempt-1',
            examId: 'exam-1',
            configurationState: configurationState as any,
            questions: questions as any,
        });

        expect(snapshot.questions[0]?.content.optionTokens).toHaveLength(3);
        expect(snapshot.questions[0]?.content.optionTokens).toEqual(
            expect.arrayContaining([expect.any(String)]),
        );
        expect('rubric' in snapshot && snapshot.rubric.id).toBe('legacy-standard-v1');
    });

    it('generates different option tokens for different attempts even when options match', () => {
        const snapshotA = buildAssessmentSnapshot({
            attemptId: 'attempt-a',
            examId: 'exam-1',
            configurationState: configurationState as any,
            questions: questions as any,
        });
        const snapshotB = buildAssessmentSnapshot({
            attemptId: 'attempt-b',
            examId: 'exam-1',
            configurationState: configurationState as any,
            questions: questions as any,
        });

        expect(snapshotA.questions[0]?.content.optionTokens).not.toEqual(
            snapshotB.questions[0]?.content.optionTokens,
        );
        expect([...(snapshotA.questions[0]?.content.options ?? [])].sort()).toEqual(
            [...(snapshotB.questions[0]?.content.options ?? [])].sort(),
        );
    });

    it('parses v1 snapshots and resolves the legacy rubric fallback', () => {
        const currentSnapshot = buildAssessmentSnapshot({
            attemptId: 'attempt-v1',
            examId: 'exam-1',
            configurationState: configurationState as any,
            questions: questions as any,
        });
        const parsedSnapshot = parseAssessmentSnapshot({
            version: 'attempt-assessment.v1',
            attemptId: currentSnapshot.attemptId,
            examId: currentSnapshot.examId,
            seed: currentSnapshot.seed,
            settings: currentSnapshot.settings,
            configuration: currentSnapshot.configuration,
            questions: currentSnapshot.questions,
            totalScore: currentSnapshot.totalScore,
        });

        expect(parsedSnapshot).not.toBeNull();
        expect(resolveAssessmentSnapshotRubric(parsedSnapshot)).toEqual(
            buildLegacyEssayRubricSnapshot(),
        );
    });

    it('strips choice label prefixes and maps correctAnswer correctly in snapshot across student seeds', () => {
        const questionsWithLabels = [
            {
                question_id: 'q-baked',
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
                    prompt: 'What is the capital of France?',
                    options: ['A. Berlin', 'B. Paris', 'C. Madrid', 'D. Rome'],
                    correctAnswer: 1, // 'B. Paris'
                },
            },
        ] as const;

        const snapshot = buildAssessmentSnapshot({
            attemptId: 'attempt-student-seed-1',
            examId: 'exam-1',
            configurationState: configurationState as any,
            questions: questionsWithLabels as any,
        });

        const snapshotQuestion = snapshot.questions[0];
        expect(snapshotQuestion?.content.options).toContain('Paris');
        expect(snapshotQuestion?.content.options).not.toContain('B. Paris');

        const correctIdx = snapshotQuestion?.content.correctAnswer as number;
        expect(snapshotQuestion?.content.options?.[correctIdx]).toBe('Paris');
        expect(snapshotQuestion?.content.optionTokens).toHaveLength(4);
    });
});

