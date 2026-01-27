// Student-related TypeScript types
export type ExamStatus = "available" | "completed" | "in-progress" | "upcoming";

// Exam difficulty levels
export type ExamDifficulty = "easy" | "medium" | "hard";

// Student information
export interface StudentInfo {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    name: string; // Full name for backward compatibility or convenience
    email: string;
    department: string;
    institution: string;
    avatar?: string;
    enrollmentDate: string;
}

// Exam information
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

// Exam history
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

// Dashboard statistics
export interface DashboardStats {
    totalExams: number;
    completedExams: number;
    pendingExams: number;
    averageScore: number;
}

// Exam list    
export interface ExamListProps {
    exams: Exam[];
    emptyMessage: string;
}

// Exam pagination
export interface ExamPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

// Exam search
export interface ExamSearchProps {
    value: string;
    onChange: (value: string) => void;
}

// Exam tabs
export interface ExamTabsProps {
    activeTab: "available" | "history";
    onTabChange: (tab: "available" | "history") => void;
}

// Exam sidebar
export interface ExamSidebarProps {
    exam: Exam;
}

// Exam not found
export interface ExamNotFoundProps {
    onBack: () => void;
}

// Exam info bar
export interface ExamInfoBarProps {
    exam: Exam;
}

// Exam description
export interface ExamDescriptionProps {
    description: string;
}

// Exam banner
export interface ExamBannerProps {
    exam: Exam;
}

// Exam card
export interface ExamCardProps {
    exam: Exam;
}

// Navigation item
export interface NavigationItem {
    label: string;
    href: string;
    icon: string;
}
