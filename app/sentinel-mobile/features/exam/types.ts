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
