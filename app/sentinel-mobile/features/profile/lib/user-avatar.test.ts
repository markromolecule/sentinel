import { describe, expect, it } from 'vitest';
import { getUserAvatarInitials } from './user-avatar';

describe('getUserAvatarInitials utility', () => {
    it('returns initials from first and last names', () => {
        expect(getUserAvatarInitials('John', 'Doe')).toBe('JD');
        expect(getUserAvatarInitials('Sarah', 'Wilson')).toBe('SW');
    });

    it('returns single initial if only first name is present', () => {
        expect(getUserAvatarInitials('John', '')).toBe('J');
        expect(getUserAvatarInitials('John', null)).toBe('J');
    });

    it('returns initials from email if names are missing', () => {
        expect(getUserAvatarInitials('', '', 'john.doe@example.com')).toBe('JD');
        expect(getUserAvatarInitials(null, null, 'jane_smith@example.com')).toBe('JS');
        expect(getUserAvatarInitials(null, null, 'student@example.com')).toBe('ST');
    });

    it('returns fallback initial if all args are empty/missing', () => {
        expect(getUserAvatarInitials('', '', '')).toBe('U');
        expect(getUserAvatarInitials(null, null, null)).toBe('U');
    });
});
