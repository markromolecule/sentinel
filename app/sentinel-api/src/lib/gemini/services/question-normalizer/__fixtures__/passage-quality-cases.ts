import type { Schema } from '@sentinel/shared';
import type { z } from 'zod';

export interface PassageQualityTestCase {
    id: string;
    type: z.infer<typeof Schema.questionTypeSchema>;
    content: any;
    passageContent: string;
    shouldPass: boolean;
    expectedViolation?: string;
    description: string;
}

export const passageQualityCases: PassageQualityTestCase[] = [
    // 1. MULTIPLE_CHOICE
    {
        id: 'mc-leak-exact',
        type: 'MULTIPLE_CHOICE',
        content: {
            prompt: 'What is the capital of France?',
            options: ['Paris', 'London', 'Berlin'],
            correctAnswer: 'Paris',
        },
        passageContent: 'Paris is the largest city in France and its capital.',
        shouldPass: false,
        expectedViolation: 'ANSWER_EXACT_MATCH',
        description:
            'Multiple choice question where the correct answer matches a whole token/phrase in the passage.',
    },
    {
        id: 'mc-safe',
        type: 'MULTIPLE_CHOICE',
        content: {
            prompt: 'What is the capital of France?',
            options: ['Paris', 'London', 'Berlin'],
            correctAnswer: 'Paris',
        },
        passageContent:
            'The main metropolitan center of the French republic is situated on the Seine river.',
        shouldPass: true,
        description:
            'Multiple choice question where the correct answer is not explicitly present in the passage.',
    },
    // 2. MULTIPLE_RESPONSE
    {
        id: 'mr-leak-exact',
        type: 'MULTIPLE_RESPONSE',
        content: {
            prompt: 'Which of the following are primary colors?',
            options: ['Red', 'Green', 'Blue', 'Yellow'],
            correctAnswer: ['Red', 'Blue', 'Yellow'],
        },
        passageContent: 'The three traditional primary colors are red, yellow, and blue.',
        shouldPass: false,
        expectedViolation: 'ANSWER_EXACT_MATCH',
        description:
            'Multiple response question where one or more correct options are found in the passage.',
    },
    {
        id: 'mr-safe',
        type: 'MULTIPLE_RESPONSE',
        content: {
            prompt: 'Which of the following are primary colors?',
            options: ['Red', 'Green', 'Blue', 'Yellow'],
            correctAnswer: ['Red', 'Blue', 'Yellow'],
        },
        passageContent: 'Light can be split into various components of the visible spectrum.',
        shouldPass: true,
        description:
            'Multiple response question where correct options are absent from the passage.',
    },
    // 3. IDENTIFICATION
    {
        id: 'id-leak-exact',
        type: 'IDENTIFICATION',
        content: {
            prompt: 'Who developed the theory of relativity?',
            acceptedAnswers: ['Albert Einstein', 'Einstein'],
        },
        passageContent: 'In 1915, Albert Einstein published his theory of general relativity.',
        shouldPass: false,
        expectedViolation: 'ANSWER_EXACT_MATCH',
        description:
            'Identification question where one of the accepted answers is verbatim in the passage.',
    },
    {
        id: 'id-safe',
        type: 'IDENTIFICATION',
        content: {
            prompt: 'Who developed the theory of relativity?',
            acceptedAnswers: ['Albert Einstein', 'Einstein'],
        },
        passageContent:
            'A famous German-born theoretical physicist revolutionized physics in the early 20th century.',
        shouldPass: true,
        description: 'Identification question where the answers are not directly leaked.',
    },
    // 4. FILL_BLANK
    {
        id: 'fb-leak-exact',
        type: 'FILL_BLANK',
        content: {
            prompt: 'The process by which plants make food is called ____.',
            blanks: ['photosynthesis'],
        },
        passageContent:
            'Through the process of photosynthesis, plants convert light energy into chemical energy.',
        shouldPass: false,
        expectedViolation: 'ANSWER_EXACT_MATCH',
        description: 'Fill in the blank question where the blank is verbatim in the passage.',
    },
    {
        id: 'fb-safe',
        type: 'FILL_BLANK',
        content: {
            prompt: 'The process by which plants make food is called ____.',
            blanks: ['photosynthesis'],
        },
        passageContent:
            'Green foliage utilizes chlorophyll to capture solar radiation and synthesize nutrients.',
        shouldPass: true,
        description: 'Fill in the blank question where the blank is not leaked.',
    },
    // 5. ENUMERATION
    {
        id: 'enum-leak-exact',
        type: 'ENUMERATION',
        content: {
            prompt: 'List the three core principles of effectuation.',
            acceptedAnswers: ['affordable loss', 'available means', 'strategic partnerships'],
        },
        passageContent:
            'Effectuation consists of three pillars: available means, affordable loss, and strategic partnerships.',
        shouldPass: false,
        expectedViolation: 'ENUMERATION_LIST_REVEALED',
        description: 'Enumeration question where correct answers are listed or copied.',
    },
    {
        id: 'enum-safe',
        type: 'ENUMERATION',
        content: {
            prompt: 'List the three core principles of effectuation.',
            acceptedAnswers: ['affordable loss', 'available means', 'strategic partnerships'],
        },
        passageContent:
            'Sarasvathy describes entrepreneurial decision-making through several steps that emphasize acting with what is currently on hand, managing downside risk, and building alliances early on.',
        shouldPass: true,
        description:
            'Enumeration question where the items are paraphrased or described conceptually.',
    },
    // 6. MATCHING
    {
        id: 'match-leak-segment',
        type: 'MATCHING',
        content: {
            prompt: 'Match the molecule to its formula.',
            pairs: [
                { left: 'Water', right: 'H2O' },
                { left: 'Carbon dioxide', right: 'CO2' },
            ],
        },
        passageContent: 'Water is chemically represented as H2O, whereas carbon dioxide is CO2.',
        shouldPass: false,
        expectedViolation: 'MATCHING_PAIR_REVEALED',
        description:
            'Matching question where both parts of a pair occur together in the same sentence segment.',
    },
    {
        id: 'match-safe',
        type: 'MATCHING',
        content: {
            prompt: 'Match the molecule to its formula.',
            pairs: [
                { left: 'Water', right: 'H2O' },
                { left: 'Carbon dioxide', right: 'CO2' },
            ],
        },
        passageContent:
            'Many basic compounds are essential. One common liquid contains hydrogen and oxygen. Another gaseous emission contains carbon.',
        shouldPass: true,
        description: 'Matching question where pairs are not associated in the same segment.',
    },
    // 7. TRUE_FALSE
    {
        id: 'tf-leak-containment',
        type: 'TRUE_FALSE',
        content: {
            prompt: 'The Earth is flat.',
            correctAnswer: false,
        },
        passageContent: 'It is a common myth that the Earth is flat.',
        shouldPass: false,
        expectedViolation: 'TRUE_FALSE_PROPOSITION_RESTATED',
        description:
            'True/False question where the proposition is contained or restated with high overlap in a sentence.',
    },
    {
        id: 'tf-safe',
        type: 'TRUE_FALSE',
        content: {
            prompt: 'The Earth is flat.',
            correctAnswer: false,
        },
        passageContent:
            'Centuries of navigation and scientific observation have proven the spherical nature of our planet.',
        shouldPass: true,
        description: 'True/False question with no containment or high overlap.',
    },
    // 8. ESSAY
    {
        id: 'essay-safe',
        type: 'ESSAY',
        content: {
            prompt: 'Describe the economic impact of the industrial revolution.',
            rubric: 'Must discuss urbanization, labor shifts, and capital accumulation.',
        },
        passageContent: 'The late 18th century brought massive shifts in manufacturing processes.',
        shouldPass: true,
        description:
            'Essay questions do not have exact answers to match, but should pass with valid passage content.',
    },
    {
        id: 'essay-leak-empty',
        type: 'ESSAY',
        content: {
            prompt: 'Describe the economic impact of the industrial revolution.',
            rubric: 'Must discuss urbanization, labor shifts, and capital accumulation.',
        },
        passageContent: '',
        shouldPass: false,
        expectedViolation: 'EMPTY_PASSAGE',
        description: 'Essay question with empty passage.',
    },
];
