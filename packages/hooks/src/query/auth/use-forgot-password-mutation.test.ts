import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useForgotPasswordMutation } from './use-forgot-password-mutation';

const { mockResetPasswordForEmail } = vi.hoisted(() => ({
    mockResetPasswordForEmail: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
    useMutation: vi.fn((options: any) => ({
        mutate: options.mutationFn,
        mutateAsync: options.mutationFn,
    })),
}));

vi.mock('../../auth-provider', () => ({
    useAuth: vi.fn(() => ({
        supabase: {
            auth: {
                resetPasswordForEmail: mockResetPasswordForEmail,
            },
        },
    })),
}));

describe('useForgotPasswordMutation Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call resetPasswordForEmail with email and redirectTo', async () => {
        const payload = {
            email: 'test@example.com',
            redirectTo: 'http://localhost:3000/auth/callback',
        };

        mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

        const mutation = useForgotPasswordMutation();
        const result = await (mutation as any).mutate(payload);

        expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
            redirectTo: 'http://localhost:3000/auth/callback',
        });
        expect(result).toEqual({ data: {}, error: null });
    });

    it('should throw an error if resetPasswordForEmail returns an error', async () => {
        const payload = {
            email: 'test@example.com',
        };

        mockResetPasswordForEmail.mockResolvedValue({ data: null, error: new Error('Rate limit exceeded') });

        const mutation = useForgotPasswordMutation();

        await expect((mutation as any).mutate(payload)).rejects.toThrow('Rate limit exceeded');
    });
});
