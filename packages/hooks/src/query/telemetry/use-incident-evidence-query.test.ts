import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getIncidentEvidence } from '@sentinel/services';
import { TELEMETRY_QUERY_KEYS } from '@sentinel/shared/constants';
import { SIGNED_URL_STALE_TIME_MS, useIncidentEvidenceQuery } from './use-incident-evidence-query';

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn((options: any) => {
        return options;
    }),
}));

vi.mock('@sentinel/services', () => ({
    getIncidentEvidence: vi.fn(),
}));

vi.mock('../../api-provider', () => ({
    useApi: vi.fn(() => ({ mockClient: true })),
}));

vi.mock('../_shared/use-authenticated-query-enabled', () => ({
    useAuthenticatedQueryEnabled: vi.fn(() => true),
}));

describe('useIncidentEvidenceQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('uses an incident-scoped key and waits until the gallery is expanded', async () => {
        const query = useIncidentEvidenceQuery('incident-1', true) as any;

        await query.queryFn();

        expect(getIncidentEvidence).toHaveBeenCalledWith({ mockClient: true }, 'incident-1');
        expect(query.queryKey).toEqual(TELEMETRY_QUERY_KEYS.incidentEvidence('incident-1'));
        expect(query.enabled).toBe(true);
        expect(query.staleTime).toBe(SIGNED_URL_STALE_TIME_MS);
    });

    it('disables fetching when the incident has not been expanded yet', () => {
        const query = useIncidentEvidenceQuery('incident-1', false) as any;

        expect(query.enabled).toBe(false);
    });

    it('does not retry authorization or not-found failures', () => {
        const query = useIncidentEvidenceQuery('incident-1', true) as any;

        expect(query.retry(0, { status: 403 } as Error & { status: number })).toBe(false);
        expect(query.retry(0, { status: 404 } as Error & { status: number })).toBe(false);
        expect(query.retry(0, { status: 500 } as Error & { status: number })).toBe(true);
    });
});
