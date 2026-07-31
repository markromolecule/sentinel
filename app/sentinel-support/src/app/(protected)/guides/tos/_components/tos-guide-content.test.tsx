import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TosGuideContent } from './tos-guide-content';

describe('TosGuideContent in Sentinel Support', () => {
    it('renders the header and introductory section', () => {
        render(<TosGuideContent />);

        expect(
            screen.getByRole('heading', { name: /Table of Specifications \(TOS\) Guide/i }),
        ).toBeTruthy();
        expect(screen.getByText(/Learn how the system maps questions to topics/i)).toBeTruthy();
    });

    it('renders the accordion headers', () => {
        render(<TosGuideContent />);

        expect(screen.getAllByText('1. Core Concepts & Purpose')[0]).toBeTruthy();
        expect(screen.getAllByText("2. Bloom's Cognitive Levels")[0]).toBeTruthy();
        expect(screen.getAllByText('3. Calculating Topic Weightage')[0]).toBeTruthy();
        expect(screen.getAllByText('4. Question Difficulty Levels')[0]).toBeTruthy();
        expect(screen.getAllByText('5. Frequently Asked Questions')[0]).toBeTruthy();
    });

    it('renders the Bloom taxonomy levels when expanded', async () => {
        render(<TosGuideContent />);

        const triggers = screen.getAllByText("2. Bloom's Cognitive Levels");
        fireEvent.click(triggers[0]!);

        expect(await screen.findByText('Remembering')).toBeTruthy();
        expect(screen.getByText('Understanding')).toBeTruthy();
        expect(screen.getByText('Applying')).toBeTruthy();
        expect(screen.getByText('Analyzing')).toBeTruthy();
        expect(screen.getByText('Evaluating')).toBeTruthy();
        expect(screen.getByText('Creating')).toBeTruthy();
    });
});
