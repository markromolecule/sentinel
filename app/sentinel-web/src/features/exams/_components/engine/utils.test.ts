import { describe, expect, it } from 'vitest';
import { getRuntimePassageDetails } from './utils';

describe('getRuntimePassageDetails', () => {
    it('renders plain passage content without source metadata', () => {
        const result = getRuntimePassageDetails({
            questionPassageContent: 'Line 1\nLine 2',
            questionPassageType: 'plain',
        });

        expect(result.title).toBe('Passage');
        expect(result.description).toBe('');
        expect(result.body).toContain('Line 1');
        expect(result.body).toContain('Line 2');
    });

    it('renders html passage content when present', () => {
        const result = getRuntimePassageDetails({
            questionPassageContent: '<p><strong>Rendered</strong> passage</p>',
            questionPassageType: 'html',
        });

        expect(result.body).toContain('Rendered');
    });

    it('returns an empty body when no passage is attached', () => {
        const result = getRuntimePassageDetails({
            questionPassageContent: null,
            questionPassageType: null,
        });

        expect(result.title).toBe('Passage');
        expect(result.body).toBe('');
    });

    it('falls back to sourceEvidence when passageContent is absent', () => {
        const result = getRuntimePassageDetails({
            questionPassageContent: null,
            questionPassageType: null,
            questionSourceEvidence: 'Legacy evidence text',
        });

        expect(result.title).toBe('Passage');
        expect(result.body).toContain('Legacy evidence text');
    });
});
