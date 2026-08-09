export interface PasswordUpdateFields {
    current: string;
    new: string;
    confirm?: string;
}

/**
 * Validates the password update inputs before executing a mutation.
 *
 * @param fields Password input fields.
 */
export function validatePasswordUpdate(fields: PasswordUpdateFields): {
    isValid: boolean;
    error?: string;
} {
    if (!fields.current || !fields.new) {
        return {
            isValid: false,
            error: 'Please fill in all password fields.',
        };
    }

    if (fields.new.length < 8) {
        return {
            isValid: false,
            error: 'New password must be at least 8 characters.',
        };
    }

    if (fields.current === fields.new) {
        return {
            isValid: false,
            error: 'New password cannot be the same as your current password.',
        };
    }

    return { isValid: true };
}
