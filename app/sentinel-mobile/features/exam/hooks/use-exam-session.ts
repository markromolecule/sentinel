import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useApi, useAuth, useExamQuery } from '@sentinel/hooks';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { syncExamProgress, completeExamSession } from '@sentinel/services';
import { emitMobileTelemetryEvent } from '@/features/exam/lib/mobile-telemetry-client';
import {
    adaptExamForMobile,
    adaptExamQuestionsForMobile,
    buildSessionAnswerPayload,
} from '@/features/exam/lib/mobile-exam-adapter';
import {
    clearStoredMobileExamSession,
    readStoredMobileExamSession,
    writeStoredMobileExamPreview,
} from '@/features/exam/lib/mobile-exam-storage';
import { MobileExamReconnection } from '@/features/exam/lib/mobile-exam-reconnection';

/**
 * Standardized answer truthiness check across sync payloads and UI count calculations.
 */
function isQuestionAnswered(answer: string | string[] | Record<string, any> | undefined | null): boolean {
    if (answer === undefined || answer === null) return false;
    if (typeof answer === 'string') return answer.trim().length > 0;
    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === 'object') return Object.keys(answer).length > 0;
    return false;
}

export const useExamSession = () => {
    const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
    const router = useRouter();
    const apiClient = useApi();
    const { user } = useAuth();
    const { data: rawExam, isLoading: isExamLoading } = useExamQuery(id, { viewer: 'student' });

    // Data
    const exam = useMemo(() => (rawExam ? adaptExamForMobile(rawExam) : undefined), [rawExam]);
    const questions = useMemo(
        () => (rawExam ? adaptExamQuestionsForMobile(rawExam) : []),
        [rawExam],
    );

    // State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [flagged, setFlagged] = useState<Record<string, boolean>>({});
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState((exam?.duration || 60) * 60);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isDurationInitializedRef = useRef(false);
    const isSubmittingRef = useRef(false);
    const isSyncingRef = useRef(false);

    // App state tracking refs (iOS active -> inactive -> background robust lifecycle)
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const hasLeftForegroundRef = useRef(false);
    const hasEmittedBackgroundViolationRef = useRef(false);
    const lastNotificationViolationAtRef = useRef(0);
    const lastScreenshotAtRef = useRef(0);

    const answersRef = useRef(answers);
    answersRef.current = answers;

    const timeLeftRef = useRef(timeLeft);
    timeLeftRef.current = timeLeft;

    // Reconnection listener
    const reconRef = useRef<MobileExamReconnection | null>(null);

    useEffect(() => {
        if (!id || !sessionId) {
            return;
        }

        const recon = new MobileExamReconnection(
            {
                examId: id,
                sessionId,
            },
            router,
        );

        recon.startListening();
        reconRef.current = recon;

        return () => {
            recon.stopListening();
            reconRef.current = null;
        };
    }, [id, sessionId, router]);

    // Helpers
    const currentQuestion = questions[currentIndex] ?? questions[0];
    const isLastQuestion = questions.length > 0 && currentIndex === questions.length - 1;

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

    const emitNotificationViolationIfAllowed = useCallback(() => {
        const now = Date.now();
        if (now - lastNotificationViolationAtRef.current < 2000) {
            return;
        }
        lastNotificationViolationAtRef.current = now;
        emitSessionTelemetry('NOTIFICATION_BLOCK_VIOLATION');
    }, [emitSessionTelemetry]);

    // Initial check
    useEffect(() => {
        if (!id || !sessionId) {
            return;
        }

        void readStoredMobileExamSession(id).then((storedSession) => {
            if (storedSession?.sessionId !== sessionId) {
                router.replace(`/exam/${id}/lobby`);
            }
        });
    }, [id, sessionId, router]);

    // Duration sync effect: updates timeLeft once exam details load asynchronously
    useEffect(() => {
        if (!exam?.duration || isDurationInitializedRef.current) {
            return;
        }

        setTimeLeft(exam.duration * 60);
        isDurationInitializedRef.current = true;
    }, [exam?.duration]);

    // 1-second countdown timer
    useEffect(() => {
        if (!exam) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                const next = Math.max(0, prev - 1);
                return next;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [exam]);

    // Mobile Security Policy listeners with multi-stage iOS transition tracking
    useEffect(() => {
        const configuration = exam?.configuration?.mobileSecurity;
        if (!configuration) {
            return;
        }

        const subscription = AppState.addEventListener('change', (nextState) => {
            const prevState = appStateRef.current;

            if (prevState === 'active' && (nextState === 'inactive' || nextState === 'background')) {
                hasLeftForegroundRef.current = true;
            }

            // Inactive transition (notification pull-down, control center, incoming call)
            if (nextState === 'inactive') {
                if (configuration.notification_block) {
                    emitNotificationViolationIfAllowed();
                }
            }

            // Background transition (home button, app switcher) — works even after 'inactive'
            if (nextState === 'background' && hasLeftForegroundRef.current) {
                const isRecentScreenshot = Date.now() - lastScreenshotAtRef.current < 2000;

                if (!hasEmittedBackgroundViolationRef.current && !isRecentScreenshot) {
                    if (configuration.prevent_backgrounding) {
                        emitSessionTelemetry('APP_BACKGROUNDING');
                    }
                    if (configuration.app_pinning_required) {
                        emitSessionTelemetry('APP_PINNING_VIOLATION');
                    }
                    hasEmittedBackgroundViolationRef.current = true;

                    Alert.alert(
                        'Focus Required',
                        'Leaving the exam app is prohibited and has been recorded in the security audit.',
                    );
                }
            }

            // Return to active foreground
            if (nextState === 'active') {
                hasLeftForegroundRef.current = false;
                hasEmittedBackgroundViolationRef.current = false;
            }

            appStateRef.current = nextState;
        });

        const blurSubscription = AppState.addEventListener('blur', () => {
            if (!configuration.notification_block) {
                return;
            }
            emitNotificationViolationIfAllowed();
        });

        return () => {
            subscription.remove();
            blurSubscription.remove();
        };
    }, [
        emitNotificationViolationIfAllowed,
        emitSessionTelemetry,
        exam?.configuration?.mobileSecurity,
    ]);

    // Hardware Screen Capture Prevention (enforces FLAG_SECURE on Android, preventing screenshots and recording)
    useEffect(() => {
        const configuration = exam?.configuration?.mobileSecurity;
        const shouldBlockScreenshot = configuration ? configuration.screenshot_block : true;

        if (shouldBlockScreenshot) {
            ScreenCapture.preventScreenCaptureAsync().catch(() => {});
        }

        return () => {
            ScreenCapture.allowScreenCaptureAsync().catch(() => {});
        };
    }, [exam?.configuration?.mobileSecurity]);

    // Native Screenshot Listener (iOS & Android)
    useEffect(() => {
        const configuration = exam?.configuration?.mobileSecurity;
        const shouldBlockScreenshot = configuration ? configuration.screenshot_block : true;

        if (!shouldBlockScreenshot) {
            return;
        }

        const subscription = ScreenCapture.addScreenshotListener(() => {
            lastScreenshotAtRef.current = Date.now();
            emitSessionTelemetry('SCREENSHOT_ATTEMPT');
            Alert.alert(
                'Screenshot Detected',
                'Taking screenshots during this exam is strictly prohibited and has been recorded in the security audit.',
            );
        });

        return () => {
            subscription.remove();
        };
    }, [emitSessionTelemetry, exam?.configuration?.mobileSecurity]);

    // Core progress sync execution function (reads latest refs, guarded against concurrent races)
    const syncProgressNow = useCallback(async () => {
        if (!sessionId || !exam || isSyncingRef.current) return;

        isSyncingRef.current = true;
        const currentAnswers = answersRef.current;
        const currentElapsed = Math.max(0, (exam.duration || 60) * 60 - timeLeftRef.current);
        const answeredCount = Object.values(currentAnswers).filter(isQuestionAnswered).length;
        const answerPayload = buildSessionAnswerPayload(questions, currentAnswers);

        try {
            await syncExamProgress(apiClient, {
                sessionId,
                answeredCount,
                elapsedSeconds: currentElapsed,
                answers: answerPayload,
            });
        } catch {
            reconRef.current?.triggerNetworkDisruption();
        } finally {
            isSyncingRef.current = false;
        }
    }, [apiClient, exam, questions, sessionId]);

    // 1. Debounced sync on answer state change (1200ms after user action)
    useEffect(() => {
        if (!sessionId) return;

        const timer = setTimeout(() => {
            void syncProgressNow();
        }, 1200);

        return () => clearTimeout(timer);
    }, [answers, sessionId, syncProgressNow]);

    // 2. Periodic background heartbeat with randomized jitter (15s–25s)
    useEffect(() => {
        if (!sessionId) return;

        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let isMounted = true;

        const scheduleNextHeartbeat = () => {
            if (!isMounted) return;
            const jitterMs = 15_000 + Math.floor(Math.random() * 10_000);
            timeoutId = setTimeout(async () => {
                await syncProgressNow();
                if (isMounted) {
                    scheduleNextHeartbeat();
                }
            }, jitterMs);
        };

        scheduleNextHeartbeat();

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [sessionId, syncProgressNow]);

    // Auto-submission on time expiration
    const executeSubmission = useCallback(async () => {
        if (!id || !sessionId || !exam || isSubmittingRef.current) {
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            const currentAnswers = answersRef.current;
            const answerPayload = buildSessionAnswerPayload(questions, currentAnswers);
            const elapsed = Math.max(0, (exam.duration || 60) * 60 - timeLeftRef.current);

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
                error?.message || 'Failed to submit exam. Please try again.',
            );
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    }, [apiClient, exam, id, questions, router, sessionId]);

    // Check for 00:00 time expiration auto-submit
    useEffect(() => {
        if (!isDurationInitializedRef.current || isSubmittingRef.current) {
            return;
        }

        if (timeLeft <= 0) {
            void executeSubmission();
        }
    }, [timeLeft, executeSubmission]);

    // Handlers
    const handleSelectOption = useCallback((optionId: any) => {
        if (!currentQuestion) return;
        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }));
    }, [currentQuestion]);

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
                            void executeSubmission();
                        },
                    },
                ],
            );
        } else {
            setCurrentIndex((prev) => prev + 1);
            void syncProgressNow();
        }
    }, [executeSubmission, flagged, isLastQuestion, questions, syncProgressNow]);

    const handlePrevious = useCallback(() => {
        setCurrentIndex((prev) => {
            if (prev > 0) {
                void syncProgressNow();
                return prev - 1;
            }
            return prev;
        });
    }, [syncProgressNow]);

    const handleSelectQuestion = useCallback((index: number) => {
        setCurrentIndex(index);
        setIsDrawerOpen(false);
        void syncProgressNow();
    }, [syncProgressNow]);

    const formatTime = useCallback((seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        exam,
        questions,
        currentQuestion,
        currentIndex,
        setCurrentIndex,
        isLastQuestion,
        answers,
        flagged,
        isDrawerOpen,
        setIsDrawerOpen,
        timeLeft,
        isLoading: isExamLoading,
        isSubmitting,
        formatTime,
        handleSelectOption,
        toggleFlag,
        handleNext,
        handlePrev: handlePrevious,
        handlePrevious,
        handleSelectQuestion,
    };
};
