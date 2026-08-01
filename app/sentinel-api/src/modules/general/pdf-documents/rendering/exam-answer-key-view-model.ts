export type QuestionType =
    | 'MULTIPLE_CHOICE'
    | 'MULTIPLE_SELECT'
    | 'TRUE_FALSE'
    | 'SHORT_ANSWER'
    | 'ESSAY'
    | 'FILL_IN_BLANK'
    | 'MATCHING'
    | 'ORDERING';

export interface QuestionOption {
    optionId: string;
    optionText: string;
    isCorrect?: boolean;
}

export interface MatchingPair {
    premise: string;
    response: string;
}

export interface EssayRubricItem {
    criterion: string;
    maxPoints: number;
    description?: string;
}

export interface QuestionViewModel {
    questionId: string;
    type: QuestionType;
    points: number;
    text: string; // Plain or HTML formatting
    passageText?: string | null; // Associated reading passage
    imageUrl?: string | null; // Associated diagram/image

    // Type-specific answer details
    options?: QuestionOption[]; // MC, MS
    trueFalseAnswer?: boolean; // TF
    shortAnswerPattern?: string; // SA
    rubric?: EssayRubricItem[]; // Essay
    blankAnswers?: string[]; // FIB
    matchingPairs?: MatchingPair[]; // Matching
    orderedItems?: string[]; // Ordering
}

export interface ExamAnswerKeyData {
    examId: string;
    title: string;
    subjectCode: string;
    subjectName: string;
    durationMinutes: number;
    difficulty: string;
    passingScore: number;
    generatedAt: string;
    generatedBy: string;
    institutionName: string;
    questions: QuestionViewModel[];
}

/**
 * Normalizes answer key raw data to protect against null pointer exceptions,
 * and normalizes formatting and question properties before rendering.
 *
 * @param data input partial data
 * @returns validated, normalized view model
 */
export function normalizeExamAnswerKeyData(data: Partial<ExamAnswerKeyData>): ExamAnswerKeyData {
    const questions: QuestionViewModel[] = (data.questions || []).map((q, idx) => {
        const type = (q.type || 'MULTIPLE_CHOICE').toUpperCase() as QuestionType;

        return {
            questionId: q.questionId || `q-${idx}`,
            type,
            points: q.points ?? 1,
            text: q.text || 'Missing question text.',
            passageText: q.passageText || null,
            imageUrl: q.imageUrl || null,
            options: q.options?.map((opt, optIdx) => ({
                optionId: opt.optionId || `option-${optIdx + 1}`,
                optionText: opt.optionText || '',
                isCorrect: opt.isCorrect,
            })),
            trueFalseAnswer: q.trueFalseAnswer,
            shortAnswerPattern: q.shortAnswerPattern || '',
            rubric: q.rubric?.map((rub) => ({
                criterion: rub.criterion || 'Content Accuracy',
                maxPoints: rub.maxPoints ?? 5,
                description: rub.description || '',
            })),
            blankAnswers: q.blankAnswers || [],
            matchingPairs: q.matchingPairs?.map((pair) => ({
                premise: pair.premise || '',
                response: pair.response || '',
            })),
            orderedItems: q.orderedItems || [],
        };
    });

    return {
        examId: data.examId || 'unknown-exam',
        title: data.title || 'Exam Answer Key',
        subjectCode: data.subjectCode || 'GEN-101',
        subjectName: data.subjectName || 'General Course',
        durationMinutes: data.durationMinutes || 60,
        difficulty: data.difficulty || 'MEDIUM',
        passingScore: data.passingScore || 50,
        generatedAt: data.generatedAt || new Date().toISOString(),
        generatedBy: data.generatedBy || 'System',
        institutionName: data.institutionName || 'Sentinel Institution',
        questions,
    };
}
