import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import { MessagesService } from '../messages.service';
import {
    getMessageRecipientsRoute,
    getMessageRecipientsRouteHandler,
} from './get-message-recipients.controller';

vi.mock('../messages.service', () => ({
    MessagesService: {
        listMessageRecipients: vi.fn(),
    },
}));

describe('get-message-recipients.controller', () => {
    const userId = 'a7c93cb6-bce7-440a-9db1-3ef5a9b9a67a';
    const institutionId = '550e8400-e29b-41d4-a716-446655440000';

    function createTestApp(
        permissionKeys: string[],
        userProfile: any = { institution_id: institutionId },
    ) {
        const app = new OpenAPIHono();

        app.use('*', async (c, next) => {
            c.set('dbClient', {} as any);
            c.set('user', {
                id: userId,
                user_profiles: userProfile,
            } as any);
            c.set('activePermissionKeys', permissionKeys);
            await next();
        });

        app.openapi(getMessageRecipientsRoute, getMessageRecipientsRouteHandler);

        return app;
    }

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('requires messages:create permission', async () => {
        const app = createTestApp(['messages:view']); // missing messages:create
        const res = await app.request('/recipients?search=Al');
        expect(res.status).toBe(403);
    });

    it('validates minimum search query length', async () => {
        const app = createTestApp(['messages:create']);
        const res = await app.request('/recipients?search=A'); // 1 char (too short)
        expect(res.status).toBe(400);
    });

    it('validates maximum search query length', async () => {
        const app = createTestApp(['messages:create']);
        const longSearch = 'A'.repeat(101);
        const res = await app.request(`/recipients?search=${longSearch}`);
        expect(res.status).toBe(400);
    });

    it('rejects user without institution id', async () => {
        const app = createTestApp(['messages:create'], null);
        const res = await app.request('/recipients?search=Alice');
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toBe('User does not belong to an institution.');
    });

    it('forwards parameters to MessagesService.listMessageRecipients', async () => {
        const mockRecipients = [
            {
                userId: 'recipient-1',
                name: 'Alice Student',
                avatarUrl: null,
                role: 'student',
                status: 'ACTIVE',
                institution: { id: institutionId, name: 'Sentinel Academy' },
            },
        ];

        vi.spyOn(MessagesService, 'listMessageRecipients').mockResolvedValue(mockRecipients as any);

        const app = createTestApp(['messages:create']);
        const res = await app.request('/recipients?search=Alice&limit=15');
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body).toEqual({
            success: true,
            message: 'Eligible recipients fetched successfully',
            data: mockRecipients,
        });

        expect(MessagesService.listMessageRecipients).toHaveBeenCalledWith(expect.anything(), {
            requesterUserId: userId,
            institutionId,
            search: 'Alice',
            limit: 15,
        });
    });
});
