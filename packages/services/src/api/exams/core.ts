import type { ProctorExam } from '@sentinel/shared/types';
import type { ApiClientType } from '../../api-client';
import { mapExam } from './mappers';
import type {
    CloseExamAttemptLifecyclePayload,
    ApiExamResponse,
    ApiExamSummary,
    ApiExamDetail,
    GrantMakeupExamWindowPayload,
    GrantRetakeExamWindowPayload,
    LockExamAttemptLifecyclePayload,
    ReopenExamAttemptLifecyclePayload,
    ResetExamAttemptLifecyclePayload,
    ApiStudentExamAccessOverride,
    GetExamsParams,
    GetExamParams,
    CreateExamPayload,
    CreateStudentExamAccessOverridePayload,
    BatchCreateStudentExamAccessOverridePayload,
    OverrideReconnectLimitPayload,
    AuthorizeStudentReentryPayload,
    AuthorizeStudentReentryResult,
    UpdateExamPayload,
    UpdateExamRuntimeAccessPayload,
    UpdateExamStatusPayload,
} from './types';
import type { ExamAttemptLifecycleResponseType } from '@sentinel/shared';

const DEFAULT_EXAMS_PAGE_SIZE = 100;

function buildQueryString(params?: GetExamsParams) {
    if (!params) {
        return '';
    }

    const searchParams = new URLSearchParams();

    if (params.search) {
        searchParams.set('search', params.search);
    }

    if (params.status) {
        searchParams.set('status', params.status);
    }

    if (params.subjectId) {
        searchParams.set('subjectId', params.subjectId);
    }

    if (params.classroomId) {
        searchParams.set('classroomId', params.classroomId);
    }

    if (params.institutionId) {
        searchParams.set('institutionId', params.institutionId);
    }

    if (params.viewer) {
        searchParams.set('viewer', params.viewer);
    }

    if (params.page) {
        searchParams.set('page', String(params.page));
    }

    if (params.limit) {
        searchParams.set('limit', String(params.limit));
    }

    const query = searchParams.toString();
    return query ? `?${query}` : '';
}

async function getExamsPage(apiClient: ApiClientType, params?: GetExamsParams) {
    const response: ApiExamResponse<ApiExamSummary[]> = await apiClient(
        `/exams${buildQueryString(params)}`,
    );

    return response.data.map(mapExam);
}

export async function getExams(
    apiClient: ApiClientType,
    params?: GetExamsParams,
): Promise<ProctorExam[]> {
    if (params?.page) {
        return getExamsPage(apiClient, params);
    }

    const limit = params?.limit ?? DEFAULT_EXAMS_PAGE_SIZE;
    const exams: ProctorExam[] = [];
    let page = 1;

    while (true) {
        const pageExams = await getExamsPage(apiClient, {
            ...params,
            page,
            limit,
        });

        exams.push(...pageExams);

        if (pageExams.length < limit) {
            break;
        }

        page += 1;
    }

    return exams;
}

export async function getExam(
    apiClient: ApiClientType,
    id: string,
    params?: GetExamParams,
): Promise<ProctorExam> {
    const searchParams = new URLSearchParams();

    if (params?.viewer) {
        searchParams.set('viewer', params.viewer);
    }

    const query = searchParams.toString();
    const response: ApiExamResponse<ApiExamDetail> = await apiClient(
        `/exams/${id}${query ? `?${query}` : ''}`,
    );
    return mapExam(response.data);
}

export async function createExam(
    apiClient: ApiClientType,
    payload: CreateExamPayload,
): Promise<ProctorExam> {
    const response: ApiExamResponse<ApiExamDetail> = await apiClient('/exams', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return mapExam(response.data);
}

export async function updateExam(
    apiClient: ApiClientType,
    {
        id,
        payload,
    }: {
        id: string;
        payload: UpdateExamPayload;
    },
): Promise<ProctorExam> {
    const response: ApiExamResponse<ApiExamDetail> = await apiClient(`/exams/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return mapExam(response.data);
}

export async function deleteExam(apiClient: ApiClientType, id: string): Promise<void> {
    await apiClient(`/exams/${id}`, {
        method: 'DELETE',
    });
}

export async function updateExamStatus(
    apiClient: ApiClientType,
    payload: UpdateExamStatusPayload,
): Promise<ProctorExam> {
    const response: ApiExamResponse<ApiExamDetail> = await apiClient(
        `/exams/${payload.id}/status`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: payload.status,
            }),
        },
    );

    return mapExam(response.data);
}

export async function updateExamRuntimeAccess(
    apiClient: ApiClientType,
    payload: UpdateExamRuntimeAccessPayload,
) {
    const response: ApiExamResponse<NonNullable<ProctorExam['runtimeAccess']>> = await apiClient(
        `/exams/${payload.id}/runtime-access`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                state: payload.state,
                reopenedUntil: payload.reopenedUntil ?? null,
            }),
        },
    );

    return response.data;
}

export async function createStudentExamAccessOverride(
    apiClient: ApiClientType,
    payload: CreateStudentExamAccessOverridePayload,
) {
    const response: ApiExamResponse<ApiStudentExamAccessOverride> = await apiClient(
        `/exams/${payload.id}/student-overrides`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                studentId: payload.studentId,
                overrideType: payload.overrideType,
                availableFrom: payload.availableFrom,
                availableUntil: payload.availableUntil,
                allowedAttempts: payload.allowedAttempts ?? 1,
                sourceAttemptId: payload.sourceAttemptId ?? null,
                notes: payload.notes ?? null,
            }),
        },
    );

    return response.data;
}

export async function batchCreateStudentExamAccessOverrides(
    apiClient: ApiClientType,
    payload: BatchCreateStudentExamAccessOverridePayload,
) {
    const response: ApiExamResponse<ApiStudentExamAccessOverride[]> = await apiClient(
        `/exams/${payload.id}/overrides/batch-makeup`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                studentIds: payload.studentIds,
                overrideType: payload.overrideType ?? 'MAKEUP',
                availableFrom: payload.availableFrom,
                availableUntil: payload.availableUntil,
                allowedAttempts: payload.allowedAttempts ?? 1,
                notes: payload.notes ?? null,
            }),
        },
    );

    return response.data;
}


export async function overrideReconnectLimit(
    apiClient: ApiClientType,
    payload: OverrideReconnectLimitPayload,
) {
    const response: ApiExamResponse<ApiStudentExamAccessOverride> = await apiClient(
        `/exams/${payload.id}/student-overrides/reconnect-override/${payload.studentId}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reason: payload.reason ?? undefined,
            }),
        },
    );

    return response.data;
}

export async function authorizeStudentReentry(
    apiClient: ApiClientType,
    payload: AuthorizeStudentReentryPayload,
): Promise<AuthorizeStudentReentryResult> {
    const response: ApiExamResponse<AuthorizeStudentReentryResult> = await apiClient(
        `/exams/${payload.id}/student-overrides/authorize-reentry/${payload.studentId}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reason: payload.reason ?? undefined,
            }),
        },
    );

    return response.data;
}

/**
 * Locks one student attempt through the lifecycle API.
 */
export async function lockExamAttemptLifecycle(
    apiClient: ApiClientType,
    payload: LockExamAttemptLifecyclePayload,
): Promise<ExamAttemptLifecycleResponseType> {
    const response: ApiExamResponse<ExamAttemptLifecycleResponseType> = await apiClient(
        `/exams/${payload.id}/attempts/${payload.attemptId}/lifecycle/lock`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reasonCode: payload.reasonCode,
                notes: payload.notes ?? null,
            }),
        },
    );

    return response.data;
}

/**
 * Reopens one student attempt through the lifecycle API.
 */
export async function reopenExamAttemptLifecycle(
    apiClient: ApiClientType,
    payload: ReopenExamAttemptLifecyclePayload,
): Promise<ExamAttemptLifecycleResponseType> {
    const response: ApiExamResponse<ExamAttemptLifecycleResponseType> = await apiClient(
        `/exams/${payload.id}/attempts/${payload.attemptId}/lifecycle/reopen`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reopenedUntil: payload.reopenedUntil,
                reasonCode: payload.reasonCode ?? null,
                notes: payload.notes ?? null,
            }),
        },
    );

    return response.data;
}

/**
 * Resets one student attempt through the lifecycle API.
 */
export async function resetExamAttemptLifecycle(
    apiClient: ApiClientType,
    payload: ResetExamAttemptLifecyclePayload,
): Promise<ExamAttemptLifecycleResponseType> {
    const response: ApiExamResponse<ExamAttemptLifecycleResponseType> = await apiClient(
        `/exams/${payload.id}/attempts/${payload.attemptId}/lifecycle/reset`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reasonCode: payload.reasonCode ?? null,
                notes: payload.notes ?? null,
                createReplacementAttempt: payload.createReplacementAttempt ?? undefined,
            }),
        },
    );

    return response.data;
}

/**
 * Closes one student attempt through the lifecycle API.
 */
export async function closeExamAttemptLifecycle(
    apiClient: ApiClientType,
    payload: CloseExamAttemptLifecyclePayload,
): Promise<ExamAttemptLifecycleResponseType> {
    const response: ApiExamResponse<ExamAttemptLifecycleResponseType> = await apiClient(
        `/exams/${payload.id}/attempts/${payload.attemptId}/lifecycle/close`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reasonCode: payload.reasonCode,
                notes: payload.notes ?? null,
            }),
        },
    );

    return response.data;
}

/**
 * Grants a makeup window for one student through the lifecycle API.
 */
export async function grantMakeupExamWindowLifecycle(
    apiClient: ApiClientType,
    payload: GrantMakeupExamWindowPayload,
): Promise<{
    override?: ApiStudentExamAccessOverride | null;
    remediationExam?: any;
    remediationSchedule?: any;
    latestEvent: ExamAttemptLifecycleResponseType['latestEvent'] | null;
}> {
    const response = await apiClient(
        `/exams/${payload.id}/students/${payload.studentId}/lifecycle/grant-makeup`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                availableFrom: payload.availableFrom,
                availableUntil: payload.availableUntil,
                allowedAttempts: payload.allowedAttempts ?? 1,
                notes: payload.notes ?? null,
            }),
        },
    );

    return response.data;
}

/**
 * Grants a retake window for one student through the lifecycle API.
 */
export async function grantRetakeExamWindowLifecycle(
    apiClient: ApiClientType,
    payload: GrantRetakeExamWindowPayload,
): Promise<{
    override?: ApiStudentExamAccessOverride | null;
    remediationExam?: any;
    remediationSchedule?: any;
    latestEvent: ExamAttemptLifecycleResponseType['latestEvent'];
}> {
    const response = await apiClient(
        `/exams/${payload.id}/students/${payload.studentId}/lifecycle/grant-retake`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                availableFrom: payload.availableFrom,
                availableUntil: payload.availableUntil,
                allowedAttempts: payload.allowedAttempts ?? 1,
                sourceAttemptId: payload.attemptId,
                notes: payload.notes ?? null,
            }),
        },
    );

    return response.data;
}
