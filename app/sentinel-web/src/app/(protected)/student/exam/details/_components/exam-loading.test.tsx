import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExamLoading } from './exam-loading';

describe('ExamLoading', () => {
    it('reuses the shared student loading state', () => {
        render(<ExamLoading />);

        expect(screen.getByText('Loading exam flow...')).toBeTruthy();
        expect(screen.getByLabelText('Loading exam flow')).toBeTruthy();
    });
});
