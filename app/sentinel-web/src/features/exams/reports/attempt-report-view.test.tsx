import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach as afterEachTest, describe, expect, it, vi } from 'vitest';
import type { GradingQuestionType } from '@sentinel/shared';
import { AttemptReportView } from './attempt-report-view';

afterEachTest(() => {
    cleanup();
});

describe('AttemptReportView', () => {
    it('submits override edits and finalization intent', () => {
        const onSubmit = vi.fn();

        render(
            <AttemptReportView
                editable
                onSubmit={onSubmit}
                attempt={{
                    attemptId: 'attempt-1',
                    examId: 'exam-1',
                    examTitle: 'Final Exam',
                    subjectTitle: 'Algorithms',
                    studentId: 'student-1',
                    studentName: 'Ana Santos',
                    studentNumber: '2024-0001',
                    completedAt: '2026-06-26T09:00:00.000Z',
                    score: 8,
                    totalScore: 10,
                    status: 'COMPLETED',
                    answers: {
                        'question-1': 'A',
                    },
                    evaluations: {},
                    feedback: 'Overall feedback',
                    itemOverrides: {},
                    grading: {
                        finalizedAt: null,
                        finalizedBy: null,
                    },
                    questionReports: [
                        {
                            questionId: 'question-1',
                            questionType: 'MULTIPLE_CHOICE',
                            prompt: 'Question prompt',
                            answer: 'A',
                            correctAnswer: 'B',
                            isCorrect: false,
                            awardedScore: 0,
                            maxScore: 5,
                            evaluation: null,
                            override: null,
                        },
                    ],
                }}
                questions={[
                    {
                        id: 'question-1',
                        examId: 'exam-1',
                        type: 'MULTIPLE_CHOICE',
                        content: {
                            prompt: 'Question prompt',
                        },
                        points: 5,
                        orderIndex: 0,
                    } as unknown as GradingQuestionType,
                ]}
            />,
        );

        // Click the row containing the question prompt to open the overrides dialog
        fireEvent.click(screen.getByText('Question prompt'));

        fireEvent.change(screen.getByLabelText('Override Score'), {
            target: { value: '4' },
        });
        fireEvent.change(screen.getByLabelText('Override Reason'), {
            target: { value: 'Accepted alternate reasoning.' },
        });

        // Close the overrides dialog by clicking Done
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));

        fireEvent.click(screen.getByRole('button', { name: 'Save & Finalize Report' }));

        expect(onSubmit).toHaveBeenCalledWith({
            itemOverrides: {
                'question-1': {
                    awardedScore: 4,
                    reason: 'Accepted alternate reasoning.',
                },
            },
            finalize: true,
        });
    });

    it('renders finalized report content without instructor actions', () => {
        render(
            <AttemptReportView
                attempt={{
                    attemptId: 'attempt-2',
                    examId: 'exam-2',
                    examTitle: 'Student View',
                    subjectTitle: 'English',
                    studentId: 'student-2',
                    studentName: 'Luis Reyes',
                    studentNumber: '2024-0002',
                    completedAt: '2026-06-26T09:00:00.000Z',
                    score: 18,
                    totalScore: 20,
                    status: 'COMPLETED',
                    answers: {
                        'question-1': 'Essay response',
                    },
                    evaluations: {},
                    feedback: 'Strong work overall.',
                    itemOverrides: {},
                    grading: {
                        finalizedAt: '2026-06-26T10:00:00.000Z',
                        finalizedBy: 'user-1',
                    },
                    questionReports: [
                        {
                            questionId: 'question-1',
                            questionType: 'ESSAY',
                            prompt: 'Question prompt',
                            answer: 'Essay response',
                            correctAnswer: null,
                            isCorrect: null,
                            awardedScore: 18,
                            maxScore: 20,
                            evaluation: {
                                scores: {
                                    contentSubstance: 4,
                                    structureOrganization: 4,
                                    argumentationSupport: 3,
                                    styleTone: 3,
                                    grammarConventions: 4,
                                },
                            },
                            override: null,
                        },
                    ],
                }}
                questions={[
                    {
                        id: 'question-1',
                        examId: 'exam-2',
                        type: 'ESSAY',
                        sourceFileName: 'reading-pack.pdf',
                        sourcePageNumber: 7,
                        sourceEvidence: 'Legacy source evidence should not be shown first.',
                        passageContent: '<p><strong>Rendered passage</strong></p>',
                        passageType: 'html',
                        content: {
                            prompt: 'Question prompt',
                        },
                        points: 20,
                        orderIndex: 0,
                    } as unknown as GradingQuestionType,
                ]}
            />,
        );

        expect(screen.getByText('Strong work overall.')).toBeTruthy();
        expect(screen.getByText('Report Finalized')).toBeTruthy();
        expect(
            screen.getByText('This attempt report is locked and cannot be edited.'),
        ).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Save Overrides' })).toBeNull();
        expect(screen.queryByLabelText('Override Score')).toBeNull();
    });

    it('can render only the question table for compact student dialogs', () => {
        render(
            <AttemptReportView
                showSummaryCards={false}
                showActions={false}
                attempt={{
                    attemptId: 'attempt-3',
                    examId: 'exam-3',
                    examTitle: 'Dialog View',
                    subjectTitle: 'Science',
                    studentId: 'student-3',
                    studentName: 'Mina Cruz',
                    studentNumber: '2024-0003',
                    completedAt: '2026-06-26T09:00:00.000Z',
                    score: 5,
                    totalScore: 5,
                    status: 'COMPLETED',
                    answers: {
                        'question-1': true,
                    },
                    evaluations: {},
                    feedback: 'Released feedback.',
                    itemOverrides: {},
                    grading: {
                        finalizedAt: '2026-06-26T10:00:00.000Z',
                        finalizedBy: 'user-1',
                    },
                    questionReports: [
                        {
                            questionId: 'question-1',
                            questionType: 'TRUE_FALSE',
                            prompt: 'Question prompt',
                            answer: true,
                            correctAnswer: true,
                            isCorrect: true,
                            awardedScore: 5,
                            maxScore: 5,
                            evaluation: null,
                            override: null,
                        },
                    ],
                }}
                questions={[
                    {
                        id: 'question-1',
                        examId: 'exam-3',
                        type: 'TRUE_FALSE',
                        content: {
                            prompt: 'Question prompt',
                        },
                        points: 5,
                        orderIndex: 0,
                    } as unknown as GradingQuestionType,
                ]}
            />,
        );

        expect(screen.getByText('Question prompt')).toBeTruthy();
        expect(screen.queryByText('Final Score')).toBeNull();
        expect(screen.queryByText('Released feedback.')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Save Overrides' })).toBeNull();
    });

    it('retains local override drafts when attempt updates while isSubmitting is true', () => {
        const onSubmit = vi.fn();
        const attemptMock = {
            attemptId: 'attempt-1',
            examId: 'exam-1',
            examTitle: 'Final Exam',
            subjectTitle: 'Algorithms',
            studentId: 'student-1',
            studentName: 'Ana Santos',
            studentNumber: '2024-0001',
            completedAt: '2026-06-26T09:00:00.000Z',
            score: 8,
            totalScore: 10,
            status: 'COMPLETED',
            answers: { 'question-1': 'A' },
            evaluations: {},
            feedback: 'Overall feedback',
            itemOverrides: {}, // initially empty
            grading: { finalizedAt: null, finalizedBy: null },
            questionReports: [
                {
                    questionId: 'question-1',
                    questionType: 'MULTIPLE_CHOICE',
                    prompt: 'Question prompt',
                    answer: 'A',
                    correctAnswer: 'B',
                    isCorrect: false,
                    awardedScore: 0,
                    maxScore: 5,
                    evaluation: null,
                    override: null,
                },
            ],
        };

        const questionsMock = [
            {
                id: 'question-1',
                examId: 'exam-1',
                type: 'MULTIPLE_CHOICE',
                content: { prompt: 'Question prompt' },
                points: 5,
                orderIndex: 0,
            },
        ];

        const { rerender } = render(
            <AttemptReportView
                editable
                isSubmitting={true} // saving is in-flight
                onSubmit={onSubmit}
                attempt={attemptMock}
                questions={questionsMock as unknown as GradingQuestionType[]}
            />,
        );

        // Open the dialog
        fireEvent.click(screen.getByText('Question prompt'));

        // Change the override score in the dialog
        fireEvent.change(screen.getByLabelText('Override Score'), {
            target: { value: '3' },
        });

        // Close dialog
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));

        // Now, trigger a rerender with updated attempt props from a background query refetch,
        // but since isSubmitting is still true, the local draft of '3' should NOT be overwritten by the server's empty overrides.
        rerender(
            <AttemptReportView
                editable
                isSubmitting={true}
                onSubmit={onSubmit}
                attempt={{
                    ...attemptMock,
                    itemOverrides: {}, // still empty from server
                }}
                questions={questionsMock as unknown as GradingQuestionType[]}
            />,
        );

        // Open dialog again
        fireEvent.click(screen.getByText('Question prompt'));

        // Check if value is still '3'
        const overrideInput = screen.getByLabelText('Override Score') as HTMLInputElement;
        expect(overrideInput.value).toBe('3');

        // Close dialog
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));

        // Now, trigger a rerender where saving has completed (isSubmitting = false)
        // and the new attempt.itemOverrides are received from the server (awardedScore: 3).
        rerender(
            <AttemptReportView
                editable
                isSubmitting={false}
                onSubmit={onSubmit}
                attempt={{
                    ...attemptMock,
                    itemOverrides: {
                        'question-1': {
                            awardedScore: 3,
                            reason: 'Server Reason',
                        },
                    },
                }}
                questions={questionsMock as unknown as GradingQuestionType[]}
            />,
        );

        // Open dialog again
        fireEvent.click(screen.getByText('Question prompt'));

        // Check if value is updated with the new server reason
        expect((screen.getByLabelText('Override Score') as HTMLInputElement).value).toBe('3');
        expect((screen.getByLabelText('Override Reason') as HTMLInputElement).value).toBe(
            'Server Reason',
        );
    });

    it('renders custom rubric badges and maps custom criterion keys to names', () => {
        const customRubric = {
            id: 'custom-rubric-1',
            versionNumber: 2,
            source: 'EXAM_OVERRIDE' as const,
            definition: {
                criteria: [
                    {
                        key: 'creativity',
                        name: 'Creativity & Originality',
                        weight: 0.6,
                        description: 'Creative aspect',
                        levels: { '0': 'L0', '1': 'L1', '2': 'L2', '3': 'L3', '4': 'L4' },
                    },
                    {
                        key: 'depth',
                        name: 'Technical Depth',
                        weight: 0.4,
                        description: 'Technical aspect',
                        levels: { '0': 'L0', '1': 'L1', '2': 'L2', '3': 'L3', '4': 'L4' },
                    },
                ],
            },
            updatedAt: null,
        };

        render(
            <AttemptReportView
                attempt={{
                    attemptId: 'attempt-3',
                    examId: 'exam-3',
                    examTitle: 'Custom Rubric Exam',
                    subjectTitle: 'Computer Science',
                    studentId: 'student-3',
                    studentName: 'Ana Santos',
                    studentNumber: '2024-0001',
                    completedAt: '2026-06-26T09:00:00.000Z',
                    score: 18,
                    totalScore: 20,
                    status: 'COMPLETED',
                    answers: {
                        'question-1': 'Essay response',
                    },
                    evaluations: {},
                    feedback: 'Nice work.',
                    itemOverrides: {},
                    grading: {
                        finalizedAt: '2026-06-26T10:00:00.000Z',
                        finalizedBy: 'user-1',
                    },
                    questionReports: [
                        {
                            questionId: 'question-1',
                            questionType: 'ESSAY',
                            prompt: 'Question prompt',
                            answer: 'Essay response',
                            correctAnswer: null,
                            isCorrect: null,
                            awardedScore: 18,
                            maxScore: 20,
                            evaluation: {
                                scores: {
                                    creativity: 4,
                                    depth: 3,
                                },
                            },
                            override: null,
                        },
                    ],
                    rubric: customRubric,
                }}
                questions={[
                    {
                        id: 'question-1',
                        examId: 'exam-3',
                        type: 'ESSAY',
                        content: {
                            prompt: 'Question prompt',
                        },
                        points: 20,
                        orderIndex: 0,
                    } as unknown as GradingQuestionType,
                ]}
            />,
        );

        // Verify that custom criterion names are displayed in the badges instead of raw keys
        expect(screen.getByText('Creativity & Originality: 4')).toBeTruthy();
        expect(screen.getByText('Technical Depth: 3')).toBeTruthy();
    });
});
