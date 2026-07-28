import { z } from '@hono/zod-openapi';
import { incident_type } from '@sentinel/db';

/**
 * Zod schema for telemetry incident evidence state.
 */
export const TelemetryIncidentEvidenceStateSchema = z.enum([
    'PENDING_UPLOAD',
    'AVAILABLE',
    'DELETE_PENDING',
    'DELETED',
    'FAILED',
    'EXPIRED'
]).openapi('TelemetryIncidentEvidenceState');

/**
 * Zod schema for telemetry incident evidence event type.
 */
export const TelemetryEvidenceEventTypeSchema = z.nativeEnum(incident_type).openapi('TelemetryEvidenceEventType');

/**
 * Schema for initializing an evidence upload.
 */
export const initializeEvidenceUploadSchema = {
    body: z.object({
        attemptId: z.string().uuid().openapi({
            description: 'The UUID of the exam attempt.',
            example: '123e4567-e89b-12d3-a456-426614174000',
        }),
        eventId: z.string().uuid().openapi({
            description: 'The client-generated event UUID.',
            example: '987f6543-e89b-12d3-a456-426614174000',
        }),
        eventType: TelemetryEvidenceEventTypeSchema.openapi({
            description: 'The telemetry event type.',
            example: 'GAZE',
        }),
        capturedAt: z.string().datetime().openapi({
            description: 'The timestamp when the frame was captured.',
            example: new Date().toISOString(),
        }),
        mimeType: z.enum(['image/webp', 'image/jpeg']).openapi({
            description: 'The MIME type of the captured image.',
            example: 'image/webp',
        }),
        sizeBytes: z.number().int().positive().openapi({
            description: 'The declared size of the image in bytes.',
            example: 45000,
        }),
    }).openapi('InitializeEvidenceUploadInput'),
    response: z.object({
        evidenceId: z.string().uuid().openapi({
            example: '123e4567-e89b-12d3-a456-426614174000',
        }),
        uploadUrl: z.string().openapi({
            description: 'The signed Supabase storage upload URL.',
            example: 'https://supabase.co/storage/v1/object/upload/sign/...',
        }),
        uploadToken: z.string().openapi({
            description: 'The provider upload token to authenticate the direct upload.',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        }),
        expiresAt: z.string().datetime().openapi({
            description: 'The deadline for completing the upload.',
            example: new Date().toISOString(),
        }),
    }).openapi('InitializeEvidenceUploadResponse'),
};

/**
 * Schema for completing an evidence upload.
 */
export const completeEvidenceUploadSchema = {
    params: z.object({
        evidenceId: z.string().uuid().openapi({
            description: 'The UUID of the evidence record.',
            example: '123e4567-e89b-12d3-a456-426614174000',
        }),
    }),
    response: z.object({
        evidenceId: z.string().uuid(),
        state: TelemetryIncidentEvidenceStateSchema,
        expiresAt: z.string().datetime(),
    }).openapi('CompleteEvidenceUploadResponse'),
};

/**
 * Schema for listing incident evidence.
 */
export const getIncidentEvidenceSchema = {
    params: z.object({
        incidentId: z.string().uuid().openapi({
            description: 'The UUID of the flagged incident.',
            example: '123e4567-e89b-12d3-a456-426614174000',
        }),
    }),
    response: z.array(
        z.object({
            evidenceId: z.string().uuid(),
            attemptId: z.string().uuid(),
            incidentId: z.string().uuid().nullable(),
            eventId: z.string().uuid(),
            eventType: TelemetryEvidenceEventTypeSchema,
            capturedAt: z.string().datetime(),
            state: TelemetryIncidentEvidenceStateSchema,
            expiresAt: z.string().datetime(),
            signedUrl: z.string().optional().openapi({
                description: 'Short-lived signed view URL. Only present if state is AVAILABLE.',
                example: 'https://supabase.co/storage/v1/object/sign/...',
            }),
        })
    ).openapi('GetIncidentEvidenceResponse'),
};

/**
 * Schema for deleting evidence.
 */
export const deleteEvidenceSchema = {
    params: z.object({
        evidenceId: z.string().uuid().openapi({
            description: 'The UUID of the evidence record to delete.',
            example: '123e4567-e89b-12d3-a456-426614174000',
        }),
    }),
    response: z.object({
        success: z.boolean().openapi({
            example: true,
        }),
        message: z.string().openapi({
            example: 'Evidence successfully marked as DELETED and storage objects converged.',
        }),
    }).openapi('DeleteEvidenceResponse'),
};

/**
 * Schema for internal reconciliation results.
 */
export const reconcileEvidenceSchema = {
    response: z.object({
        processedCount: z.number().int().nonnegative(),
        details: z.object({
            staleUploadsPurged: z.number().int(),
            retentionExpiredPurged: z.number().int(),
            deletedConverged: z.number().int(),
            unlinkedPurged: z.number().int(),
        }),
    }).openapi('ReconcileEvidenceResponse'),
};

export type InitializeEvidenceUploadBody = z.infer<typeof initializeEvidenceUploadSchema.body>;
export type InitializeEvidenceUploadResponse = z.infer<typeof initializeEvidenceUploadSchema.response>;
export type CompleteEvidenceUploadResponse = z.infer<typeof completeEvidenceUploadSchema.response>;
export type GetIncidentEvidenceResponse = z.infer<typeof getIncidentEvidenceSchema.response>;
export type DeleteEvidenceResponse = z.infer<typeof deleteEvidenceSchema.response>;
export type ReconcileEvidenceResponse = z.infer<typeof reconcileEvidenceSchema.response>;
