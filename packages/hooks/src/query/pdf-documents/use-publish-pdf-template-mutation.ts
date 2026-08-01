import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { publishPdfTemplate } from '@sentinel/services';
import { ANALYTICS_MUTATION_KEYS, ANALYTICS_QUERY_KEYS } from '@sentinel/shared/constants';
import { useApi } from '../../api-provider';

type PublishPdfTemplateResponse = Awaited<ReturnType<typeof publishPdfTemplate>>;

export interface PublishPdfTemplateVariables {
    templateId: string;
    institutionId?: string | null;
    documentKind?: 'ANALYTICS_OVERALL' | 'EXAM_ANSWER_KEY' | 'EXAM_RESULTS_REPORT';
}

export type UsePublishPdfTemplateMutationArgs = UseMutationOptions<
    PublishPdfTemplateResponse,
    Error,
    PublishPdfTemplateVariables
>;

export function usePublishPdfTemplateMutation(args: UsePublishPdfTemplateMutationArgs = {}) {
    const apiClient = useApi();
    const queryClient = useQueryClient();

    return useMutation<PublishPdfTemplateResponse, Error, PublishPdfTemplateVariables>({
        ...args,
        mutationKey: ANALYTICS_MUTATION_KEYS.publishTemplate(),
        mutationFn: ({ templateId }) => publishPdfTemplate(apiClient, templateId),
        onSuccess: async (data, variables, onMutateResult, context) => {
            await queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEYS.pdfTemplates() });

            if (variables.documentKind) {
                await queryClient.invalidateQueries({
                    queryKey: ANALYTICS_QUERY_KEYS.resolvedPdfTemplate(
                        variables.institutionId ?? null,
                        variables.documentKind,
                        'PUBLISHED',
                    ),
                });
            }

            await args.onSuccess?.(data, variables, onMutateResult, context);
        },
    });
}
