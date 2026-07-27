'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getIncidentEvidence } from '@sentinel/services';
import { TELEMETRY_QUERY_KEYS } from '@sentinel/shared/constants';
import type { IncidentEvidenceRecord } from '@sentinel/services';
import { useApi } from '../../api-provider';
import { useAuthenticatedQueryEnabled } from '../_shared/use-authenticated-query-enabled';

const NON_RETRYABLE_STATUS_CODES = new Set([401, 403, 404]);
const SIGNED_URL_STALE_TIME_MS = 1000 * 60 * 4;

function shouldRetryEvidenceQuery(failureCount: number, error: Error) {
    const status = Number((error as Error & { status?: number }).status ?? 0);

    if (NON_RETRYABLE_STATUS_CODES.has(status)) {
        return false;
    }

    return failureCount < 2;
}

export function useIncidentEvidenceQuery(
    incidentId?: string,
    enabled = false,
): UseQueryResult<IncidentEvidenceRecord[], Error> {
    const apiClient = useApi();
    const isAuthenticatedQueryEnabled = useAuthenticatedQueryEnabled();

    return useQuery({
        queryKey: TELEMETRY_QUERY_KEYS.incidentEvidence(incidentId),
        queryFn: () => getIncidentEvidence(apiClient, incidentId as string),
        enabled: Boolean(incidentId) && enabled && isAuthenticatedQueryEnabled,
        staleTime: SIGNED_URL_STALE_TIME_MS,
        retry: shouldRetryEvidenceQuery,
    });
}

export { SIGNED_URL_STALE_TIME_MS };
