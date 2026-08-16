import { describe, expect, it } from 'vitest';
import { ForgotPasswordSchema } from './forgot-password-schema';

describe('ForgotPasswordSchema', () => {
    it('should validate a correct email address', () => {
        const result = ForgotPasswordSchema.safeParse({ email: 'test@example.com' });
        expect(result.success).toBe(true);
    });

    it('should fail validation on empty email', () => {
        const result = ForgotPasswordSchema.safeParse({ email: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Email is required');
        }
    });

    it('should fail validation on malformed email', () => {
        const result = ForgotPasswordSchema.safeParse({ email: 'invalid-email' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Invalid email address');
        }
    });
});
