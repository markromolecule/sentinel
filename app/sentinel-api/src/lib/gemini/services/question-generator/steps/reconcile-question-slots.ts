import type { GenerateQuestionPreviewConfig, QuestionType } from '@sentinel/shared';
import { getQuestionTypeDistribution } from '../../prompt-builder';

export interface ReconciledSlot {
    slotId: string;
    type: QuestionType;
    question: any | null;
}

export interface ReconciliationResult {
    slots: ReconciledSlot[];
    deficits: Array<{ type: string; count: number }>;
    excess: any[];
}

/**
 * Reconciles a list of normalized questions against the configured question type distribution.
 * Establishes stable slot assignments by matching question types in order.
 * Identifies deficits and excess items.
 */
export function reconcileQuestionSlots(
    normalizedQuestions: any[],
    config: GenerateQuestionPreviewConfig,
): ReconciliationResult {
    const distribution = getQuestionTypeDistribution(config);

    // Derive ordered slots
    const slots: ReconciledSlot[] = [];
    let slotCounter = 0;
    for (const dist of distribution) {
        for (let i = 0; i < dist.count; i++) {
            slots.push({
                slotId: `slot-${slotCounter++}`,
                type: dist.type,
                question: null,
            });
        }
    }

    const unassigned = [...normalizedQuestions];

    // Assign questions to slots of matching type
    for (const slot of slots) {
        const matchingIndex = unassigned.findIndex((q) => q.type === slot.type);
        if (matchingIndex !== -1) {
            slot.question = unassigned[matchingIndex];
            unassigned.splice(matchingIndex, 1);
        }
    }

    // Compute deficits per type
    const deficits: Array<{ type: string; count: number }> = [];
    for (const dist of distribution) {
        const assignedCount = slots.filter(
            (s) => s.type === dist.type && s.question !== null,
        ).length;
        const deficitCount = dist.count - assignedCount;
        if (deficitCount > 0) {
            deficits.push({
                type: dist.type,
                count: deficitCount,
            });
        }
    }

    return {
        slots,
        deficits,
        excess: unassigned,
    };
}
