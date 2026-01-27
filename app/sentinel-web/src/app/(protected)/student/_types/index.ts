// Student-related TypeScript types

export type ExamStatus = "available" | "completed" | "in-progress" | "upcoming";

export type ExamDifficulty = "easy" | "medium" | "hard";

export interface StudentInfo {
    id: string;
    studentNumber: string;
    name: string;
    email: string;
    avatar?: string;
    enrollmentDate: string;
}

export interface Exam {
    id: string;
    title: string;
    subject: string;
    description: string;
    duration: number; // in minutes
    questionsCount: number;
    status: ExamStatus;
    difficulty: ExamDifficulty;
    scheduledDate?: string;
    passingScore: number;
    professor: string;
}

export interface ExamHistory {
    id: string;
    examId: string;
    examTitle: string;
    subject: string;
    dateTaken: string;
    score: number;
    totalScore: number;
    percentage: number;
    status: "passed" | "failed";
    timeSpent: number; // in minutes
    cheated?: boolean;
    cheatingType?: "gaze" | "audio" | "tab_switch" | "screenshot" | "screen_record" | "multiple";
}

export interface DashboardStats {
    totalExams: number;
    completedExams: number;
    pendingExams: number;
    averageScore: number;
}

export interface NavigationItem {
    label: string;
    href: string;
    icon: string;
}
