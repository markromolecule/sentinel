import type { ApiClientType } from '../../api-client';
import type { ApiExamResponse } from './types';
import type { EssayRubricDefinition, EssayRubricSource } from '@sentinel/shared';

export interface ResolvedEssayRubric {
    rubricVersionId: string | null;
    versionNumber: number | null;
    source: EssayRubricSource;
    definition: EssayRubricDefinition;
    canOverride?: boolean;
}

export interface UpdateExamEssayRubricResponse {
    rubricVersionId: string;
    versionNumber: number;
    scope: string;
    definition: EssayRubricDefinition;
}

/**
 * Fetches the effective essay rubric (either exam-scoped override or support baseline)
 * for a specific exam.
 *
 * @param apiClient - The authenticated API client instance.
 * @param examId - The UUID of the exam to fetch the rubric for.
 * @returns A promise resolving to the resolved essay rubric details.
 */
export async function getEffectiveEssayRubric(
    apiClient: ApiClientType,
    examId: string,
): Promise<ResolvedEssayRubric> {
    const response: ApiExamResponse<ResolvedEssayRubric> = await apiClient(
        `/rubrics/exams/${examId}`,
    );
    return response.data;
}

/**
 * Updates or overrides the essay rubric definition for a specific exam.
 *
 * @param apiClient - The authenticated API client instance.
 * @param args - The arguments containing the target examId and the new criteria definition.
 * @returns A promise resolving to the created rubric version details.
 */
export async function updateExamEssayRubric(
    apiClient: ApiClientType,
    args: {
        examId: string;
        payload: {
            criteria: Array<{
                key: string;
                name: string;
                weight: number;
                description: string;
                levels: Record<number, string>;
            }>;
        };
    },
): Promise<UpdateExamEssayRubricResponse> {
    const response: ApiExamResponse<UpdateExamEssayRubricResponse> = await apiClient(
        `/rubrics/exams/${args.examId}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(args.payload),
        },
    );
    return response.data;
}

/**
 * Resets the essay rubric override for a specific exam, deactivating the active override
 * and causing future attempts to inherit the baseline support rubric.
 *
 * @param apiClient - The authenticated API client instance.
 * @param examId - The UUID of the exam to reset the rubric for.
 * @returns A promise resolving to the new resolved essay rubric (inherited baseline).
 */
export async function resetExamEssayRubric(
    apiClient: ApiClientType,
    examId: string,
): Promise<ResolvedEssayRubric> {
    const response: ApiExamResponse<ResolvedEssayRubric> = await apiClient(
        `/rubrics/exams/${examId}`,
        {
            method: 'DELETE',
        },
    );
    return response.data;
}
