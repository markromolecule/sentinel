export const PASSWORD_REQUIREMENTS = (value: string = '') => [
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
