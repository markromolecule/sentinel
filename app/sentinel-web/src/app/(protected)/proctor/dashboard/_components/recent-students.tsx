"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { RecentStudentsProps } from "@/app/(protected)/proctor/dashboard/_types";

export function RecentStudents({ students }: RecentStudentsProps) {
    return (
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
                {students.map((student) => (
                    <div
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] flex items-center justify-center text-white text-xs font-bold">
                                {student.firstName[0]}
                                {student.lastName[0]}
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
    );
}
