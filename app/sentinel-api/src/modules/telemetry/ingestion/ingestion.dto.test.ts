import { describe, expect, it } from 'vitest';
import { ingestProctoringEventSchema } from './ingestion.dto';
import { ingestEvidenceCandidateSchema } from '../evidence/evidence.dto';

describe('ingestProctoringEventSchema', () => {
    it('accepts MediaPipe aggregation metadata on telemetry ingestion requests', () => {
        const parsed = ingestProctoringEventSchema.body.parse({
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            timestamp: '2026-04-23T00:00:00.000Z',
            platform: 'WEB',
            source: 'AI',
            ruleKey: 'aiRules.face_detection',
            eventType: 'NO_FACE_DETECTED',
            metadata: {
                durationMs: 1500,
                confidenceScore: 0.42,
                aggregation: {
                    trigger: 'duration-threshold',
                    occurrenceCount: 3,
                    threshold: 1500,
                },
            },
            sessionContext: {
                browser: 'Chrome',
                os: 'macOS',
                deviceType: 'DESKTOP',
                clientCapabilities: ['camera-stream', 'gaze-signal-analysis'],
            },
        });

        expect(parsed.metadata).toMatchObject({
            durationMs: 1500,
            confidenceScore: 0.42,
            aggregation: {
                trigger: 'duration-threshold',
                occurrenceCount: 3,
                threshold: 1500,
            },
        });
    });

    it('accepts eventId, dedupeKey, and clientActionAt on metadata', () => {
        const parsed = ingestProctoringEventSchema.body.parse({
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            timestamp: '2026-04-23T00:00:00.000Z',
            platform: 'WEB',
            source: 'CLIENT',
            ruleKey: 'webSecurity.right_click_disable',
            eventType: 'RIGHT_CLICK_ATTEMPT',
            metadata: {
                eventId: '123e4567-e89b-12d3-a456-426614174888',
                dedupeKey: 'RIGHT_CLICK_ATTEMPT:123e4567-e89b-12d3-a456-426614174888',
                clientActionAt: '2026-04-23T00:00:00.000Z',
            },
        });

        expect(parsed.metadata).toMatchObject({
            eventId: '123e4567-e89b-12d3-a456-426614174888',
            dedupeKey: 'RIGHT_CLICK_ATTEMPT:123e4567-e89b-12d3-a456-426614174888',
            clientActionAt: '2026-04-23T00:00:00.000Z',
        });
    });

    it('accepts additive audio diagnostics metadata on audio telemetry requests', () => {
        const parsed = ingestProctoringEventSchema.body.parse({
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            timestamp: '2026-04-23T00:00:00.000Z',
            platform: 'WEB',
            source: 'AI',
            ruleKey: 'aiRules.audio_anomaly_detection',
            eventType: 'AUDIO_ANOMALY',
            metadata: {
                anomalyType: 'TALKING',
                confidenceScore: 0.84,
                audioDiagnostics: {
                    threshold: 0.45,
                    configVersion: 'audio-config:test-version',
                    workerPhase: 'running',
                    streamPhase: 'live',
                },
            },
        });

        expect(parsed.metadata).toMatchObject({
            anomalyType: 'TALKING',
            confidenceScore: 0.84,
            audioDiagnostics: {
                threshold: 0.45,
                configVersion: 'audio-config:test-version',
                workerPhase: 'running',
                streamPhase: 'live',
            },
        });
    });

    it('rejects malformed eventId (not uuid)', () => {
        const parseResult = ingestProctoringEventSchema.body.safeParse({
            examSessionId: '123e4567-e89b-12d3-a456-426614174000',
            studentId: '123e4567-e89b-12d3-a456-426614174001',
            timestamp: '2026-04-23T00:00:00.000Z',
            platform: 'WEB',
            source: 'CLIENT',
            ruleKey: 'webSecurity.right_click_disable',
            eventType: 'RIGHT_CLICK_ATTEMPT',
            metadata: {
                eventId: 'not-a-uuid',
            },
        });

        expect(parseResult.success).toBe(false);
    });
});

describe('ingestEvidenceCandidateSchema', () => {
    const validCandidateBody = {
        examSessionId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '123e4567-e89b-12d3-a456-426614174001',
        timestamp: '2026-07-28T00:00:00.000Z',
        platform: 'WEB',
        source: 'AI',
        ruleKey: 'aiRules.face_detection',
        eventType: 'NO_FACE_DETECTED',
        metadata: {
            eventId: '123e4567-e89b-12d3-a456-426614174999',
            dedupeKey: 'attempt:NO_FACE_DETECTED:123e4567-e89b-12d3-a456-426614174999',
            clientActionAt: '2026-07-28T00:00:00.250Z',
        },
        sessionContext: {
            browser: 'Chrome',
            os: 'macOS',
            deviceType: 'DESKTOP',
        },
        capture: {
            capturedAt: '2026-07-28T00:00:00.100Z',
            mimeType: 'image/webp',
            sizeBytes: 2048,
        },
    } as const;

    it('accepts a valid MediaPipe evidence candidate body', () => {
        const parsed = ingestEvidenceCandidateSchema.body.parse(validCandidateBody);

        expect(parsed).toMatchObject(validCandidateBody);
    });

    it('rejects missing stable ids', () => {
        const missingEventId = ingestEvidenceCandidateSchema.body.safeParse({
            ...validCandidateBody,
            metadata: {
                ...validCandidateBody.metadata,
                eventId: undefined,
            },
        });
        const missingDedupeKey = ingestEvidenceCandidateSchema.body.safeParse({
            ...validCandidateBody,
            metadata: {
                ...validCandidateBody.metadata,
                dedupeKey: undefined,
            },
        });
        const missingClientActionAt = ingestEvidenceCandidateSchema.body.safeParse({
            ...validCandidateBody,
            metadata: {
                ...validCandidateBody.metadata,
                clientActionAt: undefined,
            },
        });

        expect(missingEventId.success).toBe(false);
        expect(missingDedupeKey.success).toBe(false);
        expect(missingClientActionAt.success).toBe(false);
    });

    it('rejects mismatched source and rule combinations', () => {
        const parseResult = ingestEvidenceCandidateSchema.body.safeParse({
            ...validCandidateBody,
            source: 'CLIENT',
            ruleKey: 'webSecurity.right_click_disable',
        });

        expect(parseResult.success).toBe(false);
    });

    it('rejects unsupported event types', () => {
        const parseResult = ingestEvidenceCandidateSchema.body.safeParse({
            ...validCandidateBody,
            eventType: 'AUDIO_ANOMALY',
        });

        expect(parseResult.success).toBe(false);
    });

    it('rejects non-web platforms', () => {
        const parseResult = ingestEvidenceCandidateSchema.body.safeParse({
            ...validCandidateBody,
            platform: 'MOBILE',
        });

        expect(parseResult.success).toBe(false);
    });

    it('rejects invalid capture mime types', () => {
        const parseResult = ingestEvidenceCandidateSchema.body.safeParse({
            ...validCandidateBody,
            capture: {
                ...validCandidateBody.capture,
                mimeType: 'image/png',
            },
        });

        expect(parseResult.success).toBe(false);
    });

    it('rejects non-positive capture sizes', () => {
        const parseResult = ingestEvidenceCandidateSchema.body.safeParse({
            ...validCandidateBody,
            capture: {
                ...validCandidateBody.capture,
                sizeBytes: 0,
            },
        });

        expect(parseResult.success).toBe(false);
    });
});
