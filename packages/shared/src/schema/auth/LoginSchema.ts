import * as z from "zod";

export const LoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    remember: z.boolean().optional(),
});

export type LoginSchemaType = z.infer<typeof LoginSchema>;
