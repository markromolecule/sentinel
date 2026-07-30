import { describe, expect, it } from 'vitest';
import { renderPassage, sanitizePassageHtml } from './passage-rendering';

describe('passage rendering', () => {
    it('escapes plain passages and preserves line breaks', () => {
        const rendered = renderPassage({
            passageContent: 'Hello <world>\nSecond line',
            passageType: 'plain',
        });

        expect(rendered?.html).toBe('Hello &lt;world&gt;<br />Second line');
    });

    it('sanitizes allow-listed html and removes dangerous attributes', () => {
        const rendered = renderPassage({
            passageContent:
                '<p><strong>Rich</strong> <a href="https://example.com" onclick="alert(1)">link</a></p>',
            passageType: 'html',
        });

        expect(rendered?.html).toContain('<strong>Rich</strong>');
        expect(rendered?.html).toContain(
            '<a href="https://example.com" rel="noopener noreferrer nofollow">link</a>',
        );
        expect(rendered?.html).not.toContain('onclick');
    });

    it('prefers passageContent over legacy sourceEvidence when both are present', () => {
        const rendered = renderPassage({
            sourceEvidence: 'Legacy source excerpt',
            passageContent: '<p>Preferred passage body</p>',
            passageType: 'html',
        });

        expect(rendered?.html).toContain('Preferred passage body');
        expect(rendered?.html).not.toContain('Legacy source excerpt');
    });

    it('neutralizes script and javascript url injections', () => {
        const rendered = sanitizePassageHtml(
            '<script>alert(1)</script><a href="javascript:alert(1)">bad</a><img src="data:text/html;base64,xyz" alt="x" />',
        );

        expect(rendered).toContain('alert(1)');
        expect(rendered).not.toContain('<script');
        expect(rendered).toContain('<a rel="noopener noreferrer nofollow">bad</a>');
        expect(rendered).not.toContain('javascript:');
        expect(rendered).not.toContain('data:text/html');
    });

    it('falls back to sourceEvidence by default when passageContent is empty', () => {
        const rendered = renderPassage({
            sourceEvidence: 'Legacy evidence content',
            passageContent: '',
            passageType: 'plain',
        });
        expect(rendered?.html).toBe('Legacy evidence content');
    });

    it('does not fall back to sourceEvidence when fallbackToSourceEvidence is false', () => {
        const rendered = renderPassage({
            sourceEvidence: 'Legacy evidence content',
            passageContent: '',
            passageType: 'plain',
            fallbackToSourceEvidence: false,
        });
        expect(rendered).toBeNull();
    });

    it('returns null when both passageContent and sourceEvidence are empty', () => {
        const rendered = renderPassage({
            sourceEvidence: '',
            passageContent: '',
            passageType: 'plain',
        });
        expect(rendered).toBeNull();
    });
});
