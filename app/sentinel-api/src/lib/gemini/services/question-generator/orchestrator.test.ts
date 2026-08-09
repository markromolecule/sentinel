import { describe, expect, it, vi } from 'vitest';
import { QuestionGeneratorService, isBlockingPassageFailure } from './orchestrator';
import * as uploadFilesModule from './steps/upload-files';
import * as generateBatchesModule from './steps/generate-batches';
import * as resolvePageCountsModule from './steps/resolve-page-counts';
import * as assessPassageQualityModule from './steps/assess-passage-quality';
import * as repairInvalidQuestionsModule from './steps/repair-invalid-questions';
import * as buildResponseModule from './steps/build-response';

describe('QuestionGeneratorService quality failure classification', () => {
    it('blocks deterministic passage violations', () => {
        expect(isBlockingPassageFailure({ violations: ['ANSWER_EXACT_MATCH'] })).toBe(true);
        expect(
            isBlockingPassageFailure({
                violations: ['TRUE_FALSE_PROPOSITION_RESTATED'],
            }),
        ).toBe(true);
    });

    it('treats subjective critic findings as non-blocking', () => {
        expect(isBlockingPassageFailure({ violations: ['UNANSWERABLE_PASSAGE'] })).toBe(false);
        expect(isBlockingPassageFailure({ violations: ['SEMANTIC_LEAK'] })).toBe(false);
        expect(isBlockingPassageFailure({ violations: ['CRITIC_FAIL_CLOSED'] })).toBe(false);
    });

    it('repairs only the passage and reruns validation on the patched slot', async () => {
        const provider = {
            resolveFlashModel: vi.fn().mockReturnValue('gemini-model'),
            uploadFile: vi.fn(),
            deleteFile: vi.fn().mockResolvedValue(undefined),
            generateStructuredJson: vi.fn(),
        };

        vi.spyOn(uploadFilesModule, 'uploadFilesStep').mockResolvedValue([
            { name: 'gemini-file', uri: 'uri', mimeType: 'application/pdf' },
        ] as any);
        vi.spyOn(generateBatchesModule, 'generateBatchesStep').mockResolvedValue({
            rawQuestions: [
                {
                    type: 'MULTIPLE_CHOICE',
                    sourceFileName: 'lesson.pdf',
                    sourcePageNumber: 1,
                    sourceEvidence: 'Evidence text',
                    passageContent: 'Leaky passage with answer 6.',
                    difficulty: 'EASY',
                    points: 1,
                    content: {
                        prompt: 'What is 3+3?',
                        options: ['5', '6'],
                        correctAnswer: '6',
                    },
                },
            ],
            deficits: [],
        } as any);
        vi.spyOn(resolvePageCountsModule, 'resolvePageCountsStep').mockResolvedValue([
            { fileName: 'lesson.pdf', pageCount: 1 },
        ] as any);
        const assessSpy = vi.spyOn(assessPassageQualityModule, 'assessPassageQuality');
        assessSpy
            .mockImplementationOnce(async (slots) => {
                expect(slots[0].question.passageContent).toBe('Leaky passage with answer 6.');
                return {
                    passedSlots: [],
                    failedSlots: [
                        {
                            slotId: 'slot-0',
                            type: 'MULTIPLE_CHOICE',
                            question: slots[0].question,
                            violations: ['ANSWER_EXACT_MATCH'],
                            reasons: ['Leaks answer.'],
                        },
                    ],
                } as any;
            })
            .mockImplementationOnce(async (slots) => {
                expect(slots[0].question.passageContent).toBe('Safe passage without the answer.');
                expect(slots[0].question.content).toMatchObject({
                    prompt: 'What is 3+3?',
                    correctAnswer: '6',
                });
                expect(slots[0].question.sourceEvidence).toBe('Evidence text');
                return {
                    passedSlots: [
                        {
                            slotId: 'slot-0',
                            type: 'MULTIPLE_CHOICE',
                            question: slots[0].question,
                        },
                    ],
                    failedSlots: [],
                } as any;
            });
        const repairSpy = vi
            .spyOn(repairInvalidQuestionsModule, 'repairInvalidQuestions')
            .mockResolvedValue([
                {
                    slotId: 'slot-0',
                    passageContent: 'Safe passage without the answer.',
                },
            ] as any);
        const buildResponseSpy = vi
            .spyOn(buildResponseModule, 'buildResponseStep')
            .mockReturnValue({ target: 'QUESTION_BANK' } as any);

        const result = await QuestionGeneratorService.generatePreviewFromPdf({
            files: [new File(['%PDF-1.4 test'], 'lesson.pdf', { type: 'application/pdf' })],
            config: {
                target: 'QUESTION_BANK',
                institutionId: 'institution-1',
                tags: [],
                isPublic: false,
                questionCount: 1,
                questionTypeDistribution: [{ type: 'MULTIPLE_CHOICE', count: 1 }],
            } as any,
            provider: provider as any,
        });

        expect(repairSpy).toHaveBeenCalledTimes(1);
        expect(assessSpy).toHaveBeenCalledTimes(2);
        expect(buildResponseSpy).toHaveBeenCalledTimes(1);
        expect(provider.deleteFile).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ target: 'QUESTION_BANK' });
    });
});
