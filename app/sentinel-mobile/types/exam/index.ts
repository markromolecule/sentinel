import { type Exam } from '@/data/exams';

// ─── Utility Types ───

export type ThemeColors = {
     text: string;
     background: string;
     tint: string;
     icon: string;
     tabIconDefault: string;
     tabIconSelected: string;
     primary: string;
     input: string;
     border: string;
     card: string;
};

export type DifficultyConfig = {
     color: string;
     bg: string;
};

// ─── Hook Return Type ───

export type UseExamDetailsReturn = {
     exam: Exam | undefined;
     colors: ThemeColors;
     isDark: boolean;
     difficultyConfig: DifficultyConfig;
     insets: { top: number; bottom: number };
     handleStartExam: () => void;
     handleOptOut: () => void;
};

// ─── Component Props ───

export type HeroHeaderProps = {
     exam: Exam;
     isDark: boolean;
     colors: ThemeColors;
     insetTop: number;
     onBack: () => void;
};

export type QuickInfoBarProps = {
     duration: number;
     questions: number;
     passingPercentage: number;
     colors: ThemeColors;
};

export type DifficultyBadgeProps = {
     difficulty: Exam['difficulty'];
     config: DifficultyConfig;
};

export type AboutSectionProps = {
     description: string;
     isDark: boolean;
     colors: ThemeColors;
};

export type InstructionsListProps = {
     instructions: string[];
     isDark: boolean;
     colors: ThemeColors;
};

export type BottomCTAProps = {
     colors: ThemeColors;
     onPress: () => void;
};

export type ExamNotFoundProps = {
     colors: ThemeColors;
     onGoBack: () => void;
};

// ─── Consent Types ───

export type ConsentItem = {
     label: string;
     key: string;
     checked: boolean;
};

export type UseExamConsentReturn = {
     exam: Exam | undefined;
     colors: ThemeColors;
     isDark: boolean;
     insets: { top: number; bottom: number };
     cameraGranted: boolean;
     micGranted: boolean;
     agreements: ConsentItem[];
     allAccepted: boolean;
     toggleCamera: () => void;
     toggleMic: () => void;
     toggleAgreement: (index: number) => void;
     handleGoBack: () => void;
     handleContinue: () => void;
};

export type ConsentHeaderProps = {
     examTitle: string;
     isDark: boolean;
     colors: ThemeColors;
     insetTop: number;
     onBack: () => void;
};

export type PermissionCardProps = {
     icon: 'camera' | 'mic';
     title: string;
     description: string;
     granted: boolean;
     onToggle: () => void;
     colors: ThemeColors;
     isDark: boolean;
};

export type ConsentAgreementsProps = {
     agreements: ConsentItem[];
     onToggle: (index: number) => void;
     colors: ThemeColors;
     isDark: boolean;
};

export type ConsentCTAProps = {
     colors: ThemeColors;
     enabled: boolean;
     onPress: () => void;
};

// ─── Check-Up Types ───

export type CameraFacing = 'front' | 'back';

export type UseExamCheckupReturn = {
     exam: Exam | undefined;
     colors: ThemeColors;
     isDark: boolean;
     insets: { top: number; bottom: number };
     cameraFacing: CameraFacing;
     cameraReady: boolean;
     micLevel: number;
     micDetected: boolean;
     onCameraReady: () => void;
     flipCamera: () => void;
     handleGoBack: () => void;
     handleStartExam: () => void;
};

export type CheckupHeaderProps = {
     examTitle: string;
     isDark: boolean;
     colors: ThemeColors;
     insetTop: number;
     onBack: () => void;
};

export type CameraPreviewProps = {
     cameraFacing: CameraFacing;
     cameraReady: boolean;
     onCameraReady: () => void;
     onFlip: () => void;
     colors: ThemeColors;
     isDark: boolean;
};

export type MicLevelMeterProps = {
     level: number;
     detected: boolean;
     colors: ThemeColors;
     isDark: boolean;
};

export type CheckupCTAProps = {
     colors: ThemeColors;
     onPress: () => void;
};

// ─── Session Types ───

export type Question = {
     id: string;
     questionNumber: number;
     text: string;
     options: string[];
     correctAnswer: string;
     explanation?: string;
};

export type UseExamSessionReturn = {
     exam: Exam | undefined;
     colors: ThemeColors;
     isDark: boolean;
     insets: { top: number; bottom: number };
     questions: Question[];
     currentQuestionIndex: number;
     answers: Record<string, string>;
     drawerOpen: boolean;
     timeRemaining: number;
     isFirst: boolean;
     isLast: boolean;
     goToQuestion: (index: number) => void;
     handleAnswer: (questionId: string, answer: string) => void;
     toggleDrawer: () => void;
     handleNext: () => void;
     handlePrev: () => void;
     handleSubmit: () => void;
     timeUp: boolean;
};

export type SessionHeaderProps = {
     examTitle: string;
     isDark: boolean;
     colors: ThemeColors;
     insetTop: number;
     timeRemaining: number;
     onBack: () => void;
};

export type QuestionCardProps = {
     question: Question;
     selectedAnswer: string;
     onAnswer: (answer: string) => void;
     colors: ThemeColors;
     isDark: boolean;
};

export type QuestionDrawerProps = {
     questions: Question[];
     answers: Record<string, string>;
     onSelectQuestion: (index: number) => void;
     onClose: () => void;
     colors: ThemeColors;
     isDark: boolean;
};

export type SessionFooterProps = {
     onPrev: () => void;
     onNext: () => void;
     onToggleDrawer: () => void;
     isFirst: boolean;
     isLast: boolean;
     currentIndex: number;
     totalQuestions: number;
     colors: ThemeColors;
     isDark: boolean;
};
