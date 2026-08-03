import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { RowRoomCombobox } from './row-room-combobox';

vi.mock('@sentinel/hooks', () => ({
    useRoomSearch: vi.fn(() => ({
        rooms: [
            {
                id: 'room-2',
                name: 'Lab B',
                room_number: '202',
                status: 'AVAILABLE',
            },
        ],
        isLoading: false,
    })),
}));

describe('RowRoomCombobox', () => {
    const mockRooms = [
        { id: 'room-1', name: 'Lab A', room_number: '101', status: 'AVAILABLE' },
        { id: 'room-3', name: 'Lecture Hall', room_number: '301', status: 'ASSIGNED' },
    ];
    const mockOnValueChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders with placeholder when no value is selected', () => {
        render(
            <RowRoomCombobox
                value="none"
                onValueChange={mockOnValueChange}
                rooms={mockRooms as any}
                placeholder="Select room"
            />,
        );

        const input = screen.getByRole('combobox') as HTMLInputElement;
        expect(input.placeholder).toBe('Select room');
        expect(input.value).toBe('');
    });

    it('displays the selected room name and number in the input', () => {
        render(
            <RowRoomCombobox
                value="room-1"
                onValueChange={mockOnValueChange}
                rooms={mockRooms as any}
            />,
        );

        const input = screen.getByRole('combobox') as HTMLInputElement;
        expect(input.value).toBe('Lab A (101)');
    });

    it('does not open dropdown when disabled', () => {
        render(
            <RowRoomCombobox
                value="none"
                onValueChange={mockOnValueChange}
                rooms={mockRooms as any}
                disabled
            />,
        );

        const input = screen.getByRole('combobox');
        fireEvent.focus(input);

        // Combobox should remain closed (no room items visible in dropdown)
        expect(screen.queryByText('Lab A')).toBeNull();
    });

    it('shows a clear affordance when a room is selected', () => {
        render(
            <RowRoomCombobox
                value="room-1"
                onValueChange={mockOnValueChange}
                rooms={mockRooms as any}
            />,
        );

        // ComboboxClear renders with data-slot="combobox-clear" when showClear=true
        const clearEl = document.querySelector('[data-slot="combobox-clear"]');
        expect(clearEl).not.toBeNull();
    });
});
