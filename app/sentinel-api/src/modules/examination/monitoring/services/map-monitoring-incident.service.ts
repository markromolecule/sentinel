import {
    TELEMETRY_INCIDENT_LABELS,
    type TelemetryIncidentRecord,
} from '@sentinel/shared';
import type { MonitoringIncident } from '../monitoring.dto';
import { toIsoDate } from './monitoring-time.service';
import type { MonitoringIncidentEvidenceSummaryRow } from '../data/monitoring-data.types';

export function normalizeIncidentSeverity(
    severity: string | null | undefined,
): MonitoringIncident['severity'] {
    switch (severity?.toUpperCase()) {
        case 'HIGH':
            return 'high';
        case 'LOW':
            return 'low';
        default:
            return 'medium';
    }
}

export function mapMonitoringIncident(incident: TelemetryIncidentRecord): MonitoringIncident {
    return mapMonitoringIncidentWithEvidenceSummary(incident, []);
}

export function mapMonitoringIncidentWithEvidenceSummary(
    incident: TelemetryIncidentRecord,
    evidenceSummary: MonitoringIncidentEvidenceSummaryRow[] = [],
): MonitoringIncident {
    const details = incident.details as any;
    const rawEventType = details?.lastEvent?.eventType ?? details?.eventType ?? null;
    const lastEventMetadata = details?.lastEvent?.metadata;
    const incidentMetadata = details?.metadata;
    const metadata = lastEventMetadata ?? incidentMetadata ?? null;
    const evidenceCount = evidenceSummary.reduce(
        (total, item) => total + Number(item.count ?? 0),
        0,
    );

    return {
        id: incident.incidentId,
        type: incident.incidentType,
        rawEventType,
        timestamp: toIsoDate(incident.timestamp) ?? new Date().toISOString(),
        description: metadata?.description || TELEMETRY_INCIDENT_LABELS[incident.incidentType],
        severity: normalizeIncidentSeverity(incident.severity),
        snapshotUrl: incident.evidenceUrl ?? null,
        evidenceUrl: incident.evidenceUrl ?? null,
        evidenceCount,
        evidenceStates: evidenceSummary.map((item) => item.state),
        status: incident.status ?? null,
        occurrenceCount: details?.occurrenceCount ?? 1,
        severityReason: details?.severityReason ?? null,
        persistenceTrigger: metadata?.aggregation?.trigger ?? null,
        matchingWindowSeconds: details?.severityInputs?.matchingWindowSeconds ?? null,
        wasSeverityForced: Boolean(details?.severityInputs?.overrideSeverity),
        anomalyType: metadata?.anomalyType ?? null,
        confidenceScore: metadata?.confidenceScore ?? null,
    };
}
