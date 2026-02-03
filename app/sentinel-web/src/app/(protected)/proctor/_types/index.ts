import {
    ProctorInfo,
    Student as SharedStudent,
    Exam as SharedExam, // Unified Exam
    User
} from "@sentinel/shared/src/types";

export type { ProctorInfo };

// Student projection for Proctor view
export interface Student extends SharedStudent {
    /** @deprecated Use createdAt */
    enrolledAt?: string;
}

// Proctor Exam
// Local ProctorExam matches Shared Exam mostly.
export interface ProctorExam extends SharedExam {
    // Local requires studentsCount
    studentsCount: number;
    // Local requires createdBy
    createdBy?: string; // Shared has optional
    // Local createdAt string vs Shared ??
    // Shared Exam doesn't have createdAt?
    // Let's check Shared Exam definition.
    // Shared Exam definition:
    // ... status, studentsCount, assignedStudents.
    // It is missing createdAt!
    // I need to add createdAt to Shared Exam.
    createdAt: string; 
}

export type EnrollmentFileColumn =
    | "student_no"
    | "first_name"
    | "last_name"
    | "section"
    | "subject"
    | "term";

export type EnrollmentFileResult = {
    success: boolean;
    data: Omit<Student, "id" | "enrolledAt" | "userId" | "role" | "studentNo"> & { studentNo: string }[]; // Adjusting for specific upload shape
    errors: string[];
    detectedColumns: EnrollmentFileColumn[];
};

export type NavigationItem = {
    label: string;
    href: string;
    icon: string;
};
