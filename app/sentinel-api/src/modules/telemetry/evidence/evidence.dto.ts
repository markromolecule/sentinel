import { z } from '@hono/zod-openapi';
import { incident_type } from '@sentinel/db';
import { TELEMETRY_EVENT_DEFINITIONS } from '@sentinel/shared';
import {
    TelemetryRuleKeySchema,
    telemetryMetadataSchema,
    telemetrySessionContextSchema,
} from '../ingestion/ingestion.dto';

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

const mediaPipeEvidenceCandidateEventTypes = [
    'GAZE_OFF_SCREEN',
    'NO_FACE_DETECTED',
    'MULTIPLE_FACES',
] as const;

const mediaPipeEvidenceCandidateMetadataSchema = telemetryMetadataSchema
    .extend({
        eventId: z.string().uuid().openapi({
            example: '987f6543-e89b-12d3-a456-426614174000',
        }),
        dedupeKey: z.string().min(1).openapi({
            example: 'attempt:GAZE_OFF_SCREEN:987f6543-e89b-12d3-a456-426614174000',
        }),
        clientActionAt: z.string().datetime().openapi({
            example: new Date().toISOString(),
        }),
    })
    .strict()
    .openapi('IngestEvidenceCandidateMetadata');

const mediaPipeEvidenceCaptureSchema = z.object({
    capturedAt: z.string().datetime().openapi({
        description: 'The timestamp when the triggering frame was captured.',
        example: new Date().toISOString(),
    }),
    mimeType: z.enum(['image/webp', 'image/jpeg']).openapi({
        description: 'The MIME type of the captured frame.',
        example: 'image/webp',
    }),
    sizeBytes: z.number().int().positive().openapi({
        description: 'The declared size of the captured frame in bytes.',
        example: 45000,
    }),
}).openapi('IngestEvidenceCandidateCapture');

const mediaPipeEvidenceUploadTargetSchema = z.object({
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
}).openapi('TelemetryEvidenceUploadTarget');

/**
 * Schema for ingesting one MediaPipe telemetry event and receiving an
 * authoritative server decision about whether evidence upload is allowed.
 */
export const ingestEvidenceCandidateSchema = {
    body: z.object({
        examSessionId: z.string().uuid().openapi({
            example: '123e4567-e89b-12d3-a456-426614174000',
        }),
        studentId: z.string().uuid().openapi({
            example: '123e4567-e89b-12d3-a456-426614174001',
        }),
        timestamp: z.string().datetime().openapi({
            example: new Date().toISOString(),
        }),
        platform: z.literal('WEB').openapi({
            example: 'WEB',
        }),
        source: z.literal('AI').openapi({
            example: 'AI',
        }),
        ruleKey: TelemetryRuleKeySchema.openapi({
            example: 'aiRules.face_detection',
        }),
        eventType: z.enum(mediaPipeEvidenceCandidateEventTypes).openapi({
            example: 'NO_FACE_DETECTED',
        }),
        metadata: mediaPipeEvidenceCandidateMetadataSchema,
        sessionContext: telemetrySessionContextSchema.optional(),
        capture: mediaPipeEvidenceCaptureSchema,
    })
        .strict()
        .superRefine((value, ctx) => {
            const eventDefinition = TELEMETRY_EVENT_DEFINITIONS[value.eventType];

            if (value.ruleKey !== eventDefinition.ruleKey) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['ruleKey'],
                    message: `ruleKey must match ${eventDefinition.ruleKey} for ${value.eventType}.`,
                });
            }
        })
        .openapi('IngestEvidenceCandidateInput'),
    response: z.object({
        telemetryDisposition: z
            .enum(['inserted', 'aggregated', 'duplicate-ignored', 'ignored'])
            .openapi('TelemetryEvidenceCandidateDisposition'),
        evidenceDecision: z
            .enum(['UPLOAD', 'NOT_ELIGIBLE', 'ALREADY_AVAILABLE', 'UNAVAILABLE'])
            .openapi('TelemetryEvidenceCandidateDecision'),
        upload: mediaPipeEvidenceUploadTargetSchema.optional(),
    }).openapi('IngestEvidenceCandidateResponse'),
};

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

/**
 * Standalone evidence-upload initialization request body retained for the
 * legacy direct-upload lifecycle.
 */
export type InitializeEvidenceUploadBody = z.infer<typeof initializeEvidenceUploadSchema.body>;

/**
 * Standalone evidence-upload initialization response for the legacy direct-upload
 * lifecycle.
 */
export type InitializeEvidenceUploadResponse = z.infer<typeof initializeEvidenceUploadSchema.response>;

/**
 * Candidate-ingestion body for the three MediaPipe event types that may be
 * persisted inline before evidence eligibility is decided.
 */
export type IngestEvidenceCandidateBody = z.infer<typeof ingestEvidenceCandidateSchema.body>;

/**
 * Authoritative inline evidence decision returned after the API persists a
 * restricted MediaPipe candidate event and resolves its final severity.
 */
export type IngestEvidenceCandidateResponse = z.infer<typeof ingestEvidenceCandidateSchema.response>;
export type CompleteEvidenceUploadResponse = z.infer<typeof completeEvidenceUploadSchema.response>;
export type GetIncidentEvidenceResponse = z.infer<typeof getIncidentEvidenceSchema.response>;
export type DeleteEvidenceResponse = z.infer<typeof deleteEvidenceSchema.response>;
export type ReconcileEvidenceResponse = z.infer<typeof reconcileEvidenceSchema.response>;
