"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle } from "lucide-react";
import { FlagEventListProps } from "@/app/(protected)/proctor/exams/[id]/monitoring/_types";
import { flagIcons, flagLabels, severityColors } from "@/app/(protected)/proctor/exams/[id]/monitoring/_constants";

export function FlagEventList({ flags }: FlagEventListProps) {
    return (
        <>
            {flags.length > 0 ? (
                <div className="space-y-3">
                    {flags.map((flag) => (
                        <div
                            key={flag.id}
                            className={cn("p-3 rounded-lg border", severityColors[flag.severity])}
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-md bg-white/50">
                                    {flagIcons[flag.type]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-sm">
                                            {flagLabels[flag.type]}
                                        </span>
                                        <span className="text-xs opacity-75">
                                            {new Date(flag.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-sm opacity-90">{flag.description}</p>
                                    {flag.snapshotUrl && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2 h-7 text-xs bg-white/50"
                                        >
                                            <Eye className="w-3 h-3 mr-1" />
                                            View Snapshot
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No flagging events</p>
                </div>
            )}
        </>
    );
}
