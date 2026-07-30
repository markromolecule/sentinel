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
        it('includes the semantic separation and passageContent requirements', () => {
            const prompt = buildPrompt({ config: baseConfig });

            // Check semantic separation
            expect(prompt).toContain('sourceEvidence');
            expect(prompt).toContain('passageContent');

            // Check instructions
            expect(prompt).toContain('private instructor provenance');
            expect(prompt).toContain('contains enough context for the student to solve');
            expect(prompt).toContain('MUST NOT contain the exact answer');
            expect(prompt).toContain('do not generate HTML');
        });
    });

    describe('buildResponseJsonSchema', () => {
        it('adds passageContent to properties and required list for all allowed types', () => {
            const schema = buildResponseJsonSchema(baseConfig);

            // Check properties
            const mcProperties = schema.properties.MULTIPLE_CHOICE.items.properties;
            expect(mcProperties.passageContent).toBeDefined();
            expect(mcProperties.passageContent.type).toBe('string');

            // Check required fields
            const mcRequired = schema.properties.MULTIPLE_CHOICE.items.required;
            expect(mcRequired).toContain('passageContent');
            expect(mcRequired).toContain('sourceEvidence');
        });
    });
});
