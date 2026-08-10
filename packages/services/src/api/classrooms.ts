import type {
    ClassroomDetail,
    ClassroomInstructor,
    ClassroomSummary,
} from '@sentinel/shared/types';
import type { ClassroomFormValues, ClassroomUpdateFormValues } from '@sentinel/shared/schema';
import type { ApiClientType } from '../api-client';

interface ApiResponse<T> {
    message: string;
    data: T;
}

interface ApiClassroomScopeSummary {
    subject_label: string;
    section_label: string;
    term_label: string;
    department_label: string | null;
    course_label: string | null;
    year_level_label: string | null;
}

interface ApiClassroomStudent {
    student_id: string;
    user_id: string | null;
    student_number: string;
    first_name: string | null;
    last_name: string | null;
    full_name: string | null;
    department_id: string | null;
    department_code: string | null;
    department_name: string | null;
    course_id: string | null;
    course_code: string | null;
    course_title: string | null;
    enrolled_at: string | null;
    avatar_url?: string | null;
}

interface ApiClassroomInstructor {
    user_id: string;
    name: string;
    is_head: boolean;
    assigned_at: string | null;
    assigned_by_user_id: string | null;
    assigned_by_name: string | null;
}

interface ApiClassroomSummary {
    class_group_id: string;
    class_name: string | null;
    is_configured: boolean;
    subject_offering_id: string | null;
    subject_id: string | null;
    subject_code: string | null;
    subject_title: string | null;
    section_id: string | null;
    section_name: string | null;
    term_id: string | null;
    term_academic_year: string | null;
    term_semester: string | null;
    department_id: string | null;
    department_code: string | null;
    department_name: string | null;
    course_id: string | null;
    course_code: string | null;
    course_title: string | null;
    year_level: number | null;
    institution_id: string | null;
    student_count: number;
    exam_count: number;
    created_at: string | null;
    updated_at: string | null;
    archived_at?: string | null;
    updated_by: string | null;
    updated_by_name: string | null;
    can_manage: boolean;
    instructors: string[];
    scope_summary: ApiClassroomScopeSummary;
}

interface ApiClassroomDetail extends ApiClassroomSummary {
    students: ApiClassroomStudent[];
}

function mapScopeSummary(summary: ApiClassroomScopeSummary) {
    return {
        subjectLabel: summary.subject_label,
        sectionLabel: summary.section_label,
        termLabel: summary.term_label,
        departmentLabel: summary.department_label,
        courseLabel: summary.course_label,
        yearLevelLabel: summary.year_level_label,
    };
}

function mapClassroomStudent(student: ApiClassroomStudent) {
    return {
        studentId: student.student_id,
        userId: student.user_id,
        studentNumber: student.student_number,
        firstName: student.first_name,
        lastName: student.last_name,
        fullName: student.full_name,
        departmentId: student.department_id,
        departmentCode: student.department_code,
        departmentName: student.department_name,
        courseId: student.course_id,
        courseCode: student.course_code,
        courseTitle: student.course_title,
        enrolledAt: student.enrolled_at,
        avatarUrl: student.avatar_url ?? null,
    };
}

function mapClassroomInstructor(instructor: ApiClassroomInstructor): ClassroomInstructor {
    return {
        userId: instructor.user_id,
        name: instructor.name,
        isHead: instructor.is_head,
        assignedAt: instructor.assigned_at,
        assignedByUserId: instructor.assigned_by_user_id,
        assignedByName: instructor.assigned_by_name,
    };
}

function mapClassroomSummary(classroom: ApiClassroomSummary): ClassroomSummary {
    return {
        id: classroom.class_group_id,
        className: classroom.class_name,
        isConfigured: classroom.is_configured,
        subjectOfferingId: classroom.subject_offering_id,
        subjectId: classroom.subject_id,
        subjectCode: classroom.subject_code,
        subjectTitle: classroom.subject_title,
        sectionId: classroom.section_id,
        sectionName: classroom.section_name,
        termId: classroom.term_id,
        termAcademicYear: classroom.term_academic_year,
        termSemester: classroom.term_semester,
        departmentId: classroom.department_id,
        departmentCode: classroom.department_code,
        departmentName: classroom.department_name,
        courseId: classroom.course_id,
        courseCode: classroom.course_code,
        courseTitle: classroom.course_title,
        yearLevel: classroom.year_level,
        institutionId: classroom.institution_id,
        studentCount: classroom.student_count,
        examCount: classroom.exam_count,
        createdAt: classroom.created_at,
        updatedAt: classroom.updated_at,
        archivedAt: classroom.archived_at,
        updatedBy: classroom.updated_by,
        updatedByName: classroom.updated_by_name,
        canManage: classroom.can_manage,
        instructors: classroom.instructors,
        scopeSummary: mapScopeSummary(classroom.scope_summary),
    };
}

function mapClassroomDetail(classroom: ApiClassroomDetail): ClassroomDetail {
    return {
        ...mapClassroomSummary(classroom),
        students: classroom.students.map(mapClassroomStudent),
    };
}

/**
 * Fetches the list of classrooms from the API, scoped by optional filters.
 *
 * @param apiClient - The API client function.
 * @param query - A query string for searching or an object containing search, departmentId, status, institutionId, and subjectId.
 * @returns A promise resolving to an array of ClassroomSummary.
 */
export async function getClassrooms(
    apiClient: ApiClientType,
    query?:
        | string
        | {
              search?: string;
              departmentId?: string;
              status?: 'active' | 'archived' | 'all';
              institutionId?: string;
              subjectId?: string;
          },
): Promise<ClassroomSummary[]> {
    const searchParams = new URLSearchParams();
    const search = typeof query === 'string' ? query : query?.search;
    const departmentId = typeof query === 'string' ? undefined : query?.departmentId;
    const status = typeof query === 'string' ? undefined : query?.status;
    const institutionId = typeof query === 'string' ? undefined : query?.institutionId;
    const subjectId = typeof query === 'string' ? undefined : query?.subjectId;

    if (search) {
        searchParams.append('search', search);
    }

    if (departmentId) {
        searchParams.append('departmentId', departmentId);
    }

    if (status) {
        searchParams.append('status', status);
    }

    if (institutionId) {
        searchParams.append('institutionId', institutionId);
    }

    if (subjectId) {
        searchParams.append('subjectId', subjectId);
    }

    const queryString = searchParams.toString();
    const response: ApiResponse<ApiClassroomSummary[]> = await apiClient(
        queryString ? `/classrooms?${queryString}` : '/classrooms',
    );

    return response.data.map(mapClassroomSummary);
}

export async function getClassroom(apiClient: ApiClientType, id: string): Promise<ClassroomDetail> {
    const response: ApiResponse<ApiClassroomDetail> = await apiClient(`/classrooms/${id}`);
    return mapClassroomDetail(response.data);
}

export async function createClassroom(
    apiClient: ApiClientType,
    payload: ClassroomFormValues,
): Promise<ClassroomDetail> {
    const response: ApiResponse<ApiClassroomDetail> = await apiClient('/classrooms', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return mapClassroomDetail(response.data);
}

export async function updateClassroom(
    apiClient: ApiClientType,
    {
        id,
        payload,
    }: {
        id: string;
        payload: ClassroomUpdateFormValues;
    },
): Promise<ClassroomDetail> {
    const response: ApiResponse<ApiClassroomDetail> = await apiClient(`/classrooms/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return mapClassroomDetail(response.data);
}

export async function deleteClassroom(apiClient: ApiClientType, id: string): Promise<void> {
    await apiClient(`/classrooms/${id}`, {
        method: 'DELETE',
    });
}

/**
 * Deletes multiple classrooms in bulk.
 *
 * @param apiClient - The API client instance.
 * @param ids - The array of classroom IDs to delete.
 */
export async function bulkDeleteClassrooms(apiClient: ApiClientType, ids: string[]): Promise<void> {
    await apiClient('/classrooms/bulk-delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
    });
}

export async function archiveClassroom(apiClient: ApiClientType, id: string): Promise<void> {
    await apiClient(`/classrooms/${id}/archive`, {
        method: 'PATCH',
    });
}

export async function unarchiveClassroom(apiClient: ApiClientType, id: string): Promise<void> {
    await apiClient(`/classrooms/${id}/unarchive`, {
        method: 'PATCH',
    });
}

export async function deleteClassroomStudent(
    apiClient: ApiClientType,
    {
        classroomId,
        studentId,
    }: {
        classroomId: string;
        studentId: string;
    },
): Promise<void> {
    await apiClient(`/classrooms/${classroomId}/students/${studentId}`, {
        method: 'DELETE',
    });
}

export async function getClassroomInstructors(
    apiClient: ApiClientType,
    classroomId: string,
): Promise<ClassroomInstructor[]> {
    const response: ApiResponse<ApiClassroomInstructor[]> = await apiClient(
        `/classrooms/${classroomId}/instructors`,
    );

    return response.data.map(mapClassroomInstructor);
}

export async function assignClassroomInstructor(
    apiClient: ApiClientType,
    {
        classroomId,
        instructorUserId,
    }: {
        classroomId: string;
        instructorUserId: string;
    },
): Promise<ClassroomInstructor[]> {
    const response: ApiResponse<ApiClassroomInstructor[]> = await apiClient(
        `/classrooms/${classroomId}/instructors`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                instructorUserId,
            }),
        },
    );

    return response.data.map(mapClassroomInstructor);
}

export async function removeClassroomInstructor(
    apiClient: ApiClientType,
    {
        classroomId,
        instructorUserId,
    }: {
        classroomId: string;
        instructorUserId: string;
    },
): Promise<void> {
    await apiClient(`/classrooms/${classroomId}/instructors/${instructorUserId}`, {
        method: 'DELETE',
    });
}
