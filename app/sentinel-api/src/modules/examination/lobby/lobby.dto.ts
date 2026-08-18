import { z } from '@hono/zod-openapi';

export const examLobbyAdmissionStatusSchema = z.enum(['WAITING', 'APPROVED', 'REJECTED']);
export const updateLobbyAdmissionStatusSchema = z.enum(['APPROVED', 'REJECTED']);

export const examIdParams = z.object({
    id: z
        .string()
        .uuid()
        .openapi({
            param: {
                name: 'id',
                in: 'path',
            },
            example: '123e4567-e89b-12d3-a456-426614174000',
        }),
});

export const checkInLobbySchema = {
    params: examIdParams,
    response: z.object({
        message: z.string(),
        data: z.object({
            status: examLobbyAdmissionStatusSchema,
            checkedInAt: z.string().datetime(),
        }),
    }),
};

export const getAdmissionStatusSchema = {
    params: examIdParams,
    response: z.object({
        message: z.string(),
        data: z.object({
            status: examLobbyAdmissionStatusSchema.nullable(),
            checkedInAt: z.string().datetime().nullable(),
            decidedAt: z.string().datetime().nullable(),
        }),
    }),
};

export const getLobbyCountSchema = {
    params: examIdParams,
    response: z.object({
        message: z.string(),
        data: z.object({
            count: z.number(),
        }),
    }),
};

export const getWaitingListSchema = {
    params: examIdParams,
    response: z.object({
        message: z.string(),
        data: z.array(
            z.object({
                admissionId: z.string().uuid(),
                studentId: z.string().uuid(),
                studentName: z.string(),
                studentNumber: z.string().nullable(),
                avatarUrl: z.string().nullable().optional(),
                status: examLobbyAdmissionStatusSchema,
                checkedInAt: z.string().datetime().nullable(),
                decidedAt: z.string().datetime().nullable(),
                hasActiveAttempt: z.boolean(),
                attemptStatus: z.string().nullable(),
                reconnectCount: z.number().int().min(0),
                maxReconnectAttempts: z.number().int().min(0),
            }),
        ),
    }),
};

export const updateAdmissionsSchema = {
    params: examIdParams,
    body: z.object({
        studentIds: z.array(z.string().uuid()),
        status: updateLobbyAdmissionStatusSchema,
    }),
    response: z.object({
        message: z.string(),
        data: z.object({
            updatedCount: z.number(),
        }),
    }),
};

export type LobbyAdmissionStatus = z.infer<typeof examLobbyAdmissionStatusSchema>;
export type LobbyAdmissionDecisionStatus = z.infer<typeof updateLobbyAdmissionStatusSchema>;
