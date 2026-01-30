"use client";

import { Users } from "lucide-react";
import { MonitoringStatsProps } from "@/app/(protected)/proctor/exams/[id]/monitoring/_types";

export function MonitoringStats({ stats }: MonitoringStatsProps) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="font-semibold text-foreground">{stats.total}</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-muted-foreground">Active:</span>
                <span className="font-semibold text-foreground">{stats.active}</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm text-muted-foreground">Flagged:</span>
                <span className="font-semibold text-foreground">{stats.flagged}</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-muted-foreground">Submitted:</span>
                <span className="font-semibold text-foreground">{stats.submitted}</span>
            </div>
        </div>
    );
}
