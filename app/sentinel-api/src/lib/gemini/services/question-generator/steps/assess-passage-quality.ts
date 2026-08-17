import type { GenerateQuestionPreviewConfig } from '@sentinel/shared';
import type { QuestionGeneratorLlmProvider } from '../types';
import type { ReconciledSlot } from './reconcile-question-slots';
import { validateGeneratedPassage } from '../../question-normalizer/passage-leak-validator';
import {
    buildPassageQualityCriticPrompt,
    buildPassageQualityCriticSchema,
} from '../../prompt-builder/passage-quality-prompts';
import { runWithConcurrencyLimit } from '../utils/concurrency';
import { z } from 'zod';

const CRITIC_BATCH_SIZE = 20;
const CRITIC_CONCURRENCY_LIMIT = 4;

export interface AssessPassageQualityResult {
    passedSlots: Array<{ slotId: string; type: string; question: any }>;
    failedSlots: Array<{
        slotId: string;
        type: string;
        question: any;
        violations: string[];
        reasons: string[];
    }>;
}

const criticResponseSchema = z.object({
    evaluations: z.array(
        z.object({
            slotId: z.string(),
            leaksAnswer: z.boolean(),
            answerableFromPassage: z.boolean(),
            reasonCode: z.string(),
            reason: z.string(),
        }),
    ),
});

/**
 * Step 6: Evaluates generated passages for leakage and answerability.
 * Runs deterministic validation first, then sends survivors through a batched Gemini critic.
 */
export async function assessPassageQuality(
    slots: ReconciledSlot[],
    config: GenerateQuestionPreviewConfig,
    model: string,
    provider: QuestionGeneratorLlmProvider,
): Promise<AssessPassageQualityResult> {
    const passedSlots: AssessPassageQualityResult['passedSlots'] = [];
    const failedSlots: AssessPassageQualityResult['failedSlots'] = [];

    const survivors: ReconciledSlot[] = [];

    // 1. Run deterministic checks first
    for (const slot of slots) {
        if (!slot.question) {
            // Already missing / nil slot
            failedSlots.push({
                slotId: slot.slotId,
                type: slot.type,
                question: null,
                violations: ['MISSING_ITEM'],
                reasons: ['No question was assigned to this slot.'],
            });
            continue;
        }

        const detResult = validateGeneratedPassage(
            slot.type,
            slot.question.content,
            slot.question.passageContent,
        );
        if (!detResult.isValid) {
            failedSlots.push({
                slotId: slot.slotId,
                type: slot.type,
                question: slot.question,
                violations: detResult.violations.map((v) => v.code),
                reasons: detResult.violations.map((v) => v.message),
            });
        } else {
            survivors.push(slot);
        }
    }

    // 2. Run the critic in small concurrent batches. Large critic responses are more
    // likely to omit slot IDs and take substantially longer to decode.
    if (survivors.length > 0) {
        const responseJsonSchema = buildPassageQualityCriticSchema();
        const criticTasks: Array<() => Promise<z.infer<typeof criticResponseSchema>>> = [];

        for (let offset = 0; offset < survivors.length; offset += CRITIC_BATCH_SIZE) {
            const batch = survivors.slice(offset, offset + CRITIC_BATCH_SIZE);
            criticTasks.push(async () => {
                const prompt = buildPassageQualityCriticPrompt(
                    batch.map((slot) => ({
                        slotId: slot.slotId,
                        type: slot.type,
                        prompt: String(slot.question.content?.prompt || ''),
                        questionContent: slot.question.content,
                        correctAnswer:
                            slot.question.content?.correctAnswer ??
                            slot.question.content?.acceptedAnswers ??
                            slot.question.content?.blanks ??
                            '',
                        passageContent: slot.question.passageContent,
                        sourceEvidence: slot.question.sourceEvidence || '',
                    })),
                );
                const criticOutput = await provider.generateStructuredJson<unknown>({
                    model,
                    prompt,
                    responseJsonSchema,
                });

                return criticResponseSchema.parse(criticOutput);
            });
        }

        const criticResults = await runWithConcurrencyLimit(criticTasks, CRITIC_CONCURRENCY_LIMIT);
        const failedBatch = criticResults.find(
            (result): result is PromiseRejectedResult => result.status === 'rejected',
        );

        if (failedBatch) {
            console.error('Critic model call failed:', failedBatch.reason);
            throw failedBatch.reason;
        }

        const evaluations = criticResults.flatMap((result) =>
            result.status === 'fulfilled' ? result.value.evaluations : [],
        );

        for (const slot of survivors) {
            const evals = evaluations.filter((e) => e.slotId === slot.slotId);

            if (evals.length === 1) {
                const evaluation = evals[0];
                const violations: string[] = [];
                const reasons: string[] = [];

                if (evaluation.leaksAnswer) {
                    violations.push('SEMANTIC_LEAK');
                    reasons.push(`Critic flagged answer leak: ${evaluation.reason}`);
                }
                if (!evaluation.answerableFromPassage) {
                    violations.push('UNANSWERABLE_PASSAGE');
                    reasons.push(`Critic flagged unanswerable: ${evaluation.reason}`);
                }

                if (violations.length > 0) {
                    failedSlots.push({
                        slotId: slot.slotId,
                        type: slot.type,
                        question: slot.question,
                        violations,
                        reasons,
                    });
                } else {
                    passedSlots.push({
                        slotId: slot.slotId,
                        type: slot.type,
                        question: slot.question,
                    });
                }
            } else {
                // Fail closed if missing, duplicate, or malformed result for this slot
                failedSlots.push({
                    slotId: slot.slotId,
                    type: slot.type,
                    question: slot.question,
                    violations: ['CRITIC_FAIL_CLOSED'],
                    reasons: ['Critic returned missing or duplicate slot evaluation.'],
                });
            }
        }
    }

    return {
        passedSlots,
        failedSlots,
    };
}
