import type { MobileSessionQuestion } from '@/features/exam/lib/mobile-exam-adapter';

export interface QuestionCardTheme {
    text: string;
    icon: string;
    card: string;
    primary: string;
    border: string;
    background?: string;
}

export interface QuestionCardProps {
    question: MobileSessionQuestion | null | undefined;
    currentIndex: number;
    totalQuestions: number;
    /** Answer value for single-select, multi-select, array, object, or text. */
    selectedOptionId?: any;
    isFlagged: boolean;
    onSelectOption: (optionId: any) => void;
    onToggleFlag: () => void;
}

export interface BaseInputProps {
    colors: QuestionCardTheme;
    isDark: boolean;
    onSelectOption: (optionId: any) => void;
}
