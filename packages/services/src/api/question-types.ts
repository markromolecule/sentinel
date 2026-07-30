import type { ExamQuestionContent, QuestionType } from '@sentinel/shared/types';
import type { ApiClientType } from '../api-client';

interface ApiResponse<T> {
    message: string;
    data: T;
}

export interface QuestionTypeDefinition {
    value: QuestionType;
    label: string;
    description: string;
    instruction: string;
    defaultContent: ExamQuestionContent;
}

export interface ValidateQuestionTypeContentPayload {
    type: QuestionType;
    content: ExamQuestionContent;
}

export interface QuestionTypeValidationResult {
    type: QuestionType;
    content: ExamQuestionContent;
}

export async function getQuestionTypes(
    apiClient: ApiClientType,
): Promise<QuestionTypeDefinition[]> {
    const response: ApiResponse<QuestionTypeDefinition[]> = await apiClient('/question-types');
    return response.data;
}

export async function getQuestionType(
    apiClient: ApiClientType,
    type: QuestionType,
): Promise<QuestionTypeDefinition> {
    const response: ApiResponse<QuestionTypeDefinition> = await apiClient(
        `/question-types/${type}`,
    );
    return response.data;
}

export async function validateQuestionTypeContent(
    apiClient: ApiClientType,
    payload: ValidateQuestionTypeContentPayload,
): Promise<QuestionTypeValidationResult> {
    const response: ApiResponse<QuestionTypeValidationResult> = await apiClient(
        `/question-types/${payload.type}/validate`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: payload.content,
            }),
        },
    );

    return response.data;
}
