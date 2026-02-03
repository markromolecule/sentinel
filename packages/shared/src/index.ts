// Student
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

// Enums
export type UserRole = "admin" | "proctor" | "student";
export type UserStatus = "active" | "inactive" | "suspended" | "archived";
export type TrendDirection = "up" | "down" | "neutral";
export type ActionType = "info" | "warning" | "error" | "success";

// Core Entities
export interface User {
    id: string;
    email: string;
    role: UserRole;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    created_at?: Date | string | null;
    updated_at?: Date | string | null;
}

export interface AdminUser extends User {
    status: UserStatus;
    lastActive?: string;
    department?: string;
    studentNo?: string; // For students
}

// Student & Academic
export interface Student {
    student_id: string;
    user_id: string;
    student_number: string;
    department_id?: string | null;
    institution_id?: string | null;
}

export interface Department {
    department_id: string;
    department_name: string;
    department_code?: string | null;
}

export interface Institution {
    id: string;
    name: string;
    code?: string | null;
}

// Exam Configuration
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

// Analytics & Reports
export interface AnalyticsReport {
    id: string;
    title: string;
    type: "completion" | "incident" | "performance";
    generatedAt: string;
    format: "pdf" | "csv" | "xlxs";
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