import { type DbClient } from '@sentinel/db';
import type { AppendEventResult } from '../../storage/services/incident-persistence.service';
import { TelemetryIngestionService } from '../../ingestion/ingestion.service';
import type { IngestEvidenceCandidateBody } from '../evidence.dto';
import { EvidenceUploadService } from './evidence-upload.service';

type EvidenceCandidateDecision = 'UPLOAD' | 'NOT_ELIGIBLE' | 'ALREADY_AVAILABLE' | 'UNAVAILABLE';
type TelemetryDisposition = AppendEventResult['disposition'] | 'ignored';

export type EvidenceCandidateResponse = {
    telemetryDisposition: TelemetryDisposition;
    evidenceDecision: EvidenceCandidateDecision;
    upload?: {
        evidenceId: string;
        uploadUrl: string;
        uploadToken: string;
        expiresAt: string;
    };
};

/**
 * Persists one MediaPipe telemetry occurrence and decides whether that exact
 * occurrence is allowed to upload evidence.
 */
export class EvidenceCandidateService {
    /**
     * Persists one restricted MediaPipe evidence candidate and returns the
     * authoritative upload decision derived from server-side telemetry severity.
     *
     * The browser may supply stable correlation IDs and capture metadata, but it
     * never supplies severity authority. Only inline persistence of the three
     * supported MediaPipe event types may produce an `UPLOAD` decision.
     */
    static async process(
        db: DbClient,
        payload: IngestEvidenceCandidateBody,
        studentUserId: string,
    ): Promise<EvidenceCandidateResponse> {
        const persistenceResult = await TelemetryIngestionService.persistEvidenceCandidate(db, {
            ...payload,
            metadata: payload.metadata,
            sessionContext: payload.sessionContext,
        });

        if (!persistenceResult) {
            return {
                telemetryDisposition: 'ignored',
                evidenceDecision: 'NOT_ELIGIBLE',
            };
        }

        const deferredSideEffects = persistenceResult;
        let response: EvidenceCandidateResponse;

        try {
            if (persistenceResult.disposition === 'duplicate-ignored') {
                response = await this.resolveDuplicateDecision(db, payload, studentUserId);
            } else if (persistenceResult.finalSeverity === 'LOW') {
                response = {
                    telemetryDisposition: persistenceResult.disposition,
                    evidenceDecision: 'NOT_ELIGIBLE',
                };
            } else {
                const upload = await EvidenceUploadService.initializeUpload(db, {
                    attemptId: payload.examSessionId,
                    incidentId: persistenceResult.incidentId,
                    eventId: payload.metadata.eventId,
                    eventType: this.mapEvidenceEventType(payload.eventType),
                    capturedAt: payload.capture.capturedAt,
                    mimeType: payload.capture.mimeType,
                    sizeBytes: payload.capture.sizeBytes,
                    studentUserId,
                });

                response = {
                    telemetryDisposition: persistenceResult.disposition,
                    evidenceDecision: 'UPLOAD',
                    upload: {
                        evidenceId: upload.evidenceId,
                        uploadUrl: upload.uploadUrl,
                        uploadToken: upload.uploadToken,
                        expiresAt: upload.expiresAt.toISOString(),
                    },
                };
            }
        } catch (error) {
            console.warn(
                '[TelemetryEvidence] Upload target unavailable after candidate persisted',
                {
                    attemptId: payload.examSessionId,
                    eventId: payload.metadata.eventId,
                    incidentId: persistenceResult.incidentId,
                    eventType: payload.eventType,
                    error: error instanceof Error ? error.message : error,
                },
            );

            response = {
                telemetryDisposition: persistenceResult.disposition,
                evidenceDecision: 'UNAVAILABLE',
            };
        } finally {
            await deferredSideEffects.runSideEffects();
        }

        return response;
    }

    private static mapEvidenceEventType(
        eventType: IngestEvidenceCandidateBody['eventType'],
    ): 'GAZE' | 'FACE_NOT_VISIBLE' | 'MULTIPLE_FACES' {
        if (eventType === 'GAZE_OFF_SCREEN') {
            return 'GAZE';
        }

        if (eventType === 'NO_FACE_DETECTED') {
            return 'FACE_NOT_VISIBLE';
        }

        return 'MULTIPLE_FACES';
    }

    // Duplicate candidate events must fail closed when no row exists so a later
    // incident escalation cannot retroactively authorize an older low frame.
    private static async resolveDuplicateDecision(
        db: DbClient,
        payload: IngestEvidenceCandidateBody,
        studentUserId: string,
    ): Promise<EvidenceCandidateResponse> {
        const evidence = await db
            .selectFrom('telemetry_incident_evidence')
            .select(['evidence_id', 'incident_id', 'event_type', 'state', 'expires_at'])
            .where('attempt_id', '=', payload.examSessionId)
            .where('event_id', '=', payload.metadata.eventId)
            .executeTakeFirst();

        if (!evidence) {
            return {
                telemetryDisposition: 'duplicate-ignored',
                evidenceDecision: 'NOT_ELIGIBLE',
            };
        }

        if (evidence.state === 'AVAILABLE') {
            return {
                telemetryDisposition: 'duplicate-ignored',
                evidenceDecision: 'ALREADY_AVAILABLE',
            };
        }

        if (evidence.state !== 'PENDING_UPLOAD') {
            return {
                telemetryDisposition: 'duplicate-ignored',
                evidenceDecision: 'NOT_ELIGIBLE',
            };
        }

        if (!evidence.incident_id) {
            return {
                telemetryDisposition: 'duplicate-ignored',
                evidenceDecision: 'NOT_ELIGIBLE',
            };
        }

        try {
            const upload = await EvidenceUploadService.initializeUpload(db, {
                attemptId: payload.examSessionId,
                incidentId: evidence.incident_id,
                eventId: payload.metadata.eventId,
                eventType: evidence.event_type,
                capturedAt: payload.capture.capturedAt,
                mimeType: payload.capture.mimeType,
                sizeBytes: payload.capture.sizeBytes,
                studentUserId,
            });

            return {
                telemetryDisposition: 'duplicate-ignored',
                evidenceDecision: 'UPLOAD',
                upload: {
                    evidenceId: upload.evidenceId,
                    uploadUrl: upload.uploadUrl,
                    uploadToken: upload.uploadToken,
                    expiresAt: upload.expiresAt.toISOString(),
                },
            };
        } catch (error) {
            console.warn('[TelemetryEvidence] Pending duplicate upload target refresh failed', {
                attemptId: payload.examSessionId,
                eventId: payload.metadata.eventId,
                evidenceId: evidence.evidence_id,
                error: error instanceof Error ? error.message : error,
            });

            return {
                telemetryDisposition: 'duplicate-ignored',
                evidenceDecision: 'UNAVAILABLE',
            };
        }
    }
}
