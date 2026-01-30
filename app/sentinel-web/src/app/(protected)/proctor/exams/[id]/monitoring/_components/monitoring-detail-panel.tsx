"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Camera } from "lucide-react";
import { MonitoringDetailPanelProps } from "@/app/(protected)/proctor/exams/[id]/monitoring/_types";
import { StudentDetailCard } from "@/app/(protected)/proctor/exams/[id]/monitoring/_components/student-detail-card";
import { FlagEventList } from "@/app/(protected)/proctor/exams/[id]/monitoring/_components/flag-event-list";

export function MonitoringDetailPanel({ student }: MonitoringDetailPanelProps) {
    if (!student) {
        return (
            <Card className="p-8 border-border/50">
                <div className="text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">Select a Student</h3>
                    <p className="text-sm text-muted-foreground">
                        Click on a student card to view their details and flagging events
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Student Info */}
            <StudentDetailCard student={student} />

            {/* Snapshot Preview Placeholder */}
            <Card className="p-4 border-border/50">
                <h3 className="font-semibold text-foreground mb-3">Live Preview</h3>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border border-dashed border-border">
                    <div className="text-center">
                        <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Webcam preview</p>
                        <p className="text-xs text-muted-foreground">(Coming soon)</p>
                    </div>
                </div>
                <Button className="w-full mt-3 bg-[#323d8f] hover:bg-[#323d8f]/90" size="sm">
                    <Camera className="w-4 h-4 mr-2" />
                    Take Snapshot
                </Button>
            </Card>

            {/* Flagging Events */}
            <Card className="p-4 border-border/50">
                <h3 className="font-semibold text-foreground mb-3">
                    Flagging Events ({student.flags.length})
                </h3>
                <FlagEventList flags={student.flags} />
            </Card>
        </div>
    );
}
