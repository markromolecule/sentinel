import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import * as React from 'react';
import type { ExamReportActionItem } from '@sentinel/shared/types';
import { getActionQueueColumns } from './action-queue-columns';
import { ActionQueuePanel } from './action-queue-panel';

// Mock ResizeObserver for Radix UI / JSDOM
global.ResizeObserver = class {
    observe() { }
    unobserve() { }
    disconnect() { }
};

afterEach(() => {
    cleanup();
});

const mockStudents: ExamReportActionItem[] = [
    {
        id: 'act-1',
        studentId: 'stud-1',
        attemptId: null,
        firstName: 'Alice',
        lastName: 'Smith',
        studentNo: 'S1001',
        reason: 'Absent from scheduled exam',
        sectionId: 'sec-1',
    },
    {
        id: 'act-2',
        studentId: 'stud-2',
        attemptId: null,
        firstName: 'Bob',
        lastName: 'Jones',
        studentNo: 'S1002',
        reason: 'Medical excuse submitted',
        sectionId: 'sec-1',
    },
];

describe('ActionQueueColumns', () => {
    it('omits select column when isSelectable is false or undefined', () => {
        const columns = getActionQueueColumns({
            examId: 'exam-123',
            isSelectable: false,
        });
        const selectColumn = columns.find((c) => c.id === 'select');
        expect(selectColumn).toBeUndefined();
    });

    it('includes select column when isSelectable is true', () => {
        const columns = getActionQueueColumns({
            examId: 'exam-123',
            isSelectable: true,
        });
        const selectColumn = columns.find((c) => c.id === 'select');
        expect(selectColumn).toBeDefined();
        expect(selectColumn?.id).toBe('select');
    });
});

describe('ActionQueuePanel Multi-Select & Batch Toolbar', () => {
    it('renders empty queue message when items list is empty', () => {
        render(
            <ActionQueuePanel
                title="Needs Makeup"
                description="Absent students queue"
                icon={<span>icon</span>}
                items={[]}
                page={1}
                onPageChange={vi.fn()}
                examId="exam-123"
                sectionOptions={[]}
                isSelectable={true}
            />,
        );
        expect(screen.getByText(/No students in this queue right now/i)).toBeDefined();
    });

    it('renders student rows and allows selecting students for batch actions', () => {
        const onBatchAction = vi.fn();
        render(
            <ActionQueuePanel
                title="Needs Makeup"
                description="Absent students queue"
                icon={<span>icon</span>}
                items={mockStudents}
                actionLabel="Grant Makeup"
                onAction={vi.fn()}
                onBatchAction={onBatchAction}
                page={1}
                onPageChange={vi.fn()}
                examId="exam-123"
                sectionOptions={[['sec-1', 'Section A']]}
                isSelectable={true}
            />,
        );

        // Verify students are rendered
        expect(screen.getByText('Smith, Alice')).toBeDefined();
        expect(screen.getByText('Jones, Bob')).toBeDefined();

        // Batch toolbar should not be visible initially
        expect(screen.queryByText(/selected for batch grant makeup/i)).toBeNull();

        // Find row checkboxes (aria-label="Select row")
        const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
        expect(rowCheckboxes.length).toBe(2);

        // Check the first row
        fireEvent.click(rowCheckboxes[0]!);

        // Toolbar should now appear
        expect(screen.getByText('1 selected')).toBeDefined();
        const batchButton = screen.getByRole('button', { name: /Grant Makeup \(1\)/i });
        expect(batchButton).toBeDefined();

        // Trigger batch button click
        fireEvent.click(batchButton);
        expect(onBatchAction).toHaveBeenCalledWith([mockStudents[0]]);

        // Click Clear Selection
        const clearButton = screen.getByRole('button', { name: /Clear Selection/i });
        fireEvent.click(clearButton);

        // Toolbar should be dismissed
        expect(screen.queryByText(/selected for batch grant makeup/i)).toBeNull();
    });

    it('selects all rows when header checkbox is clicked', () => {
        const onBatchAction = vi.fn();
        render(
            <ActionQueuePanel
                title="Needs Makeup"
                description="Absent students queue"
                icon={<span>icon</span>}
                items={mockStudents}
                actionLabel="Grant Makeup"
                onAction={vi.fn()}
                onBatchAction={onBatchAction}
                page={1}
                onPageChange={vi.fn()}
                examId="exam-123"
                sectionOptions={[['sec-1', 'Section A']]}
                isSelectable={true}
            />,
        );

        const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
        fireEvent.click(selectAllCheckbox);

        // All rows selected
        expect(screen.getByText('2 selected')).toBeDefined();
        const batchButton = screen.getByRole('button', { name: /Grant Makeup \(2\)/i });
        fireEvent.click(batchButton);
        expect(onBatchAction).toHaveBeenCalledWith(mockStudents);
    });
});

