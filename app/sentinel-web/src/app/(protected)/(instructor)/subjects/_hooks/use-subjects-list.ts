'use client';

import {
    useEnrolledSubjectsQuery,
    useEnrollmentRequestsQuery,
    useStableValue,
} from '@sentinel/hooks';
import { Subject, EnrolledSubjectData, EnrollmentRequest } from '@sentinel/shared/types';
import type { PaginationState } from '@tanstack/react-table';
import { type PaginatedApiResponse } from '@sentinel/services';
import {
    buildCourseSummary,
    buildDepartmentSummary,
    buildScopeSummary,
    buildSectionSummary,
    buildYearLevelSummary,
} from '@/app/(protected)/(instructor)/subjects/_lib/request-scope-summary';

function joinCodes(codes?: string[] | null, fallback?: string | null) {
    const normalizedCodes = (codes || []).filter(Boolean);

    if (normalizedCodes.length > 0) {
        return normalizedCodes.join(', ');
    }

    return fallback || '';
}

const mapEnrolledToSubject = (
    s: EnrolledSubjectData,
    approvedRequest?: EnrollmentRequest,
): Subject => ({
    id: s.subject_offering_id,
    subjectOfferingId: s.subject_offering_id,
    code: s.code,
    title: s.title,
    department_code: joinCodes(
        approvedRequest?.target_department_codes ?? s.department_codes,
        approvedRequest?.department_code ?? s.department_code,
    ),
    course_code: joinCodes(
        approvedRequest?.target_course_codes ?? s.course_codes,
        approvedRequest?.course_code ?? s.course_code,
    ),
    sections:
        approvedRequest?.sections.map((section) => ({
            id: section.class_group_id || section.section_id || '',
            name: section.section_name || 'Unknown',
        })) ?? s.sections,
    departments: approvedRequest?.target_department_codes ?? s.department_codes,
    courses: approvedRequest?.target_course_codes ?? s.course_codes,
    yearLevels: (approvedRequest?.target_year_levels ?? s.year_levels).map(
        (yearLevel) => `Year ${yearLevel}`,
    ),
    departmentIds: approvedRequest?.target_department_ids ?? s.department_ids,
    courseIds: approvedRequest?.target_course_ids ?? s.course_ids,
    sectionIds:
        approvedRequest?.sections
            .map((section) => section.class_group_id || section.section_id)
            .filter((value): value is string => Boolean(value)) ??
        s.sections.map((section) => section.id),
    yearLevelsNumeric: approvedRequest?.target_year_levels ?? s.year_levels,
    requestIds: approvedRequest?.sections.map((section) => section.request_id) ?? [],
    departmentSummary: buildDepartmentSummary(
        approvedRequest?.target_department_codes ?? s.department_codes,
    ),
    courseSummary: buildCourseSummary(approvedRequest?.target_course_codes ?? s.course_codes),
    yearLevelSummary: buildYearLevelSummary(approvedRequest?.target_year_levels ?? s.year_levels),
    sectionSummary: buildSectionSummary(
        approvedRequest?.resolved_section_count || s.sections.length,
    ),
    scopeSummary: buildScopeSummary({
        departments: approvedRequest?.target_department_codes ?? s.department_codes,
        courses: approvedRequest?.target_course_codes ?? s.course_codes,
        yearLevels: approvedRequest?.target_year_levels ?? s.year_levels,
        sectionCount: approvedRequest?.resolved_section_count || s.sections.length,
    }),
    status: 'APPROVED',
    requested_at: approvedRequest?.created_at ?? s.requested_at,
    approved_at: s.approved_at,
    approved_by: s.approved_by_name || '',
    termId: s.term_id,
    termAcademicYear: s.term_academic_year,
    termSemester: s.term_semester,
    createdAt: s.approved_at || s.requested_at || new Date().toISOString(),
    createdBy: s.approved_by_name || '',
});

const mapRequestToSubject = (r: EnrollmentRequest): Subject => ({
    id: r.subject_offering_id,
    subjectOfferingId: r.subject_offering_id,
    code: r.subject_code,
    title: r.subject_title,
    department_code: joinCodes(r.target_department_codes, r.department_code),
    course_code: joinCodes(r.target_course_codes, r.course_code),
    sections: r.sections.map((s) => ({
        id: s.class_group_id || s.section_id || '',
        name: s.section_name || 'Unknown',
    })),
    departments: r.target_department_codes,
    courses: r.target_course_codes,
    yearLevels: r.target_year_levels.map((yearLevel) => `Year ${yearLevel}`),
    departmentIds: r.target_department_ids,
    courseIds: r.target_course_ids,
    sectionIds: r.sections
        .map((section) => section.class_group_id || section.section_id)
        .filter((value): value is string => Boolean(value)),
    yearLevelsNumeric: r.target_year_levels,
    requestIds: r.sections.map((section) => section.request_id),
    departmentSummary: buildDepartmentSummary(r.target_department_codes),
    courseSummary: buildCourseSummary(r.target_course_codes),
    yearLevelSummary: buildYearLevelSummary(r.target_year_levels),
    sectionSummary: buildSectionSummary(r.resolved_section_count || r.sections.length),
    scopeSummary: buildScopeSummary({
        departments: r.target_department_codes,
        courses: r.target_course_codes,
        yearLevels: r.target_year_levels,
        sectionCount: r.resolved_section_count || r.sections.length,
    }),
    status: r.status,
    requested_at: r.created_at,
    approved_at: null,
    approved_by: null,
    termId: r.term_id,
    termAcademicYear: r.term_academic_year,
    termSemester: r.term_semester,
    createdAt: r.created_at || new Date().toISOString(),
    createdBy: r.instructor_name || '',
});

type UseSubjectsListArgs = {
    search?: string;
    page?: number;
    limit?: number;
};

type UseSubjectsListResult = {
    subjects: Subject[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    pagination?: PaginationState & {
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
};

type PaginationMetadata = {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasMore: boolean;
};

function getPaginationMetadata<T>(
    response: T[] | PaginatedApiResponse<T>,
): PaginationMetadata | undefined {
    return Array.isArray(response) ? undefined : response.pagination;
}

/**
 * Fetches and merges the instructor subjects view, optionally using paginated API calls.
 */
export function useSubjectsList(search?: string): UseSubjectsListResult;
export function useSubjectsList(params: UseSubjectsListArgs): UseSubjectsListResult;
export function useSubjectsList(
    searchOrParams?: string | UseSubjectsListArgs,
): UseSubjectsListResult {
    const params =
        typeof searchOrParams === 'string' ? { search: searchOrParams } : (searchOrParams ?? {});
    const hasPagination = params.page !== undefined && params.limit !== undefined;

    const {
        data: enrolledRaw = [],
        isLoading: isLoadingEnrolled,
        isError: isErrorEnrolled,
        error: enrolledError,
    } = useEnrolledSubjectsQuery(
        hasPagination
            ? {
                  search: params.search,
                  page: params.page,
                  limit: params.limit,
              }
            : params.search,
    );

    const {
        data: requestsRaw = [],
        isLoading: isLoadingRequests,
        isError: isErrorRequests,
        error: requestsError,
    } = useEnrollmentRequestsQuery(
        hasPagination
            ? {
                  search: params.search,
                  page: params.page,
                  limit: params.limit,
              }
            : undefined,
        hasPagination ? undefined : params.search,
    );

    const enrolledItems = Array.isArray(enrolledRaw)
        ? enrolledRaw
        : ((enrolledRaw as PaginatedApiResponse<EnrolledSubjectData>).items ?? []);

    const requestItems = Array.isArray(requestsRaw)
        ? requestsRaw
        : ((requestsRaw as PaginatedApiResponse<EnrollmentRequest>).items ?? []);

    const subjects = useStableValue(() => {
        if (!enrolledItems.length && !requestItems.length) return [];

        const approvedRequestMap = new Map(
            requestItems
                .filter((request) => request.status === 'APPROVED')
                .map((request) => [request.subject_offering_id, request]),
        );
        const enrolled = enrolledItems.map((subject) =>
            mapEnrolledToSubject(subject, approvedRequestMap.get(subject.subject_offering_id)),
        );
        const validRequests = requestItems
            .filter((r) => r.status !== 'APPROVED')
            .map(mapRequestToSubject);

        return [...enrolled, ...validRequests];
    }, [enrolledItems, requestItems]);

    const pagination = useStableValue(() => {
        if (!hasPagination) {
            return undefined;
        }

        const enrolledPagination = getPaginationMetadata(enrolledRaw);
        const requestPagination = getPaginationMetadata(requestsRaw);

        const pageSize =
            enrolledPagination?.limit ?? requestPagination?.limit ?? params.limit ?? 10;
        const total =
            (enrolledPagination?.total ?? enrolledItems.length) +
            (requestPagination?.total ?? requestItems.length);
        const totalPages = Math.max(
            enrolledPagination?.totalPages ?? 1,
            requestPagination?.totalPages ?? 1,
        );

        return {
            pageIndex: (params.page ?? 1) - 1,
            pageSize,
            total,
            totalPages,
            hasMore: enrolledPagination?.hasMore || requestPagination?.hasMore || false,
        };
    }, [
        enrolledItems.length,
        hasPagination,
        params.limit,
        params.page,
        requestItems.length,
        enrolledRaw,
        requestsRaw,
    ]);

    return {
        subjects,
        isLoading: isLoadingEnrolled || isLoadingRequests,
        isError: isErrorEnrolled || isErrorRequests,
        error: (enrolledError as Error | null) || (requestsError as Error | null) || null,
        pagination,
    };
}
