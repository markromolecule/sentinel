import { describe, expect, it } from 'vitest';
import { validatePasswordUpdate } from './password-update-handler';

describe('validatePasswordUpdate utility', () => {
    it('returns error if fields are missing', () => {
        const result = validatePasswordUpdate({ current: '', new: '' });
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please fill in all password fields.');
    });

    it('returns error if new password is too short', () => {
        const result = validatePasswordUpdate({ current: 'oldPass123', new: 'short' });
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('New password must be at least 8 characters.');
    });

    it('returns error if new password is equal to old password', () => {
        const result = validatePasswordUpdate({ current: 'samePass123', new: 'samePass123' });
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('New password cannot be the same as your current password.');
    });

    it('returns valid true if passwords are correct', () => {
        const result = validatePasswordUpdate({ current: 'oldPass123', new: 'brandNewPass123' });
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
    });
});
