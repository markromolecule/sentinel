import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useApi } from '@sentinel/hooks';
import {
    getGradingAttemptDetail,
    updateGradingAttempt,
    type UpdateGradingAttemptBody,
} from '@sentinel/services';
import { calculateEssayWeightedScore, scoreExamAttempt } from '@sentinel/shared';
import { toast } from 'sonner';
import { GRADING_ATTEMPT_QUERY_KEY, DEFAULT_RUBRIC_SCORE } from '../../_constants';
import type { CriteriaScores, EvaluationsState, ScoreSummary } from '../../_types';
import type { UseGradingAttemptProps, UseGradingAttemptReturn } from './_types';

/**
 * Custom hook for managing the state, querying, scoring calculation,
 * and saving functionality of the exam attempt grading workspace.
 *
 * @param props - Object containing examId and attemptId
 * @returns State, handlers, and mutation states for grading
 */
function useGradingAttempt({ examId, attemptId }: UseGradingAttemptProps): UseGradingAttemptReturn {
    const apiClient = useApi();
    const router = useRouter();

    const [evaluations, setEvaluations] = useState<EvaluationsState>({});
    const [overallFeedback, setOverallFeedback] = useState('');
    const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Fetch attempt details
    const { data, isLoading, isError } = useQuery({
        queryKey: [GRADING_ATTEMPT_QUERY_KEY, attemptId],
        queryFn: () => getGradingAttemptDetail(apiClient, attemptId),
    });

    // Extract essay questions from assessment definition
    const essayQuestions = useMemo(() => {
        if (!data) return [];
        return data.questions.filter((q) => q.type === 'ESSAY');
    }, [data]);

    // Initialize scoring state when details are loaded
    useEffect(() => {
        if (data && !isInitialized) {
            const initial: EvaluationsState = {};
            const criteria = data.attempt.rubric.definition.criteria;
            for (const q of essayQuestions) {
                const existing = data.attempt.evaluations[q.id] || {};
                const existingScores = existing.scores || {};

                const scores: CriteriaScores = {};
                for (const criterion of criteria) {
                    scores[criterion.key] = existingScores[criterion.key] ?? DEFAULT_RUBRIC_SCORE;
                }

                initial[q.id] = {
                    scores,
                    feedback: existing.feedback ?? '',
                };
            }
            setEvaluations(initial);
            setOverallFeedback(data.attempt.feedback ?? '');
            if (essayQuestions.length > 0) {
                setActiveQuestionId(essayQuestions[0].id);
            }
            setIsInitialized(true);
        }
    }, [data, essayQuestions, isInitialized]);

    // Live score calculations based on evaluations and objective question answers
    const scoreSummary = useMemo(() => {
        if (!data || !isInitialized) {
            return { objectiveScore: 0, essayScore: 0, totalScore: 0, maxScore: 0 };
        }

        const mappedQuestions = data.questions.map((q) => ({
            id: q.id,
            examId: q.examId,
            type: q.type as any,
            points: q.points,
            orderIndex: q.orderIndex,
            content: q.content as any,
            tags: [],
        }));

        const summary = scoreExamAttempt({
            questions: mappedQuestions,
            answers: data.attempt.answers,
        });

        const objectiveScore = summary.score;
        let essayScore = 0;

        for (const q of essayQuestions) {
            const evaluation = evaluations[q.id];
            if (evaluation) {
                essayScore += calculateEssayWeightedScore(
                    evaluation.scores,
                    q.points,
                    data.attempt.rubric.definition,
                );
            }
        }

        return {
            objectiveScore,
            essayScore,
            totalScore: Math.round(objectiveScore + essayScore),
            maxScore: data.attempt.totalScore,
        };
    }, [data, essayQuestions, evaluations, isInitialized]);

    // Mutation to submit the graded attempt
    const saveMutation = useMutation({
        mutationFn: (body: UpdateGradingAttemptBody) =>
            updateGradingAttempt(apiClient, attemptId, body),
        onSuccess: (res) => {
            toast.success(
                `Attempt graded successfully. Final Score: ${res.score}/${res.totalScore}`,
            );
            router.push(`/exams/grading/${examId}`);
            router.refresh();
        },
        onError: (err: any) => {
            toast.error(err?.message || 'Failed to submit grade evaluation.');
        },
    });

    const handleScoreChange = (qId: string, criterionKey: keyof CriteriaScores, value: number) => {
        setEvaluations((prev) => {
            const qEval = prev[qId];
            if (!qEval) return prev;
            return {
                ...prev,
                [qId]: {
                    ...qEval,
                    scores: {
                        ...qEval.scores,
                        [criterionKey]: value,
                    },
                },
            };
        });
    };

    const handleFeedbackChange = (qId: string, text: string) => {
        setEvaluations((prev) => {
            const qEval = prev[qId];
            if (!qEval) return prev;
            return {
                ...prev,
                [qId]: {
                    ...qEval,
                    feedback: text,
                },
            };
        });
    };

    const handleSubmit = () => {
        const body: UpdateGradingAttemptBody = {
            evaluations: Object.entries(evaluations).reduce(
                (acc, [qId, qEval]) => {
                    acc[qId] = {
                        scores: qEval.scores,
                        feedback: qEval.feedback || null,
                    };
                    return acc;
                },
                {} as NonNullable<UpdateGradingAttemptBody['evaluations']>,
            ),
            feedback: overallFeedback || null,
        };
        saveMutation.mutate(body);
    };

    const activeQuestion = essayQuestions.find((q) => q.id === activeQuestionId);
    const activeEval = activeQuestionId ? evaluations[activeQuestionId] : null;

    return {
        attemptDetail: data,
        isLoading,
        isError,
        essayQuestions,
        activeQuestionId,
        setActiveQuestionId,
        activeQuestion,
        activeEval,
        evaluations,
        overallFeedback,
        setOverallFeedback,
        scoreSummary,
        isSubmitting: saveMutation.isPending,
        handleScoreChange,
        handleFeedbackChange,
        handleSubmit,
    };
}

export { useGradingAttempt };
