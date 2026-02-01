import { AdminUser, SystemStat, Activity, ExamConfig, ProctorAssignment, AnalyticsReport, AuditLog, Announcement } from "../_types";

export const MOCK_USERS: AdminUser[] = [
    {
        id: "USR-001",
        firstName: "Sarah",
        lastName: "Connor",
        email: "sarah.connor@sentinel.edu",
        role: "admin",
        status: "active",
        lastActive: "2 mins ago",
        department: "IT Security"
    },
    {
        id: "USR-002",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@sentinel.edu",
        role: "proctor",
        status: "active",
        lastActive: "15 mins ago",
        department: "Computer Science"
    },
    {
        id: "USR-003",
        firstName: "Emily",
        lastName: "Watson",
        email: "emily.watson@sentinel.edu",
        role: "instructor",
        status: "active",
        lastActive: "1 hour ago",
        department: "Engineering"
    },
    {
        id: "USR-004",
        firstName: "Michael",
        lastName: "Smith",
        email: "michael.smith@sentinel.edu",
        role: "proctor",
        status: "inactive",
        lastActive: "2 days ago",
        department: "Mathematics"
    },
    {
        id: "USR-005",
        firstName: "Jessica",
        lastName: "Brown",
        email: "jessica.brown@sentinel.edu",
        role: "instructor",
        status: "suspended",
        lastActive: "1 week ago",
        department: "Physics"
    },
    {
        id: "STU-001",
        firstName: "Alex",
        lastName: "Turner",
        email: "alex.turner@student.sentinel.edu",
        role: "student",
        status: "active",
        lastActive: "5 mins ago",
        studentNo: "2024-00123"
    },
    {
        id: "STU-002",
        firstName: "Jamie",
        lastName: "Cook",
        email: "jamie.cook@student.sentinel.edu",
        role: "student",
        status: "suspended",
        lastActive: "3 days ago",
        studentNo: "2024-00456"
    }
];

export const MOCK_SYSTEM_STATS: SystemStat[] = [
    {
        label: "Total Students",
        value: "2,543",
        change: 8.5,
        trend: "up",
        description: "Enrolled this term"
    },
    {
        label: "Active Proctors",
        value: "42",
        change: 0,
        trend: "neutral",
        description: "Currently online"
    },
    {
        label: "Ongoing Exams",
        value: "18",
        change: 12,
        trend: "up",
        description: "Live sessions"
    },
    {
        label: "Flagged Incidents",
        value: "156",
        change: -5,
        trend: "down",
        description: "In the last 24h"
    }
];

export const MOCK_RECENT_ACTIVITY: Activity[] = [
    {
        id: "ACT-001",
        user: "Sarah Connor",
        action: "updated global rules",
        target: "Exam Configuration",
        timestamp: "10 mins ago",
        type: "warning"
    },
    {
        id: "ACT-002",
        user: "John Doe",
        action: "suspended user",
        target: "Jamie Cook (Student)",
        timestamp: "45 mins ago",
        type: "error"
    },
    {
        id: "ACT-003",
        user: "System",
        action: "generated report",
        target: "Weekly Incident Summary",
        timestamp: "2 hours ago",
        type: "success"
    },
    {
        id: "ACT-004",
        user: "Emily Watson",
        action: "assigned proctor",
        target: "Michael Smith -> CS101",
        timestamp: "4 hours ago",
        type: "info"
    }
];

export const MOCK_EXAM_CONFIG: ExamConfig = {
    id: "CFG-GLOBAL",
    name: "Default Strict Policy",
    allowedDevices: ["desktop"],
    cameraRequired: true,
    micRequired: true,
    aiRules: {
        faceDetection: true,
        tabSwitching: true,
        gazeTracking: true,
        audioDetection: true,
    },
    maxReconnectAttempts: 3,
    autoSubmitTimeout: 5,
};

export const MOCK_PROCTOR_ASSIGNMENTS: ProctorAssignment[] = [
    {
        id: "ASN-001",
        proctorId: "USR-002",
        proctorName: "John Doe",
        examId: "EXM-101",
        examName: "Introduction to Computer Science",
        assignedStudents: 120,
        status: "active"
    },
    {
        id: "ASN-002",
        proctorId: "USR-004",
        proctorName: "Michael Smith",
        examId: "EXM-202",
        examName: "Advanced Calculus",
        assignedStudents: 45,
        status: "scheduled"
    }
];

export const MOCK_REPORTS: AnalyticsReport[] = [
    {
        id: "RPT-001",
        title: "Weekly Incident Summary",
        type: "incident",
        generatedAt: "2024-10-25 09:00:00",
        format: "pdf",
        status: "ready"
    },
    {
        id: "RPT-002",
        title: "Exam Completion Rates - Midterm",
        type: "completion",
        generatedAt: "2024-10-24 14:30:00",
        format: "csv",
        status: "ready"
    }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
    {
        id: "LOG-001",
        actor: "admin@sentinel.edu",
        action: "LOGIN_SUCCESS",
        resourceType: "Auth",
        resourceId: "N/A",
        details: "Successful login from 192.168.1.1",
        timestamp: "2024-10-26 08:00:01"
    },
    {
        id: "LOG-002",
        actor: "proctor@sentinel.edu",
        action: "EXAM_START",
        resourceType: "Exam",
        resourceId: "EXM-101",
        details: "Started monitoring session",
        timestamp: "2024-10-26 09:00:00"
    }
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
    {
        id: "ANC-001",
        title: "Scheduled Maintenance",
        content: "The system will be down for maintenance on Sunday at 2 AM UTC.",
        targetAudience: ["all"],
        status: "published",
        publishedAt: "2024-10-20 10:00:00",
        author: "IT Support"
    },
    {
        id: "ANC-002",
        title: "New AI Proctoring Rules",
        content: "Please review the updated guidelines for gaze tracking sensitivity.",
        targetAudience: ["proctors", "students"],
        status: "draft",
        author: "Compliance Team"
    }
];
export const MOCK_EXAM_COMPLETION_DATA = [
    { name: 'Mon', completed: 40, dropped: 2 },
    { name: 'Tue', completed: 30, dropped: 1 },
    { name: 'Wed', completed: 20, dropped: 3 },
    { name: 'Thu', completed: 27, dropped: 1 },
    { name: 'Fri', completed: 18, dropped: 4 },
    { name: 'Sat', completed: 23, dropped: 2 },
    { name: 'Sun', completed: 34, dropped: 1 },
];

export const MOCK_INCIDENT_TRENDS = [
    { name: 'Week 1', incidents: 12 },
    { name: 'Week 2', incidents: 19 },
    { name: 'Week 3', incidents: 3 },
    { name: 'Week 4', incidents: 5 },
    { name: 'Week 5', incidents: 2 },
];
