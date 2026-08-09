import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { EvidenceCandidateService } from './evidence-candidate.service';
import { TelemetryIngestionService } from '../../ingestion/ingestion.service';
import { EvidenceUploadService } from './evidence-upload.service';
import type { DeferredIncidentSideEffectsResult } from '../../storage/services/incident-persistence.service';

vi.mock('../../ingestion/ingestion.service', () => ({
    TelemetryIngestionService: {
        persistEvidenceCandidate: vi.fn(),
    },
}));

vi.mock('./evidence-upload.service', () => ({
    EvidenceUploadService: {
        initializeUpload: vi.fn(),
    },
}));

describe('EvidenceCandidateService', () => {
    const payload = {
        examSessionId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '123e4567-e89b-12d3-a456-426614174001',
        timestamp: '2026-07-28T12:00:00.000Z',
        platform: 'WEB',
        source: 'AI',
        ruleKey: 'aiRules.face_detection',
        eventType: 'NO_FACE_DETECTED',
        metadata: {
            eventId: '123e4567-e89b-12d3-a456-426614174999',
            dedupeKey: 'attempt:NO_FACE_DETECTED:123e4567-e89b-12d3-a456-426614174999',
            clientActionAt: '2026-07-28T12:00:00.250Z',
        },
        capture: {
            capturedAt: '2026-07-28T12:00:00.125Z',
            mimeType: 'image/webp',
            sizeBytes: 4096,
        },
    } as const;

    const uploadTarget = {
        evidenceId: '123e4567-e89b-12d3-a456-426614174111',
        uploadUrl: 'https://supabase.co/upload',
        uploadToken: 'token',
        expiresAt: new Date('2026-07-28T12:02:00.000Z'),
    };

    function createDeferredResult(
        overrides: Partial<DeferredIncidentSideEffectsResult> = {},
    ): DeferredIncidentSideEffectsResult {
        return {
            incidentId: '123e4567-e89b-12d3-a456-426614174222',
            finalSeverity: 'LOW',
            isNew: false,
            disposition: 'aggregated',
            previousSeverity: 'LOW',
            institutionId: '123e4567-e89b-12d3-a456-426614174333',
            studentUserId: '123e4567-e89b-12d3-a456-426614174001',
            payload,
            runSideEffects: vi.fn().mockResolvedValue(undefined),
            ...overrides,
        };
    }

    function createDbForEvidenceRow(
        row:
            | {
                  evidence_id: string;
                  incident_id: string | null;
                  event_type: 'GAZE' | 'FACE_NOT_VISIBLE' | 'MULTIPLE_FACES';
                  state: 'PENDING_UPLOAD' | 'AVAILABLE' | 'FAILED' | 'DELETED' | 'EXPIRED';
                  expires_at: Date;
              }
            | undefined,
    ) {
        const query = {
            select: vi.fn(() => query),
            where: vi.fn(() => query),
            executeTakeFirst: vi.fn().mockResolvedValue(row),
        };

        return {
            selectFrom: vi.fn(() => query),
        } as any;
    }

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(EvidenceUploadService.initializeUpload).mockResolvedValue(uploadTarget);
    });

    it('returns NOT_ELIGIBLE for the first and second low-severity occurrences', async () => {
        const firstDeferred = createDeferredResult({
            finalSeverity: 'LOW',
            disposition: 'inserted',
            previousSeverity: null,
            isNew: true,
        });
        const secondDeferred = createDeferredResult({
            finalSeverity: 'LOW',
            disposition: 'aggregated',
            previousSeverity: 'LOW',
        });

        vi.mocked(TelemetryIngestionService.persistEvidenceCandidate)
            .mockResolvedValueOnce(firstDeferred)
            .mockResolvedValueOnce(secondDeferred);

        const first = await EvidenceCandidateService.process({} as any, payload, payload.studentId);
        const second = await EvidenceCandidateService.process(
            {} as any,
            payload,
            payload.studentId,
        );

        expect(first).toEqual({
            telemetryDisposition: 'inserted',
            evidenceDecision: 'NOT_ELIGIBLE',
        });
        expect(second).toEqual({
            telemetryDisposition: 'aggregated',
            evidenceDecision: 'NOT_ELIGIBLE',
        });
        expect(EvidenceUploadService.initializeUpload).not.toHaveBeenCalled();
        expect(firstDeferred.runSideEffects).toHaveBeenCalledTimes(1);
        expect(secondDeferred.runSideEffects).toHaveBeenCalledTimes(1);
    });

    it('initializes upload before running deferred side effects for eligible evidence', async () => {
        const order: string[] = [];
        const deferred = createDeferredResult({
            finalSeverity: 'MEDIUM',
            disposition: 'aggregated',
            previousSeverity: 'LOW',
            runSideEffects: vi.fn(async () => {
                order.push('side-effects');
            }),
        });

        vi.mocked(TelemetryIngestionService.persistEvidenceCandidate).mockResolvedValue(deferred);
        vi.mocked(EvidenceUploadService.initializeUpload).mockImplementation(async () => {
            order.push('upload');
            return uploadTarget;
        });

        const result = await EvidenceCandidateService.process(
            {} as any,
            payload,
            payload.studentId,
        );

        expect(result).toMatchObject({
            telemetryDisposition: 'aggregated',
            evidenceDecision: 'UPLOAD',
            upload: expect.objectContaining({
                evidenceId: uploadTarget.evidenceId,
            }),
        });
        expect(order).toEqual(['upload', 'side-effects']);
        expect(deferred.runSideEffects).toHaveBeenCalledTimes(1);
    });

    it('returns UPLOAD for high-severity evidence and still runs deferred side effects', async () => {
        const deferred = createDeferredResult({
            finalSeverity: 'HIGH',
            disposition: 'aggregated',
            previousSeverity: 'MEDIUM',
        });

        vi.mocked(TelemetryIngestionService.persistEvidenceCandidate).mockResolvedValue(deferred);

        const result = await EvidenceCandidateService.process(
            {} as any,
            payload,
            payload.studentId,
        );

        expect(result).toMatchObject({
            telemetryDisposition: 'aggregated',
            evidenceDecision: 'UPLOAD',
        });
        expect(deferred.runSideEffects).toHaveBeenCalledTimes(1);
    });

    it('treats forced medium or high severity as eligible', async () => {
        vi.mocked(TelemetryIngestionService.persistEvidenceCandidate)
            .mockResolvedValueOnce(
                createDeferredResult({
                    finalSeverity: 'MEDIUM',
                    disposition: 'inserted',
                    previousSeverity: null,
                }),
            )
            .mockResolvedValueOnce(
                createDeferredResult({
                    finalSeverity: 'HIGH',
                    disposition: 'inserted',
                    previousSeverity: null,
                }),
            );

        const medium = await EvidenceCandidateService.process(
            {} as any,
            payload,
            payload.studentId,
        );
        const high = await EvidenceCandidateService.process({} as any, payload, payload.studentId);

        expect(medium.evidenceDecision).toBe('UPLOAD');
        expect(high.evidenceDecision).toBe('UPLOAD');
    });

    it('maps policy ignore to NOT_ELIGIBLE', async () => {
        vi.mocked(TelemetryIngestionService.persistEvidenceCandidate).mockResolvedValue(null);

        const result = await EvidenceCandidateService.process(
            {} as any,
            payload,
            payload.studentId,
        );

        expect(result).toEqual({
            telemetryDisposition: 'ignored',
            evidenceDecision: 'NOT_ELIGIBLE',
        });
    });

    it('returns UNAVAILABLE when evidence upload is disabled or denied after persistence', async () => {
        const deferred = createDeferredResult({
            finalSeverity: 'MEDIUM',
        });

        vi.mocked(TelemetryIngestionService.persistEvidenceCandidate).mockResolvedValue(deferred);
        vi.mocked(EvidenceUploadService.initializeUpload).mockRejectedValue(
            new HTTPException(403, { message: 'Evidence disabled' }),
        );

        const result = await EvidenceCandidateService.process(
            {} as any,
            payload,
            payload.studentId,
        );

        expect(result).toEqual({
            telemetryDisposition: 'aggregated',
            evidenceDecision: 'UNAVAILABLE',
        });
        expect(deferred.runSideEffects).toHaveBeenCalledTimes(1);
    });

    it('returns UNAVAILABLE on quota denial or initialization failure after persistence', async () => {
        const firstDeferred = createDeferredResult({
            finalSeverity: 'MEDIUM',
        });
        const secondDeferred = createDeferredResult({
            finalSeverity: 'MEDIUM',
        });

        vi.mocked(TelemetryIngestionService.persistEvidenceCandidate)
            .mockResolvedValueOnce(firstDeferred)
            .mockResolvedValueOnce(secondDeferred);
        vi.mocked(EvidenceUploadService.initializeUpload)
            .mockRejectedValueOnce(new HTTPException(400, { message: 'quota reached' }))
            .mockRejectedValueOnce(new Error('storage target failed'));

        const quotaResult = await EvidenceCandidateService.process(
            {} as any,
            payload,
            payload.studentId,
        );
        const failureResult = await EvidenceCandidateService.process(
            {} as any,
            payload,
            payload.studentId,
        );

        expect(quotaResult.evidenceDecision).toBe('UNAVAILABLE');
        expect(failureResult.evidenceDecision).toBe('UNAVAILABLE');
        expect(firstDeferred.runSideEffects).toHaveBeenCalledTimes(1);
        expect(secondDeferred.runSideEffects).toHaveBeenCalledTimes(1);
    });

    it('passes the authoritative incident id into evidence initialization', async () => {
        vi.mocked(TelemetryIngestionService.persistEvidenceCandidate).mockResolvedValue(
            createDeferredResult({
                incidentId: '123e4567-e89b-12d3-a456-426614174444',
                finalSeverity: 'MEDIUM',
            }),
        );

        await EvidenceCandidateService.process({} as any, payload, payload.studentId);

        expect(EvidenceUploadService.initializeUpload).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                attemptId: payload.examSessionId,
                incidentId: '123e4567-e89b-12d3-a456-426614174444',
            }),
        );
    });

    it('reuses a pending duplicate row by refreshing its upload target', async () => {
        const deferred = createDeferredResult({
            disposition: 'duplicate-ignored',
            finalSeverity: 'LOW',
        });

        vi.mocked(TelemetryIngestionService.persistEvidenceCandidate).mockResolvedValue(deferred);

        const db = createDbForEvidenceRow({
            evidence_id: '123e4567-e89b-12d3-a456-426614174555',
            incident_id: '123e4567-e89b-12d3-a456-426614174222',
            event_type: 'FACE_NOT_VISIBLE',
            state: 'PENDING_UPLOAD',
            expires_at: new Date('2026-07-28T12:02:00.000Z'),
        });

        const result = await EvidenceCandidateService.process(db, payload, payload.studentId);

        expect(result).toMatchObject({
            telemetryDisposition: 'duplicate-ignored',
            evidenceDecision: 'UPLOAD',
        });
        expect(EvidenceUploadService.initializeUpload).toHaveBeenCalled();
        expect(deferred.runSideEffects).toHaveBeenCalledTimes(1);
        expect(EvidenceUploadService.initializeUpload).toHaveBeenCalledTimes(1);
    });

    it('returns ALREADY_AVAILABLE for duplicate rows that are already uploaded', async () => {
        const deferred = createDeferredResult({
            disposition: 'duplicate-ignored',
            finalSeverity: 'LOW',
        });

        vi.mocked(TelemetryIngestionService.persistEvidenceCandidate).mockResolvedValue(deferred);

        const db = createDbForEvidenceRow({
            evidence_id: '123e4567-e89b-12d3-a456-426614174555',
            incident_id: '123e4567-e89b-12d3-a456-426614174222',
            event_type: 'FACE_NOT_VISIBLE',
            state: 'AVAILABLE',
            expires_at: new Date('2026-07-28T12:02:00.000Z'),
        });

        const result = await EvidenceCandidateService.process(db, payload, payload.studentId);

        expect(result).toEqual({
            telemetryDisposition: 'duplicate-ignored',
            evidenceDecision: 'ALREADY_AVAILABLE',
        });
        expect(EvidenceUploadService.initializeUpload).not.toHaveBeenCalled();
        expect(deferred.runSideEffects).toHaveBeenCalledTimes(1);
    });

    it('fails closed for duplicates without an evidence row or direct incident linkage', async () => {
        const deferred = createDeferredResult({
            disposition: 'duplicate-ignored',
            finalSeverity: 'LOW',
        });

        vi.mocked(TelemetryIngestionService.persistEvidenceCandidate).mockResolvedValue(deferred);

        const missingRowResult = await EvidenceCandidateService.process(
            createDbForEvidenceRow(undefined),
            payload,
            payload.studentId,
        );
        const missingIncidentResult = await EvidenceCandidateService.process(
            createDbForEvidenceRow({
                evidence_id: '123e4567-e89b-12d3-a456-426614174555',
                incident_id: null,
                event_type: 'FACE_NOT_VISIBLE',
                state: 'PENDING_UPLOAD',
                expires_at: new Date('2026-07-28T12:02:00.000Z'),
            }),
            payload,
            payload.studentId,
        );

        expect(missingRowResult).toEqual({
            telemetryDisposition: 'duplicate-ignored',
            evidenceDecision: 'NOT_ELIGIBLE',
        });
        expect(missingIncidentResult).toEqual({
            telemetryDisposition: 'duplicate-ignored',
            evidenceDecision: 'NOT_ELIGIBLE',
        });
        expect(deferred.runSideEffects).toHaveBeenCalledTimes(2);
    });

    it('returns UNAVAILABLE when a closed attempt denies initialization but still runs deferred effects', async () => {
        const deferred = createDeferredResult({
            finalSeverity: 'MEDIUM',
            disposition: 'inserted',
            previousSeverity: null,
        });

        vi.mocked(TelemetryIngestionService.persistEvidenceCandidate).mockResolvedValue(deferred);
        vi.mocked(EvidenceUploadService.initializeUpload).mockRejectedValue(
            new HTTPException(400, {
                message: 'Evidence upload is only permitted for in-progress attempts.',
            }),
        );

        const result = await EvidenceCandidateService.process(
            {} as any,
            payload,
            payload.studentId,
        );

        expect(result).toEqual({
            telemetryDisposition: 'inserted',
            evidenceDecision: 'UNAVAILABLE',
        });
        expect(deferred.runSideEffects).toHaveBeenCalledTimes(1);
    });
});
