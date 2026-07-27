import { type DbClient } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import {
    getEvidenceBucket,
    getEvidenceMaxBytes,
    getEvidenceMaxPerAttempt,
    getEvidenceMaxPerEventType,
    getEvidenceRetentionDays,
} from '../evidence.constants';
import { EvidenceAuthorizationService } from './evidence-authorization.service';
import { EvidenceStorageService } from './evidence-storage.service';
import { executeTransaction } from '@sentinel/db';

export interface InitializeUploadInput {
    attemptId: string;
    eventId: string;
    eventType: any;
    capturedAt: string;
    mimeType: 'image/webp' | 'image/jpeg';
    sizeBytes: number;
    studentUserId: string;
}

/**
 * Service to handle the evidence upload lifecycle (initialization, completion, and validation).
 */
export class EvidenceUploadService {
    /**
     * Initializes the upload process for a new evidence frame.
     * Enforces size limits, quotas, rate limits, and calculates the retention expiration.
     * Idempotent on (attemptId, eventId).
     */
    static async initializeUpload(
        db: DbClient,
        input: InitializeUploadInput,
    ): Promise<{ evidenceId: string; uploadUrl: string; uploadToken: string; expiresAt: Date }> {
        const { attemptId, eventId, eventType, capturedAt, mimeType, sizeBytes, studentUserId } = input;

        // 1. Authorize attempt/student/AI rule/allowlist
        const auth = await EvidenceAuthorizationService.authorizeStudentUpload(
            db,
            attemptId,
            studentUserId,
            eventType,
        );

        // 2. Validate file size limits
        const maxBytes = getEvidenceMaxBytes();
        if (sizeBytes > maxBytes) {
            throw new HTTPException(400, {
                message: `Declared size ${sizeBytes} bytes exceeds the maximum allowed of ${maxBytes} bytes.`,
            });
        }

        // 3. Check existing quotas
        // Count total evidence in this attempt
        const totalCountRes = await db
            .selectFrom('telemetry_incident_evidence')
            .select((eb) => eb.fn.count<number>('evidence_id').as('count'))
            .where('attempt_id', '=', attemptId)
            .executeTakeFirst();
        const totalCount = totalCountRes?.count ?? 0;

        const maxPerAttempt = getEvidenceMaxPerAttempt();
        if (totalCount >= maxPerAttempt) {
            throw new HTTPException(400, {
                message: `Attempt has reached the maximum allowed evidence quota of ${maxPerAttempt}.`,
            });
        }

        // Count evidence for this event type in this attempt
        const typeCountRes = await db
            .selectFrom('telemetry_incident_evidence')
            .select((eb) => eb.fn.count<number>('evidence_id').as('count'))
            .where('attempt_id', '=', attemptId)
            .where('event_type', '=', eventType)
            .executeTakeFirst();
        const typeCount = typeCountRes?.count ?? 0;

        const maxPerType = getEvidenceMaxPerEventType();
        if (typeCount >= maxPerType) {
            throw new HTTPException(400, {
                message: `Attempt has reached the maximum allowed evidence quota of ${maxPerType} for event type ${eventType}.`,
            });
        }

        // 4. Calculate retention deadline: max(exam.end_date_time, attempt.started_at, captured_at) + 7 days
        const exam = await db
            .selectFrom('exams as e')
            .innerJoin('exam_attempts as ea', 'ea.exam_id', 'e.exam_id')
            .select(['e.end_date_time', 'ea.started_at'])
            .where('ea.attempt_id', '=', attemptId)
            .executeTakeFirst();

        const capturedDate = new Date(capturedAt);
        const startedDate = exam?.started_at ? new Date(exam.started_at) : new Date();
        const endDate = exam?.end_date_time ? new Date(exam.end_date_time) : null;

        let baseDate = capturedDate;
        if (endDate && endDate > baseDate) baseDate = endDate;
        if (startedDate > baseDate) baseDate = startedDate;

        const expiresAt = new Date(
            baseDate.getTime() + getEvidenceRetentionDays() * 24 * 60 * 60 * 1000,
        );

        // 5. Generate storage coordinates
        const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
        const bucket = getEvidenceBucket();
        const storagePath = `${auth.institutionId}/${auth.examId}/${attemptId}/${eventId}.${ext}`;

        // 6. Handle transaction-safe idempotent upsert
        return await executeTransaction(async (trx) => {
            const existing = await trx
                .selectFrom('telemetry_incident_evidence')
                .selectAll()
                .where('attempt_id', '=', attemptId)
                .where('event_id', '=', eventId)
                .executeTakeFirst();

            if (existing) {
                // Verify compatibility
                const isCompatible =
                    existing.mime_type === mimeType &&
                    existing.event_type === eventType &&
                    existing.declared_size_bytes === sizeBytes;

                if (!isCompatible) {
                    throw new HTTPException(409, {
                        message: 'Incompatible metadata for the same event ID.',
                    });
                }

                if (existing.state !== 'PENDING_UPLOAD') {
                    // Already uploaded or in a terminal state, return existing identity
                    // But generating new upload target is only valid if not complete.
                    // If it is already AVAILABLE, we just return its metadata or throw.
                    // Let's return the existing details.
                    const target = await EvidenceStorageService.createSignedUploadTarget(
                        bucket,
                        storagePath,
                    );
                    return {
                        evidenceId: existing.evidence_id,
                        uploadUrl: target.signedUrl,
                        uploadToken: target.token,
                        expiresAt: existing.expires_at,
                    };
                }

                // Refresh upload URL
                const target = await EvidenceStorageService.createSignedUploadTarget(
                    bucket,
                    storagePath,
                );
                return {
                    evidenceId: existing.evidence_id,
                    uploadUrl: target.signedUrl,
                    uploadToken: target.token,
                    expiresAt: existing.expires_at,
                };
            }

            // Generate new upload target
            const target = await EvidenceStorageService.createSignedUploadTarget(bucket, storagePath);

            // Insert new record
            const newRecord = await trx
                .insertInto('telemetry_incident_evidence')
                .values({
                    attempt_id: attemptId,
                    institution_id: auth.institutionId,
                    student_id: auth.studentId,
                    event_id: eventId,
                    event_type: eventType,
                    captured_at: capturedDate,
                    storage_bucket: bucket,
                    storage_path: storagePath,
                    mime_type: mimeType,
                    declared_size_bytes: sizeBytes,
                    state: 'PENDING_UPLOAD',
                    expires_at: expiresAt,
                })
                .returning(['evidence_id', 'expires_at'])
                .executeTakeFirstOrThrow();

            return {
                evidenceId: newRecord.evidence_id,
                uploadUrl: target.signedUrl,
                uploadToken: target.token,
                expiresAt: newRecord.expires_at,
            };
        });
    }

    /**
     * Completes an evidence upload, validating the uploaded file's metadata.
     * Transitions state to AVAILABLE or FAILED.
     */
    static async completeUpload(
        db: DbClient,
        evidenceId: string,
        studentUserId: string,
    ): Promise<{ evidenceId: string; state: any; expiresAt: Date }> {
        const evidence = await db
            .selectFrom('telemetry_incident_evidence as tie')
            .innerJoin('students as s', 's.student_id', 'tie.student_id')
            .select([
                'tie.evidence_id',
                'tie.attempt_id',
                'tie.storage_bucket',
                'tie.storage_path',
                'tie.mime_type',
                'tie.declared_size_bytes',
                'tie.state',
                'tie.expires_at',
                's.user_id as student_user_id',
            ])
            .where('tie.evidence_id', '=', evidenceId)
            .executeTakeFirst();

        if (!evidence) {
            throw new HTTPException(404, { message: 'Evidence record not found' });
        }

        if (evidence.student_user_id !== studentUserId) {
            throw new HTTPException(403, { message: 'Unauthorized evidence access' });
        }

        if (evidence.state === 'AVAILABLE') {
            return {
                evidenceId: evidence.evidence_id,
                state: 'AVAILABLE',
                expiresAt: evidence.expires_at,
            };
        }

        if (evidence.state !== 'PENDING_UPLOAD') {
            throw new HTTPException(400, {
                message: `Cannot complete upload. State is currently ${evidence.state}.`,
            });
        }

        const bucket = evidence.storage_bucket;
        const path = evidence.storage_path;

        if (!bucket || !path) {
            throw new HTTPException(500, { message: 'Missing storage coordinates.' });
        }

        try {
            // Inspect file in storage
            const objectMeta = await EvidenceStorageService.inspectObject(bucket, path);

            // Validate actual size and MIME type
            const sizeMismatch = objectMeta.sizeBytes !== evidence.declared_size_bytes;
            // Tolerant MIME type match (e.g. image/jpg vs image/jpeg fallback)
            const resolvedMime = (mime: string) => (mime === 'image/jpg' ? 'image/jpeg' : mime);
            const mimeMismatch =
                resolvedMime(objectMeta.mimeType) !== resolvedMime(evidence.mime_type);

            if (sizeMismatch || mimeMismatch) {
                // transition to FAILED and delete file
                await executeTransaction(async (trx) => {
                    await trx
                        .updateTable('telemetry_incident_evidence')
                        .set({
                            state: 'FAILED',
                            failure_code: sizeMismatch ? 'SIZE_MISMATCH' : 'MIME_MISMATCH',
                            updated_at: new Date(),
                        })
                        .where('evidence_id', '=', evidenceId)
                        .execute();
                });

                await EvidenceStorageService.deleteObject(bucket, path);

                throw new HTTPException(400, {
                    message: `Upload validation failed: ${
                        sizeMismatch ? 'Size mismatch' : 'MIME mismatch'
                    }.`,
                });
            }

            // Success: update to AVAILABLE
            await executeTransaction(async (trx) => {
                await trx
                    .updateTable('telemetry_incident_evidence')
                    .set({
                        state: 'AVAILABLE',
                        size_bytes: objectMeta.sizeBytes,
                        updated_at: new Date(),
                    })
                    .where('evidence_id', '=', evidenceId)
                    .execute();
            });

            return {
                evidenceId: evidence.evidence_id,
                state: 'AVAILABLE',
                expiresAt: evidence.expires_at,
            };
        } catch (err: any) {
            if (err instanceof HTTPException) {
                throw err;
            }

            // Fail closed: update state to FAILED
            await executeTransaction(async (trx) => {
                await trx
                    .updateTable('telemetry_incident_evidence')
                    .set({
                        state: 'FAILED',
                        failure_code: 'STORAGE_INSPECTION_FAILED',
                        updated_at: new Date(),
                    })
                    .where('evidence_id', '=', evidenceId)
                    .execute();
            });

            throw new HTTPException(400, {
                message: `Failed to verify upload: ${err.message}`,
            });
        }
    }
}
