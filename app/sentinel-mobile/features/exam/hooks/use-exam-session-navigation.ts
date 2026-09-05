import { useState, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { isQuestionAnswered } from '@/features/exam/lib/mobile-exam-adapter';
import type { MobileSessionQuestion } from '@/features/exam/lib/mobile-exam-adapter.types';

interface UseExamSessionNavigationOptions {
    questions: MobileSessionQuestion[];
    onConfirmSubmit: () => void;
    syncProgressNow: () => Promise<void>;
}

export function useExamSessionNavigation({
    questions,
    onConfirmSubmit,
    syncProgressNow,
}: UseExamSessionNavigationOptions) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [flagged, setFlagged] = useState<Record<string, boolean>>({});
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const answersRef = useRef(answers);
    answersRef.current = answers;

    const currentQuestion = questions[currentIndex] ?? questions[0];
    const isLastQuestion = questions.length > 0 && currentIndex === questions.length - 1;

    const handleSelectOption = useCallback(
        (optionId: any) => {
            if (!currentQuestion) return;
            setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }));
        },
        [currentQuestion],
    );

    const toggleFlag = useCallback(() => {
        if (!currentQuestion) return;
        setFlagged((prev) => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }));
    }, [currentQuestion]);

    const handleNext = useCallback(() => {
        if (isLastQuestion) {
            const currentAnswers = answersRef.current;
            const unansweredCount = questions.filter(
                (q) => !isQuestionAnswered(currentAnswers[q.id]),
            ).length;
            const flaggedCount = Object.values(flagged).filter(Boolean).length;

            let message = 'Are you sure you want to submit?';
            if (unansweredCount > 0 || flaggedCount > 0) {
                message = `You have ${unansweredCount} unanswered and ${flaggedCount} flagged questions. Are you sure you want to submit?`;
            }

            Alert.alert(
                unansweredCount > 0 || flaggedCount > 0
                    ? 'Missing or Flagged Questions'
                    : 'Submit Exam',
                message,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Submit',
                        style: 'destructive',
                        onPress: () => {
                            onConfirmSubmit();
                        },
                    },
                ],
            );
        } else {
            setCurrentIndex((prev) => prev + 1);
            void syncProgressNow();
        }
    }, [flagged, isLastQuestion, onConfirmSubmit, questions, syncProgressNow]);

    const handlePrevious = useCallback(() => {
        setCurrentIndex((prev) => {
            if (prev > 0) {
                void syncProgressNow();
                return prev - 1;
            }
            return prev;
        });
    }, [syncProgressNow]);

    const handleSelectQuestion = useCallback(
        (index: number) => {
            setCurrentIndex(index);
            setIsDrawerOpen(false);
            void syncProgressNow();
        },
        [syncProgressNow],
    );

    return {
        currentIndex,
        setCurrentIndex,
        currentQuestion,
        isLastQuestion,
        answers,
        answersRef,
        setAnswers,
        flagged,
        setFlagged,
        isDrawerOpen,
        setIsDrawerOpen,
        handleSelectOption,
        toggleFlag,
        handleNext,
        handlePrevious,
        handleSelectQuestion,
    };
}
