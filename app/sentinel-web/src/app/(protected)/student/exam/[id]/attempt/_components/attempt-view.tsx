'use client';

import { Badge } from '@sentinel/ui';
import {
    ExamAttemptShell,
    formatTimer,
    ExamAttemptRuntimeHeader,
    ExamAttemptRuntimeFooter,
    ExamAttemptRuntimeNavigation,
    ExamAttemptRuntimePassage,
    ExamAttemptRuntimeSecurity,
    ExamAttemptRuntimeQuestion,
    ExamAttemptPassageSheet,
} from '@/features/exams/_components/engine';
import config from '@/lib/config';
import { useStudentExamAttempt } from '@/app/(protected)/student/exam/[id]/attempt/_hooks/use-student-exam-attempt';
import { MediaPipeIncidentDialog } from './mediapipe-incident-dialog';

/**
 * Props for the AttemptView component.
 */
export interface AttemptViewProps {
    /** The coordinated state and handlers returned from `useStudentExamAttempt` hook. */
    attempt: ReturnType<typeof useStudentExamAttempt>;
}

/**
 * Renders the primary workspace for a student exam attempt.
 *
 * This component acts as a pure presentation/view layer for the exam runtime,
 * consuming the coordinated exam attempt state and controls passed down from the page container.
 */
export function AttemptView({ attempt }: AttemptViewProps) {
    const {
        exam,
        questions,
        currentQuestion,
        safeQuestionIndex,
        answeredCount,
        answeredQuestionIds,
        progress,
        unansweredCount,
        unansweredQuestionLabels,
        isCurrentQuestionFlagged,
        currentContext,
        secondsRemaining,
        selectedAnswers,
        reviewQuestionIds,
        showPassagePanel,
        setShowPassagePanel,
        isCompactPassageOpen,
        setIsCompactPassageOpen,
        crossOutEnabled,
        setCrossOutEnabled,
        crossedOutOptions,
        isSubmitDialogOpen,
        setIsSubmitDialogOpen,
        isRedirectingToTurnIn,
        mediaPipeVideoRef,
        mediaPipeAnalysis,
        mediaPipePhase,
        mediaPipeErrorMessage,
        mediaPipeIncident,
        dismissMediaPipeIncident,
        isMediaPipeEnabled,
        audioErrorMessage,
        audioMonitoringPhase,
        isAudioMonitoringEnabled,
        securityLockReason,
        isResumingExam,
        resumeSecuredExam,
        fullScreenContainerRef,
        handleAnswerChange,
        handleToggleReview,
        handleToggleCrossOutOption,
        moveQuestionIndex,
        handleSubmit,
        proceedToTurnInReview,
        setCurrentQuestionIndex,
    } = attempt;

    const hasPassage = Boolean(currentContext?.body && currentContext.body.trim().length > 0);

    return (
        <div
            ref={(node) => {
                if (fullScreenContainerRef) {
                    fullScreenContainerRef.current = node;
                }
            }}
            className={`bg-background flex h-[100dvh] h-[100vh] min-h-0 flex-col overflow-hidden transition-[filter] duration-150 ${Boolean(securityLockReason) ? 'blur-md select-none pointer-events-none' : ''}`}
        >
            <video
                ref={mediaPipeVideoRef}
                autoPlay
                muted
                playsInline
                aria-hidden="true"
                data-testid="attempt-mediapipe-video"
                className="pointer-events-none fixed right-0 bottom-0 h-px w-px opacity-0"
            />

            <MediaPipeIncidentDialog
                incident={mediaPipeIncident}
                onDismiss={dismissMediaPipeIncident}
            />

            {hasPassage ? (
                <ExamAttemptPassageSheet
                    isOpen={isCompactPassageOpen}
                    onOpenChange={setIsCompactPassageOpen}
                    title={currentContext.title}
                    description={currentContext.description}
                    body={currentContext.body}
                />
            ) : null}

            <ExamAttemptRuntimeSecurity
                isSubmitDialogOpen={isSubmitDialogOpen}
                onOpenChangeSubmitDialog={setIsSubmitDialogOpen}
                unansweredCount={unansweredCount}
                unansweredQuestionLabels={unansweredQuestionLabels}
                isRedirectingToTurnIn={isRedirectingToTurnIn}
                onProceedToTurnIn={proceedToTurnInReview}
                securityLockReason={securityLockReason}
                isResumingExam={isResumingExam}
                onResumeExam={resumeSecuredExam}
            />

            {mediaPipeErrorMessage ? (
                <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {mediaPipeErrorMessage}
                </div>
            ) : null}

            {audioErrorMessage ? (
                <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {audioErrorMessage}
                </div>
            ) : null}

            <div className="bg-background flex min-h-0 flex-1 overflow-hidden">
                <ExamAttemptShell
                    mode="runtime"
                    title={exam?.title ?? 'Exam attempt'}
                    timerLabel={formatTimer(secondsRemaining)}
                    status={
                        <>
                            <Badge
                                variant="outline"
                                className="hidden rounded-md px-2.5 py-1 text-[11px] sm:inline-flex sm:px-3 sm:text-xs"
                            >
                                Question {questions.length ? safeQuestionIndex + 1 : 0} of{' '}
                                {questions.length}
                            </Badge>
                            {isMediaPipeEnabled && !config.isProduction ? (
                                <Badge
                                    variant={mediaPipePhase === 'running' ? 'default' : 'outline'}
                                    className="rounded-md px-2.5 py-1 text-[11px] sm:px-3 sm:text-xs"
                                >
                                    MediaPipe {mediaPipeAnalysis?.status ?? mediaPipePhase}
                                </Badge>
                            ) : null}
                            {isAudioMonitoringEnabled && !config.isProduction ? (
                                <Badge
                                    variant={
                                        audioMonitoringPhase === 'running'
                                            ? 'default'
                                            : audioMonitoringPhase === 'warning'
                                              ? 'destructive'
                                              : 'outline'
                                    }
                                    className={`rounded-md px-2.5 py-1 text-[11px] sm:px-3 sm:text-xs ${audioMonitoringPhase === 'warning' ? 'animate-pulse border-transparent bg-amber-500 text-white hover:bg-amber-600' : ''}`}
                                >
                                    Audio{' '}
                                    {audioMonitoringPhase === 'warning'
                                        ? 'reconnecting'
                                        : audioMonitoringPhase}
                                </Badge>
                            ) : null}
                        </>
                    }
                    toolbar={
                        <ExamAttemptRuntimeHeader
                            answeredCount={answeredCount}
                            totalQuestions={questions.length}
                            flaggedCount={reviewQuestionIds.length}
                            showPassagePanel={showPassagePanel}
                            onTogglePassagePanel={() => setShowPassagePanel((c) => !c)}
                            onToggleCompactPassage={() => setIsCompactPassageOpen((c) => !c)}
                            hasPassage={hasPassage}
                            onSubmit={handleSubmit}
                            isSubmitting={isRedirectingToTurnIn}
                        />
                    }
                    questionRail={
                        <ExamAttemptRuntimeNavigation
                            questions={questions}
                            currentQuestionIndex={safeQuestionIndex}
                            onQuestionSelect={setCurrentQuestionIndex}
                            answeredQuestionIds={answeredQuestionIds}
                            reviewQuestionIds={reviewQuestionIds}
                        />
                    }
                    passagePanel={
                        hasPassage && showPassagePanel && currentQuestion ? (
                            <ExamAttemptRuntimePassage
                                showPassagePanel={showPassagePanel}
                                currentQuestion={currentQuestion}
                                currentContext={currentContext}
                            />
                        ) : undefined
                    }
                    footer={
                        <ExamAttemptRuntimeFooter
                            progress={progress}
                            isFlagged={isCurrentQuestionFlagged}
                            onMove={moveQuestionIndex}
                            currentQuestionIndex={safeQuestionIndex}
                            totalQuestions={questions.length}
                            isLastQuestion={safeQuestionIndex === questions.length - 1}
                            onSubmit={handleSubmit}
                            isSubmitting={isRedirectingToTurnIn}
                        />
                    }
                >
                    {currentQuestion ? (
                        <ExamAttemptRuntimeQuestion
                            currentQuestion={currentQuestion}
                            selectedAnswer={selectedAnswers[currentQuestion.id]}
                            onAnswerChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                            isFlagged={isCurrentQuestionFlagged}
                            onToggleFlag={() => handleToggleReview(currentQuestion.id)}
                            crossOutEnabled={crossOutEnabled}
                            onToggleCrossOutMode={() => setCrossOutEnabled((c) => !c)}
                            crossedOutOptions={crossedOutOptions[currentQuestion.id] ?? []}
                            onToggleOptionCrossOut={(idx) =>
                                handleToggleCrossOutOption(currentQuestion.id, idx)
                            }
                        />
                    ) : (
                        <div className="border-border/60 text-muted-foreground border border-dashed px-6 py-8 text-sm leading-7">
                            This exam does not have any questions assigned yet.
                        </div>
                    )}
                </ExamAttemptShell>
            </div>
        </div>
    );
}
