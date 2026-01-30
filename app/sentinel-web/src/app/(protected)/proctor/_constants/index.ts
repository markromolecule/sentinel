import type { ProctorInfo, Student, ProctorExam, NavigationItem } from "../_types";

// Mock proctor information
export const MOCK_PROCTOR: ProctorInfo = {
    id: "1",
    firstName: "Maria",
    lastName: "Santos",
    name: "Maria Santos",
    email: "maria.santos@university.edu",
    department: "College of Computer Studies",
    institution: "NU DASMARIÑAS",
};

// Mock students data
export const MOCK_STUDENTS: Student[] = [
    {
        id: "1",
        studentNo: "2024-00123",
        firstName: "Juan",
        lastName: "Dela Cruz",
        section: "BSCS-3A",
        subject: "Data Structures",
        term: "1st Semester 2025-2026",
        email: "juan.delacruz@student.edu",
        enrolledAt: "2026-01-15",
    },
    {
        id: "2",
        studentNo: "2024-00124",
        firstName: "Maria",
        lastName: "Garcia",
        section: "BSCS-3A",
        subject: "Data Structures",
        term: "1st Semester 2025-2026",
        email: "maria.garcia@student.edu",
        enrolledAt: "2026-01-15",
    },
    {
        id: "3",
        studentNo: "2024-00125",
        firstName: "Pedro",
        lastName: "Reyes",
        section: "BSIT-2B",
        subject: "Web Development",
        term: "1st Semester 2025-2026",
        email: "pedro.reyes@student.edu",
        enrolledAt: "2026-01-16",
    },
];

// Mock exams data
export const MOCK_PROCTOR_EXAMS: ProctorExam[] = [
    {
        id: "1",
        title: "Data Structures Midterm",
        description: "Comprehensive midterm examination covering arrays, linked lists, and trees",
        subject: "Data Structures",
        duration: 120,
        questionsCount: 50,
        passingScore: 70,
        scheduledDate: "2026-02-01",
        status: "active",
        studentsCount: 45,
        createdAt: "2026-01-20",
    },
    {
        id: "2",
        title: "Web Development Quiz 1",
        description: "Quiz on HTML and CSS fundamentals",
        subject: "Web Development",
        duration: 45,
        questionsCount: 20,
        passingScore: 60,
        status: "draft",
        studentsCount: 0,
        createdAt: "2026-01-25",
    },
    {
        id: "3",
        title: "Programming Fundamentals Final",
        description: "Final examination for programming fundamentals course",
        subject: "Programming Fundamentals",
        duration: 180,
        questionsCount: 75,
        passingScore: 65,
        scheduledDate: "2026-01-10",
        status: "completed",
        studentsCount: 52,
        createdAt: "2026-01-05",
    },
];

// Navigation items for proctor sidebar
export const PROCTOR_NAV_ITEMS: NavigationItem[] = [
    {
        label: "Dashboard",
        href: "/proctor/dashboard",
        icon: "LayoutDashboard",
    },
    {
        label: "Students",
        href: "/proctor/students",
        icon: "Users",
    },
    {
        label: "Exams",
        href: "/proctor/exams",
        icon: "FileText",
    },
    {
        label: "Messages",
        href: "/proctor/messages",
        icon: "MessageSquare",
    },
];

// Dashboard statistics
export const MOCK_DASHBOARD_STATS = {
    totalStudents: 142,
    activeExams: 3,
    examsToday: 1,
    unreadMessages: 5,
};
