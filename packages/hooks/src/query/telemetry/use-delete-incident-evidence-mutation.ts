'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { deleteEvidence, type DeleteEvidenceResponse } from '@sentinel/services';
import { EXAM_QUERY_KEYS, TELEMETRY_QUERY_KEYS } from '@sentinel/shared/constants';
import { toast } from 'sonner';
import { useApi } from '../../api-provider';

type DeleteIncidentEvidenceArgs = {
    evidenceId: string;
    incidentId: string;
    examId: string;
    studentId: string;
};

export function useDeleteIncidentEvidenceMutation(
    args: UseMutationOptions<DeleteEvidenceResponse, Error, DeleteIncidentEvidenceArgs> = {
        onSuccess: () => toast.success('Incident evidence deleted successfully.'),
        onError: (error) => toast.error(error.message),
    },
) {
    const apiClient = useApi();
    const queryClient = useQueryClient();

    return useMutation({
        ...args,
        mutationFn: ({ evidenceId }) => deleteEvidence(apiClient, evidenceId),
        onSuccess: async (data, variables, context) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: TELEMETRY_QUERY_KEYS.incidentEvidence(variables.incidentId),
                }),
                queryClient.invalidateQueries({
                    queryKey: EXAM_QUERY_KEYS.monitoringStudent(
                        variables.examId,
                        variables.studentId,
                    ),
                }),
            ]);
            (args.onSuccess as any)?.(data, variables, context);
        },
    });
}
