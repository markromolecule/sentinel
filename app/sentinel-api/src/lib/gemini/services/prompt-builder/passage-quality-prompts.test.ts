import { describe, expect, it } from 'vitest';
import {
    buildPassageQualityCriticPrompt,
    buildPassageQualityCriticSchema,
    buildPassageRepairPrompt,
    buildPassageRepairSchema,
} from './passage-quality-prompts';

describe('PassageQualityPrompts', () => {
    describe('buildPassageQualityCriticPrompt', () => {
        it('includes all relevant slot fields', () => {
            const slots = [
                {
                    slotId: 'slot-1',
                    type: 'MULTIPLE_CHOICE',
                    prompt: 'What is 2+2?',
                    correctAnswer: '4',
                    passageContent: 'This is a math passage.',
                    sourceEvidence: 'Verbatim evidence.',
                },
            ];

            const prompt = buildPassageQualityCriticPrompt(slots);
            expect(prompt).toContain('slot-1');
            expect(prompt).toContain('MULTIPLE_CHOICE');
            expect(prompt).toContain('What is 2+2?');
            expect(prompt).toContain('4');
            expect(prompt).toContain('This is a math passage.');
            expect(prompt).toContain('Verbatim evidence.');
        });
    });

    describe('buildPassageQualityCriticSchema', () => {
        it('has correct Zod/JSON schema structure', () => {
            const schema = buildPassageQualityCriticSchema();
            expect(schema.type).toBe('object');
            expect(schema.required).toContain('evaluations');
            expect(schema.properties.evaluations.type).toBe('array');

            const itemProps = schema.properties.evaluations.items.properties;
            expect(itemProps.slotId).toBeDefined();
            expect(itemProps.leaksAnswer).toBeDefined();
            expect(itemProps.answerableFromPassage).toBeDefined();
            expect(itemProps.reasonCode).toBeDefined();
            expect(itemProps.reason).toBeDefined();
        });
    });

    describe('buildPassageRepairPrompt', () => {
        it('includes violations and repair instructions', () => {
            const prompt = buildPassageRepairPrompt({
                slotId: 'slot-2',
                type: 'MULTIPLE_CHOICE',
                prompt: 'What is 3+3?',
                correctAnswer: '6',
                passageContent: 'Leaks answer 6.',
                sourceEvidence: 'Evidence content.',
                violations: ['ANSWER_EXACT_MATCH'],
                sourceFiles: ['algebra.pdf'],
            });

            expect(prompt).toContain('Repair the generated question for slot "slot-2"');
            expect(prompt).toContain('ANSWER_EXACT_MATCH');
            expect(prompt).toContain('Leaks answer 6.');
            expect(prompt).toContain('algebra.pdf');
        });
    });

    describe('buildPassageRepairSchema', () => {
        it('constrains repair output to standard question fields', () => {
            const schema = buildPassageRepairSchema({
                type: 'MULTIPLE_CHOICE',
                difficulty: 'MODERATE',
            });

            expect(schema.type).toBe('object');
            expect(schema.properties.passageContent).toBeDefined();
            expect(schema.properties.sourceEvidence).toBeDefined();
            expect(schema.properties.difficulty.enum).toEqual(['MODERATE']);
            expect(schema.required).toContain('passageContent');
        });
    });
});
