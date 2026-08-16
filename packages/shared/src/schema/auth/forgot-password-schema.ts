import * as z from 'zod';

export const ForgotPasswordSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

export type ForgotPasswordSchemaType = z.infer<typeof ForgotPasswordSchema>;
