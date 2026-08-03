import type {
    ClassificationSubjectOfferingFormValues,
    SubjectOfferingFormValues,
    SubjectOfferingUpdateFormValues,
} from '@sentinel/shared/schema';
import type {
    ClassificationSubjectOfferingResult,
    SkippedSubjectOffering,
    SubjectClassificationSummary,
    SubjectOffering,
    SubjectOfferingCourse,
    SubjectOfferingDepartment,
    SubjectOfferingSection,
    SubjectOfferingInstructor,
} from '@sentinel/shared/types';
import type { ApiClientType } from '../api-client';
import type { PaginatedApiResponse } from './pagination';

interface ApiSubjectOffering {
    subject_offering_id: string;
    subject_id: string;
    subject_code: string;
    subject_title: string;
    term_id: string;
    term_academic_year: string;
    term_semester: string;
    term_start_date: string | null;
    term_end_date: string | null;
    status: SubjectOffering['status'];
    department_ids: string[];
    course_ids: string[];
    section_ids: string[];
    year_levels: number[];
    departments: Array<{
        id: string;
        code?: string | null;
        name: string;
    }>;
    courses: Array<{
        id: string;
        code?: string | null;
        title: string;
    }>;
    sections: Array<{
        id: string;
        class_group_id?: string | null;
        section_id?: string | null;
        name: string;
        department_id?: string | null;
        course_id?: string | null;
        year_level?: number | null;
    }>;
    classifications: SubjectClassificationSummary[];
    is_multi_department?: boolean;
    created_at: string | null;
    updated_at: string | null;
    created_by: string | null;
    updated_by: string | null;
    source_record_id?: string | null;
    inheritance_status?: string;
    origin_institution_id?: string | null;
    effective_institution_id?: string | null;
    is_local?: boolean;
    is_inherited?: boolean;
    is_overridden?: boolean;
    is_hidden?: boolean;
    institution_name?: string | null;
    instructors?: SubjectOfferingInstructor[];
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

interface ApiSkippedSubjectOffering {
    subject_id: string;
    subject_code: string;
    subject_title: string;
    existing_subject_offering_id: string;
    reason: 'already_offered';
}

interface ApiClassificationSubjectOfferingResult {
    classification_id: string;
    classification_name: string;
    term_id: string;
    created_count: number;
    skipped_count: number;
    total_subject_count: number;
    duplicate_strategy: 'skip_existing' | 'fail_existing';
    created: ApiSubjectOffering[];
    skipped: ApiSkippedSubjectOffering[];
}

type SubjectOfferingQueryParams = {
    search?: string;
    subjectId?: string;
    termId?: string;
    institutionId?: string;
    visibility?: 'default' | 'requestable';
    page?: number;
    limit?: number;
};

function mapDepartments(
    departments: ApiSubjectOffering['departments'],
): SubjectOfferingDepartment[] {
    return (departments ?? []).map((department) => ({
        id: department.id,
        code: department.code ?? null,
        name: department.name,
    }));
}

function mapCourses(courses: ApiSubjectOffering['courses']): SubjectOfferingCourse[] {
    return (courses ?? []).map((course) => ({
        id: course.id,
        code: course.code ?? null,
        title: course.title,
    }));
}

function mapSections(sections: ApiSubjectOffering['sections']): SubjectOfferingSection[] {
    return (sections ?? []).map((section) => ({
        id: section.id,
        classGroupId: section.class_group_id ?? null,
        sectionId: section.section_id ?? null,
        name: section.name,
        departmentId: section.department_id ?? null,
        courseId: section.course_id ?? null,
        yearLevel: section.year_level ?? null,
    }));
}

function mapSubjectOffering(apiSubjectOffering: ApiSubjectOffering): SubjectOffering {
    return {
        id: apiSubjectOffering.subject_offering_id,
        subjectId: apiSubjectOffering.subject_id,
        subjectCode: apiSubjectOffering.subject_code,
        subjectTitle: apiSubjectOffering.subject_title,
        termId: apiSubjectOffering.term_id,
        termAcademicYear: apiSubjectOffering.term_academic_year,
        termSemester: apiSubjectOffering.term_semester,
        termStartDate: apiSubjectOffering.term_start_date,
        termEndDate: apiSubjectOffering.term_end_date,
        status: apiSubjectOffering.status,
        departmentIds: apiSubjectOffering.department_ids ?? [],
        courseIds: apiSubjectOffering.course_ids ?? [],
        sectionIds: apiSubjectOffering.section_ids ?? [],
        yearLevels: apiSubjectOffering.year_levels ?? [],
        departments: mapDepartments(apiSubjectOffering.departments),
        courses: mapCourses(apiSubjectOffering.courses),
        sections: mapSections(apiSubjectOffering.sections),
        classifications: apiSubjectOffering.classifications ?? [],
        isMultiDepartment: apiSubjectOffering.is_multi_department,
        createdAt: apiSubjectOffering.created_at,
        createdBy: apiSubjectOffering.created_by,
        updatedAt: apiSubjectOffering.updated_at,
        updatedBy: apiSubjectOffering.updated_by,
        sourceRecordId: apiSubjectOffering.source_record_id ?? null,
        inheritanceStatus: apiSubjectOffering.inheritance_status,
        originInstitutionId: apiSubjectOffering.origin_institution_id ?? null,
        effectiveInstitutionId: apiSubjectOffering.effective_institution_id ?? null,
        isLocal: apiSubjectOffering.is_local,
        isInherited: apiSubjectOffering.is_inherited,
        isOverridden: apiSubjectOffering.is_overridden,
        isHidden: apiSubjectOffering.is_hidden,
        institutionName: apiSubjectOffering.institution_name,
        instructors: apiSubjectOffering.instructors ?? [],
    };
}

function mapSkippedSubjectOffering(
    skippedOffering: ApiSkippedSubjectOffering,
): SkippedSubjectOffering {
    return {
        subjectId: skippedOffering.subject_id,
        subjectCode: skippedOffering.subject_code,
        subjectTitle: skippedOffering.subject_title,
        existingSubjectOfferingId: skippedOffering.existing_subject_offering_id,
        reason: skippedOffering.reason,
    };
}

function mapClassificationSubjectOfferingResult(
    result: ApiClassificationSubjectOfferingResult,
): ClassificationSubjectOfferingResult {
    return {
        classificationId: result.classification_id,
        classificationName: result.classification_name,
        termId: result.term_id,
        createdCount: result.created_count,
        skippedCount: result.skipped_count,
        totalSubjectCount: result.total_subject_count,
        duplicateStrategy: result.duplicate_strategy,
        created: result.created.map(mapSubjectOffering),
        skipped: result.skipped.map(mapSkippedSubjectOffering),
    };
}

function buildQueryString(params?: SubjectOfferingQueryParams) {
    if (!params) {
        return '';
    }

    const searchParams = new URLSearchParams();

    if (params.search) {
        searchParams.set('search', params.search);
    }

    if (params.subjectId) {
        searchParams.set('subject_id', params.subjectId);
    }

    if (params.termId) {
        searchParams.set('term_id', params.termId);
    }

    if (params.institutionId) {
        searchParams.set('institutionId', params.institutionId);
    }

    if (params.visibility && params.visibility !== 'default') {
        searchParams.set('visibility', params.visibility);
    }

    if (params.page !== undefined) {
        searchParams.set('page', String(params.page));
    }

    if (params.limit !== undefined) {
        searchParams.set('limit', String(params.limit));
    }

    const query = searchParams.toString();
    return query ? `?${query}` : '';
}

export async function getSubjectOfferings(
    apiClient: ApiClientType,
    params?: SubjectOfferingQueryParams,
): Promise<PaginatedApiResponse<SubjectOffering>> {
    const response: ApiResponse<ApiSubjectOffering[]> = await apiClient(
        `/subject-offerings${buildQueryString(params)}`,
    );

    return {
        items: response.data.map(mapSubjectOffering),
        pagination: response.pagination,
    };
}

export async function createSubjectOffering(
    apiClient: ApiClientType,
    payload: SubjectOfferingFormValues,
): Promise<SubjectOffering> {
    const response: ApiResponse<ApiSubjectOffering> = await apiClient('/subject-offerings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return mapSubjectOffering(response.data);
}

export async function createSubjectOfferingsFromClassification(
    apiClient: ApiClientType,
    payload: ClassificationSubjectOfferingFormValues,
): Promise<ClassificationSubjectOfferingResult> {
    const response: ApiResponse<ApiClassificationSubjectOfferingResult> = await apiClient(
        '/subject-offerings/bulk/classification',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        },
    );

    return mapClassificationSubjectOfferingResult(response.data);
}

export async function updateSubjectOffering(
    apiClient: ApiClientType,
    {
        id,
        payload,
    }: {
        id: string;
        payload: SubjectOfferingUpdateFormValues;
    },
): Promise<SubjectOffering> {
    const response: ApiResponse<ApiSubjectOffering> = await apiClient(`/subject-offerings/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return mapSubjectOffering(response.data);
}

export async function deleteSubjectOffering(apiClient: ApiClientType, id: string): Promise<void> {
    await apiClient(`/subject-offerings/${id}`, {
        method: 'DELETE',
    });
}

/**
 * Bulk delete subject offerings.
 * @param apiClient API Client instance
 * @param ids Offering IDs to delete
 */
export async function deleteSubjectOfferings(
    apiClient: ApiClientType,
    payload: string[] | { ids: string[]; institutionId?: string },
): Promise<void> {
    const body = Array.isArray(payload) ? { ids: payload } : payload;

    await apiClient('/subject-offerings/bulk-delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
}

/**
 * Fetches a single subject offering by ID.
 * @param apiClient API Client instance
 * @param id Offering ID to fetch
 */
export async function getSubjectOffering(
    apiClient: ApiClientType,
    id: string,
): Promise<SubjectOffering> {
    const response: ApiResponse<ApiSubjectOffering> = await apiClient(`/subject-offerings/${id}`);
    return mapSubjectOffering(response.data);
}
