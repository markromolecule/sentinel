// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import StudentCalendarPage from './page';

const {
    mockUseCalendarEventsQuery,
    mockUseCreateCalendarEventMutation,
    mockUseDeleteCalendarEventMutation,
} = vi.hoisted(() => ({
    mockUseCalendarEventsQuery: vi.fn(),
    mockUseCreateCalendarEventMutation: vi.fn(),
    mockUseDeleteCalendarEventMutation: vi.fn(),
}));

vi.mock('@sentinel/hooks', () => ({
    useCalendarEventsQuery: (...args: unknown[]) => mockUseCalendarEventsQuery(...args),
    useCreateCalendarEventMutation: (...args: unknown[]) =>
        mockUseCreateCalendarEventMutation(...args),
    useDeleteCalendarEventMutation: (...args: unknown[]) =>
        mockUseDeleteCalendarEventMutation(...args),
}));

vi.mock('@/features/calendar', () => ({
    useCalendar: () => ({
        currentMonth: new Date('2026-08-01T00:00:00.000Z'),
        selectedDate: new Date('2026-08-05T00:00:00.000Z'),
        isDetailsOpen: true,
        setIsDetailsOpen: vi.fn(),
        calendarDays: [new Date('2026-08-05T00:00:00.000Z')],
        handlePreviousMonth: vi.fn(),
        handleNextMonth: vi.fn(),
        handleDayClick: vi.fn(),
    }),
    CalendarHeader: ({
        currentMonth,
        onPreviousMonth,
        onNextMonth,
    }: {
        currentMonth: Date;
        onPreviousMonth: () => void;
        onNextMonth: () => void;
    }) => (
        <div data-testid="calendar-header">
            <span>{currentMonth.toISOString()}</span>
            <button onClick={onPreviousMonth}>Prev month</button>
            <button onClick={onNextMonth}>Next month</button>
        </div>
    ),
    CalendarGrid: ({
        getEventsForDate,
    }: {
        getEventsForDate: (date: Date) => Array<{ title: string; createdBy: string }>;
    }) => {
        const events = getEventsForDate(new Date('2026-08-05T00:00:00.000Z'));

        return (
            <div data-testid="calendar-grid">
                {events.map((event) => (
                    <div key={event.title}>{event.title}</div>
                ))}
            </div>
        );
    },
        DayDetailsSheet: ({
            selectedDate,
            getEventsForDate,
            renderActions,
        }: {
            selectedDate: Date | null;
            getEventsForDate: (date: Date) => Array<{ title: string; createdBy: string }>;
            renderActions?: () => ReactNode;
        }) => (
        <div data-testid="day-details-sheet">
            <div data-testid="selected-date">
                {selectedDate ? selectedDate.toISOString() : 'none'}
            </div>
            <div data-testid="sheet-events">
                {getEventsForDate(selectedDate ?? new Date()).map((event) => event.title).join(', ')}
            </div>
            {renderActions ? renderActions() : null}
        </div>
    ),
}));

vi.mock('@sentinel/ui', async () => {
    const actual = await vi.importActual<typeof import('@sentinel/ui')>('@sentinel/ui');

    return {
        ...actual,
        Button: ({
            children,
            onClick,
            disabled,
            variant,
            className,
        }: {
            children: ReactNode;
            onClick?: () => void;
            disabled?: boolean;
            variant?: string;
            className?: string;
        }) => (
            <button data-variant={variant} className={className} onClick={onClick} disabled={disabled}>
                {children}
            </button>
        ),
        Input: ({
            id,
            placeholder,
            value,
            onChange,
            disabled,
            className,
            type,
        }: {
            id?: string;
            placeholder?: string;
            value?: string;
            onChange?: (event: { target: { value: string } }) => void;
            disabled?: boolean;
            className?: string;
            type?: string;
        }) => (
            <input
                id={id}
                placeholder={placeholder}
                value={value}
                onChange={onChange as any}
                disabled={disabled}
                className={className}
                type={type}
            />
        ),
        Textarea: ({
            id,
            placeholder,
            value,
            onChange,
            disabled,
            className,
        }: {
            id?: string;
            placeholder?: string;
            value?: string;
            onChange?: (event: { target: { value: string } }) => void;
            disabled?: boolean;
            className?: string;
        }) => (
            <textarea
                id={id}
                placeholder={placeholder}
                value={value}
                onChange={onChange as any}
                disabled={disabled}
                className={className}
            />
        ),
        Label: ({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) => (
            <label htmlFor={htmlFor} className={className}>
                {children}
            </label>
        ),
        Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
            open ? <div data-testid="dialog">{children}</div> : null,
        DialogContent: ({ children, className }: { children: ReactNode; className?: string }) => (
            <div className={className}>{children}</div>
        ),
        DialogDescription: ({ children, className }: { children: ReactNode; className?: string }) => (
            <p className={className}>{children}</p>
        ),
        DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
        DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
        DialogTitle: ({ children, className }: { children: ReactNode; className?: string }) => (
            <h2 className={className}>{children}</h2>
        ),
        Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
    };
});

describe('StudentCalendarPage', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders API-authorized notes and shared events without client-side ownership filtering', () => {
        mockUseCalendarEventsQuery.mockReturnValue({
            data: [
                {
                    eventId: 'note-1',
                    title: 'My note',
                    description: 'Private reminder',
                    eventType: 'NOTE',
                    targetAudience: 'STUDENTS',
                    startDate: '2026-08-05T00:00:00.000Z',
                    endDate: null,
                    startTime: '08:00:00',
                    endTime: '09:00:00',
                    createdBy: 'student-a',
                    createdByName: 'Student A',
                    createdAt: '2026-08-01T00:00:00.000Z',
                    updatedAt: null,
                },
                {
                    eventId: 'event-1',
                    title: 'Shared Assembly',
                    description: 'Institution-wide event',
                    eventType: 'ANNOUNCEMENT',
                    targetAudience: 'ALL',
                    startDate: '2026-08-05T00:00:00.000Z',
                    endDate: null,
                    startTime: '10:00:00',
                    endTime: '11:00:00',
                    createdBy: 'admin-1',
                    createdByName: 'Admin User',
                    createdAt: '2026-08-01T00:00:00.000Z',
                    updatedAt: null,
                },
            ],
            isLoading: false,
        } as any);

        mockUseCreateCalendarEventMutation.mockReturnValue({
            mutate: vi.fn(),
            isPending: false,
            error: null,
            isError: false,
        } as any);
        mockUseDeleteCalendarEventMutation.mockReturnValue({
            mutate: vi.fn(),
        } as any);

        render(<StudentCalendarPage />);

        expect(mockUseCalendarEventsQuery).toHaveBeenCalledWith({
            payload: {
                month: 8,
                year: 2026,
            },
        });
        expect(screen.getByTestId('calendar-grid').textContent).toContain('My note');
        expect(screen.getByTestId('calendar-grid').textContent).toContain('Shared Assembly');
        expect(screen.getByTestId('sheet-events').textContent).toContain('My note');
        expect(screen.getByTestId('sheet-events').textContent).toContain('Shared Assembly');
        expect(screen.queryByText('Other student note')).toBeNull();
    });

    it('submits a personal note as a STUDENTS-scoped NOTE with the selected date and times', () => {
        const mutateMock = vi.fn(({ title, description, startDate, startTime, endTime, eventType, targetAudience }: any) => {
            expect(title).toBe('Study Session');
            expect(description).toBe('Review chapter 3');
            expect(startDate).toBe('2026-08-05T00:00:00.000Z');
            expect(startTime).toBe('08:30');
            expect(endTime).toBe('09:15');
            expect(eventType).toBe('NOTE');
            expect(targetAudience).toBe('STUDENTS');
        });
        mockUseCalendarEventsQuery.mockReturnValue({
            data: [],
            isLoading: false,
        } as any);
        mockUseCreateCalendarEventMutation.mockReturnValue({
            mutate: mutateMock,
            isPending: false,
            error: null,
            isError: false,
        } as any);
        mockUseDeleteCalendarEventMutation.mockReturnValue({
            mutate: vi.fn(),
        } as any);

        render(<StudentCalendarPage />);

        fireEvent.click(screen.getByRole('button', { name: 'Add Note' }));
        fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Study Session' } });
        fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '08:30' } });
        fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '09:15' } });
        fireEvent.change(screen.getByLabelText('Description'), {
            target: { value: 'Review chapter 3' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save Note' }));

        expect(mutateMock).toHaveBeenCalledOnce();
    });
});
