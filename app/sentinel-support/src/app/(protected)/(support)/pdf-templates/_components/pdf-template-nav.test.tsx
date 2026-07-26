import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PdfTemplateNav } from './pdf-template-nav';

describe('PdfTemplateNav', () => {
    it('renders both template destinations', () => {
        render(<PdfTemplateNav activeSection="reports" />);

        expect(screen.getByRole('link', { name: /report template/i })).toBeTruthy();
        expect(screen.getByRole('link', { name: /examination answer key/i })).toBeTruthy();
        expect(screen.getByRole('link', { name: /branding/i })).toBeTruthy();
    });
});
