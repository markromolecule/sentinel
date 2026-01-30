"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { MonitoringHeaderProps } from "@/app/(protected)/proctor/exams/[id]/monitoring/_types";

export function MonitoringHeader({ examTitle, examSubject }: MonitoringHeaderProps) {
    return (
        <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
                <Link href="/proctor/exams">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
            </Button>
            <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">{examTitle}</h1>
                <p className="text-muted-foreground text-sm">Live Monitoring • {examSubject}</p>
            </div>
            <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
            </Button>
        </div>
    );
}
