"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText } from "lucide-react";
import { RecentExamsProps } from "@/app/(protected)/proctor/dashboard/_types";

export function RecentExams({ exams }: RecentExamsProps) {
    return (
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
                {exams.map((exam) => (
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
    );
}
