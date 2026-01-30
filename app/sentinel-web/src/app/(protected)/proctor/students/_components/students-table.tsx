"use client";

import { Card } from "@/components/ui/card";
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
        <Card className="border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                                Student
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                                Student No.
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                                Section
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                                Subject
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                                Term
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {students.map((student) => (
                            <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                                <td className="py-3 px-4">
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
                                </td>
                                <td className="py-3 px-4">
                                    <span className="text-sm text-foreground font-mono">
                                        {student.studentNo}
                                    </span>
                                </td>
                                <td className="py-3 px-4 hidden md:table-cell">
                                    <span className="text-sm text-foreground">
                                        {student.section}
                                    </span>
                                </td>
                                <td className="py-3 px-4 hidden lg:table-cell">
                                    <span className="text-sm text-foreground">
                                        {student.subject}
                                    </span>
                                </td>
                                <td className="py-3 px-4 hidden lg:table-cell">
                                    <span className="text-sm text-muted-foreground">
                                        {student.term}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right">
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
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
