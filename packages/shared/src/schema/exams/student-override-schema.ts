import * as z from 'zod';

const nullableDateTimeSchema = z.union([z.string(), z.date()]).nullable();

export const studentExamAccessOverrideTypeSchema = z.enum(['MAKEUP', 'RETAKE', 'REOPEN']);

export const studentExamAccessOverrideSchema = z.object({
    id: z.string().uuid(),
    examId: z.string().uuid(),
    studentId: z.string().uuid(),
    grantedBy: z.string().uuid().nullable(),
    overrideType: studentExamAccessOverrideTypeSchema,
    availableFrom: z.union([z.string(), z.date()]),
    availableUntil: z.union([z.string(), z.date()]),
    allowedAttempts: z.number().int().min(1),
    usedAttempts: z.number().int().min(0),
    usedAttemptIds: z.array(z.string().uuid()),
    sourceAttemptId: z.string().uuid().nullable(),
    notes: z.string().nullable(),
    createdAt: nullableDateTimeSchema,
    updatedAt: nullableDateTimeSchema,
});

export const createStudentExamAccessOverrideBodySchema = z
    .object({
        studentId: z.string().uuid(),
        overrideType: studentExamAccessOverrideTypeSchema,
        availableFrom: z.union([z.string(), z.date()]),
        availableUntil: z.union([z.string(), z.date()]),
        allowedAttempts: z.number().int().min(1).optional(),
        sourceAttemptId: z.string().uuid().nullable().optional(),
        notes: z.string().trim().max(1000).nullable().optional(),
    })
    .superRefine((value, context) => {
        const availableFrom = new Date(value.availableFrom);
        const availableUntil = new Date(value.availableUntil);

        if (Number.isNaN(availableFrom.getTime())) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['availableFrom'],
                message: 'Provide a valid availability start time.',
            });
        }

        if (Number.isNaN(availableUntil.getTime())) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['availableUntil'],
                message: 'Provide a valid availability end time.',
            });
        }

        if (
            !Number.isNaN(availableFrom.getTime()) &&
            !Number.isNaN(availableUntil.getTime()) &&
            availableUntil.getTime() <= availableFrom.getTime()
        ) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['availableUntil'],
                message: 'The availability end time must be after the start time.',
            });
        }

        if (value.overrideType === 'RETAKE' && !value.sourceAttemptId) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['sourceAttemptId'],
                message: 'Provide the original attempt when granting a retake.',
            });
        }
    });

export const createAttemptScopedStudentExamAccessOverrideBodySchema =
    createStudentExamAccessOverrideBodySchema.superRefine((value, context) => {
        if (
            (value.overrideType === 'RETAKE' || value.overrideType === 'REOPEN') &&
            !value.sourceAttemptId
        ) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['sourceAttemptId'],
                message:
                    value.overrideType === 'REOPEN'
                        ? 'Provide the original attempt when granting a reopen window.'
                        : 'Provide the original attempt when granting a retake.',
            });
        }
    });

export const batchCreateStudentExamAccessOverrideBodySchema = z
    .object({
        studentIds: z.array(z.string().uuid()).min(1, 'Select at least one student.'),
        overrideType: z.literal('MAKEUP').default('MAKEUP'),
        availableFrom: z.union([z.string(), z.date()]),
        availableUntil: z.union([z.string(), z.date()]),
        allowedAttempts: z.number().int().min(1).optional().default(1),
        notes: z.string().trim().max(1000).nullable().optional(),
    })
    .superRefine((value, context) => {
        const availableFrom = new Date(value.availableFrom);
        const availableUntil = new Date(value.availableUntil);

        if (Number.isNaN(availableFrom.getTime())) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['availableFrom'],
                message: 'Provide a valid availability start time.',
            });
        }

        if (Number.isNaN(availableUntil.getTime())) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['availableUntil'],
                message: 'Provide a valid availability end time.',
            });
        }

        if (
            !Number.isNaN(availableFrom.getTime()) &&
            !Number.isNaN(availableUntil.getTime()) &&
            availableUntil.getTime() <= availableFrom.getTime()
        ) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['availableUntil'],
                message: 'The availability end time must be after the start time.',
            });
        }
    });

export type StudentExamAccessOverrideTypeType = z.infer<typeof studentExamAccessOverrideTypeSchema>;
export type StudentExamAccessOverrideSchemaType = z.infer<typeof studentExamAccessOverrideSchema>;
export type CreateStudentExamAccessOverrideBodyType = z.infer<
    typeof createStudentExamAccessOverrideBodySchema
>;
export type CreateAttemptScopedStudentExamAccessOverrideBodyType = z.infer<
    typeof createAttemptScopedStudentExamAccessOverrideBodySchema
>;
export type BatchCreateStudentExamAccessOverrideBodyType = z.infer<
    typeof batchCreateStudentExamAccessOverrideBodySchema
>;

