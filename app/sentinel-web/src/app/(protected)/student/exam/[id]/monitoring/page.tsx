"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { MOCK_EXAMS } from "../../../_constants";
import { MOCK_QUESTIONS } from "./_constants";
import { useExamTimer } from "./_hooks/use-exam-timer";
import { useExamMonitoring } from "./_hooks/use-exam-monitoring";
import { useExamState } from "./_hooks/use-exam-state";
import { ExamHeader } from "./_components/exam-header";
import { QuestionDisplay } from "./_components/question-display";
import { QuestionNavigator } from "./_components/question-navigator";
import { NavigationFooter } from "./_components/navigation-footer";
import { MobileNavigation } from "./_components/mobile-navigation";

export default function ExamMonitoringPage() {
     const params = useParams();

     // Core Exam Data
     const [examId] = useState(params.id as string);
     const [exam] = useState(() => MOCK_EXAMS.find((e) => e.id === examId) || MOCK_EXAMS[0]);

     // Custom Hooks
     const { timeLeft, formatTime, isLowTime } = useExamTimer(exam.duration * 60);
     useExamMonitoring(); // Still tracking but not displaying
     const {
          currentQuestionIndex,
          currentQuestion,
          answers,
          flaggedQuestions,
          progress,
          totalQuestions,
          handleAnswer,
          toggleFlag,
          goToQuestion,
          goNext,
          goPrevious,
          handleSubmit,
     } = useExamState({ questions: MOCK_QUESTIONS });

     return (
          <div className="flex flex-col min-h-screen bg-background">
               {/* Header */}
               <ExamHeader
                    exam={exam}
                    timeLeft={timeLeft}
                    isLowTime={isLowTime}
                    progress={progress}
                    formatTime={formatTime}
                    onSubmit={handleSubmit}
               />

               {/* Main Content */}
               <main className="flex-1 overflow-hidden flex flex-col">
                    <div className="container max-w-[1920px] flex-1 grid lg:grid-cols-12 gap-0 overflow-hidden px-0">
                         {/* Question Area */}
                         <div className="lg:col-span-9 xl:col-span-9 h-full overflow-y-auto flex flex-col p-4 sm:p-6 lg:p-10 scrollbar-thin">

                              <QuestionDisplay
                                   question={currentQuestion}
                                   questionNumber={currentQuestionIndex + 1}
                                   totalQuestions={totalQuestions}
                                   selectedAnswer={answers[currentQuestion.id]}
                                   isFlagged={flaggedQuestions.has(currentQuestionIndex)}
                                   onAnswer={handleAnswer}
                                   onToggleFlag={() => toggleFlag(currentQuestionIndex)}
                              />

                              <NavigationFooter
                                   currentIndex={currentQuestionIndex}
                                   totalQuestions={totalQuestions}
                                   answers={answers}
                                   questions={MOCK_QUESTIONS}
                                   onPrevious={goPrevious}
                                   onNext={goNext}
                                   onSubmit={handleSubmit}
                              />
                         </div>

                         {/* Sidebar Navigator */}
                         <QuestionNavigator
                              questions={MOCK_QUESTIONS}
                              currentIndex={currentQuestionIndex}
                              answers={answers}
                              flaggedQuestions={flaggedQuestions}
                              onQuestionSelect={goToQuestion}
                         />
                    </div>
               </main>

               {/* Mobile Navigation */}
               <MobileNavigation
                    currentIndex={currentQuestionIndex}
                    totalQuestions={totalQuestions}
                    onPrevious={goPrevious}
                    onNext={goNext}
                    onSubmit={handleSubmit}
               />
          </div>
     );
}