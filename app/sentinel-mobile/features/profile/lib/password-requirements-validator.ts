/**
 * Password requirements validation utility for Sentinel Mobile.
 * Enforces the 5 regex rules matching the sentinel-web registration schema.
 */

export interface PasswordRequirementStatus {
    text: string;
    met: boolean;
}

/**
 * Returns the status of the 5 password requirement rules for a given password value.
 *
 * @param value The password string to evaluate.
 */
export function getPasswordRequirements(value: string = ''): PasswordRequirementStatus[] {
    return [
        {
            met: value.length >= 8,
            text: 'At least 8 characters',
        },
        {
            met: /[a-z]/.test(value),
            text: 'One lowercase letter',
        },
        {
            met: /[A-Z]/.test(value),
            text: 'One uppercase letter',
        },
        {
            met: /[0-9]/.test(value),
            text: 'One number',
        },
        {
            met: /[^a-zA-Z0-9]/.test(value),
            text: 'One special character',
        },
    ];
}

/**
 * Checks if a password satisfies all 5 validation rules.
 *
 * @param value The password string to validate.
 */
export function isPasswordValid(value: string): boolean {
    return getPasswordRequirements(value).every((req) => req.met);
}
