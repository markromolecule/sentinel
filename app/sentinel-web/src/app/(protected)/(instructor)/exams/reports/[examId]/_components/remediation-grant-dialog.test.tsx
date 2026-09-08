import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import * as React from 'react';
import type { ExamReportActionItem } from '@sentinel/shared/types';
import { RemediationGrantDialog } from './remediation-grant-dialog';

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
    {
        id: 'act-3',
        studentId: 'stud-3',
        attemptId: null,
        firstName: 'Charlie',
        lastName: 'Brown',
        studentNo: 'S1003',
        reason: 'Absent from scheduled exam',
        sectionId: 'sec-2',
    },
];

describe('RemediationGrantDialog', () => {
    it('returns null when not open or no students provided', () => {
        const { container } = render(
            <RemediationGrantDialog
                isOpen={false}
                onClose={vi.fn()}
                items={mockStudents}
                overrideType="MAKEUP"
                onConfirm={vi.fn()}
                isLoading={false}
            />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders single student layout when one student is provided', () => {
        render(
            <RemediationGrantDialog
                isOpen={true}
                onClose={vi.fn()}
                item={mockStudents[0]}
                overrideType="MAKEUP"
                onConfirm={vi.fn()}
                isLoading={false}
            />,
        );

        expect(screen.getByText('Setup Scheduled Makeup')).toBeDefined();
        expect(screen.getByText(/Alice Smith \(S1001\)/i)).toBeDefined();
        expect(screen.getByRole('button', { name: 'Grant Makeup' })).toBeDefined();
    });

    it('renders batch students layout with preview badges when multiple students are provided', () => {
        render(
            <RemediationGrantDialog
                isOpen={true}
                onClose={vi.fn()}
                items={mockStudents}
                overrideType="RETAKE"
                onConfirm={vi.fn()}
                isLoading={false}
            />,
        );

        expect(screen.getByText('Setup Scheduled Retake (3 Students)')).toBeDefined();
        expect(screen.getByText(/shared window for the 3 selected students/i)).toBeDefined();
        expect(screen.getByText('Selected Candidates (3):')).toBeDefined();
        expect(screen.getByText('Smith, Alice')).toBeDefined();
        expect(screen.getByText('Jones, Bob')).toBeDefined();
        expect(screen.getByText('Brown, Charlie')).toBeDefined();
        expect(screen.getByRole('button', { name: 'Grant Retake (3)' })).toBeDefined();
    });

    it('dispatches confirmation with all students and valid ISO strings on submit', async () => {
        const onConfirm = vi.fn().mockResolvedValue(undefined);
        const onClose = vi.fn();

        render(
            <RemediationGrantDialog
                isOpen={true}
                onClose={onClose}
                items={mockStudents}
                overrideType="MAKEUP"
                onConfirm={onConfirm}
                isLoading={false}
            />,
        );

        const submitButton = screen.getByRole('button', { name: 'Grant Makeup (3)' });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(onConfirm).toHaveBeenCalledTimes(1);
        });

        expect(onConfirm).toHaveBeenCalledWith(
            mockStudents,
            'MAKEUP',
            expect.any(String),
            expect.any(String),
            expect.stringContaining('Approved batch makeup window'),
        );
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('disables buttons and inputs during isLoading state', () => {
        render(
            <RemediationGrantDialog
                isOpen={true}
                onClose={vi.fn()}
                items={mockStudents}
                overrideType="MAKEUP"
                onConfirm={vi.fn()}
                isLoading={true}
            />,
        );

        expect(screen.getByRole('button', { name: 'Scheduling...' })).toBeDefined();
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        expect(cancelButton.hasAttribute('disabled')).toBe(true);
    });

    it('prevents submission when start date is greater than or equal to end date', async () => {
        const onConfirm = vi.fn();
        render(
            <RemediationGrantDialog
                isOpen={true}
                onClose={vi.fn()}
                items={mockStudents}
                overrideType="MAKEUP"
                onConfirm={onConfirm}
                isLoading={false}
            />,
        );

        // Target start and end date inputs
        const inputs = screen.getAllByDisplayValue(/T/);
        const startInput = inputs[0]!;
        const endInput = inputs[1]!;

        // Set start date after end date
        fireEvent.change(startInput, { target: { value: '2026-09-10T12:00' } });
        fireEvent.change(endInput, { target: { value: '2026-09-10T10:00' } });

        const submitButton = screen.getByRole('button', { name: 'Grant Makeup (3)' });
        fireEvent.click(submitButton);

        expect(onConfirm).not.toHaveBeenCalled();
    });
});
