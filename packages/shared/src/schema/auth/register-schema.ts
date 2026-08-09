import * as z from 'zod';

export const ApiRegisterSchema = z.object({
    firstName: z
        .string()
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must not exceed 50 characters'),
    lastName: z
        .string()
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must not exceed 50 characters'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(30, 'Password must not exceed 30 characters')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    terms: z.boolean().optional(),
});

export type ApiRegisterSchemaType = z.infer<typeof ApiRegisterSchema>;

export const RegisterSchema = ApiRegisterSchema.extend({
    confirmPassword: z
        .string()
        .min(8, 'Confirm Password must be at least 8 characters')
        .max(30, 'Confirm Password must not exceed 30 characters')
        .regex(/[a-z]/, 'Confirm Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Confirm Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Confirm Password must contain at least one number')
        .regex(/[^a-zA-Z0-9]/, 'Confirm Password must contain at least one special character'),
    terms: z.boolean().refine((val) => val === true, {
        message: 'You must accept the terms and conditions',
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export type RegisterSchemaType = z.infer<typeof RegisterSchema>;
