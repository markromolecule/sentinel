import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useQuestionBankImportSelection } from './use-question-bank-import-selection';

describe('useQuestionBankImportSelection', () => {
    it('manages selection state and resets page to 1 when filters change', () => {
        const { result } = renderHook(() => useQuestionBankImportSelection());

        expect(result.current.currentPage).toBe(1);

        // Change page
        act(() => {
            result.current.setCurrentPage(2);
        });
        expect(result.current.currentPage).toBe(2);

        // Change search query
        act(() => {
            result.current.setSearchQuery('algebra');
        });
        expect(result.current.currentPage).toBe(1);
        expect(result.current.searchQuery).toBe('algebra');

        // Change page again
        act(() => {
            result.current.setCurrentPage(3);
        });
        expect(result.current.currentPage).toBe(3);

        // Change collection ID
        act(() => {
            result.current.setSelectedCollectionId('coll-1');
        });
        expect(result.current.currentPage).toBe(1);
        expect(result.current.selectedCollectionId).toBe('coll-1');

        // Change page again
        act(() => {
            result.current.setCurrentPage(4);
        });
        expect(result.current.currentPage).toBe(4);

        // Change question type
        act(() => {
            result.current.setSelectedQuestionType('MULTIPLE_CHOICE');
        });
        expect(result.current.currentPage).toBe(1);
        expect(result.current.selectedQuestionType).toBe('MULTIPLE_CHOICE');
    });

    it('enforces allowedQuestionType on initialization and dynamically clears incompatible selections on change', () => {
        let allowedType: any = undefined;
        const { result, rerender } = renderHook(() => useQuestionBankImportSelection(allowedType));

        expect(result.current.selectedQuestionType).toBe('all');

        // Add some selected questions of different types
        act(() => {
            result.current.toggleQuestion({ id: 'q1', type: 'MULTIPLE_CHOICE', content: {} } as any);
            result.current.toggleQuestion({ id: 'q2', type: 'TRUE_FALSE', content: {} } as any);
        });

        expect(result.current.selectedIds).toEqual(['q1', 'q2']);

        // Now rerender with allowedType set to MULTIPLE_CHOICE
        allowedType = 'MULTIPLE_CHOICE';
        rerender();

        // Should lock type filter and discard incompatible 'q2'
        expect(result.current.selectedQuestionType).toBe('MULTIPLE_CHOICE');
        expect(result.current.selectedIds).toEqual(['q1']);
    });
});
