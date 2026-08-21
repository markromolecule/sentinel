import * as z from 'zod';

/**
 * Base classroom create schema.
 * Shared across frontend forms and backend request validation.
 */
export const classroomFormSchema = z.object({
    classGroupId: z.string().uuid('Invalid class group ID'),
    className: z.string().trim().min(1, 'Classroom name is required').max(255),
});

/**
 * Classroom update schema.
 * Rename-only for Phase 1 so the classroom module owns metadata while the
 * underlying class group scope stays unchanged.
 */
export const classroomUpdateFormSchema = z.object({
    className: z.string().trim().min(1, 'Classroom name is required').max(255),
});

export type ClassroomFormValues = z.infer<typeof classroomFormSchema>;
export type ClassroomUpdateFormValues = z.infer<typeof classroomUpdateFormSchema>;

export const classroomScopeSummarySchema = z.object({
    subject_label: z.string(),
    section_label: z.string(),
    term_label: z.string(),
    department_label: z.string().nullable(),
    course_label: z.string().nullable(),
    year_level_label: z.string().nullable(),
});

export const classroomSummarySchema = z.object({
    class_group_id: z.string().uuid(),
    class_name: z.string().max(255).nullable(),
    is_configured: z.boolean(),
    subject_offering_id: z.string().uuid().nullable(),
    subject_id: z.string().uuid().nullable(),
    subject_code: z.string().nullable(),
    subject_title: z.string().nullable(),
    section_id: z.string().uuid().nullable(),
    section_name: z.string().nullable(),
    term_id: z.string().uuid().nullable(),
    term_academic_year: z.string().nullable(),
    term_semester: z.string().nullable(),
    department_id: z.string().uuid().nullable(),
    department_code: z.string().nullable(),
    department_name: z.string().nullable(),
    course_id: z.string().uuid().nullable(),
    course_code: z.string().nullable(),
    course_title: z.string().nullable(),
    year_level: z.number().int().nullable(),
    institution_id: z.string().uuid().nullable(),
    student_count: z.number().int().nonnegative(),
    exam_count: z.number().int().nonnegative(),
    created_at: z.union([z.coerce.date(), z.string()]).nullable(),
    updated_at: z.union([z.coerce.date(), z.string()]).nullable(),
    archived_at: z.union([z.coerce.date(), z.string()]).nullable().optional(),
    updated_by: z.string().uuid().nullable(),
    updated_by_name: z.string().nullable(),
    can_manage: z.boolean(),
    instructors: z.array(z.string()),
    scope_summary: classroomScopeSummarySchema,
});

export const classroomStudentSchema = z.object({
    student_id: z.string().uuid(),
    user_id: z.string().uuid().nullable(),
    student_number: z.string(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    full_name: z.string().nullable(),
    department_id: z.string().uuid().nullable(),
    department_code: z.string().nullable(),
    department_name: z.string().nullable(),
    course_id: z.string().uuid().nullable(),
    course_code: z.string().nullable(),
    course_title: z.string().nullable(),
    enrolled_at: z.union([z.coerce.date(), z.string()]).nullable(),
    avatar_url: z.string().nullable().optional(),
    is_claimed: z.boolean().optional(),
    claim_status: z.enum(['CLAIMED', 'UNCLAIMED']).optional(),
});

export const classroomInstructorSchema = z.object({
    user_id: z.string().uuid(),
    name: z.string(),
    is_head: z.boolean(),
    status: z.enum(['ACTIVE', 'PENDING_ACK', 'ACKNOWLEDGED', 'FLAGGED', 'REMOVED']),
    responded_at: z.union([z.coerce.date(), z.string()]).nullable().optional(),
    justification: z.string().nullable().optional(),
    flag_reason: z.string().nullable().optional(),
    assigned_at: z.union([z.coerce.date(), z.string()]).nullable(),
    assigned_by_user_id: z.string().uuid().nullable(),
    assigned_by_name: z.string().nullable(),
});

export const classroomDetailSchema = classroomSummarySchema.extend({
    students: z.array(classroomStudentSchema),
});

export type ClassroomScopeSummaryValues = z.infer<typeof classroomScopeSummarySchema>;
export type ClassroomSummaryValues = z.infer<typeof classroomSummarySchema>;
export type ClassroomStudentValues = z.infer<typeof classroomStudentSchema>;
export type ClassroomInstructorValues = z.infer<typeof classroomInstructorSchema>;
export type ClassroomDetailValues = z.infer<typeof classroomDetailSchema>;
