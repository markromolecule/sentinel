import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
const mockUseUserSearch = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock('@sentinel/hooks', () => ({
    useUserSearch: (...args: any[]) => mockUseUserSearch(...args),
}));

vi.mock('@sentinel/ui', async (importOriginal) => {
    const actual = (await importOriginal()) as any;

    return {
        ...actual,
        Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
            <div data-testid="avatar" className={className}>
                {children}
            </div>
        ),
        AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
            <img data-testid="avatar-image" src={src} alt={alt} />
        ),
        AvatarFallback: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="avatar-fallback">{children}</div>
        ),
        CommandEmpty: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="command-empty">{children}</div>
        ),
        CommandGroup: ({ children, heading }: { children: React.ReactNode; heading?: string }) => (
            <div data-testid="command-group" data-heading={heading}>
                {children}
            </div>
        ),
        CommandItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => (
            <div data-testid="command-item" onClick={onSelect}>
                {children}
            </div>
        ),
        CommandList: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="command-list">{children}</div>
        ),
        Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        PopoverContent: ({ children }: { children: React.ReactNode }) => (
            <div data-testid="popover-content">{children}</div>
        ),
        PopoverAnchor: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    };
});

vi.mock('cmdk', () => ({
    Command: Object.assign(({ children }: { children: React.ReactNode }) => <div>{children}</div>, {
        Input: ({ onFocus, onValueChange, value, placeholder, ...rest }: any) => (
            <input
                data-testid="search-input"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onValueChange?.(e.target.value)}
                onFocus={onFocus}
                {...rest}
            />
        ),
    }),
}));

vi.mock('lucide-react', () => ({
    Search: () => <svg data-testid="search-icon" />,
}));

// ---------------------------------------------------------------------------
// localStorage mock — follows the project pattern from institution-actions-cell.test
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

// ---------------------------------------------------------------------------
// Import component under test (after all mocks are declared)
// ---------------------------------------------------------------------------

import { UserSearchBar } from './user-search-bar';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECENT_SEARCHES_KEY = 'sentinel_recent_searches_v2';

function renderBar(redirectPath = '/messages') {
    return render(<UserSearchBar redirectPath={redirectPath} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserSearchBar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
        // Default: no results, not loading
        mockUseUserSearch.mockReturnValue({ users: [], isLoading: false });
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    it('renders the search input', () => {
        renderBar();
        expect(screen.getByTestId('search-input')).toBeTruthy();
    });

    describe('search results', () => {
        it('renders an <img> when avatarUrl is provided', () => {
            mockUseUserSearch.mockReturnValue({
                users: [
                    {
                        id: 'user-1',
                        firstName: 'Alice',
                        lastName: 'Smith',
                        role: 'student',
                        avatarUrl: 'https://example.com/avatar.png',
                    },
                ],
                isLoading: false,
            });

            renderBar();

            const input = screen.getByTestId('search-input');
            fireEvent.focus(input);
            fireEvent.change(input, { target: { value: 'ali' } });

            const img = screen.getByRole('img');
            expect(img).toBeTruthy();
            expect((img as HTMLImageElement).src).toBe('https://example.com/avatar.png');
        });

        it('renders initials fallback when avatarUrl is null', () => {
            mockUseUserSearch.mockReturnValue({
                users: [
                    {
                        id: 'user-2',
                        firstName: 'Bob',
                        lastName: 'Jones',
                        role: 'instructor',
                        avatarUrl: null,
                    },
                ],
                isLoading: false,
            });

            renderBar();

            const input = screen.getByTestId('search-input');
            fireEvent.focus(input);
            fireEvent.change(input, { target: { value: 'bob' } });

            // No <img> — just the initials fallback div
            expect(screen.queryByRole('img')).toBeNull();
            expect(screen.getByText('BJ')).toBeTruthy();
        });
    });

    describe('localStorage versioning', () => {
        it('reads recent searches from the versioned key sentinel_recent_searches_v2', () => {
            const storedUser = {
                id: 'user-3',
                firstName: 'Carol',
                lastName: 'White',
                role: 'support',
                avatarUrl: 'https://example.com/carol.png',
            };
            localStorageMock.setItem(RECENT_SEARCHES_KEY, JSON.stringify([storedUser]));

            renderBar();

            const input = screen.getByTestId('search-input');
            fireEvent.focus(input);

            expect(screen.getByText('Carol')).toBeTruthy();
        });

        it('writes to sentinel_recent_searches_v2 and persists avatarUrl after a user is selected', () => {
            mockUseUserSearch.mockReturnValue({
                users: [
                    {
                        id: 'user-4',
                        firstName: 'Dan',
                        lastName: 'Brown',
                        role: 'admin',
                        avatarUrl: 'https://example.com/dan.png',
                    },
                ],
                isLoading: false,
            });

            renderBar();

            const input = screen.getByTestId('search-input');
            fireEvent.focus(input);
            fireEvent.change(input, { target: { value: 'dan' } });

            const item = screen.getByTestId('command-item');
            fireEvent.click(item);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                RECENT_SEARCHES_KEY,
                expect.stringContaining('user-4'),
            );

            const lastCall = (localStorageMock.setItem as any).mock.calls.at(-1);
            const parsed = JSON.parse(lastCall[1]);
            expect(parsed[0].id).toBe('user-4');
            // avatarUrl must be persisted
            expect(parsed[0].avatarUrl).toBe('https://example.com/dan.png');
        });

        it('does NOT read from the old sentinel_recent_searches key', () => {
            // Plant data under the old (v1) key — should be ignored
            localStorageMock.setItem(
                'sentinel_recent_searches',
                JSON.stringify([
                    {
                        id: 'old-user',
                        firstName: 'Eve',
                        lastName: 'Old',
                        role: 'student',
                        avatarUrl: null,
                    },
                ]),
            );

            renderBar();

            const input = screen.getByTestId('search-input');
            fireEvent.focus(input);

            // "Eve" must NOT appear — old key is ignored
            expect(screen.queryByText('Eve')).toBeNull();
        });
    });
});
