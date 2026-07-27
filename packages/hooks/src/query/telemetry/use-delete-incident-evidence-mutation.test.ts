import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteEvidence } from '@sentinel/services';
import { EXAM_QUERY_KEYS, TELEMETRY_QUERY_KEYS } from '@sentinel/shared/constants';
import { useDeleteIncidentEvidenceMutation } from './use-delete-incident-evidence-mutation';

const invalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
    useMutation: vi.fn((options: any) => options),
    useQueryClient: vi.fn(() => ({
        invalidateQueries,
    })),
}));

vi.mock('@sentinel/services', () => ({
    deleteEvidence: vi.fn(),
}));

vi.mock('../../api-provider', () => ({
    useApi: vi.fn(() => ({ mockClient: true })),
}));

describe('useDeleteIncidentEvidenceMutation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        invalidateQueries.mockResolvedValue(undefined);
    });

    it('invalidates the evidence query and selected student detail after deletion', async () => {
        const mutation = useDeleteIncidentEvidenceMutation() as any;

        await mutation.mutationFn({
            evidenceId: 'evidence-1',
            incidentId: 'incident-1',
            examId: 'exam-1',
            studentId: 'student-1',
        });

        expect(deleteEvidence).toHaveBeenCalledWith({ mockClient: true }, 'evidence-1');

        await mutation.onSuccess(
            { success: true, message: 'deleted' },
            {
                evidenceId: 'evidence-1',
                incidentId: 'incident-1',
                examId: 'exam-1',
                studentId: 'student-1',
            },
            undefined,
        );

        expect(invalidateQueries).toHaveBeenCalledWith({
            queryKey: TELEMETRY_QUERY_KEYS.incidentEvidence('incident-1'),
        });
        expect(invalidateQueries).toHaveBeenCalledWith({
            queryKey: EXAM_QUERY_KEYS.monitoringStudent('exam-1', 'student-1'),
        });
    });
});
