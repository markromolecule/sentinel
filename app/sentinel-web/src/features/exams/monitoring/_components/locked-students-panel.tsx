'use client';

import { useState } from 'react';
import type { StudentSession } from '@sentinel/shared/types';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@sentinel/ui';
import { Lock, Unlock, AlertOctagon, RotateCcw, Clock } from 'lucide-react';
import {
    useReopenExamAttemptMutation,
    useAuthorizeStudentReentryMutation,
} from '@sentinel/hooks';
import { toast } from 'sonner';

interface LockedStudentsPanelProps {
    examId: string;
    students: StudentSession[];
    maxReconnectAttempts?: number;
    onRefresh?: () => Promise<unknown> | void;
}

export function LockedStudentsPanel({
    examId,
    students,
    maxReconnectAttempts = 3,
    onRefresh,
}: LockedStudentsPanelProps) {
    const [actioningId, setActioningId] = useState<string | null>(null);

    const reopenMutation = useReopenExamAttemptMutation();
    const authorizeReentryMutation = useAuthorizeStudentReentryMutation();

    const lockedStudents = students.filter(
        (s) =>
            s.lifecycleState === 'LOCKED' ||
            s.lifecycleState === 'CLOSED' ||
            ((s.reconnectCount ?? 0) > 0 && (s.reconnectCount ?? 0) >= maxReconnectAttempts),
    );

    if (lockedStudents.length === 0) {
        return null;
    }

    const handleAuthorizeReentry = async (student: StudentSession) => {
        setActioningId(student.id);
        try {
            await authorizeReentryMutation.mutateAsync({
                id: examId,
                studentId: student.studentRecordId ?? student.id,
                reason: '1-click re-entry authorization granted by instructor.',
            });
            toast.success(
                `Authorized re-entry and reset reconnects for ${student.firstName} ${student.lastName}`,
            );
            await onRefresh?.();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to authorize re-entry');
        } finally {
            setActioningId(null);
        }
    };

    const handleUnlock15m = async (student: StudentSession) => {
        setActioningId(student.id);
        try {
            const fifteenMinutesLater = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            await reopenMutation.mutateAsync({
                id: examId,
                attemptId: student.attemptId,
                reopenedUntil: fifteenMinutesLater,
                reasonCode: 'MANUAL_MONITORING_REOPEN',
                notes: 'Instructor 1-click unlock (15m window granted).',
            });
            toast.success(`Unlocked 15-minute access window for ${student.firstName} ${student.lastName}`);
            await onRefresh?.();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to unlock attempt');
        } finally {
            setActioningId(null);
        }
    };

    return (
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <AlertOctagon className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                            Locked & Reconnect-Limited Students ({lockedStudents.length})
                        </CardTitle>
                    </div>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
                        Action Required
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {lockedStudents.map((student) => {
                        const isLocked = student.lifecycleState === 'LOCKED' || student.lifecycleState === 'CLOSED';
                        const isBusy = actioningId === student.id;

                        return (
                            <div
                                key={student.id}
                                className="flex flex-col justify-between rounded-md border border-amber-500/20 bg-background/80 p-3 shadow-xs"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-xs font-semibold text-foreground truncate">
                                                {student.firstName} {student.lastName}
                                            </p>
                                            <p className="font-mono text-[11px] text-muted-foreground">
                                                {student.studentNo}
                                            </p>
                                        </div>
                                        <Badge
                                            variant={isLocked ? 'destructive' : 'secondary'}
                                            className="text-[10px] px-1.5 py-0"
                                        >
                                            {isLocked ? (
                                                <span className="flex items-center gap-1">
                                                    <Lock className="h-2.5 w-2.5" /> Locked
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1">
                                                    <RotateCcw className="h-2.5 w-2.5" /> Limit Reached
                                                </span>
                                            )}
                                        </Badge>
                                    </div>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Reconnects: {student.reconnectCount ?? 0} / {maxReconnectAttempts}
                                    </p>
                                </div>

                                <div className="mt-3 flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 flex-1 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white font-medium"
                                        disabled={isBusy}
                                        onClick={() => handleAuthorizeReentry(student)}
                                    >
                                        <Unlock className="h-3 w-3" />
                                        Authorize Re-entry
                                    </Button>
                                    {isLocked && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1 border-amber-500/40"
                                            disabled={isBusy}
                                            onClick={() => handleUnlock15m(student)}
                                        >
                                            <Clock className="h-3 w-3" />
                                            15m
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
