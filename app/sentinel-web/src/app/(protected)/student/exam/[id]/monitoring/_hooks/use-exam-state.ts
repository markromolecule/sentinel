"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Question } from "../_types";

interface UseExamStateOptions {
  questions: Question[];
}

export function useExamState({ questions }: UseExamStateOptions) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / totalQuestions) * 100;

  const handleAnswer = useCallback((questionId: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }, []);

  const toggleFlag = useCallback((index: number) => {
    setFlaggedQuestions((prev) => {
      const newFlags = new Set(prev);
      if (newFlags.has(index)) {
        newFlags.delete(index);
      } else {
        newFlags.add(index);
      }
      return newFlags;
    });
  }, []);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentQuestionIndex(index);
    }
  }, [totalQuestions]);

  const goNext = useCallback(() => {
    setCurrentQuestionIndex((i) => Math.min(totalQuestions - 1, i + 1));
  }, [totalQuestions]);

  const goPrevious = useCallback(() => {
    setCurrentQuestionIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleSubmit = useCallback(() => {
    const unansweredCount = totalQuestions - answeredCount;
    if (unansweredCount > 0) {
      toast.warning(`You have ${unansweredCount} unanswered questions!`, {
        description: "Are you sure you want to submit?",
      });
    }
    toast.promise(new Promise((r) => setTimeout(r, 2000)), {
      loading: "Submitting exam...",
      success: "Exam submitted successfully!",
      error: "Submission failed.",
    });
    setTimeout(() => router.push("/student/history"), 2500);
  }, [totalQuestions, answeredCount, router]);

  return {
    currentQuestionIndex,
    currentQuestion,
    answers,
    flaggedQuestions,
    progress,
    totalQuestions,
    answeredCount,
    handleAnswer,
    toggleFlag,
    goToQuestion,
    goNext,
    goPrevious,
    handleSubmit,
  };
}
