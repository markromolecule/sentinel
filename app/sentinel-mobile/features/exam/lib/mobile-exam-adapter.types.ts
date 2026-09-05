import type { Exam, ExamQuestion, QuestionType } from '@sentinel/shared/types';

export type MobileDifficulty = 'Easy' | 'Medium' | 'Hard';

export type MobileExamDisplay = Omit<Exam, 'questions' | 'difficulty'> & {
    professor: string;
    questions: number;
    passingPercentage: number;
    difficulty: MobileDifficulty;
    instructions: string[];
    startDate?: string;
    scheduledStartDate?: string;
};

export type MobileSessionQuestion = {
    id: string;
    text: string;
    type: QuestionType;
    points: number;
    /** Structured options for MULTIPLE_CHOICE, MULTIPLE_RESPONSE, and TRUE_FALSE. */
    options: {
        id: string;
        text: string;
    }[];
    /** Matching pairs for MATCHING questions. */
    pairs?: {
        left: string;
        right: string;
    }[];
    /** Expected blanks/items for FILL_BLANK and ENUMERATION questions. */
    blanks?: string[];
    /** Passage body text shown above the question, if any. */
    passage?: string | null;
    /** Passage title, if provided. */
    passageTitle?: string | null;
    /** Placeholder text for SHORT_ANSWER / ESSAY text inputs. */
    placeholder?: string;
    /** Maximum character length for SHORT_ANSWER / ESSAY inputs. */
    maxLength?: number;
    originalContent: ExamQuestion['content'];
};
