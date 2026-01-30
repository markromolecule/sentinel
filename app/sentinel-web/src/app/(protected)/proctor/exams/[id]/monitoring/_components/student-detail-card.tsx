"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Camera, Maximize2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { StudentSession } from "../_types";
import { statusConfig } from "../_constants";

export function StudentDetailCard({ student }: { student: StudentSession }) {
    const status = statusConfig[student.status];

    return (
        <Card className="p-4 border-border/50">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Student Details</h3>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                            <Camera className="w-4 h-4 mr-2" />
                            Take Snapshot
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Maximize2 className="w-4 h-4 mr-2" />
                            View Fullscreen
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] flex items-center justify-center text-white text-lg font-bold">
                    {student.firstName[0]}
                    {student.lastName[0]}
                </div>
                <div>
                    <p className="font-semibold text-foreground text-lg">
                        {student.firstName} {student.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">{student.studentNo}</p>
                </div>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{student.progress}%</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Activity</span>
                    <span className="font-medium">{student.lastActivity}</span>
                </div>
            </div>
        </Card>
    );
}
