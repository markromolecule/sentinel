import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { testWithDbClient } from '../../../../lib/test-with-db-client';
import { type DbClient } from '@sentinel/db';
import { EvidenceCorrelationService } from './evidence-correlation.service';
import { EvidenceReconciliationService } from './evidence-reconciliation.service';
import { EvidenceStorageService } from './evidence-storage.service';

vi.mock('./evidence-storage.service', () => ({
    EvidenceStorageService: {
        deleteObject: vi.fn().mockResolvedValue(undefined),
    },
}));

async function createFixture(db: DbClient) {
    const suffix = randomUUID().slice(0, 8);
    const userId = randomUUID();

    await db
        .insertInto('users')
        .values({
            id: userId,
            email: `evidence-correlation-${suffix}@sentinel.test`,
            role: 'student',
            created_at: new Date(),
            updated_at: new Date(),
        })
        .executeTakeFirst();

    const institution = await db
        .insertInto('institutions')
        .values({
            name: `Evidence Correlation ${suffix}`,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

    const student = await db
        .insertInto('students')
        .values({
            user_id: userId,
            student_number: `evidence-correlation-${suffix}`,
            institution_id: institution.id,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

    const exam = await db
        .insertInto('exams')
        .values({
            title: `Evidence Correlation ${suffix}`,
            institution_id: institution.id,
            duration_minutes: 60,
            status: 'PUBLISHED',
            scheduled_date: new Date('2026-07-27T10:00:00.000Z'),
            end_date_time: new Date('2026-07-27T11:00:00.000Z'),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

    const attempt = await db
        .insertInto('exam_attempts')
        .values({
            exam_id: exam.exam_id,
            student_id: student.student_id,
            lifecycle_state: 'IN_PROGRESS',
            status: 'IN_PROGRESS',
            started_at: new Date('2026-07-27T10:00:00.000Z'),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

    return {
        attemptId: attempt.attempt_id,
        examId: exam.exam_id,
        studentId: student.student_id,
        institutionId: institution.id,
    };
}

describe('EvidenceCorrelationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    testWithDbClient('links an unlinked evidence row to its incident', async ({ dbClient }) => {
        const fixture = await createFixture(dbClient);
        const eventId = randomUUID();

        const incident = await dbClient
            .insertInto('flagged_incidents')
            .values({
                attempt_id: fixture.attemptId,
                incident_type: 'FACE_NOT_VISIBLE',
                status: 'PENDING',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        const evidence = await dbClient
            .insertInto('telemetry_incident_evidence')
            .values({
                attempt_id: fixture.attemptId,
                incident_id: null,
                institution_id: fixture.institutionId,
                student_id: fixture.studentId,
                event_id: eventId,
                event_type: 'FACE_NOT_VISIBLE',
                captured_at: new Date('2026-07-27T10:05:00.000Z'),
                storage_bucket: 'sentinel-proctoring-evidence',
                storage_path: `${fixture.attemptId}/${eventId}.webp`,
                mime_type: 'image/webp',
                declared_size_bytes: 12345,
                state: 'AVAILABLE',
                expires_at: new Date('2026-08-03T10:05:00.000Z'),
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        const result = await EvidenceCorrelationService.linkEvidenceToIncident(dbClient, {
            attemptId: fixture.attemptId,
            eventId,
            incidentId: incident.incident_id,
        });

        expect(result).toEqual({
            status: 'linked',
            evidenceId: evidence.evidence_id,
        });

        const linked = await dbClient
            .selectFrom('telemetry_incident_evidence')
            .select(['incident_id'])
            .where('evidence_id', '=', evidence.evidence_id)
            .executeTakeFirstOrThrow();

        expect(linked.incident_id).toBe(incident.incident_id);
    });

    testWithDbClient('rejects conflicting links to a different incident', async ({ dbClient }) => {
        const fixture = await createFixture(dbClient);
        const eventId = randomUUID();

        const firstIncident = await dbClient
            .insertInto('flagged_incidents')
            .values({
                attempt_id: fixture.attemptId,
                incident_type: 'FACE_NOT_VISIBLE',
                status: 'PENDING',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        const secondIncident = await dbClient
            .insertInto('flagged_incidents')
            .values({
                attempt_id: fixture.attemptId,
                incident_type: 'FACE_NOT_VISIBLE',
                status: 'PENDING',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        await dbClient
            .insertInto('telemetry_incident_evidence')
            .values({
                attempt_id: fixture.attemptId,
                incident_id: firstIncident.incident_id,
                institution_id: fixture.institutionId,
                student_id: fixture.studentId,
                event_id: eventId,
                event_type: 'FACE_NOT_VISIBLE',
                captured_at: new Date('2026-07-27T10:05:00.000Z'),
                storage_bucket: 'sentinel-proctoring-evidence',
                storage_path: `${fixture.attemptId}/${eventId}.webp`,
                mime_type: 'image/webp',
                declared_size_bytes: 12345,
                state: 'AVAILABLE',
                expires_at: new Date('2026-08-03T10:05:00.000Z'),
            })
            .executeTakeFirst();

        await expect(
            EvidenceCorrelationService.linkEvidenceToIncident(dbClient, {
                attemptId: fixture.attemptId,
                eventId,
                incidentId: secondIncident.incident_id,
            }),
        ).rejects.toThrow('Evidence row is already linked to a different incident.');
    });

    testWithDbClient('reconciles evidence-first uploads by matching incident details event id', async ({ dbClient }) => {
        const fixture = await createFixture(dbClient);
        const eventId = randomUUID();

        await dbClient
            .insertInto('telemetry_incident_evidence')
            .values({
                attempt_id: fixture.attemptId,
                incident_id: null,
                institution_id: fixture.institutionId,
                student_id: fixture.studentId,
                event_id: eventId,
                event_type: 'FACE_NOT_VISIBLE',
                captured_at: new Date('2026-07-27T10:05:00.000Z'),
                received_at: new Date('2026-07-27T10:05:10.000Z'),
                storage_bucket: 'sentinel-proctoring-evidence',
                storage_path: `${fixture.attemptId}/${eventId}.webp`,
                mime_type: 'image/webp',
                declared_size_bytes: 12345,
                state: 'AVAILABLE',
                expires_at: new Date('2026-08-03T10:05:00.000Z'),
            })
            .executeTakeFirst();

        const incident = await dbClient
            .insertInto('flagged_incidents')
            .values({
                attempt_id: fixture.attemptId,
                incident_type: 'FACE_NOT_VISIBLE',
                status: 'PENDING',
                dedupe_key: `attempt:NO_FACE_DETECTED:${eventId}`,
                details: JSON.stringify({
                    lastEvent: {
                        eventType: 'NO_FACE_DETECTED',
                        timestamp: '2026-07-27T10:05:11.000Z',
                        metadata: {
                            eventId,
                            dedupeKey: `attempt:NO_FACE_DETECTED:${eventId}`,
                        },
                    },
                }),
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        const result = await EvidenceReconciliationService.reconcileEvidence(dbClient);

        expect(result.processedCount).toBe(1);

        const linked = await dbClient
            .selectFrom('telemetry_incident_evidence')
            .select(['incident_id'])
            .where('attempt_id', '=', fixture.attemptId)
            .where('event_id', '=', eventId)
            .executeTakeFirstOrThrow();

        expect(linked.incident_id).toBe(incident.incident_id);
    });

    testWithDbClient('purges stale unlinked evidence after the reconciliation timeout', async ({ dbClient }) => {
        const fixture = await createFixture(dbClient);
        const eventId = randomUUID();

        const evidence = await dbClient
            .insertInto('telemetry_incident_evidence')
            .values({
                attempt_id: fixture.attemptId,
                incident_id: null,
                institution_id: fixture.institutionId,
                student_id: fixture.studentId,
                event_id: eventId,
                event_type: 'FACE_NOT_VISIBLE',
                captured_at: new Date('2026-07-27T10:05:00.000Z'),
                received_at: new Date(Date.now() - 16 * 60 * 1000),
                storage_bucket: 'sentinel-proctoring-evidence',
                storage_path: `${fixture.attemptId}/${eventId}.webp`,
                mime_type: 'image/webp',
                declared_size_bytes: 12345,
                state: 'AVAILABLE',
                expires_at: new Date('2026-08-03T10:05:00.000Z'),
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        const result = await EvidenceReconciliationService.reconcileEvidence(dbClient);

        expect(result.details.unlinkedPurged).toBe(1);
        expect(vi.mocked(EvidenceStorageService.deleteObject)).toHaveBeenCalledWith(
            'sentinel-proctoring-evidence',
            `${fixture.attemptId}/${eventId}.webp`,
        );

        const deleted = await dbClient
            .selectFrom('telemetry_incident_evidence')
            .select(['state', 'deletion_reason', 'storage_bucket', 'storage_path'])
            .where('evidence_id', '=', evidence.evidence_id)
            .executeTakeFirstOrThrow();

        expect(deleted).toMatchObject({
            state: 'DELETED',
            deletion_reason: 'TELEMETRY_UNLINKED',
            storage_bucket: null,
            storage_path: null,
        });
    });
});
