'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { Activity, CheckCircle, Clock, Search, XCircle } from 'lucide-react';
import {
    Avatar,
    AvatarFallback,
    Badge,
    Button,
    Input,
    NativeSelect,
    NativeSelectOption,
} from '@sentinel/ui';
import type { ExamLobbyWaitingStudent } from '@sentinel/services';
import type {
    LobbyAdmissionGroups,
    LobbyAdmissionStatusFilter,
} from '../_lib/lobby-admission-filters';

type InstructorLobbyAdmissionPanelProps = {
    lobbyAdmissionGroups: LobbyAdmissionGroups;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    statusFilter: LobbyAdmissionStatusFilter;
    onStatusFilterChange: (value: LobbyAdmissionStatusFilter) => void;
    isUpdatingLobbyAdmissions: boolean;
    onUpdateLobbyAdmissions: (
        studentIds: string[],
        status: 'APPROVED' | 'REJECTED',
    ) => Promise<void>;
    overridingStudentId: string | null;
    onOverrideReconnect: (studentId: string) => Promise<void>;
};

type QueueSectionProps = {
    title: string;
    description: string;
    count: number;
    icon: ReactNode;
    students: ExamLobbyWaitingStudent[];
    emptyLabel: string;
    children?: (student: ExamLobbyWaitingStudent) => ReactNode;
};

const STATUS_FILTER_LABELS: Record<LobbyAdmissionStatusFilter, string> = {
    all: 'All students',
    waiting: 'Waiting',
    approved: 'Approved',
    rejected: 'Rejected',
    inAttempt: 'In attempt',
};

function formatCheckedInAt(value: string | null) {
    if (!value) return 'N/A';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'N/A'
        : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function StudentLobbyRow({
    student,
    children,
}: {
    student: ExamLobbyWaitingStudent;
    children?: ReactNode;
}) {
    return (
        <div className="bg-background hover:border-primary/30 flex flex-col gap-3 rounded-md border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
                <Avatar size="sm" className="size-8">
                    <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                        {getInitials(student.studentName)}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-semibold">
                        {student.studentName}
                    </p>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span>{student.studentNumber ?? 'N/A'}</span>
                        <span aria-hidden="true">/</span>
                        <span>{formatCheckedInAt(student.checkedInAt)}</span>
                        <span aria-hidden="true">/</span>
                        <span>
                            {student.reconnectCount} / {student.maxReconnectAttempts} reconnects
                        </span>
                    </div>
                </div>
            </div>
            {children ? <div className="flex shrink-0 gap-2">{children}</div> : null}
        </div>
    );
}

function QueueSection({
    title,
    description,
    count,
    icon,
    students,
    emptyLabel,
    children,
}: QueueSectionProps) {
    return (
        <section className="flex min-w-0 flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                    <div className="text-muted-foreground mt-0.5">{icon}</div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-semibold">{title}</h2>
                            <Badge variant="secondary" className="font-mono text-xs">
                                {count}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs">{description}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {students.length === 0 ? (
                    <div className="text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-sm">
                        {emptyLabel}
                    </div>
                ) : (
                    students.map((student) => (
                        <StudentLobbyRow key={student.admissionId} student={student}>
                            {children?.(student)}
                        </StudentLobbyRow>
                    ))
                )}
            </div>
        </section>
    );
}

/**
 * InstructorLobbyAdmissionPanel renders searchable lobby queues and admission actions.
 *
 * @param props - InstructorLobbyAdmissionPanelProps containing grouped admissions and controls.
 */
export function InstructorLobbyAdmissionPanel({
    lobbyAdmissionGroups,
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    isUpdatingLobbyAdmissions,
    onUpdateLobbyAdmissions,
    overridingStudentId,
    onOverrideReconnect,
}: InstructorLobbyAdmissionPanelProps) {
    const { waitingStudents, approvedStudents, rejectedStudents, inAttemptStudents } =
        lobbyAdmissionGroups;
    const hasActiveFilter = searchTerm.trim().length > 0 || statusFilter !== 'all';
    const waitingStudentIds = waitingStudents.map((student) => student.studentId);

    const handleStatusFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
        onStatusFilterChange(event.target.value as LobbyAdmissionStatusFilter);
    };

    return (
        <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative min-w-0 flex-1 md:max-w-md">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                        aria-label="Search lobby students"
                        placeholder="Search by name or student number"
                        value={searchTerm}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="bg-background pl-9"
                    />
                </div>

                <NativeSelect
                    aria-label="Filter lobby status"
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    className="bg-background w-full md:w-48"
                >
                    {Object.entries(STATUS_FILTER_LABELS).map(([value, label]) => (
                        <NativeSelectOption key={value} value={value}>
                            {label}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
            </div>

            <div className="flex flex-col gap-6">
                <QueueSection
                    title="Waiting"
                    description="Students ready for admission review."
                    count={waitingStudents.length}
                    icon={<Clock className="h-4 w-4" />}
                    students={waitingStudents}
                    emptyLabel={
                        hasActiveFilter
                            ? 'No waiting students match this filter.'
                            : 'No students waiting.'
                    }
                >
                    {(student) => (
                        <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                                size="sm"
                                disabled={isUpdatingLobbyAdmissions}
                                onClick={() =>
                                    void onUpdateLobbyAdmissions([student.studentId], 'APPROVED')
                                }
                            >
                                Admit
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={isUpdatingLobbyAdmissions}
                                onClick={() =>
                                    void onUpdateLobbyAdmissions([student.studentId], 'REJECTED')
                                }
                            >
                                Reject
                            </Button>
                            {student.hasActiveAttempt &&
                            student.reconnectCount >= student.maxReconnectAttempts ? (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={overridingStudentId === student.studentId}
                                    onClick={() => void onOverrideReconnect(student.studentId)}
                                >
                                    Override Limit
                                </Button>
                            ) : null}
                        </div>
                    )}
                </QueueSection>

                <div className="flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isUpdatingLobbyAdmissions || waitingStudentIds.length === 0}
                        onClick={() => void onUpdateLobbyAdmissions(waitingStudentIds, 'APPROVED')}
                    >
                        Admit All
                    </Button>
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                    <QueueSection
                        title="Approved"
                        description="Students admitted but not yet in an active attempt."
                        count={approvedStudents.length}
                        icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
                        students={approvedStudents}
                        emptyLabel={
                            hasActiveFilter
                                ? 'No approved students match this filter.'
                                : 'No approved students waiting.'
                        }
                    />

                    <QueueSection
                        title="In Attempt"
                        description="Students currently working in the exam."
                        count={inAttemptStudents.length}
                        icon={<Activity className="h-4 w-4 text-cyan-600" />}
                        students={inAttemptStudents}
                        emptyLabel={
                            hasActiveFilter
                                ? 'No active attempts match this filter.'
                                : 'No active attempts yet.'
                        }
                    >
                        {(student) => (
                            <Badge variant="outline">
                                {student.attemptStatus === 'IN_PROGRESS'
                                    ? 'Writing'
                                    : (student.attemptStatus ?? 'In Progress')}
                            </Badge>
                        )}
                    </QueueSection>

                    <QueueSection
                        title="Rejected"
                        description="Students returned to the lobby queue."
                        count={rejectedStudents.length}
                        icon={<XCircle className="h-4 w-4 text-rose-600" />}
                        students={rejectedStudents}
                        emptyLabel={
                            hasActiveFilter
                                ? 'No rejected students match this filter.'
                                : 'No rejected admissions.'
                        }
                    />
                </div>
            </div>
        </div>
    );
}
