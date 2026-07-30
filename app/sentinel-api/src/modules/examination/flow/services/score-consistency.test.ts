import { describe, expect, it } from 'vitest';
import type { ExamAttemptAnswers, ExamQuestion } from '@sentinel/shared/types';
import { buildScoreSnapshot } from './attempt-snapshot.service';
import { mapExamHistoryDetailResponse } from '../../exams/services/map-exam-response.service';

describe('student score integrity cross-surface consistency', () => {
    it('keeps prepared score, submitted baseline, history baseline, and objective award sum aligned', () => {
        const questions: ExamQuestion[] = [
            {
                id: 'question-mc-1',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE',
                points: 2,
                orderIndex: 0,
                tags: [],
                content: {
                    prompt: 'Select the correct answer.',
                    options: ['Alpha', 'Beta', 'Gamma'],
                    optionTokens: ['tok-a', 'tok-b', 'tok-c'],
                    correctAnswer: 1,
                },
            },
            {
                id: 'question-mr-1',
                examId: 'exam-1',
                type: 'MULTIPLE_RESPONSE',
                points: 3,
                orderIndex: 1,
                tags: [],
                content: {
                    prompt: 'Select the correct colors.',
                    options: ['Blue', 'Triangle', 'Red'],
                    optionTokens: ['mr-blue', 'mr-triangle', 'mr-red'],
                    correctAnswer: [0, 2],
                },
            },
        ];

        const answers: ExamAttemptAnswers = {
            'question-mc-1': 'tok-b',
            'question-mr-1': ['mr-blue', 'mr-red'],
        };

        const scoreSnapshot = buildScoreSnapshot({
            questions,
            answers,
            answerChecksum: 'checksum-1',
        });

        const preparedScore = scoreSnapshot.score;
        const submittedInitialScore = scoreSnapshot.score;
        const objectiveAwardSum = scoreSnapshot.questionReports.reduce(
            (sum, report) => sum + (report.objectiveAwardedScore ?? 0),
            0,
        );
        const instructorObjectiveBaseline = scoreSnapshot.questionReports.reduce(
            (sum, report) => sum + (report.objectiveAwardedScore ?? 0),
            0,
        );

        const historyDetail = mapExamHistoryDetailResponse({
            exam_id: 'exam-1',
            title: 'Snapshot Integrity Exam',
            description: null,
            duration_minutes: 60,
            passing_score: 70,
            status: 'PUBLISHED',
            subject_id: 'subject-1',
            subject_title: 'Science',
            section_id: null,
            section_name: null,
            linked_section_name: null,
            room_id: null,
            room_name: null,
            scheduled_date: new Date('2026-07-29T09:00:00.000Z'),
            end_date_time: new Date('2026-07-29T10:00:00.000Z'),
            published_at: new Date('2026-07-29T08:00:00.000Z'),
            question_count: 2,
            created_at: new Date('2026-07-29T08:00:00.000Z'),
            updated_at: new Date('2026-07-29T08:00:00.000Z'),
            attempt_id: 'attempt-1',
            attempt_status: 'COMPLETED',
            attempt_completed_at: new Date('2026-07-29T10:00:00.000Z'),
            attempt_score: scoreSnapshot.score,
            attempt_total_score: scoreSnapshot.totalScore,
            attempt_score_snapshot: scoreSnapshot,
            attempt_time_spent_minutes: 12,
            attempt_incident_count: 0,
            attempt_primary_incident_type: null,
            release_score_mode: 'AUTO_RELEASE',
            essay_question_count: 0,
            attempt_finalized_at: null,
            attempt_assessment_snapshot: null,
            assigned_section_ids: [],
            assigned_section_names: [],
            assigned_class_group_ids: [],
            assigned_class_group_names: [],
            assigned_room_names: [],
            assigned_instructor_names: [],
            assigned_instructor_ids: [],
            is_public: false,
            created_by: null,
            created_by_name: null,
            published_by_name: null,
            institution_id: 'institution-1',
            class_group_id: null,
            class_name: null,
            attempt_answered_count: scoreSnapshot.answeredCount,
            students_count: 0,
            incident_count: 0,
            exam_category: null,
        });

        const historyBaseline = historyDetail.score;

        expect(preparedScore).toBe(5);
        expect(submittedInitialScore).toBe(5);
        expect(objectiveAwardSum).toBe(5);
        expect(instructorObjectiveBaseline).toBe(5);
        expect(historyBaseline).toBe(5);
        expect(historyDetail.totalScore).toBe(5);
        expect(historyDetail.percentage).toBe(100);
    });
});
