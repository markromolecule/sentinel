import { describe, expect, it } from 'vitest';
import { QuestionTypeService } from './question-type.service';
import type { QuestionType } from '@sentinel/shared/types';

describe('QuestionTypeService', () => {
    it('returns the complete ordered catalog of 8 question types with correct labels, descriptions, and instructions', () => {
        const types = QuestionTypeService.getQuestionTypes();

        expect(types).toHaveLength(8);

        const expectedMetadata: Record<QuestionType, { label: string; instruction: string }> = {
            MULTIPLE_CHOICE: {
                label: 'Multiple Choice',
                instruction:
                    'Read each question carefully. Choose the one best answer from the options provided.',
            },
            MULTIPLE_RESPONSE: {
                label: 'Multiple Response',
                instruction:
                    'Read each question carefully. Select all options that correctly answer the item.',
            },
            TRUE_FALSE: {
                label: 'True or False',
                instruction:
                    'Read each statement carefully. Indicate whether each statement is true or false.',
            },
            IDENTIFICATION: {
                label: 'Identification',
                instruction:
                    'Read each item carefully. Write the correct term, concept, name, or short answer required.',
            },
            MATCHING: {
                label: 'Matching Type',
                instruction:
                    'Match each item in the first column with the most appropriate answer in the second column.',
            },
            ESSAY: {
                label: 'Essay',
                instruction:
                    'Answer each question in a clear, organized, and well-developed manner. Support your response with relevant concepts, explanations, or evidence whenever appropriate.',
            },
            FILL_BLANK: {
                label: 'Fill in the Blank',
                instruction:
                    'Read each statement carefully. Supply the word, phrase, or value that correctly completes the blank.',
            },
            ENUMERATION: {
                label: 'Enumeration',
                instruction:
                    'List the required answers for each item completely and in the correct order when applicable.',
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
        expect(tfDef.instruction).toBe(
            'Read each statement carefully. Indicate whether each statement is true or false.',
        );
    });
});
