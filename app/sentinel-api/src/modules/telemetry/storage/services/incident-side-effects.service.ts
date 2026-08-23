import type { DbClient } from '@sentinel/db';
import type { PersistableProctoringEvent } from '../../ingestion/ingestion.dto';
import { closeExamAttempt } from '../../../examination/lifecycle/services/close-exam-attempt';
import { resolveAutomaticLifecyclePolicy } from '../../../examination/lifecycle/services/resolve-automatic-lifecycle-policy';
import { LogsService } from '../../../general/logs/logs.service';
import { ActivityNotificationService } from '../../../general/notification/services/activity-notification.service';
import type { AppendEventResult } from './incident-persistence.types';

async function maybeApplyAutomaticLifecyclePolicy(args: {
    db: DbClient;
    attemptId: string;
    triggeringEventType?: string;
}): Promise<void> {
    try {
        const resolution = await resolveAutomaticLifecyclePolicy({
            dbClient: args.db,
            attemptId: args.attemptId,
            triggeringEventType: args.triggeringEventType,
        });

        if (resolution.action !== 'CLOSE_ATTEMPT') {
            return;
        }

        await closeExamAttempt({
            dbClient: args.db,
            examId: resolution.examId,
            attemptId: resolution.attemptId,
            reasonCode: resolution.reasonCode,
            notes: resolution.notes,
            actorUserId: null,
        });
    } catch (error) {
        console.error('[TelemetryStorage] Automatic lifecycle check or close failed', {
            attemptId: args.attemptId,
            error: error instanceof Error ? error.message : error,
        });
    }
}

export async function handleIncidentSideEffects(
    db: DbClient,
    payload: PersistableProctoringEvent,
    result: AppendEventResult,
): Promise<void> {
    await maybeApplyAutomaticLifecyclePolicy({
        db,
        attemptId: payload.examSessionId,
        triggeringEventType: payload.eventType,
    });

    const shouldLogOrNotify = result.isNew || result.previousSeverity !== result.finalSeverity;

    if (!shouldLogOrNotify || !result.institutionId) {
        return;
    }

    try {
        await LogsService.createLog(db, {
            userId: result.studentUserId,
            action: result.isNew ? 'telemetry.incident_flagged' : 'telemetry.incident_escalated',
            resourceType: 'telemetry_incident',
            resourceId: result.incidentId,
            activeInstitutionId: result.institutionId,
            details: {
                attemptId: payload.examSessionId,
                eventType: payload.eventType,
                ruleKey: payload.ruleKey,
                severity: result.finalSeverity,
                previousSeverity: result.previousSeverity,
            },
        });

        if (!result.isNew) {
            await ActivityNotificationService.notifyInstitutionActivityCreated({
                dbClient: db,
                actorUserId: result.studentUserId,
                institutionId: result.institutionId,
                targetType: 'TELEMETRY_INCIDENT',
                targetId: result.incidentId,
                targetLabel: payload.ruleKey || 'Incident',
                title: 'Proctoring incident escalated',
                message: `Proctoring incident escalated for student attempt. Rule: ${payload.ruleKey}. Severity escalated from ${result.previousSeverity} to ${result.finalSeverity}`,
                sourceModule: 'telemetry',
                sourceAction: 'escalate-incident',
                metadata: {
                    attemptId: payload.examSessionId,
                    incidentId: result.incidentId,
                    ruleKey: payload.ruleKey,
                    severity: result.finalSeverity,
                    previousSeverity: result.previousSeverity,
                },
            });
        }
    } catch (error) {
        console.error('[TelemetryStorage] Failed to log or notify telemetry incident activity:', {
            attemptId: payload.examSessionId,
            incidentId: result.incidentId,
            error: error instanceof Error ? error.message : error,
        });
    }
}
