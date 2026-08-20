import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useApi, useAuth, useExamQuery } from '@sentinel/hooks';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, AppState } from 'react-native';
import { syncExamProgress, completeExamSession } from '@sentinel/services';
import { emitMobileTelemetryEvent } from '@/features/exam/lib/mobile-telemetry-client';
import {
    adaptExamForMobile,
    adaptExamQuestionsForMobile,
    buildExamResultPreview,
    buildSessionAnswerPayload,
} from '@/features/exam/lib/mobile-exam-adapter';
import {
    clearStoredMobileExamSession,
    readStoredMobileExamSession,
    writeStoredMobileExamPreview,
} from '@/features/exam/lib/mobile-exam-storage';
import { MobileExamReconnection } from '@/features/exam/lib/mobile-exam-reconnection';

export const useExamSession = () => {
    const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
    const router = useRouter();
    const apiClient = useApi();
    const { user } = useAuth();
    const { data: rawExam } = useExamQuery(id);

    // Data
    const exam = useMemo(() => (rawExam ? adaptExamForMobile(rawExam) : undefined), [rawExam]);
    const questions = useMemo(
        () => (rawExam ? adaptExamQuestionsForMobile(rawExam) : []),
        [rawExam],
    );

    // State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [flagged, setFlagged] = useState<Record<string, boolean>>({});
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState((exam?.duration || 60) * 60);
    const appStateRef = useRef(AppState.currentState);
    const lastNotificationViolationAtRef = useRef(0);

    // Reconnection listener
    const reconRef = useRef<MobileExamReconnection | null>(null);

    useEffect(() => {
        if (!id || !sessionId) {
            return;
        }

        const recon = new MobileExamReconnection({
            examId: id,
            sessionId,
        }, router);

        recon.startListening();
        reconRef.current = recon;

        return () => {
            recon.stopListening();
            reconRef.current = null;
        };
    }, [id, sessionId, router]);

    // Helpers
    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;
    const emitSessionTelemetry = useCallback(
        (
            eventType:
                | 'APP_BACKGROUNDING'
                | 'SCREENSHOT_ATTEMPT'
                | 'APP_PINNING_VIOLATION'
                | 'NOTIFICATION_BLOCK_VIOLATION',
        ) => {
            if (!exam || !sessionId || !user?.id) {
                return;
            }

            void emitMobileTelemetryEvent({
                apiClient,
                configuration: exam.configuration,
                examSessionId: sessionId,
                eventType,
                studentId: user.id,
            }).catch((error) => {
                console.warn('Failed to emit mobile telemetry event.', {
                    eventType,
                    error,
                });
            });
        },
        [apiClient, exam, sessionId, user?.id],
    );

    // Timer
    useEffect(() => {
        if (!id || !sessionId) {
            return;
        }

        void readStoredMobileExamSession(id).then((storedSession) => {
            if (storedSession?.sessionId !== sessionId) {
                router.replace(`/exam/${id}/lobby`);
            }
        });
    }, [id, router, sessionId]);

    useEffect(() => {
        if (!exam) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [exam]);

    useEffect(() => {
        const configuration = exam?.configuration?.mobileSecurity;

        if (!configuration) {
            return;
        }

        const subscription = AppState.addEventListener('change', (nextState) => {
            const wasActive = appStateRef.current === 'active';
            const movedAwayFromExam = nextState === 'inactive' || nextState === 'background';

            if (wasActive && movedAwayFromExam) {
                // Backgrounding violations
                if (nextState === 'background') {
                    if (configuration.prevent_backgrounding) {
                        emitSessionTelemetry('APP_BACKGROUNDING');
                    }

                    if (configuration.app_pinning_required) {
                        emitSessionTelemetry('APP_PINNING_VIOLATION');
                    }
                }

                // Notification / Overlay violations
                if (nextState === 'inactive') {
                    if (configuration.notification_block) {
                        emitSessionTelemetry('NOTIFICATION_BLOCK_VIOLATION');
                        lastNotificationViolationAtRef.current = Date.now();
                    }
                }

                Alert.alert(
                    'Focus Required',
                    'Leaving the exam app is prohibited and may be flagged by the security policy.',
                );
            }

            appStateRef.current = nextState;
        });

        const blurSubscription = AppState.addEventListener('blur', () => {
            if (!configuration.notification_block) {
                return;
            }

            const now = Date.now();
            if (now - lastNotificationViolationAtRef.current < 2000) {
                return;
            }

            lastNotificationViolationAtRef.current = now;
            emitSessionTelemetry('NOTIFICATION_BLOCK_VIOLATION');
        });

        return () => {
            subscription.remove();
            blurSubscription.remove();
        };
    }, [emitSessionTelemetry, exam?.configuration?.mobileSecurity]);

    useEffect(() => {
        if (!sessionId) {
            return;
        }

        const answeredCount = Object.keys(answers).length;
        const answerPayload = buildSessionAnswerPayload(questions, answers);
        void syncExamProgress(apiClient, {
            sessionId,
            answeredCount,
            elapsedSeconds: (exam?.duration || 60) * 60 - timeLeft,
            answers: answerPayload,
        }).catch(() => {
            reconRef.current?.triggerNetworkDisruption();
        });
    }, [answers, apiClient, exam?.duration, sessionId, timeLeft, questions]);

    // Handlers
    const handleSelectOption = (optionId: string | string[]) => {
        if (!currentQuestion) return;
        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }));
    };

    const toggleFlag = () => {
        if (!currentQuestion) return;
        setFlagged((prev) => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }));
    };

    const handleNext = () => {
        if (isLastQuestion) {
            const unansweredCount = questions.filter((q) => !answers[q.id]).length;
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
                        onPress: async () => {
                            if (!id || !sessionId) {
                                return;
                            }

                            try {
                                const answerPayload = buildSessionAnswerPayload(questions, answers);
                                const elapsed = (exam?.duration || 60) * 60 - timeLeft;

                                const result = await completeExamSession(apiClient, {
                                    sessionId,
                                    answers: answerPayload,
                                    elapsedSeconds: elapsed,
                                });

                                const preview = {
                                    sessionId,
                                    answers: answerPayload,
                                    elapsedSeconds: elapsed,
                                    summary: result,
                                };

                                await writeStoredMobileExamPreview(id, preview);
                                await clearStoredMobileExamSession(id);

                                router.replace(`/exam/${id}/result`);
                            } catch (error: any) {
                                Alert.alert(
                                    'Submission Failed',
                                    error?.message || 'Failed to submit exam. Please try again.'
                                );
                            }
                        },
                    },
                ],
            );
        } else {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return {
        exam,
        questions,
        currentQuestion,
        currentIndex,
        setCurrentIndex,
        answers,
        flagged,
        isDrawerOpen,
        setIsDrawerOpen,
        timeLeft,
        formatTime,
        handleSelectOption,
        toggleFlag,
        handleNext,
        handlePrev,
        isLastQuestion,
    };
};
