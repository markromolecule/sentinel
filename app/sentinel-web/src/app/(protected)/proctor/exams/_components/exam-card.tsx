"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    FileText,
    Clock,
    Users,
    CalendarDays,
    MoreHorizontal,
    Pencil,
    Trash2,
    Eye,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ExamCardProps } from "../_types";

export function ExamCard({ exam }: ExamCardProps) {
    return (
        <Card className="p-5 border-border/50 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <span
                        className={cn(
                            "text-xs font-medium px-2 py-1 rounded-full",
                            exam.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : exam.status === "draft"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-gray-100 text-gray-700"
                        )}
                    >
                        {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                    </span>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-1">
                {exam.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {exam.description}
            </p>

            <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{exam.subject}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{exam.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{exam.studentsCount} students</span>
                </div>
                {exam.scheduledDate && (
                    <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        <span>{new Date(exam.scheduledDate).toLocaleDateString()}</span>
                    </div>
                )}
            </div>

            {/* Monitor Button for Active Exams */}
            {exam.status === "active" && (
                <Button
                    asChild
                    className="w-full mt-4 bg-[#323d8f] hover:bg-[#323d8f]/90"
                    size="sm"
                >
                    <Link href={`/proctor/exams/${exam.id}/monitoring`}>
                        <span className="relative flex h-2 w-2 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Live Monitor
                    </Link>
                </Button>
            )}
        </Card>
    );
}
