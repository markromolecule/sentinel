import { useEffect, useMemo } from 'react';
import type { ExamQuestion } from '@sentinel/shared/types';
import {
    getRuntimePassageDetails,
    hasAnswer,
    type ExamAnswerValue,
} from '@/features/exams/_components/engine';

export type UseAttemptQuestionContextArgs = {
    questions: ExamQuestion[];
    currentQuestionIndex: number;
    selectedAnswers: Record<string, ExamAnswerValue>;
    answeredCount: number;
    reviewQuestionIds: string[];
    setIsCompactPassageOpen: (open: boolean) => void;
};

/**
 * Derives current question, unanswered question metrics, progress percentage,
 * passage details, and resets the compact passage drawer when question changes.
 */
export function useAttemptQuestionContext({
    questions,
    currentQuestionIndex,
    selectedAnswers,
    answeredCount,
    reviewQuestionIds,
    setIsCompactPassageOpen,
}: UseAttemptQuestionContextArgs) {
    const safeQuestionIndex = currentQuestionIndex;
    const currentQuestion = questions[safeQuestionIndex] ?? null;

    const unansweredQuestions = useMemo(
        () => questions.filter((question) => !hasAnswer(selectedAnswers[question.id])),
        [questions, selectedAnswers],
    );

    const unansweredCount = unansweredQuestions.length;

    const unansweredQuestionLabels = useMemo(
        () =>
            unansweredQuestions.slice(0, 8).map((question, index) => {
                const qIndex = questions.findIndex((q) => q.id === question.id);
                return `Q${qIndex >= 0 ? qIndex + 1 : index + 1}`;
            }),
        [questions, unansweredQuestions],
    );

    const progress = questions.length
        ? Math.round((answeredCount / questions.length) * 100)
        : 0;

    const isCurrentQuestionFlagged = currentQuestion
        ? reviewQuestionIds.includes(currentQuestion.id)
        : false;

    // Close the compact passage sheet on question change
    const currentQuestionId = currentQuestion?.id;
    useEffect(() => {
        setIsCompactPassageOpen(false);
    }, [currentQuestionId, setIsCompactPassageOpen]);

    const currentContext = useMemo(
        () =>
            getRuntimePassageDetails({
                questionPassageContent: currentQuestion?.passageContent,
                questionPassageType: currentQuestion?.passageType,
            }),
        [currentQuestion?.passageContent, currentQuestion?.passageType],
    );

    return {
        safeQuestionIndex,
        currentQuestion,
        progress,
        unansweredCount,
        unansweredQuestionLabels,
        isCurrentQuestionFlagged,
        currentContext,
    };
}
