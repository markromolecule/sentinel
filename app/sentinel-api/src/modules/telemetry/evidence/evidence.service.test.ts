import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testWithDbClient } from '../../../lib/test-with-db-client';
import { type DbClient } from '@sentinel/db';
import { EvidenceAuthorizationService } from './services/evidence-authorization.service';
import { EvidenceUploadService } from './services/evidence-upload.service';
import { EvidenceQueryService } from './services/evidence-query.service';
import { EvidenceDeletionService } from './services/evidence-deletion.service';
import { EvidenceStorageService } from './services/evidence-storage.service';

vi.mock('@sentinel/db', async () => {
    const actual = await vi.importActual<typeof import('@sentinel/db')>('@sentinel/db');
    return {
        ...actual,
        executeTransaction: vi.fn(async (callback: any) => {
            const activeTrx = (globalThis as any).activeTestTrx;
            if (activeTrx) {
                return await callback(activeTrx);
            }
            return await callback(actual.dbClient);
        }),
    };
});

vi.mock('./services/evidence-storage.service', () => ({
    EvidenceStorageService: {
        createSignedUploadTarget: vi.fn().mockResolvedValue({
            signedUrl: 'https://upload-target.url',
            token: 'test-upload-token',
        }),
        inspectObject: vi.fn().mockResolvedValue({
            sizeBytes: 12345,
            mimeType: 'image/webp',
        }),
        createSignedViewUrl: vi.fn().mockResolvedValue('https://signed-view.url'),
        deleteObject: vi.fn().mockResolvedValue(undefined),
    },
}));

describe('Telemetry Evidence Services', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default env variables for testing
        process.env.TELEMETRY_EVIDENCE_ENABLED = 'true';
        delete process.env.TELEMETRY_EVIDENCE_MAX_PER_ATTEMPT;
        delete process.env.TELEMETRY_EVIDENCE_MAX_PER_EVENT_TYPE;
        delete (globalThis as any).activeTestTrx;
    });

    async function createTestFixture(
        db: DbClient,
        overrides: {
            institutionId?: string;
            aiRules?: any;
            lifecycleState?: any;
        } = {},
    ) {
        const suffix = randomUUID().slice(0, 8);
        const userId = randomUUID();

        // 1. User
        await db
            .insertInto('users')
            .values({
                id: userId,
                email: `student-${suffix}@sentinel.test`,
                role: 'student',
                created_at: new Date(),
                updated_at: new Date(),
            })
            .executeTakeFirst();

        // 2. Institution
        let institutionId = overrides.institutionId;
        if (!institutionId) {
            const institution = await db
                .insertInto('institutions')
                .values({
                    name: `Test Inst ${suffix}`,
                })
                .returningAll()
                .executeTakeFirstOrThrow();
            institutionId = institution.id;
        }

        // Set allowlist to include this institution
        process.env.TELEMETRY_EVIDENCE_INSTITUTION_ALLOWLIST = institutionId;

        // 3. Student
        const student = await db
            .insertInto('students')
            .values({
                user_id: userId,
                student_number: `student-${suffix}`,
                institution_id: institutionId,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        // 4. Exam
        const exam = await db
            .insertInto('exams')
            .values({
                title: `Test Exam ${suffix}`,
                institution_id: institutionId,
                duration_minutes: 60,
                status: 'PUBLISHED',
                scheduled_date: new Date(),
                end_date_time: new Date(Date.now() + 3600000),
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        // 5. Config
        const aiRules = overrides.aiRules ?? {
            face_detection: true,
            multiple_faces_detection: true,
            gaze_tracking: true,
        };
        await db
            .insertInto('exam_configurations')
            .values({
                exam_id: exam.exam_id,
                ai_rules: aiRules,
            })
            .execute();

        // 6. Attempt
        const attempt = await db
            .insertInto('exam_attempts')
            .values({
                exam_id: exam.exam_id,
                student_id: student.student_id,
                lifecycle_state: overrides.lifecycleState ?? 'IN_PROGRESS',
                status: 'IN_PROGRESS',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return {
            userId,
            studentId: student.student_id,
            institutionId,
            examId: exam.exam_id,
            attemptId: attempt.attempt_id,
        };
    }

    describe('EvidenceAuthorizationService', () => {
        testWithDbClient('authorizes valid attempt and rule', async ({ dbClient }) => {
            (globalThis as any).activeTestTrx = dbClient;
            const fix = await createTestFixture(dbClient);

            const auth = await EvidenceAuthorizationService.authorizeStudentUpload(
                dbClient,
                fix.attemptId,
                fix.userId,
                'FACE_NOT_VISIBLE',
            );

            expect(auth.attemptId).toBe(fix.attemptId);
            expect(auth.studentId).toBe(fix.studentId);
            expect(auth.institutionId).toBe(fix.institutionId);
        });

        testWithDbClient('rejects completed attempts', async ({ dbClient }) => {
            (globalThis as any).activeTestTrx = dbClient;
            const fix = await createTestFixture(dbClient, { lifecycleState: 'SUBMITTED' });

            await expect(
                EvidenceAuthorizationService.authorizeStudentUpload(
                    dbClient,
                    fix.attemptId,
                    fix.userId,
                    'FACE_NOT_VISIBLE',
                ),
            ).rejects.toThrow('Evidence upload is only permitted for in-progress attempts.');
        });

        testWithDbClient('rejects when AI rule is disabled', async ({ dbClient }) => {
            (globalThis as any).activeTestTrx = dbClient;
            const fix = await createTestFixture(dbClient, {
                aiRules: { face_detection: false },
            });

            await expect(
                EvidenceAuthorizationService.authorizeStudentUpload(
                    dbClient,
                    fix.attemptId,
                    fix.userId,
                    'FACE_NOT_VISIBLE',
                ),
            ).rejects.toThrow('AI proctoring rule for event type FACE_NOT_VISIBLE is disabled.');
        });
    });

    describe('EvidenceUploadService', () => {
        testWithDbClient('initializes upload and creates db record', async ({ dbClient }) => {
            (globalThis as any).activeTestTrx = dbClient;
            const fix = await createTestFixture(dbClient);
            const eventId = randomUUID();
            const incidentId = randomUUID();

            const result = await EvidenceUploadService.initializeUpload(dbClient, {
                attemptId: fix.attemptId,
                incidentId,
                eventId,
                eventType: 'FACE_NOT_VISIBLE',
                capturedAt: new Date().toISOString(),
                mimeType: 'image/webp',
                sizeBytes: 25000,
                studentUserId: fix.userId,
            });

            expect(result.evidenceId).toBeDefined();
            expect(result.uploadUrl).toBe('https://upload-target.url');

            // Verify db row
            const row = await dbClient
                .selectFrom('telemetry_incident_evidence')
                .selectAll()
                .where('evidence_id', '=', result.evidenceId)
                .executeTakeFirstOrThrow();

            expect(row.state).toBe('PENDING_UPLOAD');
            expect(row.declared_size_bytes).toBe(25000);
            expect(row.event_id).toBe(eventId);
            expect(row.incident_id).toBe(incidentId);
        });

        testWithDbClient(
            'performs idempotency lookup before quota checks',
            async ({ dbClient }) => {
                (globalThis as any).activeTestTrx = dbClient;
                process.env.TELEMETRY_EVIDENCE_MAX_PER_ATTEMPT = '1';
                const fix = await createTestFixture(dbClient);
                const eventId = randomUUID();

                const first = await EvidenceUploadService.initializeUpload(dbClient, {
                    attemptId: fix.attemptId,
                    incidentId: randomUUID(),
                    eventId,
                    eventType: 'FACE_NOT_VISIBLE',
                    capturedAt: new Date().toISOString(),
                    mimeType: 'image/webp',
                    sizeBytes: 25000,
                    studentUserId: fix.userId,
                });

                const second = await EvidenceUploadService.initializeUpload(dbClient, {
                    attemptId: fix.attemptId,
                    incidentId: randomUUID(),
                    eventId,
                    eventType: 'FACE_NOT_VISIBLE',
                    capturedAt: new Date().toISOString(),
                    mimeType: 'image/webp',
                    sizeBytes: 25000,
                    studentUserId: fix.userId,
                });

                expect(second.evidenceId).toBe(first.evidenceId);
                expect(EvidenceStorageService.createSignedUploadTarget).toHaveBeenCalledTimes(2);
            },
        );

        testWithDbClient('completes upload successfully', async ({ dbClient }) => {
            (globalThis as any).activeTestTrx = dbClient;
            const fix = await createTestFixture(dbClient);
            const eventId = randomUUID();

            const init = await EvidenceUploadService.initializeUpload(dbClient, {
                attemptId: fix.attemptId,
                incidentId: randomUUID(),
                eventId,
                eventType: 'FACE_NOT_VISIBLE',
                capturedAt: new Date().toISOString(),
                mimeType: 'image/webp',
                sizeBytes: 12345, // matches mocked inspectObject sizeBytes
                studentUserId: fix.userId,
            });

            const complete = await EvidenceUploadService.completeUpload(
                dbClient,
                init.evidenceId,
                fix.userId,
            );

            expect(complete.state).toBe('AVAILABLE');

            const row = await dbClient
                .selectFrom('telemetry_incident_evidence')
                .selectAll()
                .where('evidence_id', '=', init.evidenceId)
                .executeTakeFirstOrThrow();

            expect(row.state).toBe('AVAILABLE');
            expect(row.size_bytes).toBe(12345);
        });

        testWithDbClient(
            'rejects a later evidence target once the attempt has been closed',
            async ({ dbClient }) => {
                (globalThis as any).activeTestTrx = dbClient;
                const fix = await createTestFixture(dbClient);
                const firstEventId = randomUUID();
                const secondEventId = randomUUID();

                const first = await EvidenceUploadService.initializeUpload(dbClient, {
                    attemptId: fix.attemptId,
                    incidentId: randomUUID(),
                    eventId: firstEventId,
                    eventType: 'FACE_NOT_VISIBLE',
                    capturedAt: new Date().toISOString(),
                    mimeType: 'image/webp',
                    sizeBytes: 12345,
                    studentUserId: fix.userId,
                });

                expect(first.evidenceId).toBeDefined();

                await dbClient
                    .updateTable('exam_attempts')
                    .set({
                        lifecycle_state: 'CLOSED',
                        closed_reason: 'AUTO_HIGH_INCIDENT_THRESHOLD',
                    })
                    .where('attempt_id', '=', fix.attemptId)
                    .execute();

                await expect(
                    EvidenceUploadService.initializeUpload(dbClient, {
                        attemptId: fix.attemptId,
                        incidentId: randomUUID(),
                        eventId: secondEventId,
                        eventType: 'FACE_NOT_VISIBLE',
                        capturedAt: new Date().toISOString(),
                        mimeType: 'image/webp',
                        sizeBytes: 12345,
                        studentUserId: fix.userId,
                    }),
                ).rejects.toThrow('Evidence upload is only permitted for in-progress attempts.');
            },
        );

        testWithDbClient('fails upload on size mismatch', async ({ dbClient }) => {
            (globalThis as any).activeTestTrx = dbClient;
            const fix = await createTestFixture(dbClient);
            const eventId = randomUUID();

            const init = await EvidenceUploadService.initializeUpload(dbClient, {
                attemptId: fix.attemptId,
                incidentId: randomUUID(),
                eventId,
                eventType: 'FACE_NOT_VISIBLE',
                capturedAt: new Date().toISOString(),
                mimeType: 'image/webp',
                sizeBytes: 99999, // Mismatches the mocked 12345 bytes
                studentUserId: fix.userId,
            });

            await expect(
                EvidenceUploadService.completeUpload(dbClient, init.evidenceId, fix.userId),
            ).rejects.toThrow('Upload validation failed: Size mismatch.');

            const row = await dbClient
                .selectFrom('telemetry_incident_evidence')
                .selectAll()
                .where('evidence_id', '=', init.evidenceId)
                .executeTakeFirstOrThrow();

            expect(row.state).toBe('FAILED');
            expect(row.failure_code).toBe('SIZE_MISMATCH');
            expect(EvidenceStorageService.deleteObject).toHaveBeenCalled();
        });

        testWithDbClient(
            'refuses terminal-state reinitialization for the same event',
            async ({ dbClient }) => {
                (globalThis as any).activeTestTrx = dbClient;
                const fix = await createTestFixture(dbClient);
                const eventId = randomUUID();

                const init = await EvidenceUploadService.initializeUpload(dbClient, {
                    attemptId: fix.attemptId,
                    incidentId: randomUUID(),
                    eventId,
                    eventType: 'FACE_NOT_VISIBLE',
                    capturedAt: new Date().toISOString(),
                    mimeType: 'image/webp',
                    sizeBytes: 12345,
                    studentUserId: fix.userId,
                });

                await EvidenceUploadService.completeUpload(dbClient, init.evidenceId, fix.userId);

                await expect(
                    EvidenceUploadService.initializeUpload(dbClient, {
                        attemptId: fix.attemptId,
                        incidentId: randomUUID(),
                        eventId,
                        eventType: 'FACE_NOT_VISIBLE',
                        capturedAt: new Date().toISOString(),
                        mimeType: 'image/webp',
                        sizeBytes: 12345,
                        studentUserId: fix.userId,
                    }),
                ).rejects.toThrow('Evidence upload cannot be reinitialized from state AVAILABLE.');
            },
        );

        testWithDbClient(
            'counts failed evidence rows toward lifetime quota limits',
            async ({ dbClient }) => {
                (globalThis as any).activeTestTrx = dbClient;
                process.env.TELEMETRY_EVIDENCE_MAX_PER_ATTEMPT = '1';
                const fix = await createTestFixture(dbClient);

                const failedEventId = randomUUID();
                const failed = await EvidenceUploadService.initializeUpload(dbClient, {
                    attemptId: fix.attemptId,
                    incidentId: randomUUID(),
                    eventId: failedEventId,
                    eventType: 'FACE_NOT_VISIBLE',
                    capturedAt: new Date().toISOString(),
                    mimeType: 'image/webp',
                    sizeBytes: 99999,
                    studentUserId: fix.userId,
                });

                await expect(
                    EvidenceUploadService.completeUpload(dbClient, failed.evidenceId, fix.userId),
                ).rejects.toThrow('Upload validation failed: Size mismatch.');

                await expect(
                    EvidenceUploadService.initializeUpload(dbClient, {
                        attemptId: fix.attemptId,
                        incidentId: randomUUID(),
                        eventId: randomUUID(),
                        eventType: 'MULTIPLE_FACES',
                        capturedAt: new Date().toISOString(),
                        mimeType: 'image/webp',
                        sizeBytes: 25000,
                        studentUserId: fix.userId,
                    }),
                ).rejects.toThrow('Attempt has reached the maximum allowed evidence quota of 1.');
            },
        );
    });

    describe('EvidenceQueryService & DeletionService', () => {
        testWithDbClient('lists incident evidence and deletes it', async ({ dbClient }) => {
            (globalThis as any).activeTestTrx = dbClient;
            const fix = await createTestFixture(dbClient);
            const eventId = randomUUID();

            // Create available evidence
            const init = await EvidenceUploadService.initializeUpload(dbClient, {
                attemptId: fix.attemptId,
                incidentId: randomUUID(),
                eventId,
                eventType: 'FACE_NOT_VISIBLE',
                capturedAt: new Date().toISOString(),
                mimeType: 'image/webp',
                sizeBytes: 12345,
                studentUserId: fix.userId,
            });

            await EvidenceUploadService.completeUpload(dbClient, init.evidenceId, fix.userId);

            // Create incident
            const incident = await dbClient
                .insertInto('flagged_incidents')
                .values({
                    attempt_id: fix.attemptId,
                    incident_type: 'FACE_NOT_VISIBLE',
                    status: 'PENDING',
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            // Link evidence to incident
            await dbClient
                .updateTable('telemetry_incident_evidence')
                .set({ incident_id: incident.incident_id })
                .where('evidence_id', '=', init.evidenceId)
                .execute();

            // Get evidence
            const userScope = {
                role: 'support',
                userId: fix.userId,
                departmentId: null,
                courseId: null,
            };

            const list = await EvidenceQueryService.getIncidentEvidence(
                dbClient,
                incident.incident_id,
                fix.institutionId,
                userScope,
                fix.userId,
            );

            expect(list).toHaveLength(1);
            expect(list[0].signedUrl).toBe('https://signed-view.url');

            // Delete evidence
            await EvidenceDeletionService.deleteEvidence(
                dbClient,
                init.evidenceId,
                fix.institutionId,
                userScope,
                fix.userId,
            );

            const row = await dbClient
                .selectFrom('telemetry_incident_evidence')
                .selectAll()
                .where('evidence_id', '=', init.evidenceId)
                .executeTakeFirstOrThrow();

            expect(row.state).toBe('DELETED');
            expect(row.storage_path).toBeNull();
            expect(row.storage_bucket).toBeNull();
        });
    });
});
