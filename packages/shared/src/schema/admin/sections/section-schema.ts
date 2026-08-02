import * as z from 'zod';

/**
 * Base section body schema.
 * Used for form validation (frontend) AND API body validation (backend).
 */
export const sectionSchema = z.object({
    institution_id: z.preprocess(
        (value) => (value === '' ? undefined : value),
        z.string().uuid('Invalid institution ID').optional(),
    ),
    name: z.string().min(2, 'Section name is required (e.g., INF231)'),
    department_id: z.string().uuid('Invalid department ID').optional().nullable(),
    course_id: z.string().uuid('Invalid course ID').optional().nullable(),
    year_level: z.coerce.number().optional(),
});

export type SectionFormValues = z.infer<typeof sectionSchema>;
