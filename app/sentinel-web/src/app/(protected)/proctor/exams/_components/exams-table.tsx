"use client";

import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, FileText, Clock, Users, CalendarDays, Eye, Pencil, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExamsGridProps } from "../_types"; // Reuse props for now as it's just { exams: ProctorExam[] }

export function ExamsTable({ exams }: ExamsGridProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="pl-4">Exam Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {exams.map((exam) => (
                        <TableRow key={exam.id}>
                            <TableCell className="font-medium pl-4">
                                <div className="flex flex-col">
                                    <span>{exam.title}</span>
                                    {exam.description && (
                                        <span className="text-xs text-muted-foreground line-clamp-1">
                                            {exam.description}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <span>{exam.subject}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                {exam.scheduledDate ? (
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                        <span>{new Date(exam.scheduledDate).toLocaleDateString()}</span>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground italic">Unscheduled</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span>{exam.duration}m</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span>{exam.studentsCount}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={
                                    exam.status === "active"
                                        ? "default" // or a structured green variant if available
                                        : exam.status === "draft"
                                            ? "secondary" // or amber
                                            : "outline"
                                }>
                                    {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-4">
                                <div className="flex items-center justify-end gap-2">
                                    {exam.status === "active" && (
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="h-8 border-emerald-500/50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                        >
                                            <Link href={`/proctor/exams/${exam.id}/monitoring`}>
                                                <span className="relative flex h-2 w-2 mr-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                Monitor
                                            </Link>
                                        </Button>
                                    )}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
