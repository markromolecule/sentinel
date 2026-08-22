import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { NewAssignmentsBuilder } from './new-assignments-builder';
import {
    useCreateExamSectionAssignmentsBatchMutation,
    useClassroomsQuery,
    useRoomsQuery,
    useUsersQuery,
    useProfileQuery,
} from '@sentinel/hooks';

vi.mock('@sentinel/hooks', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        useCreateExamSectionAssignmentsBatchMutation: vi.fn(),
        useClassroomsQuery: vi.fn(() => ({
            data: [
                {
                    id: 'cls-1',
                    className: 'Classroom Alpha',
                    sectionId: 'section-1',
                    subjectId: 'sub-1',
                    scopeSummary: { sectionLabel: 'Section Alpha' },
                },
                {
                    id: 'cls-2',
                    className: 'Classroom Beta',
                    sectionId: 'section-2',
                    subjectId: 'sub-2',
                    scopeSummary: { sectionLabel: 'Section Beta' },
                },
            ],
            isLoading: false,
        })),
        useRoomsQuery: vi.fn(() => ({
            data: [{ id: 'room-1', name: 'Room 101', room_number: '101', status: 'AVAILABLE' }],
            isLoading: false,
        })),
        useUsersQuery: vi.fn(() => ({
            data: [
                { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@sentinel.edu' },
            ],
            isLoading: false,
        })),
        useProfileQuery: vi.fn(() => ({
            profile: { institutionId: 'institution-1' },
            isLoading: false,
        })),
        useUserSearch: vi.fn(() => ({
            users: [
                { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@sentinel.edu' },
            ],
            isLoading: false,
        })),
    };
});

vi.mock('./row-classroom-combobox', () => ({
    RowClassroomCombobox: React.forwardRef(
        ({ value, onValueChange, classrooms }: any, ref: any) => (
            <div data-testid="mock-classroom-combobox">
                <input
                    ref={ref}
                    data-testid="classroom-input"
                    value={value}
                    onChange={(e) => onValueChange(e.target.value)}
                />
                {classrooms.map((cls: any) => (
                    <button
                        key={cls.id}
                        data-testid={`classroom-select-${cls.id}`}
                        onClick={() => onValueChange(cls.id)}
                    >
                        {cls.className}
                    </button>
                ))}
            </div>
        ),
    ),
}));

vi.mock('./row-instructor-combobox', () => ({
    RowInstructorCombobox: React.forwardRef(
        ({ value, onValueChange, users, placeholder }: any, ref: any) => (
            <div data-testid="mock-instructor-combobox">
                <input
                    ref={ref}
                    data-testid={
                        placeholder === 'Apply instructor to all...'
                            ? 'bulk-instructor-input'
                            : 'instructor-input'
                    }
                    value={value}
                    onChange={(e) => onValueChange(e.target.value)}
                />
                {users.map((usr: any) => (
                    <button
                        key={usr.id}
                        data-testid={`instructor-select-${usr.id}`}
                        onClick={() => onValueChange(usr.id)}
                    >
                        {usr.firstName}
                    </button>
                ))}
            </div>
        ),
    ),
}));

vi.mock('./row-room-combobox', () => ({
    RowRoomCombobox: React.forwardRef(({ value, onValueChange, rooms }: any, ref: any) => (
        <div data-testid="mock-room-combobox">
            <input
                ref={ref}
                data-testid="room-input"
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
            />
            {rooms.map((room: any) => (
                <button
                    key={room.id}
                    data-testid={`room-select-${room.id}`}
                    onClick={() => onValueChange(room.id)}
                >
                    {room.name}
                </button>
            ))}
        </div>
    )),
}));

vi.mock('@sentinel/ui', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        Select: ({ children, value, onValueChange }: any) => (
            <div data-testid="mock-select">
                <input
                    data-testid="room-input"
                    value={value}
                    onChange={(e) => onValueChange(e.target.value)}
                />
                {children}
            </div>
        ),
        SelectTrigger: React.forwardRef(({ children }: any, ref: any) => (
            <button ref={ref} data-testid="select-trigger">
                {children}
            </button>
        )),
        SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
        SelectContent: ({ children }: any) => <div>{children}</div>,
        SelectItem: ({ children, value }: any) => (
            <button data-testid={`select-item-${value}`}>{children}</button>
        ),
    };
});

describe('NewAssignmentsBuilder', () => {
    const mockBatchMutate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
        vi.mocked(useCreateExamSectionAssignmentsBatchMutation).mockReturnValue({
            mutateAsync: mockBatchMutate,
            isPending: false,
        } as any);
    });

    it('renders and verifies that all fields are required', async () => {
        render(<NewAssignmentsBuilder examId="exam-1" currentAssignments={[]} />);

        expect(screen.getByText('Apply instructor to all rows')).toBeDefined();
        expect(screen.getByText('Add another classroom')).toBeDefined();

        // Initially 0 of 1 assignments ready
        expect(screen.getByText('0 of 1 assignments ready')).toBeDefined();

        // Submit form without filling fields
        const saveBtn = screen.getByRole('button', { name: 'Save assignments' });
        fireEvent.click(saveBtn);

        // Validation errors should be displayed inline
        expect(screen.getByText('Classroom is required.')).toBeDefined();
        expect(screen.getByText('Room is required.')).toBeDefined();
        expect(screen.getByText('Instructor is required.')).toBeDefined();
    });

    it('applies bulk instructor and saves a valid batch successfully', async () => {
        render(<NewAssignmentsBuilder examId="exam-1" currentAssignments={[]} />);

        // Set classroom
        fireEvent.click(screen.getByTestId('classroom-select-cls-1'));

        // Apply bulk instructor
        const bulkInput = screen.getByTestId('bulk-instructor-input');
        fireEvent.change(bulkInput, { target: { value: 'user-1' } });

        // Set room
        const roomInput = screen.getByTestId('room-input');
        fireEvent.change(roomInput, { target: { value: 'room-1' } });

        // Now it should be ready
        expect(screen.getByText('1 of 1 assignments ready')).toBeDefined();

        // Submit batch
        const saveBtn = screen.getByRole('button', { name: 'Save assignments' });
        fireEvent.click(saveBtn);

        expect(mockBatchMutate).toHaveBeenCalledWith({
            examId: 'exam-1',
            payload: {
                assignments: [
                    {
                        sectionId: 'section-1',
                        classGroupId: 'cls-1',
                        roomId: 'room-1',
                        instructorId: 'user-1',
                    },
                ],
            },
        });
    });

    it('keeps the dialog recoverable when the batch mutation fails', async () => {
        render(<NewAssignmentsBuilder examId="exam-1" currentAssignments={[]} />);

        fireEvent.click(screen.getByTestId('classroom-select-cls-1'));
        fireEvent.change(screen.getByTestId('bulk-instructor-input'), {
            target: { value: 'user-1' },
        });
        fireEvent.change(screen.getByTestId('room-input'), { target: { value: 'room-1' } });

        mockBatchMutate.mockRejectedValueOnce(new Error('Assignment service unavailable'));

        fireEvent.click(screen.getByRole('button', { name: 'Save assignments' }));

        await waitFor(() => {
            expect(screen.getByRole('alert').textContent).toContain(
                'Assignment service unavailable',
            );
        });
    });

    it('filters classrooms by subjectId if provided', () => {
        render(<NewAssignmentsBuilder examId="exam-1" subjectId="sub-2" currentAssignments={[]} />);

        // Assert only subject matched classroom cls-2 is shown, while cls-1 is filtered out
        expect(screen.queryByTestId('classroom-select-cls-2')).not.toBeNull();
        expect(screen.queryByTestId('classroom-select-cls-1')).toBeNull();
    });

    it('safely handles paginated rooms query response without throwing S.filter is not a function', () => {
        vi.mocked(useRoomsQuery).mockReturnValueOnce({
            data: {
                data: [{ id: 'room-1', name: 'Room 101', room_number: '101', status: 'AVAILABLE' }],
                meta: { page: 1, limit: 25, total: 1, totalPages: 1 },
            },
            isLoading: false,
        } as any);

        expect(() => {
            render(<NewAssignmentsBuilder examId="exam-1" currentAssignments={[]} />);
        }).not.toThrow();

        expect(screen.getByTestId('room-select-room-1')).toBeDefined();
    });
});
