import type { SubjectClassificationFormValues } from '@sentinel/shared/schema';
import type { SubjectClassification } from '@sentinel/shared/types';
import type { ApiClientType } from '../api-client';
import type { PaginatedApiResponse } from './pagination';

interface ApiSubjectClassification {
    id: string;
    name: string;
    type: 'GENERAL' | 'CORE';
    description: string | null;
    subject_count: number;
    subjects: Array<{
        id: string;
        code: string;
        title: string;
    }>;
    created_at: string | null;
    updated_at: string | null;
    created_by: string | null;
    updated_by: string | null;
    department_id: string | null;
    course_ids: string[];
    year_levels?: number[];
    institution_id: string | null;
    source_record_id?: string | null;
    inheritance_status?: string | null;
    origin_institution_id?: string | null;
    effective_institution_id?: string | null;
    is_local?: boolean;
    is_inherited?: boolean;
    is_overridden?: boolean;
    is_hidden?: boolean;
}

interface ApiResponse<T> {
    message: string;
    data: T;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
}

function mapSubjectClassification(
    apiSubjectClassification: ApiSubjectClassification,
): SubjectClassification {
    return {
        id: apiSubjectClassification.id,
        name: apiSubjectClassification.name,
        type: apiSubjectClassification.type,
        description: apiSubjectClassification.description,
        subjectCount: apiSubjectClassification.subject_count,
        subjects: apiSubjectClassification.subjects ?? [],
        createdAt: apiSubjectClassification.created_at,
        updatedAt: apiSubjectClassification.updated_at,
        createdBy: apiSubjectClassification.created_by,
        updatedBy: apiSubjectClassification.updated_by,
        department_id: apiSubjectClassification.department_id,
        course_ids: apiSubjectClassification.course_ids ?? [],
        year_levels: apiSubjectClassification.year_levels ?? [],
        institution_id: apiSubjectClassification.institution_id ?? null,
        sourceRecordId: apiSubjectClassification.source_record_id ?? null,
        inheritanceStatus: apiSubjectClassification.inheritance_status ?? undefined,
        originInstitutionId: apiSubjectClassification.origin_institution_id ?? null,
        effectiveInstitutionId: apiSubjectClassification.effective_institution_id ?? null,
        isLocal: apiSubjectClassification.is_local,
        isInherited: apiSubjectClassification.is_inherited,
        isOverridden: apiSubjectClassification.is_overridden,
        isHidden: apiSubjectClassification.is_hidden,
    };
}

export async function getSubjectClassifications(
    apiClient: ApiClientType,
    search?: string,
    institutionId?: string,
    page?: number,
    limit?: number,
): Promise<PaginatedApiResponse<SubjectClassification>> {
    const params = new URLSearchParams();

    if (search) {
        params.set('search', search);
    }

    if (institutionId) {
        params.set('institutionId', institutionId);
    }

    if (page !== undefined) {
        params.set('page', String(page));
    }

    if (limit !== undefined) {
        params.set('limit', String(limit));
    }

    const url = params.size
        ? `/subjects/classifications?${params.toString()}`
        : '/subjects/classifications';
    const response: ApiResponse<ApiSubjectClassification[]> = await apiClient(url);
    return {
        items: response.data.map(mapSubjectClassification),
        pagination: response.pagination,
    };
}

export async function getSubjectClassification(
    apiClient: ApiClientType,
    id: string,
    institutionId?: string,
): Promise<SubjectClassification> {
    const params = new URLSearchParams();

    if (institutionId) {
        params.set('institutionId', institutionId);
    }

    const response: ApiResponse<ApiSubjectClassification> = await apiClient(
        params.size
            ? `/subjects/classifications/${id}?${params.toString()}`
            : `/subjects/classifications/${id}`,
    );
    return mapSubjectClassification(response.data);
}

export async function createSubjectClassification(
    apiClient: ApiClientType,
    payload: SubjectClassificationFormValues,
): Promise<SubjectClassification> {
    const response: ApiResponse<ApiSubjectClassification> = await apiClient(
        '/subjects/classifications',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        },
    );

    return mapSubjectClassification(response.data);
}

export async function updateSubjectClassification(
    apiClient: ApiClientType,
    {
        id,
        payload,
    }: {
        id: string;
        payload: SubjectClassificationFormValues;
    },
): Promise<SubjectClassification> {
    const response: ApiResponse<ApiSubjectClassification> = await apiClient(
        `/subjects/classifications/${id}`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        },
    );

    return mapSubjectClassification(response.data);
}

export async function deleteSubjectClassification(
    apiClient: ApiClientType,
    {
        id,
        institutionId,
    }: {
        id: string;
        institutionId?: string;
    },
): Promise<void> {
    const params = new URLSearchParams();

    if (institutionId) {
        params.set('institutionId', institutionId);
    }

    await apiClient(
        params.size
            ? `/subjects/classifications/${id}?${params.toString()}`
            : `/subjects/classifications/${id}`,
        {
            method: 'DELETE',
        },
    );
}
