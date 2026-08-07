'use client';

import { StudentSession } from '@sentinel/shared/types';
import { Card, Badge, Separator, Avatar, AvatarImage, AvatarFallback } from '@sentinel/ui';
import { Activity, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@sentinel/ui';
import { statusConfig } from '@sentinel/shared/constants';

interface StudentIdentityCardProps {
    student: StudentSession;
}

export function StudentIdentityCard({ student }: StudentIdentityCardProps) {
    const status = statusConfig[student.status];
    const incidentCount = student.incidentCount ?? student.flags?.length ?? 0;
    const sessionTime = student.timeSpentMinutes
        ? `${Math.floor(student.timeSpentMinutes / 60)
              .toString()
              .padStart(2, '0')}:${(student.timeSpentMinutes % 60).toString().padStart(2, '0')}:00`
        : '00:00:00';

    return (
        <Card className="border-border/50 bg-card gap-0 overflow-hidden rounded-xl p-0 shadow-sm">
            <div className="h-1 bg-[#323d8f]" />
            <div className="p-5">
                <div className="mb-5 flex items-center gap-4">
                    <Avatar className="ring-border/20 h-12 w-12 border-2 border-white shadow-sm ring-1">
                        <AvatarImage src={student.avatarUrl || undefined} alt={`${student.firstName} ${student.lastName}`} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] text-lg font-bold text-white">
                            {student.firstName?.[0] || ''}
                            {student.lastName?.[0] || ''}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-foreground truncate text-lg leading-tight font-bold">
                            {student.firstName} {student.lastName}
                        </h2>
                        <p className="text-muted-foreground mt-1 font-mono text-xs opacity-70">
                            {student.studentNo}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase opacity-70">
                            Status
                        </p>
                        <Badge
                            className={cn('h-5 px-2 py-0.5 text-[11px] font-bold', status.color)}
                        >
                            <span className="truncate">{status.label}</span>
                        </Badge>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase opacity-70">
                            Progress
                        </p>
                        <div className="flex items-center gap-1.5">
                            <span className="text-foreground text-xs font-bold">
                                {student.progress}%
                            </span>
                            <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                                <div
                                    className="h-full rounded-full bg-[#323d8f] transition-all duration-1000"
                                    style={{ width: `${student.progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="my-5 opacity-50" />

                <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                        <div className="text-muted-foreground flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5" />
                            <span>Activity</span>
                        </div>
                        <span className="text-foreground font-semibold">
                            {student.lastActivity}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <div className="text-muted-foreground flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Session Time</span>
                        </div>
                        <span className="text-foreground font-semibold">{sessionTime}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <div className="text-muted-foreground flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span>Total Flags</span>
                        </div>
                        <span
                            className={cn(
                                'text-foreground font-bold',
                                incidentCount > 0 ? 'text-red-600' : 'text-emerald-600',
                            )}
                        >
                            {incidentCount}
                        </span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
