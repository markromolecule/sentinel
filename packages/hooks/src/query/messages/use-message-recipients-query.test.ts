import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageRecipientsQuery } from './use-message-recipients-query';
import { getMessageRecipients } from '@sentinel/services';
import { MESSAGES_QUERY_KEYS } from '@sentinel/shared/constants';
import { useDebounce } from '../../use-debounce';

const mockUseAuthenticatedQueryEnabled = vi.fn(() => true);

// Mock tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn((options: any) => {
        if (options.enabled !== false && options.queryFn) {
            options.queryFn();
        }
        return {
            queryKey: options.queryKey,
            enabled: options.enabled,
        };
    }),
}));

// Mock sentinel/services
vi.mock('@sentinel/services', () => ({
    getMessageRecipients: vi.fn(),
}));

// Mock api provider hook
vi.mock('../../api-provider', () => ({
    useApi: vi.fn(() => ({ mockClient: true })),
}));

// Mock authentication status hook
vi.mock('../_shared/use-authenticated-query-enabled', () => ({
    useAuthenticatedQueryEnabled: () => mockUseAuthenticatedQueryEnabled(),
}));

// Mock debounce hook
vi.mock('../../use-debounce', () => ({
    useDebounce: vi.fn((val) => val),
}));

describe('useMessageRecipientsQuery Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuthenticatedQueryEnabled.mockReturnValue(true);
    });

    it('applies trim and debounce, sets correct query key, and triggers fetch', () => {
        const query = useMessageRecipientsQuery('  Alice  ', 15) as any;

        expect(useDebounce).toHaveBeenCalledWith('Alice', 300);
        expect(query.queryKey).toEqual(MESSAGES_QUERY_KEYS.recipients('Alice', 15));
        expect(getMessageRecipients).toHaveBeenCalledWith(
            { mockClient: true },
            { search: 'Alice', limit: 15 },
        );
        expect(query.enabled).toBe(true);
    });

    it('requires at least 2 characters to be enabled', () => {
        const query = useMessageRecipientsQuery('A', 15) as any;

        expect(query.enabled).toBe(false);
        expect(getMessageRecipients).not.toHaveBeenCalled();
    });

    it('stays disabled if authenticated query is disabled', () => {
        mockUseAuthenticatedQueryEnabled.mockReturnValue(false);

        const query = useMessageRecipientsQuery('Alice', 15) as any;

        expect(query.enabled).toBe(false);
        expect(getMessageRecipients).not.toHaveBeenCalled();
    });

    it('defaults limit to 20', () => {
        const query = useMessageRecipientsQuery('Alice') as any;

        expect(query.queryKey).toEqual(MESSAGES_QUERY_KEYS.recipients('Alice', 20));
        expect(getMessageRecipients).toHaveBeenCalledWith(
            { mockClient: true },
            { search: 'Alice', limit: 20 },
        );
    });
});
