import { z } from 'zod';

export const liveInspectionStateSchema = z.enum([
    'REQUESTED',
    'PUBLISHER_CONNECTING',
    'PUBLISHER_READY',
    'LIVE',
    'STOPPING',
    'ENDED',
    'FAILED',
    'EXPIRED',
]);

export const liveInspectionTerminalReasonSchema = z.enum([
    'VIEWER_STOPPED',
    'STUDENT_DISCONNECTED',
    'VIEWER_DISCONNECTED',
    'TIME_LIMIT_REACHED',
    'TOKEN_ERROR',
    'PROVIDER_ERROR',
    'EXAM_ENDED',
    'LEASE_EXPIRED',
]);

export const liveInspectionFailureCodeSchema = z
    .string()
    .trim()
    .regex(/^[A-Z0-9_]+$/)
    .max(64);

export const liveInspectionConnectionResponseSchema = z.object({
    leaseId: z.string().uuid(),
    revision: z.number().int().positive(),
    roomName: z.string().min(1).max(128),
    token: z.string().min(1),
    liveKitUrl: z.string().url(),
    participantIdentity: z.string().min(1).max(160),
    expiresAt: z.string().datetime(),
});

export const liveInspectionStartResponseSchema = z.object({
    leaseId: z.string().uuid(),
    roomName: z.string().min(1).max(128),
    token: z.string().min(1),
    liveKitUrl: z.string().url(),
    expiresAt: z.string().datetime(),
});

export const liveInspectionDirectiveSchema = z.object({
    leaseId: z.string().uuid(),
    revision: z.number().int().positive(),
    state: liveInspectionStateSchema,
    attemptId: z.string().uuid(),
    topic: z.string().max(160),
    connection: liveInspectionConnectionResponseSchema.optional(),
});

export const liveInspectionStaffStatusSchema = z.object({
    leaseId: z.string().uuid(),
    attemptId: z.string().uuid(),
    studentUserId: z.string().uuid(),
    viewerUserId: z.string().uuid(),
    state: liveInspectionStateSchema,
    revision: z.number().int().positive(),
    requestedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    startedAt: z.string().datetime().nullable(),
    endedAt: z.string().datetime().nullable(),
    endReason: liveInspectionTerminalReasonSchema.nullable(),
    lastErrorCode: liveInspectionFailureCodeSchema.nullable(),
    connection: liveInspectionConnectionResponseSchema.optional(),
});

export const liveInspectionReadyAckSchema = z.object({
    leaseId: z.string().uuid(),
    revision: z.number().int().positive(),
    state: z.literal('PUBLISHER_READY'),
});

export const liveInspectionFailureAckSchema = z.object({
    leaseId: z.string().uuid(),
    revision: z.number().int().positive(),
    state: z.literal('FAILED'),
    errorCode: liveInspectionFailureCodeSchema,
});

export const liveInspectionStopResponseSchema = z.object({
    leaseId: z.string().uuid(),
    revision: z.number().int().positive(),
    state: z.enum(['STOPPING', 'ENDED', 'FAILED', 'EXPIRED']),
    endReason: liveInspectionTerminalReasonSchema.nullable(),
});

export type LiveInspectionState = z.infer<typeof liveInspectionStateSchema>;
export type LiveInspectionTerminalReason = z.infer<typeof liveInspectionTerminalReasonSchema>;
export type LiveInspectionDirective = z.infer<typeof liveInspectionDirectiveSchema>;
export type LiveInspectionStaffStatus = z.infer<typeof liveInspectionStaffStatusSchema>;
export type LiveInspectionStartResponse = z.infer<typeof liveInspectionStartResponseSchema>;
export type LiveInspectionConnectionResponse = z.infer<
    typeof liveInspectionConnectionResponseSchema
>;
export type LiveInspectionReadyAck = z.infer<typeof liveInspectionReadyAckSchema>;
export type LiveInspectionFailureAck = z.infer<typeof liveInspectionFailureAckSchema>;

const TERMINAL_STATES = new Set<LiveInspectionState>(['ENDED', 'FAILED', 'EXPIRED']);

const LIVE_INSPECTION_TRANSITIONS: Record<LiveInspectionState, LiveInspectionState[]> = {
    REQUESTED: ['PUBLISHER_CONNECTING', 'FAILED', 'EXPIRED', 'STOPPING'],
    PUBLISHER_CONNECTING: ['PUBLISHER_READY', 'FAILED', 'EXPIRED', 'STOPPING'],
    PUBLISHER_READY: ['LIVE', 'FAILED', 'EXPIRED', 'STOPPING'],
    LIVE: ['STOPPING', 'FAILED', 'EXPIRED'],
    STOPPING: ['ENDED', 'FAILED', 'EXPIRED'],
    ENDED: [],
    FAILED: [],
    EXPIRED: [],
};

/**
 * Returns true for states that cannot transition to another state.
 */
export function isLiveInspectionTerminalState(state: LiveInspectionState) {
    return TERMINAL_STATES.has(state);
}

/**
 * Checks whether a lease state transition is explicitly allowed.
 */
export function canTransitionLiveInspectionState(
    from: LiveInspectionState,
    to: LiveInspectionState,
) {
    return LIVE_INSPECTION_TRANSITIONS[from].includes(to);
}

export const LIVE_INSPECTION_TRANSITION_MAP = LIVE_INSPECTION_TRANSITIONS;
