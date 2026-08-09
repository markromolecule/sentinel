import { type ExamQuestion } from '@sentinel/shared';

/**
 * Sanitizes an exam question to prevent answer-key exposure during a student attempt.
 * Removes correctAnswer, correctBoolean, acceptedAnswers, and obfuscates blanks and pairs.
 *
 * @param question The exam question to sanitize.
 * @returns A new exam question object with sensitive answer data removed or sanitized.
 */
export function sanitizeQuestionForStudentAttempt(question: ExamQuestion): ExamQuestion {
    const sanitizedContent = { ...question.content };

    const originalAcceptedAnswers = question.content.acceptedAnswers;
    const originalBlanks = question.content.blanks;
    const originalPairs = question.content.pairs;

    // Remove direct correct answer fields
    delete sanitizedContent.correctAnswer;
    delete sanitizedContent.correctBoolean;
    delete sanitizedContent.acceptedAnswers;
    delete sanitizedContent.blanks;
    delete sanitizedContent.pairs;
    delete sanitizedContent.rubric;
    delete sanitizedContent.answerGuidance;
    delete sanitizedContent.guidance;

    if (question.type === 'FILL_BLANK') {
        if (Array.isArray(originalBlanks)) {
            sanitizedContent.blanks = originalBlanks.map(() => '');
        }
    } else if (question.type === 'MATCHING') {
        if (Array.isArray(originalPairs)) {
            sanitizedContent.pairs = originalPairs.map((pair) => ({
                left: pair.left,
                right: '',
            }));
        }
    } else if (question.type === 'ENUMERATION') {
        const count = Array.isArray(originalAcceptedAnswers)
            ? originalAcceptedAnswers.length
            : Array.isArray(originalBlanks)
              ? originalBlanks.length
              : 0;

        if (count > 0) {
            sanitizedContent.acceptedAnswers = Array(count).fill('');
            sanitizedContent.blanks = Array(count).fill('');
        }
    }

    return {
        ...question,
        content: sanitizedContent,
    };
}
