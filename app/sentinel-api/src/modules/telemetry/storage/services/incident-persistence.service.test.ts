import { randomUUID } from 'node:crypto';
import { DEFAULT_TELEMETRY_SETTINGS } from '@sentinel/shared';
import { prisma, type DbClient } from '@sentinel/db';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { testWithDbClient } from '../../../../lib/test-with-db-client';
import type { PersistableProctoringEvent } from '../../ingestion/ingestion.dto';
import { IncidentPersistenceService } from './incident-persistence.service';

function parseIncidentDetails(details: string | null | undefined) {
    return JSON.parse(details ?? '{}') as Record<string, unknown>;
}

async function createTelemetryAttemptFixture(
    dbClient: DbClient,
    overrides: {
        completedAt?: Date | null;
        status?: 'IN_PROGRESS' | 'COMPLETED';
    } = {},
) {
    const suffix = randomUUID().slice(0, 8);
    const userId = randomUUID();

    await dbClient
        .insertInto('users')
        .values({
            id: userId,
            email: `telemetry-${suffix}@sentinel.test`,
            role: 'student',
            created_at: new Date(),
            updated_at: new Date(),
        })
        .executeTakeFirst();

    const institution = await dbClient
        .insertInto('institutions')
        .values({
            name: `Telemetry Test Institution ${suffix}`,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

    const student = await dbClient
        .insertInto('students')
        .values({
            user_id: userId,
            student_number: `telemetry-${suffix}`,
            institution_id: institution.id,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

    const exam = await dbClient
        .insertInto('exams')
        .values({
            title: `Telemetry Severity ${suffix}`,
            institution_id: institution.id,
            duration_minutes: 60,
            scheduled_date: new Date('2026-04-22T06:00:00.000Z'),
            end_date_time: new Date('2026-04-22T07:00:00.000Z'),
            published_at: new Date('2026-04-21T06:00:00.000Z'),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

    const attempt = await dbClient
        .insertInto('exam_attempts')
        .values({
            exam_id: exam.exam_id,
            student_id: student.student_id,
            status: overrides.status ?? 'IN_PROGRESS',
            started_at: new Date('2026-04-22T06:00:00.000Z'),
            completed_at: overrides.completedAt,
            created_at: new Date('2026-04-22T06:00:00.000Z'),
            time_spent_minutes: 0,
            is_verified: false,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

    return {
        attemptId: attempt.attempt_id,
        studentUserId: userId,
        institutionId: institution.id,
        studentId: student.student_id,
        examId: exam.exam_id,
    };
}

function buildPayload(
    overrides: Partial<PersistableProctoringEvent> & {
        attemptId: string;
        studentUserId: string;
    },
): PersistableProctoringEvent {
    return {
        examSessionId: overrides.attemptId,
        studentId: overrides.studentUserId,
        timestamp: overrides.timestamp ?? new Date('2026-04-22T08:00:00.000Z').toISOString(),
        platform: overrides.platform ?? 'WEB',
        source: overrides.source ?? 'CLIENT',
        ruleKey: overrides.ruleKey ?? 'webSecurity.right_click_disable',
        eventType: overrides.eventType ?? 'RIGHT_CLICK_ATTEMPT',
        metadata: overrides.metadata,
        sessionContext: overrides.sessionContext,
        runtimeSettingsSnapshot:
            overrides.runtimeSettingsSnapshot === undefined
                ? {
                      version: DEFAULT_TELEMETRY_SETTINGS.version,
                      operations: { ...DEFAULT_TELEMETRY_SETTINGS.operations },
                      ruleOverrideApplied: null,
                  }
                : overrides.runtimeSettingsSnapshot,
    };
}

describe('IncidentPersistenceService', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    testWithDbClient(
        'persists first browser security occurrences as one reviewable row each',
        async ({ dbClient }) => {
            const events: Array<{
                ruleKey: PersistableProctoringEvent['ruleKey'];
                eventType: PersistableProctoringEvent['eventType'];
            }> = [
                {
                    ruleKey: 'webSecurity.right_click_disable',
                    eventType: 'RIGHT_CLICK_ATTEMPT',
                },
                {
                    ruleKey: 'webSecurity.clipboard_control',
                    eventType: 'CLIPBOARD_ATTEMPT',
                },
                {
                    ruleKey: 'webSecurity.tab_switching_monitor',
                    eventType: 'TAB_SWITCH',
                },
                {
                    ruleKey: 'webSecurity.full_screen_required',
                    eventType: 'FULL_SCREEN_EXIT',
                },
            ];

            for (const event of events) {
                const fixture = await createTelemetryAttemptFixture(dbClient);

                await IncidentPersistenceService.appendEvent(
                    dbClient,
                    buildPayload({
                        ...fixture,
                        ...event,
                    }),
                );

                const incidents = await dbClient
                    .selectFrom('flagged_incidents')
                    .select(['rule_key', 'details'])
                    .where('attempt_id', '=', fixture.attemptId)
                    .execute();

                expect(incidents).toHaveLength(1);
                expect(incidents[0]).toMatchObject({
                    rule_key: event.ruleKey,
                });
                expect(parseIncidentDetails(incidents[0]?.details)).toMatchObject({
                    eventType: event.eventType,
                    occurrenceCount: 1,
                    previousSeverity: null,
                    lastEvent: {
                        eventType: event.eventType,
                    },
                });
            }
        },
    );

    testWithDbClient(
        'deduplicates same-rule events and does not merge or escalate mixed rules together',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);

            await IncidentPersistenceService.appendEvent(dbClient, buildPayload(fixture));
            await IncidentPersistenceService.appendEvent(dbClient, buildPayload(fixture));
            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'webSecurity.clipboard_control',
                    eventType: 'CLIPBOARD_ATTEMPT',
                }),
            );

            const incidents = await dbClient
                .selectFrom('flagged_incidents')
                .select(['incident_id', 'rule_key', 'severity', 'details'])
                .where('attempt_id', '=', fixture.attemptId)
                .orderBy('rule_key', 'asc')
                .execute();

            expect(incidents).toHaveLength(2);

            const clipboardIncident = incidents.find(
                (incident) => incident.rule_key === 'webSecurity.clipboard_control',
            );
            const rightClickIncident = incidents.find(
                (incident) => incident.rule_key === 'webSecurity.right_click_disable',
            );

            expect(clipboardIncident?.severity).toBe('LOW');
            expect(parseIncidentDetails(clipboardIncident?.details)).toMatchObject({
                occurrenceCount: 1,
                severityReason: 'default-ladder',
                currentSeverity: 'LOW',
            });

            expect(rightClickIncident?.severity).toBe('LOW');
            expect(parseIncidentDetails(rightClickIncident?.details)).toMatchObject({
                occurrenceCount: 2,
                severityReason: 'default-ladder',
                previousSeverity: 'LOW',
                currentSeverity: 'LOW',
                severityInputs: {
                    baseSeverity: 'LOW',
                    matchingCount: 2,
                    matchingWindowSeconds: 600,
                },
            });
        },
    );

    testWithDbClient(
        'links evidence-first uploads to the inserted incident when telemetry arrives later',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);
            const eventId = randomUUID();

            await dbClient
                .insertInto('telemetry_incident_evidence')
                .values({
                    attempt_id: fixture.attemptId,
                    institution_id: fixture.institutionId,
                    student_id: fixture.studentId,
                    event_id: eventId,
                    event_type: 'FACE_NOT_VISIBLE',
                    captured_at: new Date('2026-04-22T08:00:00.000Z'),
                    received_at: new Date('2026-04-22T08:00:05.000Z'),
                    storage_bucket: 'sentinel-proctoring-evidence',
                    storage_path: `${fixture.attemptId}/${eventId}.webp`,
                    mime_type: 'image/webp',
                    declared_size_bytes: 12000,
                    state: 'AVAILABLE',
                    expires_at: new Date('2026-04-29T08:00:00.000Z'),
                })
                .executeTakeFirst();

            const result = await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'aiRules.face_detection',
                    eventType: 'NO_FACE_DETECTED',
                    source: 'AI',
                    metadata: {
                        eventId,
                        dedupeKey: `attempt:NO_FACE_DETECTED:${eventId}`,
                        clientActionAt: '2026-04-22T08:00:00.000Z',
                    },
                }),
            );

            const evidence = await dbClient
                .selectFrom('telemetry_incident_evidence')
                .select(['incident_id'])
                .where('attempt_id', '=', fixture.attemptId)
                .where('event_id', '=', eventId)
                .executeTakeFirstOrThrow();

            expect(result?.incidentId).toBeTruthy();
            expect(evidence.incident_id).toBe(result?.incidentId);
        },
    );

    testWithDbClient(
        'returns duplicate-ignored with the existing incident id so evidence correlation can converge on retries',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);
            const eventId = randomUUID();

            const payload = buildPayload({
                ...fixture,
                metadata: {
                    eventId,
                    dedupeKey: `attempt:RIGHT_CLICK_ATTEMPT:${eventId}`,
                    clientActionAt: '2026-04-22T08:00:00.000Z',
                },
            });

            const first = await IncidentPersistenceService.appendEvent(dbClient, payload);
            const second = await IncidentPersistenceService.appendEvent(dbClient, payload);

            expect(first).toMatchObject({
                disposition: 'inserted',
            });
            expect(second).toMatchObject({
                disposition: 'duplicate-ignored',
                incidentId: first?.incidentId,
            });
        },
    );

    testWithDbClient(
        'links later aggregated evidence rows to the already-selected incident',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);
            const firstEventId = randomUUID();
            const secondEventId = randomUUID();

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'aiRules.gaze_tracking',
                    eventType: 'GAZE_OFF_SCREEN',
                    source: 'AI',
                    metadata: {
                        eventId: firstEventId,
                        dedupeKey: `attempt:GAZE_OFF_SCREEN:${firstEventId}`,
                        clientActionAt: '2026-04-22T08:00:00.000Z',
                    },
                }),
            );

            await dbClient
                .insertInto('telemetry_incident_evidence')
                .values({
                    attempt_id: fixture.attemptId,
                    institution_id: fixture.institutionId,
                    student_id: fixture.studentId,
                    event_id: secondEventId,
                    event_type: 'GAZE',
                    captured_at: new Date('2026-04-22T08:02:00.000Z'),
                    received_at: new Date('2026-04-22T08:02:05.000Z'),
                    storage_bucket: 'sentinel-proctoring-evidence',
                    storage_path: `${fixture.attemptId}/${secondEventId}.webp`,
                    mime_type: 'image/webp',
                    declared_size_bytes: 12000,
                    state: 'AVAILABLE',
                    expires_at: new Date('2026-04-29T08:02:00.000Z'),
                })
                .executeTakeFirst();

            const aggregated = await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'aiRules.gaze_tracking',
                    eventType: 'GAZE_OFF_SCREEN',
                    source: 'AI',
                    timestamp: '2026-04-22T08:02:10.000Z',
                    metadata: {
                        eventId: secondEventId,
                        dedupeKey: `attempt:GAZE_OFF_SCREEN:${secondEventId}`,
                        clientActionAt: '2026-04-22T08:02:00.000Z',
                    },
                }),
            );

            const evidence = await dbClient
                .selectFrom('telemetry_incident_evidence')
                .select(['incident_id'])
                .where('attempt_id', '=', fixture.attemptId)
                .where('event_id', '=', secondEventId)
                .executeTakeFirstOrThrow();

            expect(aggregated).toMatchObject({
                disposition: 'aggregated',
            });
            expect(evidence.incident_id).toBe(aggregated?.incidentId);
        },
    );

    test('emits structured persistence diagnostics for insert, duplicate retry, aggregation, and concurrent first writes', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        const diagnosticSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
        const dbClient = prisma.$kysely;
        const fixture = await createTelemetryAttemptFixture(dbClient);

        try {
            const insertedPayload = buildPayload({
                ...fixture,
                metadata: {
                    eventId: randomUUID(),
                    dedupeKey: 'diag-right-click-1',
                    clientActionAt: '2026-04-22T08:00:00.000Z',
                },
            });

            await IncidentPersistenceService.appendEvent(dbClient, insertedPayload);
            await IncidentPersistenceService.appendEvent(dbClient, insertedPayload);

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    metadata: {
                        eventId: randomUUID(),
                        dedupeKey: 'diag-right-click-2',
                        clientActionAt: '2026-04-22T08:02:30.000Z',
                    },
                }),
            );

            const concurrentPayload = buildPayload({
                ...fixture,
                ruleKey: 'webSecurity.print_screen_disable',
                eventType: 'PRINT_SCREEN_ATTEMPT',
                metadata: {
                    eventId: randomUUID(),
                    dedupeKey: 'diag-print-screen-1',
                    clientActionAt: '2026-04-22T08:03:00.000Z',
                },
            });

            await Promise.allSettled([
                IncidentPersistenceService.appendEvent(dbClient, concurrentPayload),
                IncidentPersistenceService.appendEvent(dbClient, concurrentPayload),
            ]);

            const diagnostics = diagnosticSpy.mock.calls
                .filter(([message]) => message === '[TelemetryStorage][Diagnostics]')
                .map(([, diagnostic]) => diagnostic as Record<string, unknown>);

            expect(diagnostics).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        disposition: 'inserted',
                        dedupeKey: 'diag-right-click-1',
                        occurrenceCount: 1,
                    }),
                    expect.objectContaining({
                        disposition: 'duplicate-ignored',
                        dedupeKey: 'diag-right-click-1',
                        occurrenceCount: 1,
                    }),
                    expect.objectContaining({
                        disposition: 'aggregated',
                        dedupeKey: 'diag-right-click-2',
                        occurrenceCount: 2,
                    }),
                    expect.objectContaining({
                        disposition: 'inserted',
                        dedupeKey: 'diag-print-screen-1',
                        occurrenceCount: 1,
                    }),
                    expect.objectContaining({
                        disposition: 'duplicate-ignored',
                        dedupeKey: 'diag-print-screen-1',
                        occurrenceCount: 1,
                    }),
                ]),
            );

            const rightClickIncident = await dbClient
                .selectFrom('flagged_incidents')
                .select(['details'])
                .where('attempt_id', '=', fixture.attemptId)
                .where('rule_key', '=', 'webSecurity.right_click_disable')
                .executeTakeFirstOrThrow();
            const printScreenIncidents = await dbClient
                .selectFrom('flagged_incidents')
                .select(['incident_id', 'details'])
                .where('attempt_id', '=', fixture.attemptId)
                .where('rule_key', '=', 'webSecurity.print_screen_disable')
                .execute();

            expect(parseIncidentDetails(rightClickIncident.details)).toMatchObject({
                occurrenceCount: 2,
            });
            expect(printScreenIncidents).toHaveLength(1);
            expect(parseIncidentDetails(printScreenIncidents[0]?.details)).toMatchObject({
                occurrenceCount: 1,
            });
        } finally {
            await dbClient
                .deleteFrom('flagged_incidents')
                .where('attempt_id', '=', fixture.attemptId)
                .execute();
            await dbClient
                .deleteFrom('exam_attempts')
                .where('attempt_id', '=', fixture.attemptId)
                .execute();
            await dbClient.deleteFrom('exams').where('exam_id', '=', fixture.examId).execute();
            await dbClient
                .deleteFrom('students')
                .where('student_id', '=', fixture.studentId)
                .execute();
            await dbClient
                .deleteFrom('institutions')
                .where('id', '=', fixture.institutionId)
                .execute();
            await dbClient.deleteFrom('users').where('id', '=', fixture.studentUserId).execute();
        }
    }, 30000);

    testWithDbClient(
        'escalates deduplicated occurrence counts without jumping to high at count two',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);

            for (let index = 0; index < 6; index += 1) {
                await IncidentPersistenceService.appendEvent(dbClient, buildPayload(fixture));
            }

            const incident = await dbClient
                .selectFrom('flagged_incidents')
                .select(['severity', 'details'])
                .where('attempt_id', '=', fixture.attemptId)
                .executeTakeFirstOrThrow();

            const details = parseIncidentDetails(incident.details);

            expect(incident.severity).toBe('HIGH');
            expect(details).toMatchObject({
                occurrenceCount: 6,
                severityReason: 'repeat-escalated',
                currentSeverity: 'HIGH',
                severityInputs: {
                    baseSeverity: 'LOW',
                    matchingCount: 6,
                    matchingWindowSeconds: 600,
                    repeatThreshold: 3,
                },
            });
        },
    );

    testWithDbClient(
        'creates a new same-rule row after the dedupe window expires',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);

            await IncidentPersistenceService.appendEvent(dbClient, buildPayload(fixture));

            const firstIncident = await dbClient
                .selectFrom('flagged_incidents')
                .select(['incident_id'])
                .where('attempt_id', '=', fixture.attemptId)
                .executeTakeFirstOrThrow();

            await dbClient
                .updateTable('flagged_incidents')
                .set({
                    timestamp: new Date(Date.now() - 180_000),
                })
                .where('incident_id', '=', firstIncident.incident_id)
                .execute();

            await IncidentPersistenceService.appendEvent(dbClient, buildPayload(fixture));

            const incidents = await dbClient
                .selectFrom('flagged_incidents')
                .select(['incident_id', 'details'])
                .where('attempt_id', '=', fixture.attemptId)
                .orderBy('timestamp', 'asc')
                .execute();

            expect(incidents).toHaveLength(2);
            expect(incidents.map((incident) => parseIncidentDetails(incident.details))).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ occurrenceCount: 1 }),
                    expect.objectContaining({ occurrenceCount: 1 }),
                ]),
            );
        },
    );

    testWithDbClient(
        'honors a forced severity override when persisting incidents',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    runtimeSettingsSnapshot: {
                        version: DEFAULT_TELEMETRY_SETTINGS.version,
                        operations: { ...DEFAULT_TELEMETRY_SETTINGS.operations },
                        ruleOverrideApplied: {
                            severity: 'HIGH',
                        },
                    },
                }),
            );

            const incident = await dbClient
                .selectFrom('flagged_incidents')
                .select(['severity', 'details'])
                .where('attempt_id', '=', fixture.attemptId)
                .executeTakeFirstOrThrow();

            expect(incident.severity).toBe('HIGH');
            expect(parseIncidentDetails(incident.details)).toMatchObject({
                severityReason: 'forced-override',
                currentSeverity: 'HIGH',
                severityInputs: {
                    baseSeverity: 'LOW',
                    overrideSeverity: 'HIGH',
                },
            });
        },
    );

    testWithDbClient(
        'persists browser security events with instructor-reviewable raw event details',
        async ({ dbClient }) => {
            const rightClickFixture = await createTelemetryAttemptFixture(dbClient);
            const printScreenFixture = await createTelemetryAttemptFixture(dbClient);

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...rightClickFixture,
                    ruleKey: 'webSecurity.right_click_disable',
                    eventType: 'RIGHT_CLICK_ATTEMPT',
                }),
            );
            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...printScreenFixture,
                    ruleKey: 'webSecurity.print_screen_disable',
                    eventType: 'PRINT_SCREEN_ATTEMPT',
                }),
            );

            const incidents = await dbClient
                .selectFrom('flagged_incidents')
                .select(['attempt_id', 'incident_type', 'rule_key', 'severity', 'details'])
                .where('attempt_id', 'in', [
                    rightClickFixture.attemptId,
                    printScreenFixture.attemptId,
                ])
                .orderBy('rule_key', 'asc')
                .execute();

            expect(incidents).toHaveLength(2);

            const printScreenIncident = incidents.find(
                (incident) => incident.rule_key === 'webSecurity.print_screen_disable',
            );
            const rightClickIncident = incidents.find(
                (incident) => incident.rule_key === 'webSecurity.right_click_disable',
            );

            expect(rightClickIncident).toMatchObject({
                attempt_id: rightClickFixture.attemptId,
                incident_type: 'SUSPICIOUS_MOVEMENT',
                severity: 'LOW',
            });
            expect(parseIncidentDetails(rightClickIncident?.details)).toMatchObject({
                eventType: 'RIGHT_CLICK_ATTEMPT',
                lastEvent: {
                    eventType: 'RIGHT_CLICK_ATTEMPT',
                },
                occurrenceCount: 1,
            });

            expect(printScreenIncident).toMatchObject({
                attempt_id: printScreenFixture.attemptId,
                incident_type: 'SCREENSHOT',
                severity: 'HIGH',
            });
            expect(parseIncidentDetails(printScreenIncident?.details)).toMatchObject({
                eventType: 'PRINT_SCREEN_ATTEMPT',
                lastEvent: {
                    eventType: 'PRINT_SCREEN_ATTEMPT',
                },
                occurrenceCount: 1,
            });
        },
    );

    testWithDbClient(
        'ignores fullscreen exits after an attempt is completed',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient, {
                completedAt: new Date(),
                status: 'COMPLETED',
            });

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'webSecurity.full_screen_required',
                    eventType: 'FULL_SCREEN_EXIT',
                }),
            );

            const incidents = await dbClient
                .selectFrom('flagged_incidents')
                .select(['incident_id'])
                .where('attempt_id', '=', fixture.attemptId)
                .execute();

            expect(incidents).toHaveLength(0);
        },
    );

    testWithDbClient(
        'persists fullscreen exits while an attempt is active',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'webSecurity.full_screen_required',
                    eventType: 'FULL_SCREEN_EXIT',
                }),
            );

            const incident = await dbClient
                .selectFrom('flagged_incidents')
                .select(['rule_key', 'details'])
                .where('attempt_id', '=', fixture.attemptId)
                .executeTakeFirstOrThrow();

            expect(incident.rule_key).toBe('webSecurity.full_screen_required');
            expect(parseIncidentDetails(incident.details)).toMatchObject({
                eventType: 'FULL_SCREEN_EXIT',
                occurrenceCount: 1,
                lastEvent: {
                    eventType: 'FULL_SCREEN_EXIT',
                },
            });
        },
    );

    testWithDbClient(
        'persists first audio anomalies with occurrence count one and anomaly metadata',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'aiRules.audio_anomaly_detection',
                    eventType: 'AUDIO_ANOMALY',
                    metadata: {
                        anomalyType: 'TALKING',
                        confidenceScore: 0.82,
                    },
                }),
            );

            const incident = await dbClient
                .selectFrom('flagged_incidents')
                .select(['rule_key', 'details'])
                .where('attempt_id', '=', fixture.attemptId)
                .executeTakeFirstOrThrow();

            expect(incident.rule_key).toBe('aiRules.audio_anomaly_detection');
            expect(parseIncidentDetails(incident.details)).toMatchObject({
                eventType: 'AUDIO_ANOMALY',
                occurrenceCount: 1,
                previousSeverity: null,
                lastEvent: {
                    eventType: 'AUDIO_ANOMALY',
                    metadata: {
                        anomalyType: 'TALKING',
                        confidenceScore: 0.82,
                    },
                },
            });
        },
    );

    testWithDbClient(
        'increments audio anomaly occurrence count to two for a later distinct audio dedupe key',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'aiRules.audio_anomaly_detection',
                    eventType: 'AUDIO_ANOMALY',
                    metadata: {
                        anomalyType: 'TALKING',
                        confidenceScore: 0.82,
                        dedupeKey: 'audio:talking:bucket-1',
                    },
                }),
            );
            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'aiRules.audio_anomaly_detection',
                    eventType: 'AUDIO_ANOMALY',
                    metadata: {
                        anomalyType: 'TALKING',
                        confidenceScore: 0.84,
                        dedupeKey: 'audio:talking:bucket-2',
                    },
                }),
            );

            const incident = await dbClient
                .selectFrom('flagged_incidents')
                .select(['rule_key', 'details'])
                .where('attempt_id', '=', fixture.attemptId)
                .executeTakeFirstOrThrow();

            expect(incident.rule_key).toBe('aiRules.audio_anomaly_detection');
            expect(parseIncidentDetails(incident.details)).toMatchObject({
                occurrenceCount: 2,
                lastEvent: {
                    eventType: 'AUDIO_ANOMALY',
                    metadata: {
                        anomalyType: 'TALKING',
                        confidenceScore: 0.84,
                        dedupeKey: 'audio:talking:bucket-2',
                    },
                },
            });
        },
    );

    testWithDbClient(
        'keeps mixed-event counts isolated by rule key, platform, and dedupe key within one attempt',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'webSecurity.right_click_disable',
                    eventType: 'RIGHT_CLICK_ATTEMPT',
                    platform: 'WEB',
                    metadata: {
                        dedupeKey: 'mixed:right-click:bucket-1',
                        eventId: 'mixed-right-click-1',
                        clientActionAt: '2026-04-22T08:00:00.000Z',
                    },
                }),
            );
            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'webSecurity.right_click_disable',
                    eventType: 'RIGHT_CLICK_ATTEMPT',
                    platform: 'WEB',
                    metadata: {
                        dedupeKey: 'mixed:right-click:bucket-1',
                        eventId: 'mixed-right-click-1-retry',
                        clientActionAt: '2026-04-22T08:00:00.000Z',
                    },
                }),
            );
            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'webSecurity.right_click_disable',
                    eventType: 'RIGHT_CLICK_ATTEMPT',
                    platform: 'WEB',
                    metadata: {
                        dedupeKey: 'mixed:right-click:bucket-2',
                        eventId: 'mixed-right-click-2',
                        clientActionAt: '2026-04-22T08:00:04.000Z',
                    },
                }),
            );

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'mobileSecurity.prevent_backgrounding',
                    eventType: 'APP_BACKGROUNDING',
                    platform: 'MOBILE',
                    metadata: {
                        dedupeKey: 'mixed:backgrounding:bucket-1',
                        eventId: 'mixed-backgrounding-1',
                        clientActionAt: '2026-04-22T08:01:00.000Z',
                    },
                }),
            );

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'aiRules.audio_anomaly_detection',
                    eventType: 'AUDIO_ANOMALY',
                    platform: 'WEB',
                    metadata: {
                        dedupeKey: 'mixed:audio:bucket-1',
                        eventId: 'mixed-audio-1',
                        clientActionAt: '2026-04-22T08:02:00.000Z',
                        anomalyType: 'TALKING',
                        confidenceScore: 0.84,
                    },
                }),
            );

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'aiRules.gaze_tracking',
                    eventType: 'GAZE_OFF_SCREEN',
                    platform: 'WEB',
                    metadata: {
                        dedupeKey: 'mixed:gaze:bucket-1',
                        eventId: 'mixed-gaze-1',
                        clientActionAt: '2026-04-22T08:03:00.000Z',
                        durationMs: 1500,
                        confidenceScore: 0.79,
                    },
                }),
            );

            const incidents = await dbClient
                .selectFrom('flagged_incidents')
                .select(['rule_key', 'platform', 'dedupe_key', 'details'])
                .where('attempt_id', '=', fixture.attemptId)
                .orderBy('rule_key', 'asc')
                .execute();

            expect(incidents).toHaveLength(4);

            const rightClickIncident = incidents.find(
                (incident) => incident.rule_key === 'webSecurity.right_click_disable',
            );
            const backgroundingIncident = incidents.find(
                (incident) => incident.rule_key === 'mobileSecurity.prevent_backgrounding',
            );
            const audioIncident = incidents.find(
                (incident) => incident.rule_key === 'aiRules.audio_anomaly_detection',
            );
            const gazeIncident = incidents.find(
                (incident) => incident.rule_key === 'aiRules.gaze_tracking',
            );

            expect(rightClickIncident?.platform).toBe('WEB');
            expect(rightClickIncident?.dedupe_key).toBe('mixed:right-click:bucket-1');
            expect(parseIncidentDetails(rightClickIncident?.details)).toMatchObject({
                occurrenceCount: 2,
                lastEvent: {
                    eventType: 'RIGHT_CLICK_ATTEMPT',
                    metadata: {
                        dedupeKey: 'mixed:right-click:bucket-2',
                    },
                },
            });

            expect(backgroundingIncident?.platform).toBe('MOBILE');
            expect(backgroundingIncident?.dedupe_key).toBe('mixed:backgrounding:bucket-1');
            expect(parseIncidentDetails(backgroundingIncident?.details)).toMatchObject({
                eventType: 'APP_BACKGROUNDING',
                occurrenceCount: 1,
            });

            expect(audioIncident?.platform).toBe('WEB');
            expect(audioIncident?.dedupe_key).toBe('mixed:audio:bucket-1');
            expect(parseIncidentDetails(audioIncident?.details)).toMatchObject({
                eventType: 'AUDIO_ANOMALY',
                occurrenceCount: 1,
                lastEvent: {
                    metadata: {
                        anomalyType: 'TALKING',
                        confidenceScore: 0.84,
                    },
                },
            });

            expect(gazeIncident?.platform).toBe('WEB');
            expect(gazeIncident?.dedupe_key).toBe('mixed:gaze:bucket-1');
            expect(parseIncidentDetails(gazeIncident?.details)).toMatchObject({
                eventType: 'GAZE_OFF_SCREEN',
                occurrenceCount: 1,
                lastEvent: {
                    metadata: {
                        durationMs: 1500,
                    },
                },
            });
        },
    );

    testWithDbClient(
        'keeps duplicate first-trigger requests with the same dedupe key at occurrence count one',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);
            const metadata = {
                dedupeKey: 'attempt:right-click:bucket-1',
                eventId: 'event-1',
                clientActionAt: '2026-04-22T08:00:00.000Z',
            };

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    metadata,
                }),
            );
            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    metadata,
                }),
            );

            const incidents = await dbClient
                .selectFrom('flagged_incidents')
                .select(['incident_id', 'details', 'dedupe_key'])
                .where('attempt_id', '=', fixture.attemptId)
                .execute();

            expect(incidents).toHaveLength(1);
            expect(incidents[0]?.dedupe_key).toBe(metadata.dedupeKey);
            expect(parseIncidentDetails(incidents[0]?.details)).toMatchObject({
                occurrenceCount: 1,
            });
        },
    );

    testWithDbClient(
        'increments occurrence count to two for a later distinct event inside the aggregation window',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    metadata: {
                        dedupeKey: 'attempt:right-click:bucket-1',
                        eventId: 'event-1',
                        clientActionAt: '2026-04-22T08:00:00.000Z',
                    },
                }),
            );
            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    metadata: {
                        dedupeKey: 'attempt:right-click:bucket-2',
                        eventId: 'event-2',
                        clientActionAt: '2026-04-22T08:00:03.000Z',
                    },
                }),
            );

            const incidents = await dbClient
                .selectFrom('flagged_incidents')
                .select(['incident_id', 'details'])
                .where('attempt_id', '=', fixture.attemptId)
                .execute();

            expect(incidents).toHaveLength(1);
            expect(parseIncidentDetails(incidents[0]?.details)).toMatchObject({
                occurrenceCount: 2,
            });
        },
    );

    testWithDbClient(
        'automatically closes only the triggering attempt after three high incidents',
        async ({ dbClient }) => {
            const targetFixture = await createTelemetryAttemptFixture(dbClient);
            const unaffectedFixture = await createTelemetryAttemptFixture(dbClient);

            for (const ruleKey of [
                'webSecurity.right_click_disable',
                'webSecurity.clipboard_control',
                'webSecurity.full_screen_required',
            ] as const) {
                await IncidentPersistenceService.appendEvent(
                    dbClient,
                    buildPayload({
                        ...targetFixture,
                        ruleKey,
                        runtimeSettingsSnapshot: {
                            version: DEFAULT_TELEMETRY_SETTINGS.version,
                            operations: { ...DEFAULT_TELEMETRY_SETTINGS.operations },
                            ruleOverrideApplied: {
                                severity: 'HIGH',
                            },
                        } as any,
                    }),
                );
            }

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...unaffectedFixture,
                    ruleKey: 'webSecurity.right_click_disable',
                    runtimeSettingsSnapshot: {
                        version: DEFAULT_TELEMETRY_SETTINGS.version,
                        operations: { ...DEFAULT_TELEMETRY_SETTINGS.operations },
                        ruleOverrideApplied: {
                            severity: 'HIGH',
                        },
                    } as any,
                }),
            );

            const attempts = await dbClient
                .selectFrom('exam_attempts')
                .select(['attempt_id', 'lifecycle_state', 'closed_reason'])
                .where('attempt_id', 'in', [targetFixture.attemptId, unaffectedFixture.attemptId])
                .orderBy('attempt_id', 'asc')
                .execute();

            expect(attempts).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        attempt_id: targetFixture.attemptId,
                        lifecycle_state: 'CLOSED',
                        closed_reason: 'AUTO_HIGH_INCIDENT_THRESHOLD',
                    }),
                    expect.objectContaining({
                        attempt_id: unaffectedFixture.attemptId,
                        lifecycle_state: 'IN_PROGRESS',
                    }),
                ]),
            );
        },
    );

    testWithDbClient(
        'proves duplicate dedupeKey leaves occurrenceCount = 1 and a later distinct dedupeKey increments it',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);
            const dedupeKey = 'test-dedupe-key-123';

            // First emission with dedupeKey
            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'webSecurity.right_click_disable',
                    eventType: 'RIGHT_CLICK_ATTEMPT',
                    metadata: {
                        dedupeKey,
                    },
                }),
            );

            // Duplicate emission with same dedupeKey (should no-op)
            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'webSecurity.right_click_disable',
                    eventType: 'RIGHT_CLICK_ATTEMPT',
                    metadata: {
                        dedupeKey,
                    },
                }),
            );

            const incidents = await dbClient
                .selectFrom('flagged_incidents')
                .selectAll()
                .where('attempt_id', '=', fixture.attemptId)
                .execute();

            expect(incidents).toHaveLength(1);
            expect(parseIncidentDetails(incidents[0].details).occurrenceCount).toBe(1);

            // Distinct emission with different dedupeKey (should increment)
            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'webSecurity.right_click_disable',
                    eventType: 'RIGHT_CLICK_ATTEMPT',
                    metadata: {
                        dedupeKey: 'different-dedupe-key-456',
                    },
                }),
            );

            const updatedIncidents = await dbClient
                .selectFrom('flagged_incidents')
                .selectAll()
                .where('attempt_id', '=', fixture.attemptId)
                .execute();

            expect(updatedIncidents).toHaveLength(1);
            expect(updatedIncidents[0].dedupe_key).toBe(dedupeKey);
            expect(parseIncidentDetails(updatedIncidents[0].details).occurrenceCount).toBe(2);
            expect(parseIncidentDetails(updatedIncidents[0].details)).toMatchObject({
                lastEvent: {
                    metadata: {
                        dedupeKey: 'different-dedupe-key-456',
                    },
                },
            });
        },
    );

    testWithDbClient(
        'automatically closes the attempt using the custom configured threshold',
        async ({ dbClient }) => {
            const fixture = await createTelemetryAttemptFixture(dbClient);

            const attemptRecord = await dbClient
                .selectFrom('exam_attempts')
                .select(['exam_id'])
                .where('attempt_id', '=', fixture.attemptId)
                .executeTakeFirstOrThrow();

            await dbClient
                .insertInto('exam_configurations')
                .values({
                    exam_id: attemptRecord.exam_id,
                    ai_rules: {
                        automaticClosePolicy: {
                            enabled: true,
                            highIncidentThreshold: 2,
                            windowMinutes: 10,
                        },
                    },
                })
                .execute();

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'webSecurity.right_click_disable',
                    runtimeSettingsSnapshot: {
                        version: DEFAULT_TELEMETRY_SETTINGS.version,
                        operations: { ...DEFAULT_TELEMETRY_SETTINGS.operations },
                        ruleOverrideApplied: {
                            severity: 'HIGH',
                        },
                    } as any,
                }),
            );

            let attempt = await dbClient
                .selectFrom('exam_attempts')
                .select(['lifecycle_state'])
                .where('attempt_id', '=', fixture.attemptId)
                .executeTakeFirstOrThrow();
            expect(attempt.lifecycle_state).toBe('IN_PROGRESS');

            await IncidentPersistenceService.appendEvent(
                dbClient,
                buildPayload({
                    ...fixture,
                    ruleKey: 'webSecurity.clipboard_control',
                    runtimeSettingsSnapshot: {
                        version: DEFAULT_TELEMETRY_SETTINGS.version,
                        operations: { ...DEFAULT_TELEMETRY_SETTINGS.operations },
                        ruleOverrideApplied: {
                            severity: 'HIGH',
                        },
                    } as any,
                }),
            );

            attempt = await dbClient
                .selectFrom('exam_attempts')
                .select(['lifecycle_state', 'closed_reason'])
                .where('attempt_id', '=', fixture.attemptId)
                .executeTakeFirstOrThrow();
            expect(attempt.lifecycle_state).toBe('CLOSED');
            expect(attempt.closed_reason).toBe('AUTO_HIGH_INCIDENT_THRESHOLD');
        },
    );
});

test('IncidentPersistenceService keeps one row and occurrence count one for concurrent first-trigger writes with the same dedupe key', async () => {
    const dbClient = prisma.$kysely;
    const fixture = await createTelemetryAttemptFixture(dbClient);
    const payload = buildPayload({
        attemptId: fixture.attemptId,
        studentUserId: fixture.studentUserId,
        metadata: {
            dedupeKey: 'attempt:right-click:bucket-concurrent',
            eventId: 'event-concurrent-1',
            clientActionAt: '2026-04-22T08:00:00.000Z',
        },
    });

    try {
        const results = await Promise.all([
            IncidentPersistenceService.appendEvent(dbClient, payload),
            IncidentPersistenceService.appendEvent(dbClient, payload),
        ]);

        const incidents = await dbClient
            .selectFrom('flagged_incidents')
            .select(['incident_id', 'details', 'dedupe_key'])
            .where('attempt_id', '=', fixture.attemptId)
            .execute();

        expect(results.filter(Boolean)).toHaveLength(1);
        expect(incidents).toHaveLength(1);
        expect(incidents[0]?.dedupe_key).toBe('attempt:right-click:bucket-concurrent');
        expect(parseIncidentDetails(incidents[0]?.details)).toMatchObject({
            occurrenceCount: 1,
        });
    } finally {
        await dbClient
            .deleteFrom('flagged_incidents')
            .where('attempt_id', '=', fixture.attemptId)
            .execute();
        await dbClient
            .deleteFrom('exam_attempts')
            .where('attempt_id', '=', fixture.attemptId)
            .execute();
        await dbClient.deleteFrom('exams').where('exam_id', '=', fixture.examId).execute();
        await dbClient.deleteFrom('students').where('student_id', '=', fixture.studentId).execute();
        await dbClient.deleteFrom('institutions').where('id', '=', fixture.institutionId).execute();
        await dbClient.deleteFrom('users').where('id', '=', fixture.studentUserId).execute();
    }
}, 30000);
