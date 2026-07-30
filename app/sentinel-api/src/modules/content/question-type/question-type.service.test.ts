import { describe, expect, it } from 'vitest';
import { QuestionTypeService } from './question-type.service';
import type { QuestionType } from '@sentinel/shared/types';

describe('QuestionTypeService', () => {
    it('returns the complete ordered catalog of 8 question types with correct labels, descriptions, and instructions', () => {
        const types = QuestionTypeService.getQuestionTypes();

        expect(types).toHaveLength(8);

        const expectedMetadata: Record<
            QuestionType,
            { label: string; instruction: string }
        > = {
            MULTIPLE_CHOICE: {
                label: 'Multiple Choice',
                instruction: 'Select the best answer from the choices provided.',
            },
            MULTIPLE_RESPONSE: {
                label: 'Multiple Response',
                instruction: 'Select all answers that apply for each question.',
            },
            TRUE_FALSE: {
                label: 'True or False',
                instruction: 'Determine whether each statement is true or false.',
            },
            IDENTIFICATION: {
                label: 'Identification',
                instruction: 'Write the correct term, concept, or short answer.',
            },
            MATCHING: {
                label: 'Matching Type',
                instruction: 'Match each item with its correct corresponding answer.',
            },
            ESSAY: {
                label: 'Essay',
                instruction: 'Answer each question clearly and completely.',
            },
            FILL_BLANK: {
                label: 'Fill in the Blank',
                instruction: 'Complete each statement with the correct word or phrase.',
            },
            ENUMERATION: {
                label: 'Enumeration',
                instruction: 'List all required answers for each question.',
            },
        };

        types.forEach((typeDef) => {
            const expected = expectedMetadata[typeDef.value];
            expect(expected).toBeDefined();
            expect(typeDef.label).toBe(expected.label);
            expect(typeDef.instruction).toBe(expected.instruction);
            expect(typeDef.description).toBeTruthy();
            expect(typeDef.defaultContent).toBeDefined();
        });
    });

    it('returns individual question type definitions correctly', () => {
        const tfDef = QuestionTypeService.getQuestionType('TRUE_FALSE');
        expect(tfDef.value).toBe('TRUE_FALSE');
        expect(tfDef.label).toBe('True or False');
        expect(tfDef.instruction).toBe('Determine whether each statement is true or false.');
    });
});
