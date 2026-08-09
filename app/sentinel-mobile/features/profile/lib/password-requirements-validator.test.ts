import { describe, expect, it } from 'vitest';
import { getPasswordRequirements, isPasswordValid } from './password-requirements-validator';

describe('password requirements validator', () => {
    it('should validate minimum length of 8 characters', () => {
        // Less than 8 characters
        const requirementsShort = getPasswordRequirements('Ab1!');
        expect(requirementsShort[0].met).toBe(false);

        // Exactly 8 characters
        const requirementsExact = getPasswordRequirements('Abcd123!');
        expect(requirementsExact[0].met).toBe(true);

        // More than 8 characters
        const requirementsLong = getPasswordRequirements('Abcdefgh1234!');
        expect(requirementsLong[0].met).toBe(true);
    });

    it('should validate lowercase letter requirement', () => {
        // No lowercase
        const requirementsNoLower = getPasswordRequirements('ABCDEF1!');
        expect(requirementsNoLower[1].met).toBe(false);

        // Has lowercase
        const requirementsHasLower = getPasswordRequirements('aBCDEF1!');
        expect(requirementsHasLower[1].met).toBe(true);
    });

    it('should validate uppercase letter requirement', () => {
        // No uppercase
        const requirementsNoUpper = getPasswordRequirements('abcdef1!');
        expect(requirementsNoUpper[2].met).toBe(false);

        // Has uppercase
        const requirementsHasUpper = getPasswordRequirements('Abcdef1!');
        expect(requirementsHasUpper[2].met).toBe(true);
    });

    it('should validate digit/number requirement', () => {
        // No digit
        const requirementsNoDigit = getPasswordRequirements('Abcdefgh!');
        expect(requirementsNoDigit[3].met).toBe(false);

        // Has digit
        const requirementsHasDigit = getPasswordRequirements('Abcdefgh1!');
        expect(requirementsHasDigit[3].met).toBe(true);
    });

    it('should validate special character requirement', () => {
        // No special character
        const requirementsNoSpecial = getPasswordRequirements('Abcdefgh1');
        expect(requirementsNoSpecial[4].met).toBe(false);

        // Has special character
        const requirementsHasSpecial = getPasswordRequirements('Abcdefgh1!');
        expect(requirementsHasSpecial[4].met).toBe(true);
    });

    it('should correctly determine overall password validity with isPasswordValid', () => {
        // Invalid passwords missing one or more rules
        expect(isPasswordValid('')).toBe(false);
        expect(isPasswordValid('short')).toBe(false); // short, no upper, no number, no special
        expect(isPasswordValid('Abcdefgh')).toBe(false); // no number, no special
        expect(isPasswordValid('Abcdefgh1')).toBe(false); // no special
        expect(isPasswordValid('abcdefgh1!')).toBe(false); // no upper
        expect(isPasswordValid('ABCDEFGH1!')).toBe(false); // no lower

        // Valid password meeting all 5 requirements
        expect(isPasswordValid('Abcdefg1!')).toBe(true);
        expect(isPasswordValid('SecurePass123$')).toBe(true);
    });
});
