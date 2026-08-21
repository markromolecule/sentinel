export type RawClassroomRecord = {
    class_group_id: string;
    class_name: string | null;
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
    created_at: string | Date | null;
    updated_at: string | Date | null;
    archived_at: string | Date | null;
    updated_by: string | null;
    updated_by_name: string | null;
    can_manage: boolean;
    instructors: string[];
};

export type RawClassroomStudentRecord = {
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
    enrolled_at: string | Date | null;
    avatar_url: string | null;
    is_claimed?: boolean;
    claim_status?: 'CLAIMED' | 'UNCLAIMED';
};

export type ClassroomStudentAccessScope = ClassroomAccessScope & {
    studentId: string;
};

export type ClassroomScope = {
    userId: string;
    institutionId: string;
};

export type ClassroomAccessScope = ClassroomScope & {
    classGroupId: string;
    userRole?: string;
};
