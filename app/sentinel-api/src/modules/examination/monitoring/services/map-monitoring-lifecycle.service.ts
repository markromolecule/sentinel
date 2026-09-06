import type { ExamAttemptLifecycleEvent } from '@sentinel/shared';
import { toIsoDate } from './monitoring-time.service';
import type { MonitoringLifecycleEventRow } from '../data/monitoring-data.types';

export function mapMonitoringLifecycleEvent(
    event: MonitoringLifecycleEventRow,
): ExamAttemptLifecycleEvent {
    return {
        eventId: event.event_id,
        attemptId: event.attempt_id,
        examId: event.exam_id,
        studentId: event.student_id,
        eventType: event.event_type,
        previousState: event.previous_state,
        nextState: event.next_state,
        actorUserId: event.actor_user_id,
        reasonCode: event.reason_code,
        notes: event.notes,
        relatedIncidentIds: Array.isArray(event.related_incident_ids)
            ? (event.related_incident_ids as string[])
            : null,
        relatedOverrideId: event.related_override_id,
        metadata:
            event.metadata && typeof event.metadata === 'object'
                ? (event.metadata as Record<string, unknown>)
                : null,
        createdAt: toIsoDate(event.created_at),
    };
}
