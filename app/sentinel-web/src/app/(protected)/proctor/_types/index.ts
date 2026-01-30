// Proctor types for the portal

export type ProctorInfo = {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    department: string;
    institution: string;
};

export type Student = {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    section: string;
    subject: string;
    term: string;
    email?: string;
    enrolledAt: string;
};

export type ProctorExam = {
    id: string;
    title: string;
    description: string;
    subject: string;
    duration: number;
    questionsCount: number;
    passingScore: number;
    scheduledDate?: string;
    status: "draft" | "active" | "completed";
    studentsCount: number;
    createdAt: string;
};

export type EnrollmentFileColumn =
    | "student_no"
    | "first_name"
    | "last_name"
    | "section"
    | "subject"
    | "term";

export type EnrollmentFileResult = {
    success: boolean;
    data: Omit<Student, "id" | "enrolledAt">[];
    errors: string[];
    detectedColumns: EnrollmentFileColumn[];
};

export type NavigationItem = {
    label: string;
    href: string;
    icon: string;
};
