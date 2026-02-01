export type AdminUserRole = "admin" | "proctor" | "instructor" | "student";

export interface AdminUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: AdminUserRole;
    status: "active" | "inactive" | "suspended" | "archived";
    lastActive: string;
    department?: string;
    studentNo?: string; // For students
}

export interface SystemStat {
    label: string;
    value: string | number;
    change?: number; // percentage change
    trend?: "up" | "down" | "neutral";
    description?: string;
}

export interface Activity {
    id: string;
    user: string;
    action: string;
    target: string;
    timestamp: string;
    type: "info" | "warning" | "error" | "success";
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
    autoSubmitTimeout: number;
}

export interface ProctorAssignment {
    id: string;
    proctorId: string;
    proctorName: string;
    examId: string;
    examName: string;
    assignedStudents: number;
    status: "active" | "completed" | "scheduled";
}

export interface AnalyticsReport {
    id: string;
    title: string;
    type: "completion" | "incident" | "performance";
    generatedAt: string;
    format: "pdf" | "csv" | "excel";
    status: "ready" | "generating" | "failed";
}

export interface AuditLog {
    id: string;
    actor: string;
    action: string;
    resourceType: string;
    resourceId: string;
    details: string;
    timestamp: string;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    targetAudience: ("all" | "students" | "proctors")[];
    status: "published" | "draft" | "scheduled";
    publishedAt?: string;
    author: string;
}
