import { describe, expect, it, vi } from 'vitest';
import { PDFParse } from 'pdf-parse';
import { getAnswerKeySource, mapAnswerKeySourceToViewModel } from './get-answer-key-source';
import { renderExamAnswerKeyPdf } from '../../rendering/exam-answer-key-renderer';
import type { HeaderConfig } from '../../rendering/pdf-header-renderer';
import type { FooterConfig } from '../../rendering/pdf-footer-renderer';

const headerConfig: HeaderConfig = {
    logo_visible: true,
    logo_placement: 'LEFT',
    logo_max_size_px: 120,
    title_text: 'Answer Key',
    title_alignment: 'LEFT',
    divider_visible: true,
    divider_color: '#D1D5DB',
    accent_color: '#3B82F6',
    sentinel_logo_visible: false,
};

const footerConfig: FooterConfig = {
    text: 'Private answer key',
    confidentiality_label: 'CONFIDENTIAL',
    divider_visible: true,
    divider_color: '#E5E7EB',
    page_number_visible: true,
    page_number_format: 'PAGE_X_OF_Y',
};

function buildExamLookupStub(examRow: Record<string, unknown>) {
    const whereMock = { executeTakeFirst: vi.fn().mockResolvedValue(examRow) };
    const selectMock = { where: () => whereMock };
    const joinInst = { select: () => selectMock };
    const joinSubj = { leftJoin: () => joinInst };
    return { leftJoin: () => joinSubj };
}

function buildQuestionLookupStub(rows: Array<Record<string, unknown>>) {
    const orderByMock = { execute: vi.fn().mockResolvedValue(rows) };
    const whereMock = { orderBy: () => orderByMock };
    const selectMock = { where: () => whereMock };
    const joinMock = { select: () => selectMock };
    return { leftJoin: () => joinMock };
}

async function extractPdfText(buffer: Buffer) {
    const parser = new PDFParse({ data: buffer });
    try {
        return (await parser.getText()).text;
    } finally {
        await parser.destroy();
    }
}

describe('answer-key source to renderer integration', () => {
    it('renders current DB-shaped content through source normalization without manual view models', async () => {
        const examRow = {
            exam_id: 'exam-current-shape',
            title: 'Current Shape Final',
            duration_minutes: 90,
            difficulty: 'MEDIUM',
            passing_score: 75,
            institution_id: 'inst-current',
            subject_code: 'CS-202',
            subject_name: 'Software Testing',
            institution_name: 'Sentinel University',
        };
        const questionRows = [
            {
                question_id: 'q-mc',
                question_type: 'MULTIPLE_CHOICE',
                content: JSON.stringify({
                    prompt: 'Which city is the capital of France?',
                    source_evidence:
                        'Paris appears in source evidence but must not replace passage.',
                    options: ['Lyon', 'Paris', 'Nice'],
                    correctAnswer: 'Paris',
                }),
                passage_content: 'Persisted passage: France uses Paris as its capital.',
                points: 1,
                order_index: 1,
            },
            {
                question_id: 'q-fill',
                question_type: 'FILL_BLANK',
                content: {
                    prompt: 'Sentinel stores private artifacts in ____ storage.',
                    blanks: ['private'],
                },
                passage_content: null,
                points: 2,
                order_index: 2,
            },
            {
                question_id: 'q-match',
                question_type: 'MATCHING',
                content: {
                    prompt: 'Match runtime states.',
                    pairs: [{ left: 'READY', right: 'Download allowed' }],
                },
                passage_content: null,
                points: 2,
                order_index: 3,
            },
        ];
        const mockDb = {
            selectFrom: vi
                .fn()
                .mockReturnValueOnce(buildExamLookupStub(examRow))
                .mockReturnValueOnce(buildQuestionLookupStub(questionRows)),
        } as any;

        const source = await getAnswerKeySource(mockDb, 'exam-current-shape', 'inst-current');
        const viewModel = mapAnswerKeySourceToViewModel(source, 'Release Validator');
        const buffer = await renderExamAnswerKeyPdf(headerConfig, footerConfig, null, viewModel);
        const text = await extractPdfText(buffer);

        expect(text).toContain('Current Shape Final');
        expect(text).toContain('Persisted passage: France uses Paris as its capital.');
        expect(text).toContain("[' ] B. Paris");
        expect(text).toContain('Blank [1]: private');
        expect(text).toContain('"READY" matches with "Download allowed"');
        expect(text).not.toContain('must not replace passage');
    });
});
