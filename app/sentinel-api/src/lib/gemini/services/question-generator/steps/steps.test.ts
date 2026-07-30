import { describe, expect, it, vi } from 'vitest';
import { generateBatchesStep } from './generate-batches';
import { resolvePageCountsStep } from './resolve-page-counts';
import { buildSourceDocumentsStep, normalizeFileNameForMatch } from './build-source-documents';
import type { QuestionGeneratorLlmProvider } from '../types';
import type { GenerateQuestionPreviewConfig } from '@sentinel/shared';

describe('Question Generator steps modules', () => {
    describe('normalizeFileNameForMatch', () => {
        it('normalizes pdf extension and punctuation', () => {
            expect(normalizeFileNameForMatch('Hello, World!.pdf')).toBe('hello world');
            expect(normalizeFileNameForMatch('  week_3 - OS_stats.PDF  ')).toBe('week 3 os stats');
        });
    });

    describe('generateBatchesStep', () => {
        it('calls generateStructuredJson and processes results', async () => {
            const mockProvider: Partial<QuestionGeneratorLlmProvider> = {
                generateStructuredJson: vi.fn().mockResolvedValue({
                    MULTIPLE_CHOICE: [
                        {
                            sourceFileName: 'lesson.pdf',
                            sourcePageNumber: 2,
                            sourceEvidence: 'Evidence text',
                            passageContent: 'This is a passage.',
                            content: {
                                prompt: 'What is 1+1?',
                                options: ['1', '2'],
                                correctAnswer: '2',
                            },
                        },
                    ],
                }),
            };

            const config: GenerateQuestionPreviewConfig = {
                target: 'QUESTION_COLLECTION',
                institutionId: '123',
                tags: [],
                isPublic: false,
                questionCount: 1,
            };

            const { rawQuestions, deficits } = await generateBatchesStep({
                batches: [config],
                files: [new File([], 'lesson.pdf')],
                uploadedFiles: [{ name: 'file1', uri: 'uri1', mimeType: 'pdf' }],
                model: 'gemini-model',
                provider: mockProvider as QuestionGeneratorLlmProvider,
            });

            expect(rawQuestions).toHaveLength(1);
            expect(rawQuestions[0].type).toBe('MULTIPLE_CHOICE');
            expect(rawQuestions[0].sourceFileName).toBe('lesson.pdf');
            expect(rawQuestions[0].passageContent).toBe('This is a passage.');
            expect(deficits).toHaveLength(0);
        });
    });

    describe('resolvePageCountsStep', () => {
        it('queries page counts', async () => {
            const mockProvider: Partial<QuestionGeneratorLlmProvider> = {
                generateStructuredJson: vi.fn().mockResolvedValue({
                    documents: [{ fileName: 'lesson.pdf', pageCount: 12 }],
                }),
            };

            const counts = await resolvePageCountsStep({
                files: [new File([], 'lesson.pdf')],
                uploadedFiles: [{ name: 'file1', uri: 'uri1', mimeType: 'pdf' }],
                model: 'model',
                provider: mockProvider as QuestionGeneratorLlmProvider,
            });

            expect(counts).toHaveLength(1);
            expect(counts[0].fileName).toBe('lesson.pdf');
            expect(counts[0].pageCount).toBe(12);
        });
    });

    describe('buildSourceDocumentsStep', () => {
        it('constructs source documents correctly', () => {
            const files = [new File([], 'lesson.pdf')];
            const rawQuestions = [
                {
                    type: 'MULTIPLE_CHOICE',
                    sourceFileName: 'lesson.pdf',
                    sourcePageNumber: 4,
                    sourceEvidence: 'Evidence text',
                    passageContent: 'Evidence text',
                    content: {},
                },
            ];
            const pageCounts = [{ fileName: 'lesson.pdf', pageCount: 8 }];

            const docs = buildSourceDocumentsStep(files, rawQuestions, pageCounts);
            expect(docs).toHaveLength(1);
            expect(docs[0].fileName).toBe('lesson.pdf');
            expect(docs[0].pageCount).toBe(8);
        });
    });
});
