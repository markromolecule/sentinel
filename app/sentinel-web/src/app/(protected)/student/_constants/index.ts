import type { StudentInfo, Exam, ExamHistory, DashboardStats, NavigationItem } from "../_types";

// Mock student information
export const MOCK_STUDENT: StudentInfo = {
    id: "1",
    studentNumber: "2024-00123",
    firstName: "Juan",
    lastName: "Dela Cruz",
    name: "Juan Dela Cruz",
    email: "juan.delacruz@student.edu",
    department: "College of Computer Studies",
    institution: "NU DASMARIÑAS",
    enrollmentDate: "2024-01-15",
};

// Mock exams data
export const MOCK_EXAMS: Exam[] = [
    {
        id: "1",
        title: "Mathematics Final Exam",
        subject: "Mathematics",
        description: "Comprehensive final exam covering algebra, geometry, and calculus",
        duration: 120,
        questionsCount: 50,
        status: "available",
        difficulty: "hard",
        scheduledDate: "2026-02-01",
        passingScore: 70,
        professor: "Dr. Alan Turing",
    },
    {
        id: "2",
        title: "English Literature Quiz",
        subject: "English",
        description: "Short quiz on Shakespeare's works",
        duration: 45,
        questionsCount: 20,
        status: "upcoming",
        difficulty: "medium",
        scheduledDate: "2026-01-28",
        passingScore: 60,
        professor: "Prof. J.K. Rowling",
    },
    {
        id: "3",
        title: "Science Practical Exam",
        subject: "Science",
        description: "Laboratory practical examination",
        duration: 90,
        questionsCount: 30,
        status: "available",
        difficulty: "medium",
        passingScore: 65,
        professor: "Dr. Marie Curie",
    },
    {
        id: "4",
        title: "History Midterm",
        subject: "History",
        description: "World History midterm examination",
        duration: 60,
        questionsCount: 40,
        status: "upcoming",
        difficulty: "easy",
        scheduledDate: "2026-02-05",
        passingScore: 60,
        professor: "Prof. Yuval Noah Harari",
    },
    {
        id: "5",
        title: "Computer Science Quiz",
        subject: "Computer Science",
        description: "Programming fundamentals quiz",
        duration: 30,
        questionsCount: 15,
        status: "available",
        difficulty: "easy",
        passingScore: 70,
        professor: "Dr. Ada Lovelace",
    },
];

// Mock exam history
export const MOCK_EXAM_HISTORY: ExamHistory[] = [
    {
        id: "1",
        examId: "101",
        examTitle: "Physics Midterm Exam",
        subject: "Physics",
        dateTaken: "2026-01-15",
        score: 85,
        totalScore: 100,
        percentage: 85,
        status: "passed",
        timeSpent: 75,
    },
    {
        id: "2",
        examId: "102",
        examTitle: "Chemistry Quiz",
        subject: "Chemistry",
        dateTaken: "2026-01-10",
        score: 92,
        totalScore: 100,
        percentage: 92,
        status: "passed",
        timeSpent: 25,
    },
    {
        id: "3",
        examId: "103",
        examTitle: "Biology Lab Exam",
        subject: "Biology",
        dateTaken: "2026-01-05",
        score: 78,
        totalScore: 100,
        percentage: 78,
        status: "passed",
        timeSpent: 55,
    },
    {
        id: "4",
        examId: "104",
        examTitle: "Geography Test",
        subject: "Geography",
        dateTaken: "2025-12-20",
        score: 0,
        totalScore: 100,
        percentage: 0,
        status: "failed",
        timeSpent: 40,
        cheated: true,
        cheatingType: "tab_switch"
    },
    {
        id: "5",
        examId: "105",
        examTitle: "Filipino Exam",
        subject: "Filipino",
        dateTaken: "2025-12-15",
        score: 58,
        totalScore: 100,
        percentage: 58,
        status: "failed",
        timeSpent: 50,
        cheated: true,
        cheatingType: "screen_record"
    },
    {
        id: "6",
        examId: "106",
        examTitle: "Mobile Dev Quiz",
        subject: "Computer Science",
        dateTaken: "2025-11-30",
        score: 45,
        totalScore: 50,
        percentage: 90,
        status: "failed",
        timeSpent: 15,
        cheated: true,
        cheatingType: "screenshot"
    }
];

// Mock dashboard statistics
export const MOCK_DASHBOARD_STATS: DashboardStats = {
    totalExams: 12,
    completedExams: 5,
    pendingExams: 7,
    averageScore: 75.6,
};

// Navigation items for sidebar
export const STUDENT_NAVIGATION: NavigationItem[] = [

    {
        label: "Exams",
        href: "/student/exam",
        icon: "FileText",
    },
    {
        label: "History",
        href: "/student/history",
        icon: "Clock",
    },
    {
        label: "Settings",
        href: "/student/setting",
        icon: "Settings",
    },
];
