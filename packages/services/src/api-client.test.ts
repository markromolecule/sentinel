import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from './api-client';

describe('createApiClient', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('rewrites limit query parameters to pageSize before fetching', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: {
                get: () => 'application/json',
            },
            json: async () => ({ data: [] }),
        });

        vi.stubGlobal('fetch', fetchMock);

        const apiClient = createApiClient({ baseUrl: 'https://example.test' });

        await apiClient('/rooms?search=lab&limit=25&page=2');

        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.test/rooms?search=lab&page=2&pageSize=25',
            expect.objectContaining({
                headers: expect.any(Headers),
            }),
        );
    });

    it('adds a limit alias when a JSON response includes pagination.pageSize', async () => {
        const jsonResponse = {
            items: [{ id: 'room-1' }],
            pagination: {
                page: 2,
                pageSize: 25,
                total: 100,
                totalPages: 4,
                hasMore: true,
            },
        };

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: {
                get: () => 'application/json; charset=utf-8',
            },
            json: async () => jsonResponse,
        });

        vi.stubGlobal('fetch', fetchMock);

        const apiClient = createApiClient();
        const response = await apiClient('/rooms?page=2&pageSize=25');

        expect(response).toEqual({
            items: [{ id: 'room-1' }],
            pagination: {
                page: 2,
                pageSize: 25,
                limit: 25,
                total: 100,
                totalPages: 4,
                hasMore: true,
            },
        });
    });

    it('translates Failed to fetch into a descriptive ApiError', async () => {
        const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        vi.stubGlobal('fetch', fetchMock);

        const apiClient = createApiClient();

        await expect(apiClient('/ai/generate-preview')).rejects.toMatchObject({
            name: 'ApiError',
            status: 0,
            statusText: 'Network Error',
            message:
                'Unable to connect to the server. The uploaded files may exceed the 4.5MB serverless payload limit or the request exceeded the 60-second execution window. Please try again with smaller files or a smaller question batch.',
        });
    });

    it('translates Failed to fetch into a descriptive ApiError for non-AI routes', async () => {
        const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        vi.stubGlobal('fetch', fetchMock);

        const apiClient = createApiClient();

        await expect(apiClient('/rooms')).rejects.toMatchObject({
            name: 'ApiError',
            status: 0,
            statusText: 'Network Error',
            message:
                'Unable to connect to the server. Please check your network connection or try again with a smaller file/question batch.',
        });
    });
});

