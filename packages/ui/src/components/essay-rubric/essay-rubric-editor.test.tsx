import React from 'react';
import {
    cleanup,
    fireEvent,
    render,
    screen,
} from '../../../../../app/sentinel-web/node_modules/@testing-library/react/dist/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EssayRubricEditor } from './essay-rubric-editor';
import type { EssayRubricCriterion } from '@sentinel/shared';

const mockCriteria: EssayRubricCriterion[] = [
    {
        key: 'c1',
        name: 'Criterion 1',
        description: 'Description 1',
        weight: 0.6,
        levels: {
            4: 'L4_1',
            3: 'L3_1',
            2: 'L2_1',
            1: 'L1_1',
            0: 'L0_1',
        },
    },
    {
        key: 'c2',
        name: 'Criterion 2',
        description: 'Description 2',
        weight: 0.4,
        levels: {
            4: 'L4_2',
            3: 'L3_2',
            2: 'L2_2',
            1: 'L1_2',
            0: 'L0_2',
        },
    },
];

describe('EssayRubricEditor', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders read-only view when canOverride is false', () => {
        render(
            <EssayRubricEditor
                initialCriteria={mockCriteria}
                onSave={vi.fn()}
                canOverride={false}
            />,
        );

        expect(screen.getByText(/Read-only View/i)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Save Changes/i })).toBeNull();
        expect(screen.getByText('Criterion 1')).toBeTruthy();
        expect(screen.getByText('Criterion 2')).toBeTruthy();
    });

    it('renders editor view with correct criteria list when canOverride is true', () => {
        render(
            <EssayRubricEditor
                initialCriteria={mockCriteria}
                onSave={vi.fn()}
                canOverride={true}
            />,
        );

        expect(screen.getByText('Rubric Criteria List')).toBeTruthy();
        expect(screen.getByText('Criterion 1')).toBeTruthy();
        expect(screen.getByText('Criterion 2')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeTruthy();
    });

    it('supports adding a new criterion', () => {
        render(
            <EssayRubricEditor
                initialCriteria={mockCriteria}
                onSave={vi.fn()}
                canOverride={true}
            />,
        );

        const addButton = screen.getByRole('button', { name: /Add/i });
        fireEvent.click(addButton);

        expect(screen.getByText('Criterion #3')).toBeTruthy();
        // Total weight will now be 100% (initial) + 0% (new) = 100%
        expect(screen.getByText('100%')).toBeTruthy();
    });

    it('supports deleting a criterion', () => {
        render(
            <EssayRubricEditor
                initialCriteria={mockCriteria}
                onSave={vi.fn()}
                canOverride={true}
            />,
        );

        // Delete second criterion
        const deleteButtons = screen.getAllByRole('button', { name: /Delete Criterion/i });
        fireEvent.click(deleteButtons[1]);

        expect(screen.queryByText('Criterion 2')).toBeNull();
        // Since we deleted c2 (40% weight), total weight is now 60%
        expect(screen.getAllByText('60%').length).toBeGreaterThan(0);
        // Validation warning for weight !== 100% should show
        expect(screen.getByText(/Total weight must equal exactly 100%/i)).toBeTruthy();
    });

    it('validates weight total and disables save button when not equal to 100%', () => {
        const onSave = vi.fn();
        render(
            <EssayRubricEditor initialCriteria={mockCriteria} onSave={onSave} canOverride={true} />,
        );

        // Save should be disabled initially because dirty state is false (no changes made)
        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        expect(saveButton.disabled).toBe(true);

        // Change name of first criterion to make it dirty
        const nameInput = screen.getByLabelText(/Criterion Name/i) as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'Modified Name' } });

        // Save should now be enabled since it's dirty and valid (total weight is 100%)
        expect(saveButton.disabled).toBe(false);

        // Change weight to make it invalid
        const weightInput = screen.getByLabelText(/Weight Allocation/i) as HTMLInputElement;
        fireEvent.change(weightInput, { target: { value: '50' } }); // 50% instead of 60%

        // Total weight is now 50% + 40% = 90%
        expect(screen.getAllByText('90%').length).toBeGreaterThan(0);
        expect(saveButton.disabled).toBe(true);
        expect(screen.getByText(/Total weight must equal exactly 100%/i)).toBeTruthy();
    });

    it('supports discarding changes and reverting to initial state', () => {
        render(
            <EssayRubricEditor
                initialCriteria={mockCriteria}
                onSave={vi.fn()}
                canOverride={true}
            />,
        );

        const nameInput = screen.getByLabelText(/Criterion Name/i) as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'Changed Name' } });

        expect(screen.getByDisplayValue('Changed Name')).toBeTruthy();

        const discardButton = screen.getByRole('button', { name: /Discard/i });
        fireEvent.click(discardButton);

        expect(screen.queryByDisplayValue('Changed Name')).toBeNull();
        expect(screen.getByDisplayValue('Criterion 1')).toBeTruthy();
    });

    it('displays confirmation dialog before resetting to baseline', async () => {
        const onReset = vi.fn();
        render(
            <EssayRubricEditor
                initialCriteria={mockCriteria}
                onSave={vi.fn()}
                onReset={onReset}
                canOverride={true}
                isSupport={false}
            />,
        );

        const resetButton = screen.getByRole('button', { name: /Reset to Baseline/i });
        fireEvent.click(resetButton);

        // Confirmation dialog should appear
        expect(screen.getByText('Reset Essay Rubric to Baseline?')).toBeTruthy();

        const confirmButton = screen.getByRole('button', { name: /Confirm Reset/i });
        fireEvent.click(confirmButton);

        expect(onReset).toHaveBeenCalledTimes(1);
    });
});
