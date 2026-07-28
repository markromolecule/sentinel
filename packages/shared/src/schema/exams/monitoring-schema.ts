import * as z from 'zod';
import { audioAnomalyTypeSchema } from '../audio/audio-settings-schema';
import {
    telemetryAggregationMetadataSchema,
    telemetryEventTypeSchema,
    telemetryIncidentStatusSchema,
    telemetryIncidentTypeSchema,
    telemetrySeverityReasonSchema,
} from '../telemetry/telemetry-schema';
import { examRuntimeAccessSchema } from './runtime-access-schema';

const nullableDateTimeSchema = z.union([z.string(), z.date()]).nullable();

export const monitoringStudentStatusSchema = z.enum([
    'active',
    'submitted',
    'flagged',
    'disconnected',
]);

export const monitoringIncidentSeveritySchema = z.enum(['low', 'medium', 'high']);

export const monitoringIncidentEvidenceStateSchema = z.enum([
    'PENDING_UPLOAD',
    'AVAILABLE',
    'DELETE_PENDING',
    'DELETED',
    'FAILED',
    'EXPIRED',
]);

export const monitoringIncidentSchema = z.object({
    id: z.string().uuid(),
    type: telemetryIncidentTypeSchema,
    rawEventType: telemetryEventTypeSchema.nullable().optional(),
    timestamp: z.union([z.string(), z.date()]),
    description: z.string(),
    severity: monitoringIncidentSeveritySchema,
    snapshotUrl: z.string().nullable().optional(),
    evidenceUrl: z.string().nullable().optional(),
    evidenceCount: z.number().int().min(0).optional(),
    evidenceStates: z.array(monitoringIncidentEvidenceStateSchema).max(6).optional(),
    status: telemetryIncidentStatusSchema.nullable().optional(),
    occurrenceCount: z.number().int().positive().optional(),
    severityReason: telemetrySeverityReasonSchema.nullable().optional(),
    persistenceTrigger: telemetryAggregationMetadataSchema.shape.trigger.nullable().optional(),
    matchingWindowSeconds: z.number().int().positive().nullable().optional(),
    wasSeverityForced: z.boolean().optional(),
    anomalyType: audioAnomalyTypeSchema.nullable().optional(),
    confidenceScore: z.number().min(0).max(1).nullable().optional(),
});

export const monitoringExamSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    subject: z.string(),
    scheduledDate: nullableDateTimeSchema,
    endDateTime: nullableDateTimeSchema,
    maxReconnectAttempts: z.number().int().min(0),
    runtimeAccess: examRuntimeAccessSchema.optional(),
    remediationContext: z
        .object({
            remediationId: z.string().uuid(),
            remediationType: z.enum(['RETAKE', 'MAKEUP']),
            sourceExamId: z.string().uuid(),
            sourceExamTitle: z.string(),
            sourceAttemptId: z.string().uuid().nullable(),
        })
        .nullable()
        .optional(),
});

export const monitoringStatsSchema = z.object({
    total: z.number().int().min(0),
    active: z.number().int().min(0),
    flagged: z.number().int().min(0),
    submitted: z.number().int().min(0),
    disconnected: z.number().int().min(0),
});

export const monitoringLobbyAdmissionsSchema = z.object({
    waiting: z.number().int().min(0),
    approved: z.number().int().min(0),
    inAttempt: z.number().int().min(0),
});

export const monitoringStudentSummarySchema = z.object({
    id: z.string().uuid(),
    studentRecordId: z.string().uuid(),
    attemptId: z.string().uuid(),
    studentNo: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    avatarUrl: z.string().nullable().optional(),
    status: monitoringStudentStatusSchema,
    progress: z.number().int().min(0).max(100),
    incidentCount: z.number().int().min(0),
    openIncidentCount: z.number().int().min(0),
    latestIncidentType: telemetryIncidentTypeSchema.nullable(),
    lastActivityAt: nullableDateTimeSchema,
    startedAt: nullableDateTimeSchema,
    completedAt: nullableDateTimeSchema,
    timeSpentMinutes: z.number().int().min(0).nullable(),
    reconnectCount: z.number().int().min(0),
    score: z.number().int().nullable().optional(),
    totalScore: z.number().int().nullable().optional(),
});

export const monitoringStudentDetailSchema = monitoringStudentSummarySchema.extend({
    flags: z.array(monitoringIncidentSchema),
});

export const monitoringOverviewSchema = z.object({
    exam: monitoringExamSchema,
    stats: monitoringStatsSchema,
    lobbyAdmissions: monitoringLobbyAdmissionsSchema,
    students: z.array(monitoringStudentSummarySchema),
});

export const monitoringStudentParamsSchema = z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
});

export type MonitoringStudentStatusType = z.infer<typeof monitoringStudentStatusSchema>;
export type MonitoringIncidentSeverityType = z.infer<typeof monitoringIncidentSeveritySchema>;
export type MonitoringIncidentEvidenceStateType = z.infer<
    typeof monitoringIncidentEvidenceStateSchema
>;
export type MonitoringIncidentType = z.infer<typeof monitoringIncidentSchema>;
export type MonitoringExamType = z.infer<typeof monitoringExamSchema>;
export type MonitoringStatsType = z.infer<typeof monitoringStatsSchema>;
export type MonitoringLobbyAdmissionsType = z.infer<typeof monitoringLobbyAdmissionsSchema>;
export type MonitoringStudentSummaryType = z.infer<typeof monitoringStudentSummarySchema>;
export type MonitoringStudentDetailType = z.infer<typeof monitoringStudentDetailSchema>;
export type MonitoringOverviewType = z.infer<typeof monitoringOverviewSchema>;
