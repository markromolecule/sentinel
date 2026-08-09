import { scoreExamAttempt } from '@sentinel/shared';
import type {
    Exam,
    ExamAttemptAnswers,
    ExamAttemptScoreSummary,
    ExamQuestion,
    QuestionType,
} from '@sentinel/shared/types';

type MobileDifficulty = 'Easy' | 'Medium' | 'Hard';

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
    options: {
        id: string;
        text: string;
    }[];
    originalContent: ExamQuestion['content'];
};

const DEFAULT_INSTRUCTIONS = [
    'Review the privacy and readiness steps before joining the live session.',
    'Stay inside the app while the exam is active.',
    'Keep camera and microphone access available when required.',
    'Submit your answers before the timer ends.',
];

function toDisplayDifficulty(value?: Exam['difficulty']): MobileDifficulty {
    switch (value) {
        case 'easy':
            return 'Easy';
        case 'hard':
            return 'Hard';
        case 'medium':
        default:
            return 'Medium';
    }
}

function buildInstructions(exam: Exam): string[] {
    const instructions = [...DEFAULT_INSTRUCTIONS];

    if (exam.configuration?.lobbyAdmissionMode === 'INSTRUCTOR_GATED') {
        instructions.unshift('Wait for instructor approval in the lobby before entering.');
    }

    if (exam.configuration?.mobileSecurity.prevent_backgrounding) {
        instructions.push('Backgrounding the app may be flagged by the proctoring policy.');
    }

    return instructions;
}

export function adaptExamForMobile(exam: Exam): MobileExamDisplay {
    return {
        ...exam,
        professor: exam.professor || 'Instructor',
        questions: exam.questionCount ?? exam.questions?.length ?? 0,
        passingPercentage: exam.passingScore,
        difficulty: toDisplayDifficulty(exam.difficulty),
        instructions: buildInstructions(exam),
        startDate: exam.scheduledDate || (exam as any).startDate || (exam as any).scheduledStartDate,
        scheduledStartDate: (exam as any).scheduledStartDate || exam.scheduledDate || (exam as any).startDate,
    };
}

function getQuestionOptionValues(question: ExamQuestion) {
    if (question.type === 'TRUE_FALSE') {
        return ['True', 'False'];
    }

    if (Array.isArray(question.content.options) && question.content.options.length > 0) {
        return question.content.options;
    }

    return [];
}

export function adaptExamQuestionsForMobile(exam: Exam): MobileSessionQuestion[] {
    const questions = exam.questions ?? [];

    return [...questions]
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map((question) => {
            const optionValues = getQuestionOptionValues(question);

            return {
                id: question.id,
                text: question.content.prompt,
                type: question.type,
                points: question.points,
                options: optionValues.map((text, index) => ({
                    id: String.fromCharCode(65 + index),
                    text,
                })),
                originalContent: question.content,
            };
        });
}

export function buildSessionAnswerPayload(
    questions: MobileSessionQuestion[],
    selectedOptionIds: Record<string, string>,
): ExamAttemptAnswers {
    const answerEntries = questions.flatMap((question) => {
        const selectedOptionId = selectedOptionIds[question.id];

        if (!selectedOptionId) {
            return [];
        }

        const selectedOption = question.options.find((option) => option.id === selectedOptionId);

        if (!selectedOption) {
            return [];
        }

        return [[question.id, selectedOption.text] as const];
    });

    return Object.fromEntries(answerEntries);
}

export function buildExamResultPreview(args: {
    questions: MobileSessionQuestion[];
    answers: Record<string, string>;
    elapsedSeconds: number;
    sessionId: string;
}): {
    summary: ExamAttemptScoreSummary;
    answers: ExamAttemptAnswers;
    elapsedSeconds: number;
    sessionId: string;
} {
    const answerPayload = buildSessionAnswerPayload(args.questions, args.answers);

    // Use shared scoring logic
    const summary = scoreExamAttempt({
        questions: args.questions.map((q) => ({
            id: q.id,
            type: q.type,
            points: q.points,
            content: q.originalContent,
        })) as unknown as ExamQuestion[],
        answers: answerPayload,
    });

    return {
        summary,
        answers: answerPayload,
        elapsedSeconds: args.elapsedSeconds,
        sessionId: args.sessionId,
    };
}
