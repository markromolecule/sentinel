import {
    Exam,
    ExamStatus,
    ExamDifficulty,
    ExamHistory,
    Student as SharedStudent,
    User,
    SystemStat
} from "@sentinel/shared/src/types";

// Re-export shared types
export type { Exam, ExamStatus, ExamDifficulty, ExamHistory };

// Student information
// Extending SharedStudent to maintain access to core fields
// mapping legacy fields for backward compatibility
export interface StudentInfo extends SharedStudent {
    // Legacy support
    /** @deprecated Use studentNo from SharedStudent */
    studentNumber?: string;
    /** @deprecated Use departmentId or fetch relationship */
    department?: string;
    /** @deprecated Use institutionId or fetch relationship */
    institution?: string;
    /** @deprecated Use avatarUrl from User */
    avatar?: string;
    /** @deprecated Use createdAt from User */
    enrollmentDate?: string;
}

// Dashboard statistics
// Keeping this specific shape as it matches the API response likely
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
