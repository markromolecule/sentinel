import { z } from 'zod';

export const essayRubricSourceSchema = z.enum(['BASELINE', 'EXAM_OVERRIDE', 'LEGACY']);

export const essayRubricCriterionSchema = z.object({
    key: z.string().trim().min(1).max(50),
    name: z.string().trim().min(1).max(100),
    weight: z.number().positive().max(1),
    description: z.string().trim().min(1).max(500),
    levels: z
        .record(
            z.string().regex(/^[0-4]$/, { message: 'Level keys must be integers from 0 to 4' }),
            z.string().trim().min(1).max(1000),
        )
        .refine(
            (levels) => {
                const keys = Object.keys(levels);
                return (
                    keys.length === 5 && ['0', '1', '2', '3', '4'].every((k) => keys.includes(k))
                );
            },
            { message: 'Levels must define descriptions for exactly keys 0, 1, 2, 3, and 4' },
        ),
});

export const essayRubricDefinitionSchema = z.object({
    criteria: z
        .array(essayRubricCriterionSchema)
        .min(1, { message: 'Rubric must contain at least 1 criterion' })
        .max(10, { message: 'Rubric must contain at most 10 criteria' })
        .refine(
            (criteria) => {
                const keys = criteria.map((c) => c.key);
                return new Set(keys).size === keys.length;
            },
            { message: 'Criteria keys must be unique' },
        )
        .refine(
            (criteria) => {
                const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
                // Allow a small tolerance for floating point representations (e.g. 0.9999 - 1.0001)
                return Math.abs(totalWeight - 1.0) < 0.0001;
            },
            { message: 'Criteria weights must total exactly 100% (1.0)' },
        ),
});

export const essayRubricVersionSchema = z.object({
    id: z.string().uuid(),
    scope: essayRubricSourceSchema,
    examId: z.string().uuid().nullable().optional(),
    versionNumber: z.number().int().positive(),
    definition: essayRubricDefinitionSchema,
    isActive: z.boolean(),
    supersedesVersionId: z.string().uuid().nullable().optional(),
    createdBy: z.string().uuid().nullable().optional(),
    createdAt: z.union([z.string(), z.date()]).optional(),
    updatedAt: z.union([z.string(), z.date()]).optional(),
});

export const updateExamEssayRubricSchema = z.object({
    criteria: z
        .array(essayRubricCriterionSchema)
        .min(1)
        .max(10)
        .refine(
            (criteria) => {
                const keys = criteria.map((c) => c.key);
                return new Set(keys).size === keys.length;
            },
            { message: 'Criteria keys must be unique' },
        )
        .refine(
            (criteria) => {
                const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
                return Math.abs(totalWeight - 1.0) < 0.0001;
            },
            { message: 'Criteria weights must total exactly 100% (1.0)' },
        ),
});
