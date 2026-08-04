import type { PersistableProctoringEvent } from '../../ingestion/ingestion.dto';
import type { incident_severity } from '@sentinel/db';

export type IngestSessionType = {
    attempt_id: string;
    completed_at: Date | null;
    status: string | null;
    user_id: string;
    institution_id: string | null;
};

export type AppendEventResult = {
    incidentId: string;
    finalSeverity: incident_severity;
    isNew: boolean;
    disposition: 'inserted' | 'aggregated' | 'duplicate-ignored';
    previousSeverity: incident_severity | null;
    institutionId: string | null;
    studentUserId: string;
};

export type DeferredIncidentSideEffectsResult = AppendEventResult & {
    payload: PersistableProctoringEvent;
    runSideEffects: () => Promise<void>;
};
