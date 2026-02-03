import {
    User as SharedUser,
    AdminUser as SharedAdminUser, // Strict admin
    UserRole,
    SystemStat,
    Activity,
    ExamConfig,
    ProctorAssignment,
    AnalyticsReport,
    AuditLog,
    Announcement
} from "@sentinel/shared/src/types";

// Re-export shared types
export type {
    SystemStat,
    Activity,
    ExamConfig,
    ProctorAssignment,
    AnalyticsReport,
    AuditLog,
    Announcement,
    UserRole
};

// Admin User Roles
export type AdminUserRole = UserRole;

// Admin User Definition
// In local context, "AdminUser" referred to any user managed by the admin.
// SharedUser now includes status, lastActive, etc. so it's the correct match.
export interface AdminUser extends SharedUser {
    // Legacy mapping or ensuring property existence
    // SharedUser has id, firstName, lastName, email, role, status, lastActive, department, studentNo (optional)
    // Local AdminUser exact match:
    // id, firstName, lastName, email, role, status, lastActive, department, studentNo
    // SharedUser optional fields: firstName, lastName, lastActive.
    // Local requires them.
    // We can enforce them if needed, or rely on TS to warn.
    // For now, extensions to enforce required fields IF the UI strictly needs them.
    firstName: string;
    lastName: string;
    lastActive: string;
    studentNo?: string;
}
