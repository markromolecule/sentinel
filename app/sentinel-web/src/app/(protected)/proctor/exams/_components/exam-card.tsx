"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        <Card className="group relative overflow-hidden transition-all hover:shadow-md border-border/60">
            <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <Badge variant={
                        exam.status === "active" ? "default" :
                            exam.status === "draft" ? "secondary" : "outline"
                    } className="mb-2">
                        {exam.status}
                    </Badge>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div>
                    <h3 className="font-semibold tracking-tight text-foreground line-clamp-1" title={exam.title}>
                        {exam.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="truncate">{exam.subject}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{exam.duration}m</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{exam.studentsCount} students</span>
                    </div>
                    {exam.scheduledDate && (
                        <div className="flex items-center gap-1.5 col-span-2">
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>{new Date(exam.scheduledDate).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
