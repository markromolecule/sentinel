'use client';

import { useState } from 'react';
import { Card } from '@sentinel/ui';
import { Badge } from '@sentinel/ui';
import { AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';
import { cn } from '@sentinel/ui';
import { StudentCardProps } from '@sentinel/shared/types';
import { statusConfig } from '@sentinel/shared/constants';
import { AttemptLifecycleActions } from './attempt-lifecycle-actions';
import { AttemptLifecycleBadge } from './attempt-lifecycle-badge';

export function StudentCard({
    student,
    isSelected,
    onClick,
    maxReconnectAttempts = 0,
    isOverridingReconnect,
    onOverrideReconnect,
    activeLifecycleActionId,
    onLifecycleAction,
}: StudentCardProps) {
    const [imgError, setImgError] = useState(false);
    const status = statusConfig[student.status];
    const avatarUrl = student.avatarUrl ?? null;
    const incidentCount = student.incidentCount ?? student.flags?.length ?? 0;
    const reconnectLimitReached =
        maxReconnectAttempts > 0 && (student.reconnectCount ?? 0) >= maxReconnectAttempts;
    const reconnectOverrideDisabled =
        student.lifecycleState === 'CLOSED' || student.lifecycleState === 'SUPERSEDED';

    return (
        <Card
            className={cn(
                'border-border/50 cursor-pointer p-2.5 transition-all hover:shadow-md',
                isSelected && 'ring-2 ring-[#323d8f]',
            )}
            onClick={onClick}
        >
            {/* Header: avatar + name + status badge */}
            <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                    <div className="relative h-8 w-8 shrink-0">
                        {avatarUrl && !imgError ? (
                            <img
                                src={avatarUrl}
                                alt={`${student.firstName} ${student.lastName}`}
                                className="h-8 w-8 rounded-full object-cover"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] text-[10px] font-bold text-white">
                                {student.firstName[0]}
                                {student.lastName[0]}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p
                            className="text-foreground truncate text-sm leading-tight font-semibold"
                            title={`${student.firstName} ${student.lastName}`}
                        >
                            {student.firstName} {student.lastName}
                        </p>
                        <p className="text-muted-foreground font-mono text-xs leading-tight">
                            {student.studentNo}
                        </p>
                        <div className="mt-1 flex flex-nowrap items-center gap-1">
                            <AttemptLifecycleBadge student={student} />
                        </div>
                    </div>
                </div>
                <Badge className={cn('shrink-0 px-1.5 py-0.5 text-[10px]', status.color)}>
                    {status.icon}
                    <span className="ml-1">{status.label}</span>
                </Badge>
            </div>

            {/* Progress bar (compact, no label row) */}
            <div className="mb-2">
                <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">{student.progress}%</span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                        className="h-full rounded-full bg-[#323d8f] transition-all"
                        style={{ width: `${student.progress}%` }}
                    />
                </div>
            </div>

            {/* Reconnects + Flags inline + actions */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    {/* Reconnects badge */}
                    <Badge
                        variant={reconnectLimitReached ? 'destructive' : 'outline'}
                        className="shrink-0 text-xs"
                    >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        {student.reconnectCount ?? 0}
                        {reconnectLimitReached && onOverrideReconnect ? (
                            <button
                                className="ml-1 underline opacity-70 hover:opacity-100"
                                disabled={isOverridingReconnect || reconnectOverrideDisabled}
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    onOverrideReconnect(student);
                                }}
                            >
                                Override
                            </button>
                        ) : null}
                    </Badge>

                    {/* Flags inline */}
                    {incidentCount > 0 ? (
                        <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-red-600">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                            {incidentCount} flag{incidentCount !== 1 ? 's' : ''}
                        </span>
                    ) : (
                        <span className="flex shrink-0 items-center gap-0.5 text-xs text-emerald-600">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            Clean
                        </span>
                    )}
                </div>

                {/* Lifecycle actions only */}
                <div className="flex shrink-0 items-center">
                    <AttemptLifecycleActions
                        student={student}
                        activeLifecycleActionId={activeLifecycleActionId}
                        onAction={onLifecycleAction}
                    />
                </div>
            </div>
        </Card>
    );
}
