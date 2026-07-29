import type { ApiClientType } from '../../api-client';
import type {
    ApiExamResponse,
    CompleteExamSessionPayload,
    CompleteExamSessionResult,
    PrepareExamSessionPayload,
    PrepareExamSessionResult,
    StartExamSessionPayload,
    StartExamSessionResult,
    SyncExamProgressPayload,
    SyncExamProgressResult,
} from './types';

export async function startExamSession(
    apiClient: ApiClientType,
    payload: StartExamSessionPayload,
): Promise<StartExamSessionResult> {
    const response: ApiExamResponse<StartExamSessionResult> = await apiClient(
        '/examination/flow/start',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        },
    );

    return response.data;
}

export async function prepareExamSession(
    apiClient: ApiClientType,
    payload: PrepareExamSessionPayload,
): Promise<PrepareExamSessionResult> {
    const response: ApiExamResponse<PrepareExamSessionResult> = await apiClient(
        '/examination/flow/prepare',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        },
    );

    return response.data;
}

export async function completeExamSession(
    apiClient: ApiClientType,
    payload: CompleteExamSessionPayload,
): Promise<CompleteExamSessionResult> {
    const response: ApiExamResponse<CompleteExamSessionResult> = await apiClient(
        '/examination/flow/complete',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        },
    );

    return response.data;
}

export async function syncExamProgress(
    apiClient: ApiClientType,
    payload: SyncExamProgressPayload,
): Promise<SyncExamProgressResult> {
    const response: ApiExamResponse<SyncExamProgressResult> = await apiClient(
        '/examination/flow/sync',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        },
    );

    return response.data;
}
