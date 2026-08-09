import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { UserAuthService } from './user-auth.service';

vi.mock('../../../../lib/supabase-admin', () => ({
    supabaseAdmin: {
        auth: {
            admin: {
                deleteUser: vi.fn(),
            },
        },
    },
}));

describe('UserAuthService.deleteUserAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('treats missing auth users as already deleted', async () => {
        vi.mocked(supabaseAdmin.auth.admin.deleteUser).mockResolvedValue({
            data: { user: null },
            error: {
                status: 404,
                message: 'User not found',
            },
        } as any);

        await expect(UserAuthService.deleteUserAuth({} as any, 'user-1')).resolves.toBeUndefined();
    });

    it('throws a bad request exception for other auth deletion errors', async () => {
        vi.mocked(supabaseAdmin.auth.admin.deleteUser).mockResolvedValue({
            data: { user: null },
            error: {
                status: 400,
                message: 'Database error deleting user',
            },
        } as any);

        await expect(UserAuthService.deleteUserAuth({} as any, 'user-1')).rejects.toBeInstanceOf(
            HTTPException,
        );
    });
});
