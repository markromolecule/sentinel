import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeAll } from 'vitest';
import { UserSearchBar } from './user-search-bar';
import { useUserSearch } from '@sentinel/hooks';
import { useRouter } from 'next/navigation';
import React from 'react';

vi.mock('@sentinel/hooks', () => ({
    useUserSearch: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
}));

global.ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
};

const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = String(value);
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();

beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
    });
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
    cleanup();
});

describe('UserSearchBar', () => {
    it('renders the search input and opens the popover', () => {
        const pushMock = vi.fn();
        vi.mocked(useRouter).mockReturnValue({
            push: pushMock,
        } as unknown as ReturnType<typeof useRouter>);

        vi.mocked(useUserSearch).mockReturnValue({
            users: [
                {
                    id: 'user-123',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'student',
                },
            ],
            isLoading: false,
        } as unknown as ReturnType<typeof useUserSearch>);

        const { getByPlaceholderText, getByText } = render(
            <UserSearchBar redirectPath="/student/message" />,
        );

        // Find the input directly
        const input = getByPlaceholderText('Search users by name...');
        expect(input).toBeTruthy();

        // Focus the input to open popover
        fireEvent.focus(input);

        // Type search query
        fireEvent.change(input, { target: { value: 'John' } });

        // Check if user is displayed
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('student')).toBeTruthy();

        // Select the user
        const userItem = getByText('John Doe').closest('[role="option"]');
        expect(userItem).toBeTruthy();
        if (userItem) {
            fireEvent.click(userItem);
        }

        expect(pushMock).toHaveBeenCalledWith('/student/message?userId=user-123');
    });

    it('renders search bar with placeholder text "Search users by name..."', () => {
        const { getByPlaceholderText } = render(<UserSearchBar redirectPath="/student/message" />);
        expect(getByPlaceholderText('Search users by name...')).toBeTruthy();
    });

    it('renders as a visible element with styling classes', () => {
        const { getByPlaceholderText } = render(
            <UserSearchBar redirectPath="/student/message" className="custom-class" />,
        );
        const input = getByPlaceholderText('Search users by name...');
        const container = input.closest('div');
        expect(container).toBeTruthy();
        if (container) {
            expect(container.className).toContain('custom-class');
            expect(container.className).toContain('flex');
            expect(container.className).toContain('items-center');
            expect(container.className).toContain('rounded-none');
        }
    });

    it('renders recent searches from localStorage when open and search query is empty', () => {
        const mockRecent = [
            { id: 'user-rec-1', firstName: 'Jane', lastName: 'Smith', role: 'instructor' },
        ];
        window.localStorage.setItem('sentinel_recent_searches', JSON.stringify(mockRecent));

        vi.mocked(useUserSearch).mockReturnValue({
            users: [],
            isLoading: false,
        } as unknown as ReturnType<typeof useUserSearch>);

        const { getByPlaceholderText, getByText, queryByText } = render(
            <UserSearchBar redirectPath="/student/message" />,
        );

        const input = getByPlaceholderText('Search users by name...');
        fireEvent.focus(input);

        // Should display recent searches section (header is "People" in Teams style)
        expect(getByText('People')).toBeTruthy();
        expect(getByText('Jane')).toBeTruthy();

        // Clear the recent searches
        const clearButton = getByText('Clear');
        fireEvent.click(clearButton);

        expect(queryByText('People')).toBeNull();
        expect(queryByText('Jane')).toBeNull();
        expect(window.localStorage.getItem('sentinel_recent_searches')).toBeNull();
    });

    it('saves user to recent searches on select', () => {
        window.localStorage.removeItem('sentinel_recent_searches');

        const pushMock = vi.fn();
        vi.mocked(useRouter).mockReturnValue({
            push: pushMock,
        } as unknown as ReturnType<typeof useRouter>);

        vi.mocked(useUserSearch).mockReturnValue({
            users: [
                {
                    id: 'user-222',
                    firstName: 'Alice',
                    lastName: 'Wonder',
                    role: 'instructor',
                },
            ],
            isLoading: false,
        } as unknown as ReturnType<typeof useUserSearch>);

        const { getByPlaceholderText, getByText } = render(
            <UserSearchBar redirectPath="/student/message" />,
        );

        const input = getByPlaceholderText('Search users by name...');
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'Alice' } });

        const userItem = getByText('Alice Wonder').closest('[role="option"]');
        expect(userItem).toBeTruthy();
        if (userItem) {
            fireEvent.click(userItem);
        }

        const stored = window.localStorage.getItem('sentinel_recent_searches');
        expect(stored).toBeTruthy();
        if (stored) {
            const parsed = JSON.parse(stored);
            expect(parsed[0].id).toBe('user-222');
            expect(parsed[0].firstName).toBe('Alice');
        }
    });

    it('renders iconOnly mode with the mobile viewport width and all empty/search states', () => {
        const pushMock = vi.fn();
        vi.mocked(useRouter).mockReturnValue({
            push: pushMock,
        } as unknown as ReturnType<typeof useRouter>);

        vi.mocked(useUserSearch).mockReturnValue({
            users: [
                {
                    id: 'user-123',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'student',
                },
            ],
            isLoading: false,
        } as unknown as ReturnType<typeof useUserSearch>);

        window.localStorage.setItem(
            'sentinel_recent_searches',
            JSON.stringify([
                {
                    id: 'user-rec-1',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    role: 'instructor',
                },
            ]),
        );

        const { getByRole, getByPlaceholderText, getByText, queryByText } = render(
            <UserSearchBar redirectPath="/student/message" iconOnly={true} />,
        );

        expect(queryByText('People')).toBeNull();

        fireEvent.click(getByRole('button'));

        const input = getByPlaceholderText('Search users by name...');
        expect(input).toBeTruthy();

        const popoverContent = Array.from(document.querySelectorAll('div')).find((node) =>
            node.className.includes('w-[calc(100svw-1rem)]'),
        );
        expect(popoverContent).toBeTruthy();
        expect(popoverContent?.className).toContain('sm:w-96');

        expect(getByText('People')).toBeTruthy();
        expect(getByText('Jane')).toBeTruthy();
        expect(getByText('Clear')).toBeTruthy();

        fireEvent.click(getByText('Clear'));
        expect(queryByText('People')).toBeNull();
        expect(queryByText('Jane')).toBeNull();

        fireEvent.change(input, { target: { value: 'Jo' } });
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('student')).toBeTruthy();
    });
});
