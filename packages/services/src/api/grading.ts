import type { GradingExam, GradingStudentList } from '@sentinel/shared/types';
import type {
    AttemptGradingDetailType,
    GradingQuestionType,
    UpdateGradingAttemptBodyType,
} from '@sentinel/shared';
import type { ApiClientType } from '../api-client';

interface ApiResponse<T> {
    message: string;
    data: T;
}

export type GetGradingExamsParams = {
    sectionId?: string;
};

export type GetGradingStudentsParams = {
    sectionId?: string;
    search?: string;
};

function buildGradingQueryString(params?: GetGradingExamsParams | GetGradingStudentsParams) {
    if (!params) {
        return '';
    }
    const searchParams = new URLSearchParams();
    if (params.sectionId) {
        searchParams.set('sectionId', params.sectionId);
    }
    if ('search' in params && params.search) {
        searchParams.set('search', params.search);
    }
    const query = searchParams.toString();
    return query ? `?${query}` : '';
}

export async function getGradingExams(
    apiClient: ApiClientType,
    params?: GetGradingExamsParams,
): Promise<GradingExam[]> {
    const response: ApiResponse<GradingExam[]> = await apiClient(
        `/grading${buildGradingQueryString(params)}`,
    );
    return response.data;
}

export async function getGradingStudents(
    apiClient: ApiClientType,
    examId: string,
    params?: GetGradingStudentsParams,
): Promise<GradingStudentList> {
    const response: ApiResponse<GradingStudentList> = await apiClient(
        `/grading/${examId}/students${buildGradingQueryString(params)}`,
    );
    return response.data;
}

export interface GradingAttemptDetail {
    attempt: AttemptGradingDetailType;
    questions: GradingQuestionType[];
}

export async function getGradingAttemptDetail(
    apiClient: ApiClientType,
    attemptId: string,
): Promise<GradingAttemptDetail> {
    const response: ApiResponse<GradingAttemptDetail> = await apiClient(
        `/grading/attempts/${attemptId}`,
    );
    return response.data;
}

export type UpdateGradingAttemptBody = UpdateGradingAttemptBodyType;

export async function updateGradingAttempt(
    apiClient: ApiClientType,
    attemptId: string,
    body: UpdateGradingAttemptBody,
): Promise<{ attemptId: string; score: number; totalScore: number }> {
    const response: ApiResponse<{ attemptId: string; score: number; totalScore: number }> =
        await apiClient(`/grading/attempts/${attemptId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
    return response.data;
}

export async function bulkFinalizeAttempts(
    apiClient: ApiClientType,
    examId: string,
): Promise<{ count: number }> {
    const response: ApiResponse<{ count: number }> = await apiClient(
        `/grading/exams/${examId}/finalize-all`,
        {
            method: 'POST',
        },
    );
    return response.data;
}

