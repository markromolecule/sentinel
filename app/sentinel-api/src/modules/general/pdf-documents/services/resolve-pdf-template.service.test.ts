import { describe, expect, it, vi } from 'vitest';
import { resolvePdfTemplate } from './resolve-pdf-template.service';

function createMockDbClient(options: {
    instOverride?: any;
    globalTemplate?: any;
    persistedFallback?: any;
    insertedValues?: any[];
}) {
    const insertedValues = options.insertedValues ?? [];
    return {
        selectFrom: () => ({
            selectAll: () => ({
                where: (column: string, op: string, value: any) => ({
                    where: (col2: string, op2: string, val2: any) => ({
                        where: (col3: string, op3: string, val3: any) => ({
                            executeTakeFirst: async () => {
                                if (column === 'institution_id' && value !== null) {
                                    return options.instOverride;
                                }
                                return options.globalTemplate;
                            },
                        }),
                    }),
                }),
            }),
            select: () => ({
                where: () => ({
                    where: () => ({
                        where: () => ({
                            executeTakeFirst: async () => options.persistedFallback,
                        }),
                    }),
                }),
            }),
        }),
        insertInto: () => ({
            values: (val: any) => ({
                execute: async () => {
                    insertedValues.push(val);
                    return { insertId: '1' };
                },
            }),
        }),
    } as any;
}

describe('resolvePdfTemplate', () => {
    it('resolves institution override when present', async () => {
        const instOverride = {
            template_id: 'override-id',
            institution_id: 'inst-1',
            document_kind: 'EXAM_RESULTS_REPORT',
            header_config: {
                logo_visible: true,
                logo_placement: 'LEFT',
                logo_max_size_px: 120,
                title_text: 'Institution Custom Title',
                title_alignment: 'LEFT',
                divider_visible: true,
                divider_color: '#D1D5DB',
                accent_color: '#4F46E5',
                sentinel_logo_visible: false,
            },
            footer_config: {
                text: 'Inst Footer',
                divider_visible: true,
                divider_color: '#E5E7EB',
                page_number_visible: true,
                page_number_format: 'PAGE_X_OF_Y',
            },
        };

        const db = createMockDbClient({ instOverride });
        const result = await resolvePdfTemplate(db, 'inst-1', 'EXAM_RESULTS_REPORT');

        expect(result.templateId).toBe('override-id');
        expect(result.headerConfig.title_text).toBe('Institution Custom Title');
    });

    it('falls back to global template when override is absent', async () => {
        const globalTemplate = {
            template_id: 'global-id',
            institution_id: null,
            document_kind: 'EXAM_RESULTS_REPORT',
            header_config: {
                logo_visible: true,
                logo_placement: 'LEFT',
                logo_max_size_px: 120,
                title_text: 'Global Custom Title',
                title_alignment: 'LEFT',
                divider_visible: true,
                divider_color: '#D1D5DB',
                accent_color: '#4F46E5',
                sentinel_logo_visible: false,
            },
            footer_config: {
                text: 'Global Footer',
                divider_visible: true,
                divider_color: '#E5E7EB',
                page_number_visible: true,
                page_number_format: 'PAGE_X_OF_Y',
            },
        };

        const db = createMockDbClient({ globalTemplate });
        const result = await resolvePdfTemplate(db, 'inst-1', 'EXAM_RESULTS_REPORT');

        expect(result.templateId).toBe('global-id');
        expect(result.headerConfig.title_text).toBe('Global Custom Title');
    });

    it('falls back to built-in defaults when override and global are absent', async () => {
        const db = createMockDbClient({});
        const result = await resolvePdfTemplate(db, 'inst-1', 'EXAM_RESULTS_REPORT');

        expect(result.templateId).toBeNull();
        expect(result.headerConfig.title_text).toBe('Examination Results Report');
        expect(result.headerConfig.accent_color).toBe('#4F46E5');
    });

    it('persists built-in defaults if option is enabled and not already saved', async () => {
        const insertedValues: any[] = [];
        const db = createMockDbClient({ insertedValues });

        const result = await resolvePdfTemplate(db, 'inst-1', 'EXAM_RESULTS_REPORT', {
            persistBuiltInFallback: true,
        });

        expect(result.templateId).not.toBeNull();
        expect(insertedValues.length).toBe(1);
        expect(insertedValues[0].document_kind).toBe('EXAM_RESULTS_REPORT');
        expect(insertedValues[0].status).toBe('PUBLISHED');
    });
});
