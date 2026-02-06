
export * from "@/constants";

// Student
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

// Enums
export type UserRole = "admin" | "proctor" | "student" | "instructor";
export type UserStatus = "active" | "inactive" | "suspended" | "archived";
export type TrendDirection = "up" | "down" | "neutral";
export type ActionType = "info" | "warning" | "error" | "success";
export type ExamDifficulty = "easy" | "medium" | "hard";
export type CheatingType = "gaze" | "audio" | "tab_switch" | "screenshot" | "screen_record" | "multiple";
export type ExamStatus = "available" | "completed" | "in-progress" | "upcoming" | "draft" | "scheduled" | "active";

// Core Entities
export interface User {
    id: string;
    email: string;
    role: UserRole;
    firstName?: string | null;
    lastName?: string | null;
    name?: string; // Virtual or concatenated name
    avatarUrl?: string | null;
    status: UserStatus;
    lastActive?: string;
    department?: string;
    institution?: string;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
}

export interface AdminUser extends User {
    role: "admin";
    studentNo?: string; // For students
}

// Student & Academic
export interface Student extends User {
    role: "student";
    userId: string;
    firstName: string;
    lastName: string;
    studentNo: string;
    section: string;
    term: string;
    subject: string;
    departmentId?: string | null;
    institutionId?: string | null;
    createdBy?: Date | string | null;
}

export interface Department {
    id: string;
    name: string;
    code?: string | null;
    createdAt?: Date | string | null;
    createdBy?: Date | string | null;
}

export interface Institution {
    id: string;
    name: string;
    code?: string | null;
    createdAt: Date | string;
    createdBy: string;
}

export interface Subject {
    id: string;
    title: string;
    code: string;
    section: string;
    department: string;
    createdAt: string | null;
    createdBy: string | null; // Name of proctor/creator
}

// Exam Configuration
export interface Exam {
    id: string;
    title: string;
    subject: string;
    description: string;
    duration: number; // in minutes
    questionCount: number;
    difficulty?: ExamDifficulty;
    scheduledDate?: string;
    passingScore: number;
    professor?: string;
    status: ExamStatus;
    // Proctor fields merged
    studentsCount?: number;
    assignedStudents?: number;
    createdAt?: string;
    createdBy?: string;
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
    cheatingType?: CheatingType; 
}

export interface ExamConfig {
    id: string;
    name: string;
    allowedDevices: string[];
    cameraRequired: boolean;
    micRequired: boolean;
    aiRules: {
        faceDetection: boolean;
        tabSwitching: boolean;
        gazeTracking: boolean;
        audioDetection: boolean;
    };
    maxReconnectAttempts: number;
    autoSubmitTimeout: number; // in minutes
}

// Proctoring
export interface ProctorAssignment {
    id: string;
    proctorId: string;
    proctorName: string;
    examId: string;
    examName: string;
    assignedStudents: number;
    status: "active" | "completed" | "scheduled";
}

export type ProctorInfo = {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    department: string;
    institution: string;
};

// Analytics & Reports
export interface AnalyticsReport {
    id: string;
    title: string;
    type: "completion" | "incident" | "performance";
    generatedAt: string;
    format: "pdf" | "csv" | "xlsx";
    status: "ready" | "generating" | "failed";
}

export interface SystemStat {
    label: string;
    value: string | number;
    change?: number; // percentage change
    trend?: TrendDirection;
    description?: string;
}

// System Logs
export interface AuditLog {
    id: string;
    actor: string; // User ID or Name
    action: string;
    resourceType: string;
    resourceId: string;
    details: string;
    timestamp: string;
}

export interface Activity {
    id: string;
    user: string;
    action: string;
    target: string;
    timestamp: string;
    type: ActionType;
}

// Announcements
export interface Announcement {
    id: string;
    title: string;
    content: string;
    targetAudience: ("all" | "students" | "proctors")[];
    status: "published" | "draft" | "scheduled";
    publishedAt?: string;
    author: string;
}