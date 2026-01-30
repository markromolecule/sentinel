"use client";

import {
    Users,
    FileText,
    CalendarDays,
    MessageSquare,
} from "lucide-react";
import { MOCK_DASHBOARD_STATS, MOCK_PROCTOR_EXAMS, MOCK_STUDENTS } from "@/app/(protected)/proctor/_constants";
import { DashboardStats } from "@/app/(protected)/proctor/dashboard/_components/dashboard-stats";
import { QuickActions } from "@/app/(protected)/proctor/dashboard/_components/quick-actions";
import { PerformanceOverview } from "@/app/(protected)/proctor/dashboard/_components/performance-overview";
import { RecentExams } from "@/app/(protected)/proctor/dashboard/_components/recent-exams";
import { RecentStudents } from "@/app/(protected)/proctor/dashboard/_components/recent-students";

export default function ProctorDashboardPage() {
    const recentExams = MOCK_PROCTOR_EXAMS.slice(0, 3);
    const recentStudents = MOCK_STUDENTS.slice(0, 5);

    const stats = [
        {
            label: "Total Students",
            value: MOCK_DASHBOARD_STATS.totalStudents,
            icon: Users,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            href: "/proctor/students",
        },
        {
            label: "Active Exams",
            value: MOCK_DASHBOARD_STATS.activeExams,
            icon: FileText,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
            href: "/proctor/exams",
        },
        {
            label: "Exams Today",
            value: MOCK_DASHBOARD_STATS.examsToday,
            icon: CalendarDays,
            color: "text-amber-600",
            bgColor: "bg-amber-50",
            href: "/proctor/exams",
        },
        {
            label: "Unread Messages",
            value: MOCK_DASHBOARD_STATS.unreadMessages,
            icon: MessageSquare,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
            href: "/proctor/messages",
        },
    ];

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back! Here&apos;s an overview of your proctoring activities.
                </p>
            </div>

            {/* Stats Grid */}
            <DashboardStats stats={stats} />

            {/* Quick Actions & Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <QuickActions />
                <PerformanceOverview />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentExams exams={recentExams} />
                <RecentStudents students={recentStudents} />
            </div>
        </div>
    );
}
