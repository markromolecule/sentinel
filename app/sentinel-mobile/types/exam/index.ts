import type { MobileExamDisplay } from '@/features/exam/lib/mobile-exam-adapter';

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
    exam: MobileExamDisplay | undefined;
    isLoading: boolean;
    isError: boolean;
    canStartExam: boolean;
    startLabel: string;
    isReadOnlyExam: boolean;
    colors: ThemeColors;
    isDark: boolean;
    difficultyConfig: DifficultyConfig;
    insets: { top: number; bottom: number };
    handleStartExam: () => void;
    handleOptOut: () => void;
};

// ─── Component Props ───

export type HeroHeaderProps = {
    exam: MobileExamDisplay;
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
    difficulty: MobileExamDisplay['difficulty'];
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
    onPress: () => void | Promise<void>;
    label?: string;
    disabled?: boolean;
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
    exam: MobileExamDisplay | undefined;
    colors: ThemeColors;
    isDark: boolean;
    insets: { top: number; bottom: number };
    cameraGranted: boolean;
    micGranted: boolean;
    requiresCamera: boolean;
    requiresMicrophone: boolean;
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
    exam: MobileExamDisplay | undefined;
    colors: ThemeColors;
    isDark: boolean;
    insets: { top: number; bottom: number };
    cameraFacing: CameraFacing;
    cameraReady: boolean;
    hasCameraPermission: boolean;
    isPermissionLoading: boolean;
    requestCameraPermission: () => Promise<any>;
    micLevel: number;
    micDetected: boolean;
    requiresCamera: boolean;
    requiresMicrophone: boolean;
    isStartingSession: boolean;
    onCameraReady: () => void;
    onCameraMountError: (error: any) => void;
    flipCamera: () => void;
    handleGoBack: () => void;
    handleStartExam: () => Promise<void>;
    calibrationProgress: number;
    isCalibrated: boolean;
    calibrationFeedback: string | null;
    calibrationProfile: any | null;
    isFaceCentered: boolean;
    handleLandmarksDetected?: (landmarksByFace: any[][], confidenceScore: number) => void;
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
    hasPermission?: boolean;
    isPermissionLoading?: boolean;
    onRequestPermission?: () => void;
    onCameraReady: () => void;
    onCameraMountError?: (error: any) => void;
    onFlip: () => void;
    colors: ThemeColors;
    isDark: boolean;
    calibrationProgress?: number;
    isCalibrated?: boolean;
    calibrationFeedback?: string | null;
    isFaceCentered?: boolean;
    onLandmarksDetected?: (landmarksByFace: any[][], confidenceScore: number) => void;
};

export type MicLevelMeterProps = {
    level: number;
    detected: boolean;
    colors: ThemeColors;
    isDark: boolean;
};

export type CheckupCTAProps = {
    colors: ThemeColors;
    isLoading?: boolean;
    onPress: () => void | Promise<void>;
    disabled?: boolean;
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
    exam: MobileExamDisplay | undefined;
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
