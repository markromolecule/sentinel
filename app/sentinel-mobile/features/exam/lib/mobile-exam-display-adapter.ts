import type { Exam } from '@sentinel/shared/types';
import type { MobileDifficulty, MobileExamDisplay } from './mobile-exam-adapter.types';
import { resolveStudentExamMediaPipeSandbox } from './mobile-exam-mediapipe-adapter';

const DEFAULT_INSTRUCTIONS = [
    'Review the privacy and readiness steps before joining the live session.',
    'Stay inside the app while the exam is active.',
    'Keep camera and microphone access available when required.',
    'Submit your answers before the timer ends.',
];

export function toDisplayDifficulty(value?: Exam['difficulty']): MobileDifficulty {
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

export function buildInstructions(exam: Exam): string[] {
    const instructions = [...DEFAULT_INSTRUCTIONS];

    if (exam.configuration?.lobbyAdmissionMode === 'INSTRUCTOR_GATED') {
        instructions.unshift('Wait for instructor approval in the lobby before entering.');
    }

    if (exam.configuration?.mobileSecurity?.prevent_backgrounding) {
        instructions.push('Backgrounding the app may be flagged by the proctoring policy.');
    }

    return instructions;
}

/**
 * Converts a raw API exam object into a lightweight display model for the
 * mobile exam list and lobby screens, automatically resolving MediaPipe sandbox settings.
 */
export function adaptExamForMobile(exam: Exam): MobileExamDisplay {
    const questionCount =
        exam.questionCount ??
        (Array.isArray(exam.questions) ? exam.questions.length : 0);

    const resolvedMediaPipeSandbox = resolveStudentExamMediaPipeSandbox({
        configuration: exam.configuration,
        mediaPipeSandbox: exam.mediaPipeSandbox,
    });

    return {
        ...exam,
        mediaPipeSandbox: resolvedMediaPipeSandbox,
        professor: exam.professor || 'Instructor',
        questions: questionCount,
        passingPercentage: exam.passingScore,
        difficulty: toDisplayDifficulty(exam.difficulty),
        instructions: buildInstructions(exam),
        startDate:
            exam.scheduledDate || (exam as any).startDate || (exam as any).scheduledStartDate,
        scheduledStartDate:
            (exam as any).scheduledStartDate || exam.scheduledDate || (exam as any).startDate,
    };
}
