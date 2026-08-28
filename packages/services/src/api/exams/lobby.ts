import type { ApiClientType } from '../../api-client';
import type { ApiExamResponse } from './types';
import type { ExamConfig, ExamData, ExamRuntimeAccess } from '@sentinel/shared/types';

export type ExamLobbyAdmissionStatus = 'WAITING' | 'APPROVED' | 'REJECTED';

export type ExamLobbyAdmissionStatusResult = {
    status: ExamLobbyAdmissionStatus | null;
    checkedInAt: string | null;
    decidedAt: string | null;
};

export type ExamLobbyCountResult = {
    count: number;
};

export type ExamLobbyBootstrapResult = {
    exam: ExamData;
    configuration: ExamConfig;
    admission: {
        status: ExamLobbyAdmissionStatus;
        checkedInAt: string | null;
        decidedAt?: string | null;
    };
    waitingCount: number;
    runtimeAccess: ExamRuntimeAccess | null;
};

export type ExamLobbyWaitingStudent = {
    admissionId: string;
    studentId: string;
    studentName: string;
    studentNumber: string | null;
    avatarUrl?: string | null;
    status: ExamLobbyAdmissionStatus;
    checkedInAt: string | null;
    decidedAt: string | null;
    hasActiveAttempt: boolean;
    attemptStatus: string | null;
    reconnectCount: number;
    maxReconnectAttempts: number;
};

export async function bootstrapExamLobby(apiClient: ApiClientType, examId: string) {
    const response: ApiExamResponse<ExamLobbyBootstrapResult> = await apiClient(
        `/exams/${examId}/lobby/bootstrap`,
        {
            method: 'POST',
        },
    );

    return response.data;
}

export async function checkIntoExamLobby(apiClient: ApiClientType, examId: string) {
    const response: ApiExamResponse<{
        status: ExamLobbyAdmissionStatus;
        checkedInAt: string;
    }> = await apiClient(`/exams/${examId}/lobby/check-in`, {
        method: 'POST',
    });

    return response.data;
}

export async function getExamLobbyAdmissionStatus(apiClient: ApiClientType, examId: string) {
    const response: ApiExamResponse<ExamLobbyAdmissionStatusResult> = await apiClient(
        `/exams/${examId}/lobby/admission-status`,
    );

    return response.data;
}

export async function getExamLobbyCount(apiClient: ApiClientType, examId: string) {
    const response: ApiExamResponse<ExamLobbyCountResult> = await apiClient(
        `/exams/${examId}/lobby/count`,
    );

    return response.data;
}

export async function getExamLobbyWaitingList(apiClient: ApiClientType, examId: string) {
    const response: ApiExamResponse<ExamLobbyWaitingStudent[]> = await apiClient(
        `/exams/${examId}/lobby/waiting-list`,
    );

    return response.data;
}

export async function updateExamLobbyAdmissions(
    apiClient: ApiClientType,
    args: {
        examId: string;
        studentIds: string[];
        status: Extract<ExamLobbyAdmissionStatus, 'APPROVED' | 'REJECTED'>;
    },
) {
    const response: ApiExamResponse<{ updatedCount: number }> = await apiClient(
        `/exams/${args.examId}/lobby/admissions`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                studentIds: args.studentIds,
                status: args.status,
            }),
        },
    );

    return response.data;
}
