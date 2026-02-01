"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Mail, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudentsTableProps } from "@/app/(protected)/proctor/students/_types";

export function StudentsTable({ students }: StudentsTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[250px] pl-4">Student</TableHead>
                        <TableHead>Student No.</TableHead>
                        <TableHead className="hidden md:table-cell">Section</TableHead>
                        <TableHead className="hidden lg:table-cell">Subject</TableHead>
                        <TableHead className="hidden lg:table-cell">Term</TableHead>
                        <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {students.map((student) => (
                        <TableRow key={student.id}>
                            <TableCell className="pl-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {student.firstName[0]}
                                        {student.lastName[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {student.firstName} {student.lastName}
                                        </p>
                                        {student.email && (
                                            <p className="text-xs text-muted-foreground">
                                                {student.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{student.studentNo}</TableCell>
                            <TableCell className="hidden md:table-cell">{student.section}</TableCell>
                            <TableCell className="hidden lg:table-cell">{student.subject}</TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">{student.term}</TableCell>
                            <TableCell className="text-right pr-4">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem className="cursor-pointer">
                                            <Mail className="w-4 h-4 mr-2" />
                                            Send Message
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Remove
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
