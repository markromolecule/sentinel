'use client';

import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { QuestionsPanel } from './questions-panel';

afterEach(() => {
    cleanup();
});

describe('QuestionsPanel', () => {
    const defaultProps = {
        selectedCollection: null,
        questionTypes: [
            { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
            { value: 'TRUE_FALSE', label: 'True / False' },
        ] as any,
        typeCounts: [
            { type: 'MULTIPLE_CHOICE', count: 5 },
            { type: 'TRUE_FALSE', count: 3 },
        ] as any,
        searchQuery: '',
        selectedQuestionType: 'all' as const,
        questionRecords: [
            { id: 'q-1', prompt: 'Multiple choice question', type: 'MULTIPLE_CHOICE' },
            { id: 'q-2', prompt: 'True/False question', type: 'TRUE_FALSE' },
        ] as any,
        selectedIds: [],
        selectedIdSet: new Set<string>(),
        alreadyAddedIds: [],
        alreadyAddedIdSet: new Set<string>(),
        totalQuestionCount: 8,
        currentPage: 1,
        totalPages: 2,
        isQuestionsLoading: false,
        isFetchingMoreQuestions: false,
        isQuestionTypesLoading: false,
        isTypeCountsLoading: false,
        isSelectedCollectionLoading: false,
        questionsScrollContainerRef: { current: null },
        onSearchChange: vi.fn(),
        onQuestionTypeChange: vi.fn(),
        onPageChange: vi.fn(),
        onToggleSelectAll: vi.fn(),
        onToggleQuestion: vi.fn(),
    };

    it('renders search input and available questions label', () => {
        render(<QuestionsPanel {...defaultProps} />);
        expect(screen.getByPlaceholderText(/Search by topic/i)).toBeTruthy();
        expect(screen.getByText(/Available questions/i)).toBeTruthy();
    });

    it('renders single facet dropdown trigger with correct active counts', () => {
        render(<QuestionsPanel {...defaultProps} />);

        // Active facet trigger should show "Type: All 8"
        const trigger = screen.getByRole('button', { name: /Type: All 8/i });
        expect(trigger).toBeTruthy();
    });

    it('triggers scroll-to-load page change when scrolling near bottom', () => {
        const scrollContainerRef = React.createRef<HTMLDivElement>();
        render(
            <QuestionsPanel
                {...defaultProps}
                questionsScrollContainerRef={scrollContainerRef as any}
            />,
        );

        const container = scrollContainerRef.current;
        if (container) {
            // Mock scroll properties
            Object.defineProperty(container, 'scrollHeight', { value: 200, configurable: true });
            Object.defineProperty(container, 'scrollTop', { value: 100, configurable: true });
            Object.defineProperty(container, 'clientHeight', { value: 80, configurable: true });

            fireEvent.scroll(container);
            expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
        }
    });

    it('disables the type filter dropdown when allowedQuestionType is provided', () => {
        render(
            <QuestionsPanel
                {...defaultProps}
                allowedQuestionType="MULTIPLE_CHOICE"
                selectedQuestionType="MULTIPLE_CHOICE"
            />,
        );

        const trigger = screen.getByRole('button', { name: /Type: Multiple Choice/i }) as HTMLButtonElement;
        expect(trigger.disabled).toBe(true);
        expect(screen.getByText(/Section locked to:/i)).toBeTruthy();
    });

    it('renders incompatible question rows as disabled and prevents toggle', () => {
        const onToggleQuestion = vi.fn();
        render(
            <QuestionsPanel
                {...defaultProps}
                allowedQuestionType="MULTIPLE_CHOICE"
                selectedQuestionType="MULTIPLE_CHOICE"
                onToggleQuestion={onToggleQuestion}
            />,
        );

        // Click on the incompatible TRUE_FALSE question (q-2)
        const row2 = screen.getByText('True/False question').closest('div');
        expect(row2).toBeTruthy();
        if (row2) {
            fireEvent.click(row2);
        }

        expect(onToggleQuestion).not.toHaveBeenCalled();
    });
});
