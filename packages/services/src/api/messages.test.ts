import { describe, expect, it, vi } from 'vitest';
import { getMessageRecipients } from './messages';

describe('getMessageRecipients', () => {
    it('sends a search request with query parameters and returns recipients list', async () => {
        const mockRecipients = [
            {
                userId: 'recipient-1',
                name: 'Alice Student',
                avatarUrl: null,
                role: 'student',
                status: 'ACTIVE',
                institution: { id: 'inst-1', name: 'Sentinel Academy' },
            },
        ];

        const apiClient = vi.fn().mockResolvedValue({
            success: true,
            message: 'Eligible recipients fetched successfully',
            data: mockRecipients,
        });

        const result = await getMessageRecipients(apiClient, {
            search: ' Alice ', // should be trimmed
            limit: 10,
        });

        expect(apiClient).toHaveBeenCalledWith('/messages/recipients?search=Alice&limit=10', {
            method: 'GET',
        });
        expect(result).toEqual(mockRecipients);
    });

    it('omits limit query parameter if it is not provided', async () => {
        const apiClient = vi.fn().mockResolvedValue({
            success: true,
            message: 'Eligible recipients fetched successfully',
            data: [],
        });

        await getMessageRecipients(apiClient, {
            search: 'Bob',
        });

        expect(apiClient).toHaveBeenCalledWith('/messages/recipients?search=Bob', {
            method: 'GET',
        });
    });

    it('propagates API errors correctly', async () => {
        const apiClient = vi.fn().mockResolvedValue({
            success: false,
            message: 'Failed to fetch recipients',
            error: 'Database connection failed',
        });

        await expect(
            getMessageRecipients(apiClient, {
                search: 'ErrorCase',
            }),
        ).rejects.toThrow('Database connection failed');
    });
});
