import * as z from "zod";

export const subjectFormSchema = z.object({
    code: z.string().min(2, "Code must be at least 2 characters"),
    title: z.string().min(3, "Title must be at least 3 characters"),
    section: z.string().min(1, "Section is required"),
});

export type SubjectFormValues = z.infer<typeof subjectFormSchema>;
