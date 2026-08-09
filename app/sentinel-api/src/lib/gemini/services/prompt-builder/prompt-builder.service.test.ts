import { describe, expect, it } from 'vitest';
import { buildPrompt, buildResponseJsonSchema } from './prompt-builder.service';
import type { GenerateQuestionPreviewConfig } from '@sentinel/shared';

const baseConfig: GenerateQuestionPreviewConfig = {
    target: 'QUESTION_COLLECTION',
    institutionId: '33560732-ef36-4670-b20c-a718f31179a0',
    tags: [],
    isPublic: false,
    questionType: 'MULTIPLE_CHOICE',
    questionCount: 2,
};

describe('PromptBuilderService', () => {
    describe('buildPrompt', () => {
        it('keeps passageContent before sourceEvidence and adds a self-check', () => {
            const prompt = buildPrompt({ config: baseConfig });

            expect(prompt).toContain('Set "passageContent"');
            expect(prompt).toContain('Set "sourceEvidence"');
            expect(prompt.indexOf('Set "passageContent"')).toBeLessThan(
                prompt.indexOf('Set "sourceEvidence"'),
            );

            expect(prompt).toContain('private instructor provenance');
            expect(prompt).toContain('contains enough context for the student to solve');
            expect(prompt).toContain('MUST NOT contain the exact answer');
            expect(prompt).toContain(
                'Before finalizing each question, re-check its passageContent',
            );
            expect(prompt).toContain('do not generate HTML');
        });
    });

    describe('buildResponseJsonSchema', () => {
        it('orders passageContent before sourceEvidence and requires both fields', () => {
            const schema = buildResponseJsonSchema(baseConfig);

            const mcProperties = schema.properties.MULTIPLE_CHOICE.items.properties;
            const propertyKeys = Object.keys(mcProperties);
            expect(propertyKeys.indexOf('passageContent')).toBeLessThan(
                propertyKeys.indexOf('sourceEvidence'),
            );

            const mcRequired = schema.properties.MULTIPLE_CHOICE.items.required;
            expect(mcRequired).toContain('passageContent');
            expect(mcRequired).toContain('sourceEvidence');
        });
    });
});
