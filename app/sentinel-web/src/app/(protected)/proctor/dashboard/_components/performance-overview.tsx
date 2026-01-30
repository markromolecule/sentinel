"use client";

import { Card } from "@/components/ui/card";
import { TrendingUp, Clock } from "lucide-react";

export function PerformanceOverview() {
    return (
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
    );
}
