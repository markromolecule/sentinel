export type ClassroomScopeSummary = {
    subjectLabel: string;
    sectionLabel: string;
    termLabel: string;
    departmentLabel: string | null;
    courseLabel: string | null;
    yearLevelLabel: string | null;
};

export type ClassroomStudent = {
    studentId: string;
    userId: string | null;
    studentNumber: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    departmentId: string | null;
    departmentCode: string | null;
    departmentName: string | null;
    courseId: string | null;
    courseCode: string | null;
    courseTitle: string | null;
    enrolledAt: string | null;
};

export type ClassroomInstructor = {
    userId: string;
    name: string;
    isHead: boolean;
    assignedAt: string | null;
    assignedByUserId: string | null;
    assignedByName: string | null;
};

export type ClassroomSummary = {
    id: string;
    className: string | null;
    isConfigured: boolean;
    subjectOfferingId: string | null;
    subjectId: string | null;
    subjectCode: string | null;
    subjectTitle: string | null;
    sectionId: string | null;
    sectionName: string | null;
    termId: string | null;
    termAcademicYear: string | null;
    termSemester: string | null;
    departmentId: string | null;
    departmentCode: string | null;
    departmentName: string | null;
    courseId: string | null;
    courseCode: string | null;
    courseTitle: string | null;
    yearLevel: number | null;
    institutionId: string | null;
    studentCount: number;
    examCount: number;
    createdAt: string | null;
    updatedAt: string | null;
    archivedAt?: string | null;
    updatedBy: string | null;
    updatedByName: string | null;
    canManage: boolean;
    instructors: string[];
    scopeSummary: ClassroomScopeSummary;
};

export type ClassroomDetail = ClassroomSummary & {
    students: ClassroomStudent[];
};
