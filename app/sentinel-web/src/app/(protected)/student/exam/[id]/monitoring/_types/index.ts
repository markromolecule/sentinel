import { Exam } from "@sentinel/shared/src/types";

// --- Question Types ---
export interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
}

// --- Exam State Types ---
export interface ExamMonitoringState {
  currentQuestionIndex: number;
  answers: Record<number, number>;
  flaggedQuestions: Set<number>;
}

// --- Timer Types ---
export interface ExamTimerState {
  timeLeft: number;
  isLowTime: boolean;
}

// --- Monitoring Types ---
export interface ExamMonitoringData {
  tabSwitches: number;
  isMobile: boolean;
}

// --- Component Props ---
export interface ExamHeaderProps {
  exam: Exam;
  timeLeft: number;
  isLowTime: boolean;
  progress: number;
  formatTime: (seconds: number) => string;
  onSubmit: () => void;
}

export interface IntegrityAlertProps {
  tabSwitches: number;
}

export interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer?: number;
  isFlagged: boolean;
  onAnswer: (questionId: number, optionIndex: number) => void;
  onToggleFlag: () => void;
}

export interface QuestionNavigatorProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<number, number>;
  flaggedQuestions: Set<number>;
  onQuestionSelect: (index: number) => void;
}

export interface NavigationFooterProps {
  currentIndex: number;
  totalQuestions: number;
  answers: Record<number, number>;
  questions: Question[];
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export interface MobileNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}
