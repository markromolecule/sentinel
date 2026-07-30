import type { QuestionType } from '@sentinel/shared/types';
import {
    QUESTION_TYPES,
    validateQuestionContentByType,
} from '../../examination/assessment/assessment-contracts';
import type { QuestionTypeDefinition, QuestionTypeValidationResult } from './question-type.dto';

const QUESTION_TYPE_META: Record<
    QuestionType,
    Pick<QuestionTypeDefinition, 'label' | 'description' | 'instruction'>
> = {
    MULTIPLE_CHOICE: {
        label: 'Multiple Choice',
        description: 'Select one correct option among the available choices.',
        instruction: 'Select the best answer from the choices provided.',
    },
    MULTIPLE_RESPONSE: {
        label: 'Multiple Response',
        description: 'Select multiple correct options from the available choices.',
        instruction: 'Select all answers that apply for each question.',
    },
    TRUE_FALSE: {
        label: 'True or False',
        description: 'Determine whether a statement is true or false.',
        instruction: 'Determine whether each statement is true or false.',
    },
    IDENTIFICATION: {
        label: 'Identification',
        description: 'Provide the correct term, concept, or short answer.',
        instruction: 'Write the correct term, concept, or short answer.',
    },
    MATCHING: {
        label: 'Matching Type',
        description: 'Match related items from two connected lists.',
        instruction: 'Match each item with its correct corresponding answer.',
    },
    ESSAY: {
        label: 'Essay',
        description: 'Write a long-form answer using a rubric or response guide.',
        instruction: 'Answer each question clearly and completely.',
    },
    FILL_BLANK: {
        label: 'Fill in the Blank',
        description: 'Complete a sentence or statement with the correct answer.',
        instruction: 'Complete each statement with the correct word or phrase.',
    },
    ENUMERATION: {
        label: 'Enumeration',
        description: 'List multiple expected answers in sequence or set form.',
        instruction: 'List all required answers for each question.',
    },
};

function createDefaultContent(type: QuestionType): QuestionTypeDefinition['defaultContent'] {
    switch (type) {
        case 'MULTIPLE_CHOICE':
            return {
                prompt: '',
                options: ['', ''],
                correctAnswer: '',
            };
        case 'MULTIPLE_RESPONSE':
            return {
                prompt: '',
                options: ['', ''],
                correctAnswer: [],
            };
        case 'TRUE_FALSE':
            return {
                prompt: '',
                correctAnswer: true,
            };
        case 'IDENTIFICATION':
        case 'ENUMERATION':
            return {
                prompt: '',
                acceptedAnswers: [''],
            };
        case 'MATCHING':
            return {
                prompt: '',
                pairs: [{ left: '', right: '' }],
            };
        case 'FILL_BLANK':
            return {
                prompt: '',
                blanks: [''],
            };
        case 'ESSAY':
            return {
                prompt: '',
                rubric: '',
                maxLength: 1000,
            };
    }
}

function buildQuestionTypeDefinition(type: QuestionType): QuestionTypeDefinition {
    return {
        value: type,
        ...QUESTION_TYPE_META[type],
        defaultContent: createDefaultContent(type),
    };
}

export class QuestionTypeService {
    static getQuestionTypes(): QuestionTypeDefinition[] {
        return QUESTION_TYPES.map((type) => buildQuestionTypeDefinition(type as QuestionType));
    }

    static getQuestionType(type: QuestionType): QuestionTypeDefinition {
        return buildQuestionTypeDefinition(type);
    }

    static validateQuestionTypeContent(
        type: QuestionType,
        content: unknown,
    ): QuestionTypeValidationResult {
        return {
            type,
            content: validateQuestionContentByType(type, content),
        };
    }
}
