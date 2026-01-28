"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    FileText,
    CalendarDays,
    MessageSquare,
    Plus,
    ArrowRight,
    Clock,
    TrendingUp,
} from "lucide-react";
import { MOCK_DASHBOARD_STATS, MOCK_PROCTOR_EXAMS, MOCK_STUDENTS } from "@/app/(protected)/proctor/_constants";
import Link from "next/link";

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

export default function ProctorDashboardPage() {
    const recentExams = MOCK_PROCTOR_EXAMS.slice(0, 3);
    const recentStudents = MOCK_STUDENTS.slice(0, 5);

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Link key={stat.label} href={stat.href}>
                        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-border/50">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions Card */}
                <Card className="p-6 border-border/50">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Button asChild className="h-auto py-4 flex-col gap-2 bg-[#323d8f] hover:bg-[#323d8f]/90">
                            <Link href="/proctor/exams">
                                <Plus className="w-5 h-5" />
                                <span>Create Exam</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                            <Link href="/proctor/students">
                                <Users className="w-5 h-5" />
                                <span>Add Students</span>
                            </Link>
                        </Button>
                    </div>
                </Card>

                {/* Performance Overview */}
                <Card className="p-6 border-border/50">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Performance Overview</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-50">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                </div>
                                <span className="text-sm text-muted-foreground">Average Pass Rate</span>
                            </div>
                            <span className="text-lg font-semibold text-foreground">78.5%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-50">
                                    <Clock className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="text-sm text-muted-foreground">Avg. Completion Time</span>
                            </div>
                            <span className="text-lg font-semibold text-foreground">45 min</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Exams */}
                <Card className="p-6 border-border/50">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-foreground">Recent Exams</h2>
                        <Button asChild variant="ghost" size="sm" className="text-[#323d8f]">
                            <Link href="/proctor/exams">
                                View All
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Link>
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {recentExams.map((exam) => (
                            <div
                                key={exam.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-background">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{exam.title}</p>
                                        <p className="text-xs text-muted-foreground">{exam.subject}</p>
                                    </div>
                                </div>
                                <span
                                    className={`text-xs font-medium px-2 py-1 rounded-full ${exam.status === "active"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : exam.status === "draft"
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-gray-100 text-gray-700"
                                        }`}
                                >
                                    {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Recent Students */}
                <Card className="p-6 border-border/50">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-foreground">Recent Students</h2>
                        <Button asChild variant="ghost" size="sm" className="text-[#323d8f]">
                            <Link href="/proctor/students">
                                View All
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Link>
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {recentStudents.map((student) => (
                            <div
                                key={student.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] flex items-center justify-center text-white text-xs font-bold">
                                        {student.firstName[0]}{student.lastName[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {student.firstName} {student.lastName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{student.studentNo}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground">{student.section}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
