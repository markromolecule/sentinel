import { z } from '@hono/zod-openapi';
import { Schema } from '@sentinel/shared';

const { userFormSchema: userBodySchema } = Schema;

// User Schema
const userSchemaObject = {
    user_id: z.string().uuid(),
    firstName: z.string().openapi({ example: 'John' }),
    lastName: z.string().openapi({ example: 'Doe' }),
    email: z.string().email().openapi({ example: 'john.doe@example.com' }),
    role: z
        .enum([
            'admin',
            'superadmin',
            'proctor',
            'instructor',
            'student',
            'disciplinary_officer',
            'support',
        ])
        .openapi({ example: 'student' }),
    department: z.string().nullable().openapi({ example: 'SOECA' }),
    departmentCode: z.string().nullable().openapi({ example: 'SOECA' }),
    department_id: z.string().uuid().nullable(),
    studentNo: z.string().nullable().openapi({ example: '2023-0001' }),
    employeeNo: z.string().nullable().openapi({ example: 'EMP-2023-0001' }),
    course: z.string().nullable().openapi({ example: 'BSIT-MWA, BSCS' }),
    course_id: z.string().uuid().nullable(),
    course_ids: z
        .array(z.string().uuid())
        .openapi({ example: ['00000000-0000-0000-0000-000000000001'] }),
    courses: z
        .array(z.string())
        .openapi({ example: ['Bachelor of Science in Information Technology'] }),
    institution: z.string().nullable().openapi({ example: 'National University - Dasmariñas' }),
    institution_id: z.string().uuid().nullable(),
    status: z
        .enum(['active', 'inactive', 'offline', 'suspended', 'archived'])
        .openapi({ example: 'active' }),
    created_at: z
        .union([z.coerce.date(), z.string()])
        .nullable()
        .openapi({ example: new Date().toISOString() }),
    updated_at: z.union([z.coerce.date(), z.string()]).nullable(),
    created_by: z.string().nullable(),
    updated_by: z.string().nullable(),
    subject: z.string().nullable().optional().openapi({ example: 'Advanced Communication' }),
    section: z.string().nullable().optional().openapi({ example: 'INF233' }),
    term: z.string().nullable().optional().openapi({ example: '2025-2026 - 3rd Semester' }),
    yearLevel: z.string().nullable().optional().openapi({ example: '3rd Year' }),
    active_permission_keys: z.array(z.string()).optional(),
    avatarUrl: z
        .string()
        .nullable()
        .optional()
        .openapi({ example: 'https://example.com/avatar.png' }),
};

export const userSchemaOpenApi = z.object(userSchemaObject).openapi('User');

export type UserType = z.infer<typeof userSchemaOpenApi>;

export const getUsersSchema = {
    request: {
        query: z.object({
            search: z.string().optional().openapi({ description: 'Search term' }),
            limit: z.coerce.number().int().min(1).max(500).optional().openapi({
                description: 'Maximum number of users to return',
                example: 100,
            }),
            offset: z.coerce.number().int().min(0).optional().openapi({
                description: 'Number of users to skip before returning rows',
                example: 0,
            }),
            department_id: z
                .string()
                .uuid()
                .optional()
                .openapi({ description: 'Filter by department ID' }),
            institution_id: z
                .string()
                .uuid()
                .optional()
                .openapi({ description: 'Filter by institution ID' }),
            role: z.string().optional().openapi({
                description: 'Filter by user role or comma-separated roles',
            }),
            include_institution_users: z.coerce.boolean().optional().openapi({
                description: 'Include all users in the institution and skip requester role limits',
            }),
        }),
    },
    response: z.object({
        message: z.string(),
        data: z.array(userSchemaOpenApi),
    }),
};

export type GetUsersResponse = z.infer<typeof getUsersSchema.response>;

export const instructorStudentEnrollmentSchemaOpenApi = z
    .object({
        id: z.string().uuid(),
        user_id: z.string().uuid().nullable().optional(),
        userId: z.string().uuid().nullable().optional(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email().or(z.literal('')),
        role: z.literal('student'),
        avatarUrl: z.string().nullable().optional(),
        department: z.string().nullable().optional(),
        departmentCode: z.string().nullable().optional(),
        institution: z.string().nullable().optional(),
        institution_id: z.string().uuid().nullable().optional(),
        institutionId: z.string().uuid().nullable().optional(),
        studentNo: z.string(),
        subject: z.string(),
        section: z.string(),
        term: z.string(),
        yearLevel: z.string(),
        enrollmentIds: z.string().optional().nullable(),
        status: z.enum(['active', 'offline']),
        created_at: z.null(),
        updated_at: z.null(),
        created_by: z.null(),
        updated_by: z.null(),
    })
    .openapi('InstructorStudentEnrollment');

export const getInstructorStudentEnrollmentsSchema = {
    request: {
        query: z.object({
            search: z.string().optional().openapi({ description: 'Search term' }),
        }),
    },
    response: z.object({
        message: z.string(),
        data: z.array(instructorStudentEnrollmentSchemaOpenApi),
    }),
};

export type GetInstructorStudentEnrollmentsResponse = z.infer<
    typeof getInstructorStudentEnrollmentsSchema.response
>;

export const studentEnrollmentDetailSchemaOpenApi = z
    .object({
        id: z.string().uuid(),
        subject: z.string(),
        classroom: z.string(),
        section: z.string(),
        term: z.string(),
        yearLevel: z.string().nullable(),
    })
    .openapi('StudentEnrollmentDetail');

export const getInstructorStudentEnrollmentDetailSchema = {
    params: z.object({
        id: z.string().uuid('Invalid user ID format'),
    }),
    response: z.object({
        message: z.string(),
        data: z.array(studentEnrollmentDetailSchemaOpenApi),
    }),
};

export type GetInstructorStudentEnrollmentDetailResponse = z.infer<
    typeof getInstructorStudentEnrollmentDetailSchema.response
>;

export const getStudentEnrollmentDetailSchema = {
    params: z.object({
        id: z.string().uuid('Invalid user ID format'),
    }),
    response: z.object({
        message: z.string(),
        data: z.array(studentEnrollmentDetailSchemaOpenApi),
    }),
};

export type GetStudentEnrollmentDetailResponse = z.infer<
    typeof getStudentEnrollmentDetailSchema.response
>;

// Get Single
export const getUserSchema = {
    params: z.object({
        id: z.string().uuid('Invalid user ID format'),
    }),
    response: z.object({
        message: z.string(),
        data: userSchemaOpenApi,
    }),
};

export type GetUserParams = z.infer<typeof getUserSchema.params>;
export type GetUserResponse = z.infer<typeof getUserSchema.response>;

// Create
export const createUserSchema = {
    body: userBodySchema,
    response: z.object({
        message: z.string(),
        data: userSchemaOpenApi,
    }),
};

export type CreateUserBody = z.infer<typeof createUserSchema.body>;
export type CreateUserResponse = z.infer<typeof createUserSchema.response>;

// Update
export const updateUserSchema = {
    params: z.object({
        id: z.string().uuid('Invalid user ID format'),
    }),
    body: Schema.userFormBaseSchema.partial(),
    response: z.object({
        message: z.string(),
        data: userSchemaOpenApi,
    }),
};

export type UpdateUserParams = z.infer<typeof updateUserSchema.params>;
export type UpdateUserBody = z.infer<typeof updateUserSchema.body>;
export type UpdateUserResponse = z.infer<typeof updateUserSchema.response>;

// Delete
export const deleteUserSchema = {
    params: z.object({
        id: z.string().uuid('Invalid user ID format'),
    }),
    response: z.object({
        message: z.string(),
        data: z.null(),
    }),
};

export type DeleteUserParams = z.infer<typeof deleteUserSchema.params>;
export type DeleteUserResponse = z.infer<typeof deleteUserSchema.response>;

// Invite
export const inviteUserSchema = {
    body: userBodySchema,
    response: z.object({
        message: z.string(),
        data: userSchemaOpenApi,
        inviteDelivery: z.enum(['email', 'generated_link']).optional(),
        inviteLink: z.string().url().optional(),
    }),
};

export type InviteUserBody = z.infer<typeof inviteUserSchema.body>;
export type InviteUserResponse = z.infer<typeof inviteUserSchema.response>;

// Bulk Delete Users Operation
export const deleteUsersSchema = {
    body: z.object({
        ids: z.array(z.string().uuid()).min(1),
    }),
    response: z.object({
        message: z.string(),
        data: z.null(),
    }),
};

export type DeleteUsersBody = z.infer<typeof deleteUsersSchema.body>;
export type DeleteUsersResponse = z.infer<typeof deleteUsersSchema.response>;

export const instructorDashboardSchema = {
    response: z.object({
        message: z.string(),
        data: z.object({
            stats: z.object({
                totalStudents: z.number(),
                totalClassrooms: z.number(),
                totalSubjects: z.number(),
                examsCreated: z.number(),
            }),
            recentExams: z.array(
                z.object({
                    exam_id: z.string().uuid(),
                    title: z.string(),
                    status: z.string(),
                    scheduled_date: z.string().nullable(),
                    duration_minutes: z.number(),
                    question_count: z.number().nullable(),
                    subject_title: z.string().nullable(),
                    subject_code: z.string().nullable(),
                    attempts_count: z.number(),
                    incidents_count: z.number(),
                }),
            ),
        }),
    }),
};

export type GetInstructorDashboardResponse = z.infer<typeof instructorDashboardSchema.response>;
