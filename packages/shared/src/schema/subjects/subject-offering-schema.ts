import * as z from 'zod';

const yearLevelSchema = z.coerce
    .number()
    .int()
    .min(1, 'Year level must be at least 1')
    .max(6, 'Year level must be at most 6');

function hasOfferingAudience(value: {
    department_ids?: unknown[];
    course_ids?: unknown[];
    section_ids?: unknown[];
    year_levels?: unknown[];
}) {
    return (
        (value.department_ids?.length ?? 0) > 0 ||
        (value.course_ids?.length ?? 0) > 0 ||
        (value.section_ids?.length ?? 0) > 0 ||
        (value.year_levels?.length ?? 0) > 0
    );
}

const subjectOfferingFieldsSchema = z.object({
    subject_id: z.string().uuid('Invalid subject ID'),
    term_id: z.string().uuid('Invalid term ID'),
    department_ids: z.array(z.string().uuid('Invalid department ID')).default([]),
    course_ids: z.array(z.string().uuid('Invalid course ID')).default([]),
    section_ids: z.array(z.string().uuid('Invalid section ID')).default([]),
    year_levels: z.array(yearLevelSchema).default([]),
});

export const subjectOfferingFormSchema = subjectOfferingFieldsSchema.superRefine((value, ctx) => {
    if (hasOfferingAudience(value)) {
        return;
    }

    ctx.addIssue({
        code: 'custom',
        path: ['department_ids'],
        message: 'Select at least one department, course, year level, or section',
    });
});

export const subjectOfferingUpdateFormSchema = subjectOfferingFieldsSchema
    .omit({
        subject_id: true,
    })
    .partial()
    .extend({
        status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED']).optional(),
    })
    .superRefine((value, ctx) => {
        const includesAudienceUpdate =
            value.department_ids !== undefined ||
            value.course_ids !== undefined ||
            value.section_ids !== undefined ||
            value.year_levels !== undefined;

        if (!includesAudienceUpdate || hasOfferingAudience(value)) {
            return;
        }

        ctx.addIssue({
            code: 'custom',
            path: ['department_ids'],
            message: 'Select at least one department, course, year level, or section',
        });
    });

export const subjectOfferingDuplicateStrategySchema = z
    .enum(['skip_existing', 'fail_existing'])
    .default('skip_existing');

export const classificationSubjectOfferingFormSchema = z
    .object({
        subject_classification_id: z.string().uuid('Invalid subject classification ID'),
        term_id: z.string().uuid('Invalid term ID'),
        department_ids: z.array(z.string().uuid('Invalid department ID')).default([]),
        course_ids: z.array(z.string().uuid('Invalid course ID')).default([]),
        section_ids: z.array(z.string().uuid('Invalid section ID')).default([]),
        year_levels: z.array(yearLevelSchema).default([]),
        institution_id: z.string().uuid('Invalid institution ID').optional().nullable(),
        duplicate_strategy: subjectOfferingDuplicateStrategySchema.optional(),
    })
    .superRefine((value, ctx) => {
        if (hasOfferingAudience(value)) {
            return;
        }

        ctx.addIssue({
            code: 'custom',
            path: ['department_ids'],
            message: 'Select at least one department, course, year level, or section',
        });
    });

export type SubjectOfferingFormValues = z.infer<typeof subjectOfferingFormSchema>;
export type SubjectOfferingUpdateFormValues = z.infer<typeof subjectOfferingUpdateFormSchema>;
export type SubjectOfferingDuplicateStrategy = z.infer<
    typeof subjectOfferingDuplicateStrategySchema
>;
export type ClassificationSubjectOfferingFormValues = z.infer<
    typeof classificationSubjectOfferingFormSchema
>;
