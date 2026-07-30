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
        description:
            'A question format requiring examinees to select the single correct or best response from a set of provided options.',
        instruction:
            'Read each question carefully. Choose the one best answer from the options provided.',
    },
    MULTIPLE_RESPONSE: {
        label: 'Multiple Response',
        description:
            'A question format requiring examinees to identify all correct responses from a set of options, where more than one choice may be correct.',
        instruction:
            'Read each question carefully. Select all options that correctly answer the item.',
    },
    TRUE_FALSE: {
        label: 'True or False',
        description:
            'A question format requiring examinees to evaluate the validity of a given statement as either true or false.',
        instruction:
            'Read each statement carefully. Indicate whether each statement is true or false.',
    },
    IDENTIFICATION: {
        label: 'Identification',
        description:
            'A question format requiring examinees to supply the specific term, concept, or short answer being described or referenced.',
        instruction:
            'Read each item carefully. Write the correct term, concept, name, or short answer required.',
    },
    MATCHING: {
        label: 'Matching Type',
        description:
            'A question format requiring examinees to establish the correct correspondence between items presented in two related columns.',
        instruction:
            'Match each item in the first column with the most appropriate answer in the second column.',
    },
    ESSAY: {
        label: 'Essay',
        description:
            'A question format requiring examinees to construct an extended, well-organized written response, typically assessed against a rubric or scoring guide.',
        instruction:
            'Answer each question in a clear, organized, and well-developed manner. Support your response with relevant concepts, explanations, or evidence whenever appropriate.',
    },
    FILL_BLANK: {
        label: 'Fill in the Blank',
        description:
            'A question format requiring examinees to complete a sentence or statement by supplying the missing word, phrase, or value.',
        instruction:
            'Read each statement carefully. Supply the word, phrase, or value that correctly completes the blank.',
    },
    ENUMERATION: {
        label: 'Enumeration',
        description:
            'A question format requiring examinees to list a specified number of correct answers in response to a given prompt.',
        instruction:
            'List the required answers for each item completely and in the correct order when applicable.',
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
